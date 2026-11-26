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
let initPromise: Promise<void> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

// Remember last persisted blob strings per key so routine score/setting writes skip rewriting unchanged photos
const blobMemoryCache = new Map<string, string>();

const STORAGE_SYNC_CHANNEL = "repota-storage-sync";
const TAB_SYNC_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`;

interface StorageSyncMessage {
  type: "storage-updated";
  keys: string[];
  senderId: string;
}

let syncChannel: BroadcastChannel | null = null;
let syncChannelCtor: typeof BroadcastChannel | null = null;

function clearBlobCacheForKeys(keys: string[]): void {
  for (const key of keys) {
    const prefix =
      key === IDB_KEYS.STUDENTS
        ? STUDENT_PHOTO_PREFIX
        : key === IDB_KEYS.SETTINGS
          ? SETTINGS_MEDIA_PREFIX
          : null;
    if (!prefix) {
      blobMemoryCache.clear();
      return;
    }
    for (const cacheKey of Array.from(blobMemoryCache.keys())) {
      if (cacheKey.startsWith(prefix)) {
        blobMemoryCache.delete(cacheKey);
      }
    }
  }
}

function hasMigratedToIndexedDB(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(IDB_MIGRATED_MARKER_KEY) === "v2";
  } catch {
    return false;
  }
}

function getSyncChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") {
    syncChannel = null;
    syncChannelCtor = null;
    return null;
  }
  if (!syncChannel || syncChannelCtor !== BroadcastChannel) {
    try {
      syncChannel?.close();
    } catch {
      // ignore close errors on stale handles
    }
    try {
      const nextChannel = new BroadcastChannel(STORAGE_SYNC_CHANNEL);
      nextChannel.addEventListener("message", (event: MessageEvent<StorageSyncMessage>) => {
        const msg = event.data;
        if (
          msg &&
          msg.type === "storage-updated" &&
          msg.senderId !== TAB_SYNC_ID &&
          Array.isArray(msg.keys)
        ) {
          // Evict cross-tab invalidated blob refs immediately so stale cache cannot skip IDB puts
          clearBlobCacheForKeys(msg.keys);
        }
      });
      syncChannel = nextChannel;
      syncChannelCtor = BroadcastChannel;
    } catch {
      syncChannel = null;
      syncChannelCtor = null;
      return null;
    }
  }
  return syncChannel;
}

function notifyStorageUpdated(keys: string[]): void {
  if (keys.length === 0) return;
  const channel = getSyncChannel();
  if (!channel) return;
  try {
    channel.postMessage({
      type: "storage-updated",
      keys,
      senderId: TAB_SYNC_ID,
    } satisfies StorageSyncMessage);
  } catch {
    // Ignore blocked or closed BroadcastChannel errors
  }
}

/**
 * Subscribes to cross-tab storage change notifications emitted on successful writes,
 * deletes, or clears. Returns an unsubscribe cleanup callback (no-op when unsupported).
 */
export function subscribeToStorageSync(listener: (keys: string[]) => void): () => void {
  const channel = getSyncChannel();
  if (!channel) return () => {};

  const handler = (event: MessageEvent<StorageSyncMessage>) => {
    const msg = event.data;
    if (
      msg &&
      msg.type === "storage-updated" &&
      msg.senderId !== TAB_SYNC_ID &&
      Array.isArray(msg.keys)
    ) {
      listener(msg.keys);
    }
  };
  channel.addEventListener("message", handler);
  return () => {
    channel.removeEventListener("message", handler);
  };
}

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

/**
 * Waits for all queued storage writes or migrations to settle before snapshotting/importing.
 */
export function flushStorageWriteQueue(): Promise<void> {
  return writeQueue.then(
    () => undefined,
    () => undefined,
  );
}

function ensureStores(database: IDBPDatabase<RepotaDB>): void {
  if (!database.objectStoreNames.contains(STORE_NAME)) {
    database.createObjectStore(STORE_NAME);
  }
  if (!database.objectStoreNames.contains(MEDIA_STORE_NAME)) {
    database.createObjectStore(MEDIA_STORE_NAME);
  }
}

function isInvalidStateReconnectable(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "InvalidStateError" || /closing|closed|terminated/i.test(error.message))
  );
}

/**
 * Initialize storage system (call on app startup). Coalesces concurrent init calls,
 * opens `repota-storage` once with lifecycle recovery handlers, and falls back to
 * `localStorage` only on un-migrated fresh devices or Safari Private Mode.
 */
export const initStorage = async (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let openedDb: IDBPDatabase<RepotaDB> | null = null;
    try {
      openedDb = await openDB<RepotaDB>(DB_NAME, DB_VERSION, {
        upgrade(database) {
          ensureStores(database);
        },
        blocking() {
          if (db === openedDb) {
            try {
              openedDb?.close();
            } catch {
              // ignore close errors
            }
            db = null;
          }
        },
        terminated() {
          if (db === openedDb) {
            db = null;
          }
        },
      });

      // Read-only probe verifies IndexedDB queryability without failing on full-disk quota
      await openedDb.get(STORE_NAME, "idb_test");

      isIndexedDBAvailable = true;
      blobMemoryCache.clear();
      db = openedDb;
    } catch (error) {
      try {
        openedDb?.close();
      } catch {
        // ignore close errors
      }
      db = null;
      if (hasMigratedToIndexedDB()) {
        // Never silently boot an empty localStorage workspace if this device already migrated to IDB
        isIndexedDBAvailable = true;
        console.error("IndexedDB unavailable on migrated device:", error);
        throw error instanceof Error
          ? error
          : new Error("IndexedDB unavailable on previously migrated device");
      }
      isIndexedDBAvailable = false;
      console.warn("IndexedDB not available, falling back to localStorage:", error);
      console.warn("⚠️ Using localStorage fallback (Safari Private Mode detected)");
    }
  })().finally(() => {
    initPromise = null;
  });

  return initPromise;
};

async function ensureDbConnection(): Promise<IDBPDatabase<RepotaDB> | null> {
  if (!isIndexedDBAvailable) return null;
  if (db) return db;
  await initStorage();
  return isIndexedDBAvailable ? db : null;
}

async function runWithIdbReconnect<T>(
  operation: (database: IDBPDatabase<RepotaDB>) => Promise<T>,
): Promise<T> {
  const activeDb = await ensureDbConnection();
  if (!activeDb) {
    throw new Error("IndexedDB unavailable");
  }
  try {
    return await operation(activeDb);
  } catch (error) {
    if (isInvalidStateReconnectable(error)) {
      try {
        activeDb.close();
      } catch {
        // ignore close error on dead handle
      }
      if (db === activeDb) {
        db = null;
      }
      const reopened = await ensureDbConnection();
      if (reopened) {
        return await operation(reopened);
      }
    }
    throw error;
  }
}

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

interface ReadonlyMediaStore {
  get: (key: string) => Promise<string | undefined>;
}

function evictUnreferencedBlobCacheKeys(prefix: string, referencedKeys: Set<string>): void {
  for (const cacheKey of Array.from(blobMemoryCache.keys())) {
    if (cacheKey.startsWith(prefix) && !referencedKeys.has(cacheKey)) {
      blobMemoryCache.delete(cacheKey);
    }
  }
}

async function hydrateValueFromMediaStore(
  mediaStore: ReadonlyMediaStore,
  key: string,
  rawValue: unknown,
): Promise<unknown> {
  if (!rawValue) {
    return rawValue;
  }

  if (key === IDB_KEYS.STUDENTS && Array.isArray(rawValue)) {
    const refsNeeded: Array<{ index: number; blobKey: string }> = [];
    const referencedKeys = new Set<string>();
    for (let i = 0; i < rawValue.length; i++) {
      const item = rawValue[i] as { pictureUrl?: unknown } | null | undefined;
      if (item && typeof item.pictureUrl === "string" && item.pictureUrl.startsWith(BLOB_REF_PREFIX)) {
        const blobKey = item.pictureUrl.slice(BLOB_REF_PREFIX.length);
        referencedKeys.add(blobKey);
        refsNeeded.push({ index: i, blobKey });
      }
    }
    evictUnreferencedBlobCacheKeys(STUDENT_PHOTO_PREFIX, referencedKeys);
    if (refsNeeded.length === 0) return rawValue;

    const blobs = await Promise.all(refsNeeded.map((ref) => mediaStore.get(ref.blobKey)));

    const hydrated = [...rawValue];
    for (let i = 0; i < refsNeeded.length; i++) {
      const { index, blobKey } = refsNeeded[i];
      const resolved = blobs[i];
      const student = hydrated[index] as Record<string, unknown>;
      if (typeof resolved === "string") {
        blobMemoryCache.set(blobKey, resolved);
        hydrated[index] = { ...student, pictureUrl: resolved };
      } else {
        blobMemoryCache.delete(blobKey);
        hydrated[index] = { ...student, pictureUrl: undefined };
      }
    }
    return hydrated;
  }

  if (key === IDB_KEYS.SETTINGS && typeof rawValue === "object" && !Array.isArray(rawValue)) {
    const settingsObj = rawValue as Record<string, unknown>;
    const refsNeeded: Array<{ field: string; blobKey: string }> = [];
    const referencedKeys = new Set<string>();
    for (const field of SETTINGS_MEDIA_FIELDS) {
      const val = settingsObj[field];
      if (typeof val === "string" && val.startsWith(BLOB_REF_PREFIX)) {
        const blobKey = val.slice(BLOB_REF_PREFIX.length);
        referencedKeys.add(blobKey);
        refsNeeded.push({ field, blobKey });
      }
    }
    evictUnreferencedBlobCacheKeys(SETTINGS_MEDIA_PREFIX, referencedKeys);
    if (refsNeeded.length === 0) return rawValue;

    const blobs = await Promise.all(refsNeeded.map((ref) => mediaStore.get(ref.blobKey)));

    const hydrated = { ...settingsObj };
    for (let i = 0; i < refsNeeded.length; i++) {
      const { field, blobKey } = refsNeeded[i];
      const resolved = blobs[i];
      if (typeof resolved === "string") {
        blobMemoryCache.set(blobKey, resolved);
        hydrated[field] = resolved;
      } else {
        blobMemoryCache.delete(blobKey);
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
export const saveToStorage = <T>(key: string, value: T): Promise<boolean> =>
  enqueueWrite(async () => {
    try {
      const activeDb = await ensureDbConnection();
      if (activeDb) {
        await runWithIdbReconnect((database) => writeEntriesToIdb(database, [{ key, value }]));
      } else {
        // localStorage fallback: 5-10MB limit
        const jsonString = JSON.stringify(value);
        localStorage.setItem(key, jsonString);
      }
      notifyStorageUpdated([key]);
      return true;
    } catch (error: unknown) {
      if (isQuotaExceededError(error)) {
        notifyQuotaExceeded();
        return false;
      }

      console.error("Storage save error:", error);
      return false;
    }
  });

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
export const saveEntriesToStorage = (
  entries: Array<{ key: string; value: unknown }>,
): Promise<boolean> =>
  enqueueWrite(async () => {
    try {
      const activeDb = await ensureDbConnection();
      if (activeDb) {
        try {
          await runWithIdbReconnect((database) => writeEntriesToIdb(database, entries));
          notifyStorageUpdated(entries.map((entry) => entry.key));
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
        notifyStorageUpdated(entries.map((entry) => entry.key));
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
  });

export type StorageLoadResult<T> =
  | { status: "found"; value: T }
  | { status: "empty" }
  | { status: "error" };

/**
 * Load data from storage (IndexedDB or localStorage fallback)
 */
export const loadFromStorageResult = async <T>(key: string): Promise<StorageLoadResult<T>> => {
  try {
    const activeDb = await ensureDbConnection();
    if (activeDb) {
      return await runWithIdbReconnect(async (database) => {
        const hasMediaStore = database.objectStoreNames.contains(MEDIA_STORE_NAME);
        const storeNames = hasMediaStore ? [STORE_NAME, MEDIA_STORE_NAME] : [STORE_NAME];
        const tx = database.transaction(storeNames as ("app-data" | "media-blobs")[], "readonly");
        const rawValue = await tx.objectStore(STORE_NAME).get(key);
        if (rawValue == null) {
          clearBlobCacheForKeys([key]);
          await tx.done;
          return { status: "empty" } as const;
        }
        const value = hasMediaStore
          ? await hydrateValueFromMediaStore(tx.objectStore(MEDIA_STORE_NAME), key, rawValue)
          : rawValue;
        await tx.done;
        return { status: "found", value: value as T } as const;
      });
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
export const deleteFromStorage = (key: string): Promise<boolean> =>
  enqueueWrite(async () => {
    try {
      const activeDb = await ensureDbConnection();
      if (activeDb) {
        await runWithIdbReconnect(async (database) => {
          const cleanupPrefix =
            key === IDB_KEYS.STUDENTS
              ? STUDENT_PHOTO_PREFIX
              : key === IDB_KEYS.SETTINGS
                ? SETTINGS_MEDIA_PREFIX
                : null;

          if (cleanupPrefix && database.objectStoreNames.contains(MEDIA_STORE_NAME)) {
            const tx = database.transaction([STORE_NAME, MEDIA_STORE_NAME], "readwrite");
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
            await database.delete(STORE_NAME, key);
          }
        });
      } else {
        localStorage.removeItem(key);
      }
      notifyStorageUpdated([key]);
      return true;
    } catch (error) {
      console.error("Storage delete error:", error);
      return false;
    }
  });

/**
 * Clear all data from storage (use with caution!)
 */
export const clearAllStorage = (): Promise<boolean> =>
  enqueueWrite(async () => {
    try {
      blobMemoryCache.clear();
      const activeDb = await ensureDbConnection();
      if (activeDb) {
        await runWithIdbReconnect(async (database) => {
          await database.clear(STORE_NAME);
          if (database.objectStoreNames.contains(MEDIA_STORE_NAME)) {
            await database.clear(MEDIA_STORE_NAME);
          }
        });
      } else {
        localStorage.clear();
      }
      notifyStorageUpdated([IDB_KEYS.STUDENTS, IDB_KEYS.SETTINGS]);
      return true;
    } catch (error) {
      console.error("Storage clear error:", error);
      return false;
    }
  });

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
export const migrateFromLocalStorage = (): Promise<{
  success: boolean;
  studentsCount?: number;
  settingsMigrated?: boolean;
  error?: string;
}> =>
  enqueueWrite(async () => {
    try {
      // Check if IndexedDB is available
      const activeDb = await ensureDbConnection();
      if (!activeDb) {
        return {
          success: false,
          error: "IndexedDB not available - using localStorage fallback",
        };
      }

      // Check if already migrated (check both students & settings so settings-only state isn't orphaned)
      const [existingStudents, existingSettings] = await runWithIdbReconnect((database) =>
        Promise.all([
          database.get(STORE_NAME, IDB_KEYS.STUDENTS),
          database.get(STORE_NAME, IDB_KEYS.SETTINGS),
        ]),
      );
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
        await runWithIdbReconnect((database) => writeEntriesToIdb(database, migrationEntries));
        notifyStorageUpdated(migrationEntries.map((entry) => entry.key));
      }

      try {
        localStorage.removeItem(IDB_KEYS.STUDENTS);
        localStorage.removeItem(IDB_KEYS.SETTINGS);
        localStorage.setItem(IDB_MIGRATED_MARKER_KEY, "v2");
      } catch {
        // ignore localStorage cleanup errors
      }

      // Success!

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
  });
