/**
 * IndexedDB storage wrapper with localStorage fallback
 * Provides 50MB+ capacity vs localStorage's 5-10MB limit
 * Falls back to localStorage for Safari Private Mode
 */

import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";

// Database configuration
const DB_NAME = "repota-storage";
const DB_VERSION = 2;
const STORE_NAME = "app-data";
const MEDIA_STORE_NAME = "media-blobs";
const BLOB_REF_PREFIX = "idb-blob://";
const STUDENT_PHOTO_PREFIX = "student-photo:";
const SETTINGS_MEDIA_PREFIX = "settings-media:";
const SETTINGS_MEDIA_FIELDS = [
  "logoUrl",
  "schoolLogo",
  "headTeacherSignature",
  "teacherSignature",
] as const;
const INLINE_BLOB_MIN_LENGTH = 512;

/**
 * Storage keys (same as localStorage for compatibility)
 */
export const IDB_KEYS = {
  STUDENTS: "ges_v1_students",
  SETTINGS: "ges_v1_settings",
};
const IDB_MIGRATED_MARKER_KEY = "repota_idb_migrated";

// Database schema
interface RepotaDB extends DBSchema {
  "app-data": {
    key: string;
    value: unknown;
  };
  "media-blobs": {
    key: string;
    value: string;
  };
}

// Track if IndexedDB is available
let isIndexedDBAvailable = true;
let db: IDBPDatabase<RepotaDB> | null = null;

// Remember last persisted blob strings per key so routine score/setting writes skip rewriting unchanged photos
const blobMemoryCache = new Map<string, string>();

function ensureStores(database: IDBPDatabase<RepotaDB>): void {
  if (!database.objectStoreNames.contains(STORE_NAME)) {
    database.createObjectStore(STORE_NAME);
  }
  if (!database.objectStoreNames.contains(MEDIA_STORE_NAME)) {
    database.createObjectStore(MEDIA_STORE_NAME);
  }
}

/**
 * Check if IndexedDB is available (fails in Safari Private Mode)
 */
const checkIndexedDBAvailability = async (): Promise<boolean> => {
  try {
    // Try to open database
    const testDB = await openDB<RepotaDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        ensureStores(database);
      },
    });

    // Test write and delete
    await testDB.put(STORE_NAME, "test", "idb_test");
    await testDB.delete(STORE_NAME, "idb_test");
    testDB.close();

    return true;
  } catch (error) {
    console.warn("IndexedDB not available, falling back to localStorage:", error);
    return false;
  }
};

/**
 * Initialize storage system (call on app startup)
 */
export const initStorage = async (): Promise<void> => {
  isIndexedDBAvailable = await checkIndexedDBAvailability();

  if (!isIndexedDBAvailable) {
    console.warn("⚠️ Using localStorage fallback (Safari Private Mode detected)");
  } else {
    blobMemoryCache.clear();
    // Open database connection
    db = await openDB<RepotaDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        ensureStores(database);
      },
    });
    console.log("✅ IndexedDB initialized successfully");
  }
};

function isExtractableMediaString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith(BLOB_REF_PREFIX) &&
    (value.startsWith("data:") || value.length >= INLINE_BLOB_MIN_LENGTH)
  );
}

interface PreparedEntry {
  key: string;
  strippedValue: unknown;
  blobsToPut: Array<{ key: string; value: string }>;
  cleanupScope?: { prefix: string; keepKeys: Set<string> };
}

function prepareEntryForIdb(key: string, value: unknown): PreparedEntry {
  if (key === IDB_KEYS.STUDENTS && Array.isArray(value)) {
    const keepKeys = new Set<string>();
    const blobsToPut: Array<{ key: string; value: string }> = [];
    const strippedStudents = value.map((item) => {
      if (!item || typeof item !== "object") return item;
      const student = item as { id?: unknown; pictureUrl?: unknown };
      if (typeof student.id !== "string") return item;
      const blobKey = `${STUDENT_PHOTO_PREFIX}${student.id}`;

      if (typeof student.pictureUrl === "string" && student.pictureUrl.startsWith(BLOB_REF_PREFIX)) {
        keepKeys.add(blobKey);
        return item;
      }

      if (isExtractableMediaString(student.pictureUrl)) {
        keepKeys.add(blobKey);
        if (blobMemoryCache.get(blobKey) !== student.pictureUrl) {
          blobsToPut.push({ key: blobKey, value: student.pictureUrl });
        }
        return { ...student, pictureUrl: `${BLOB_REF_PREFIX}${blobKey}` };
      }

      return item;
    });

    return {
      key,
      strippedValue: strippedStudents,
      blobsToPut,
      cleanupScope: { prefix: STUDENT_PHOTO_PREFIX, keepKeys },
    };
  }

  if (key === IDB_KEYS.SETTINGS && value && typeof value === "object" && !Array.isArray(value)) {
    const keepKeys = new Set<string>();
    const blobsToPut: Array<{ key: string; value: string }> = [];
    let cloned: Record<string, unknown> | null = null;
    const settingsObj = value as Record<string, unknown>;

    for (const field of SETTINGS_MEDIA_FIELDS) {
      const fieldVal = settingsObj[field];
      const blobKey = `${SETTINGS_MEDIA_PREFIX}${field}`;

      if (typeof fieldVal === "string" && fieldVal.startsWith(BLOB_REF_PREFIX)) {
        keepKeys.add(blobKey);
        continue;
      }

      if (isExtractableMediaString(fieldVal)) {
        keepKeys.add(blobKey);
        if (blobMemoryCache.get(blobKey) !== fieldVal) {
          blobsToPut.push({ key: blobKey, value: fieldVal });
        }
        if (!cloned) cloned = { ...settingsObj };
        cloned[field] = `${BLOB_REF_PREFIX}${blobKey}`;
      }
    }

    return {
      key,
      strippedValue: cloned ?? value,
      blobsToPut,
      cleanupScope: { prefix: SETTINGS_MEDIA_PREFIX, keepKeys },
    };
  }

  return { key, strippedValue: value, blobsToPut: [] };
}

async function writeEntriesToIdb(
  database: IDBPDatabase<RepotaDB>,
  entries: Array<{ key: string; value: unknown }>,
): Promise<void> {
  const prepared = entries.map((e) => prepareEntryForIdb(e.key, e.value));
  const useMediaStore = database.objectStoreNames.contains(MEDIA_STORE_NAME);

  if (!useMediaStore) {
    const tx = database.transaction(STORE_NAME, "readwrite");
    try {
      for (const entry of entries) {
        await tx.store.put(entry.value, entry.key);
      }
      await tx.done;
      return;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // ignore if already aborted
      }
      await tx.done.catch(() => {});
      throw error;
    }
  }

  const tx = database.transaction([STORE_NAME, MEDIA_STORE_NAME], "readwrite");
  const appStore = tx.objectStore(STORE_NAME);
  const mediaStore = tx.objectStore(MEDIA_STORE_NAME);
  const pendingCacheUpdates: Array<{ key: string; value: string }> = [];
  const pendingCacheDeletes: string[] = [];

  try {
    const scopes = prepared
      .map((p) => p.cleanupScope)
      .filter((scope): scope is { prefix: string; keepKeys: Set<string> } => Boolean(scope));
    const existingMediaKeys = scopes.length > 0 ? await mediaStore.getAllKeys() : [];

    for (const entry of prepared) {
      for (const blob of entry.blobsToPut) {
        await mediaStore.put(blob.value, blob.key);
        pendingCacheUpdates.push(blob);
      }

      if (entry.cleanupScope) {
        const { prefix, keepKeys } = entry.cleanupScope;
        for (const existingKey of existingMediaKeys) {
          if (
            typeof existingKey === "string" &&
            existingKey.startsWith(prefix) &&
            !keepKeys.has(existingKey)
          ) {
            await mediaStore.delete(existingKey);
            pendingCacheDeletes.push(existingKey);
          }
        }
      }

      await appStore.put(entry.strippedValue, entry.key);
    }

    await tx.done;

    for (const delKey of pendingCacheDeletes) {
      blobMemoryCache.delete(delKey);
    }
    for (const update of pendingCacheUpdates) {
      blobMemoryCache.set(update.key, update.value);
    }
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // ignore if already aborted
    }
    await tx.done.catch(() => {});
    throw error;
  }
}

async function hydrateValueFromIdb(
  database: IDBPDatabase<RepotaDB>,
  key: string,
  rawValue: unknown,
): Promise<unknown> {
  if (!rawValue || !database.objectStoreNames.contains(MEDIA_STORE_NAME)) {
    return rawValue;
  }

  if (key === IDB_KEYS.STUDENTS && Array.isArray(rawValue)) {
    const refsNeeded: Array<{ index: number; blobKey: string }> = [];
    for (let i = 0; i < rawValue.length; i++) {
      const item = rawValue[i] as { pictureUrl?: unknown } | null | undefined;
      if (item && typeof item.pictureUrl === "string" && item.pictureUrl.startsWith(BLOB_REF_PREFIX)) {
        refsNeeded.push({
          index: i,
          blobKey: item.pictureUrl.slice(BLOB_REF_PREFIX.length),
        });
      }
    }
    if (refsNeeded.length === 0) return rawValue;

    const tx = database.transaction(MEDIA_STORE_NAME, "readonly");
    const blobs = await Promise.all(refsNeeded.map((ref) => tx.store.get(ref.blobKey)));
    await tx.done;

    const hydrated = [...rawValue];
    for (let i = 0; i < refsNeeded.length; i++) {
      const { index, blobKey } = refsNeeded[i];
      const resolved = blobs[i];
      const student = hydrated[index] as Record<string, unknown>;
      if (typeof resolved === "string") {
        blobMemoryCache.set(blobKey, resolved);
        hydrated[index] = { ...student, pictureUrl: resolved };
      } else {
        hydrated[index] = { ...student, pictureUrl: undefined };
      }
    }
    return hydrated;
  }

  if (key === IDB_KEYS.SETTINGS && typeof rawValue === "object" && !Array.isArray(rawValue)) {
    const settingsObj = rawValue as Record<string, unknown>;
    const refsNeeded: Array<{ field: string; blobKey: string }> = [];
    for (const field of SETTINGS_MEDIA_FIELDS) {
      const val = settingsObj[field];
      if (typeof val === "string" && val.startsWith(BLOB_REF_PREFIX)) {
        refsNeeded.push({ field, blobKey: val.slice(BLOB_REF_PREFIX.length) });
      }
    }
    if (refsNeeded.length === 0) return rawValue;

    const tx = database.transaction(MEDIA_STORE_NAME, "readonly");
    const blobs = await Promise.all(refsNeeded.map((ref) => tx.store.get(ref.blobKey)));
    await tx.done;

    const hydrated = { ...settingsObj };
    for (let i = 0; i < refsNeeded.length; i++) {
      const { field, blobKey } = refsNeeded[i];
      const resolved = blobs[i];
      if (typeof resolved === "string") {
        blobMemoryCache.set(blobKey, resolved);
        hydrated[field] = resolved;
      } else {
        hydrated[field] = "";
      }
    }
    return hydrated;
  }

  return rawValue;
}

export const STORAGE_QUOTA_EXCEEDED_EVENT = "repota:storage-quota-exceeded";
const QUOTA_NOTIFY_COOLDOWN_MS = 10_000;
let lastQuotaNotifyAt = 0;

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function notifyQuotaExceeded(): void {
  console.error("Storage quota exceeded");
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastQuotaNotifyAt < QUOTA_NOTIFY_COOLDOWN_MS) return;
  lastQuotaNotifyAt = now;
  window.dispatchEvent(
    new CustomEvent(STORAGE_QUOTA_EXCEEDED_EVENT, {
      detail: {
        message:
          "Storage full: cannot save latest changes. Save a .repota backup and clear old photos or unused records.",
      },
    }),
  );
}

/**
 * Save data to storage (IndexedDB or localStorage fallback)
 */
export const saveToStorage = async <T>(key: string, value: T): Promise<boolean> => {
  try {
    if (isIndexedDBAvailable && db) {
      await writeEntriesToIdb(db, [{ key, value }]);
    } else {
      // localStorage fallback: 5-10MB limit
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
    }
    return true;
  } catch (error: unknown) {
    if (isQuotaExceededError(error)) {
      notifyQuotaExceeded();
      return false;
    }

    console.error("Storage save error:", error);
    return false;
  }
};

export class StorageBatchRollbackError extends Error {
  constructor(
    message = "Storage batch write failed and rollback was incomplete.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StorageBatchRollbackError";
  }
}

/**
 * Save multiple entries atomically in a single readwrite transaction
 */
export const saveEntriesToStorage = async (
  entries: Array<{ key: string; value: unknown }>,
): Promise<boolean> => {
  try {
    if (isIndexedDBAvailable && !db) {
      await initStorage();
    }
    if (isIndexedDBAvailable && db) {
      try {
        await writeEntriesToIdb(db, entries);
        return true;
      } catch (error) {
        if (isQuotaExceededError(error)) {
          notifyQuotaExceeded();
        } else {
          console.error("Storage batch write error:", error);
        }
        return false;
      }
    } else {
      const snapshots: Array<{ key: string; value: string | null }> = entries.map((e) => ({
        key: e.key,
        value: localStorage.getItem(e.key),
      }));

      try {
        for (const entry of entries) {
          const jsonString = JSON.stringify(entry.value);
          localStorage.setItem(entry.key, jsonString);
        }
      } catch (writeError) {
        let rollbackFailed = false;
        for (const snapshot of snapshots) {
          try {
            if (snapshot.value !== null) {
              localStorage.setItem(snapshot.key, snapshot.value);
            } else {
              localStorage.removeItem(snapshot.key);
            }
          } catch {
            rollbackFailed = true;
          }
        }
        if (rollbackFailed) {
          throw new StorageBatchRollbackError(undefined, { cause: writeError });
        }
        throw writeError;
      }
    }
    return true;
  } catch (error: unknown) {
    if (error instanceof StorageBatchRollbackError) {
      throw error;
    }
    if (isQuotaExceededError(error)) {
      notifyQuotaExceeded();
      return false;
    }

    console.error("Storage save entries error:", error);
    return false;
  }
};

export type StorageLoadResult<T> =
  | { status: "found"; value: T }
  | { status: "empty" }
  | { status: "error" };

/**
 * Load data from storage (IndexedDB or localStorage fallback)
 */
export const loadFromStorageResult = async <T>(key: string): Promise<StorageLoadResult<T>> => {
  try {
    if (isIndexedDBAvailable && db) {
      // IndexedDB
      const rawValue = await db.get(STORE_NAME, key);
      if (rawValue == null) {
        return { status: "empty" };
      }
      const value = await hydrateValueFromIdb(db, key, rawValue);
      return { status: "found", value: value as T };
    } else {
      // localStorage fallback
      const jsonString = localStorage.getItem(key);
      if (jsonString === null) {
        return { status: "empty" };
      }
      const parsed = JSON.parse(jsonString);
      return parsed == null ? { status: "empty" } : { status: "found", value: parsed as T };
    }
  } catch (error) {
    console.error("Storage load error:", error);
    return { status: "error" };
  }
};

/**
 * Load data from storage, preserving the legacy null-on-error API.
 */
export const loadFromStorage = async <T>(key: string): Promise<T | null> => {
  const result = await loadFromStorageResult<T>(key);
  return result.status === "found" ? result.value : null;
};

/**
 * Delete specific key from storage
 */
export const deleteFromStorage = async (key: string): Promise<boolean> => {
  try {
    if (isIndexedDBAvailable && db) {
      const cleanupPrefix =
        key === IDB_KEYS.STUDENTS
          ? STUDENT_PHOTO_PREFIX
          : key === IDB_KEYS.SETTINGS
            ? SETTINGS_MEDIA_PREFIX
            : null;

      if (cleanupPrefix && db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        const tx = db.transaction([STORE_NAME, MEDIA_STORE_NAME], "readwrite");
        const mediaStore = tx.objectStore(MEDIA_STORE_NAME);
        const mediaKeys = await mediaStore.getAllKeys();
        for (const mediaKey of mediaKeys) {
          if (typeof mediaKey === "string" && mediaKey.startsWith(cleanupPrefix)) {
            await mediaStore.delete(mediaKey);
            blobMemoryCache.delete(mediaKey);
          }
        }
        await tx.objectStore(STORE_NAME).delete(key);
        await tx.done;
      } else {
        await db.delete(STORE_NAME, key);
      }
    } else {
      localStorage.removeItem(key);
    }
    return true;
  } catch (error) {
    console.error("Storage delete error:", error);
    return false;
  }
};

/**
 * Clear all data from storage (use with caution!)
 */
export const clearAllStorage = async (): Promise<boolean> => {
  try {
    blobMemoryCache.clear();
    if (isIndexedDBAvailable && db) {
      await db.clear(STORE_NAME);
      if (db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        await db.clear(MEDIA_STORE_NAME);
      }
    } else {
      localStorage.clear();
    }
    return true;
  } catch (error) {
    console.error("Storage clear error:", error);
    return false;
  }
};

/**
 * Get storage type being used
 */
export const getStorageType = (): "indexeddb" | "localstorage" => {
  return isIndexedDBAvailable ? "indexeddb" : "localstorage";
};

/**
 * Migrate data from localStorage to IndexedDB
 * Call this once when switching from localStorage to IndexedDB
 */
export const migrateFromLocalStorage = async (): Promise<{
  success: boolean;
  studentsCount?: number;
  settingsMigrated?: boolean;
  error?: string;
}> => {
  try {
    // Check if IndexedDB is available
    if (!isIndexedDBAvailable || !db) {
      return {
        success: false,
        error: "IndexedDB not available - using localStorage fallback",
      };
    }

    // Check if already migrated (check both students & settings so settings-only state isn't orphaned)
    const [existingStudents, existingSettings] = await Promise.all([
      db.get(STORE_NAME, IDB_KEYS.STUDENTS),
      db.get(STORE_NAME, IDB_KEYS.SETTINGS),
    ]);
    if (existingStudents !== undefined || existingSettings !== undefined) {
      try {
        localStorage.removeItem(IDB_KEYS.STUDENTS);
        localStorage.removeItem(IDB_KEYS.SETTINGS);
        localStorage.setItem(IDB_MIGRATED_MARKER_KEY, "v2");
      } catch {
        // ignore localStorage cleanup errors
      }
      return {
        success: true,
        studentsCount: Array.isArray(existingStudents) ? existingStudents.length : 0,
        settingsMigrated: existingSettings !== undefined,
        error: "Data already in IndexedDB",
      };
    }

    // Migrate students
    const studentsJSON = localStorage.getItem(IDB_KEYS.STUDENTS);
    const students = studentsJSON ? JSON.parse(studentsJSON) : [];

    const migrationEntries: Array<{ key: string; value: unknown }> = [];
    if (students.length > 0) {
      migrationEntries.push({ key: IDB_KEYS.STUDENTS, value: students });
    }

    // Migrate settings
    const settingsJSON = localStorage.getItem(IDB_KEYS.SETTINGS);
    const settings = settingsJSON ? JSON.parse(settingsJSON) : null;

    if (settings) {
      migrationEntries.push({ key: IDB_KEYS.SETTINGS, value: settings });
    }

    if (migrationEntries.length > 0) {
      await writeEntriesToIdb(db, migrationEntries);
    }

    try {
      localStorage.removeItem(IDB_KEYS.STUDENTS);
      localStorage.removeItem(IDB_KEYS.SETTINGS);
      localStorage.setItem(IDB_MIGRATED_MARKER_KEY, "v2");
    } catch {
      // ignore localStorage cleanup errors
    }

    // Success!
    console.log(`✅ Migrated ${students.length} students to IndexedDB`);

    return {
      success: true,
      studentsCount: students.length,
      settingsMigrated: !!settings,
    };
  } catch (error) {
    console.error("Migration error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
