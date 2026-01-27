/**
 * IndexedDB storage wrapper with localStorage fallback
 * Provides 50MB+ capacity vs localStorage's 5-10MB limit
 * Falls back to localStorage for Safari Private Mode
 */

import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";

// Database configuration
const DB_NAME = "repota-storage";
const DB_VERSION = 1;
const STORE_NAME = "app-data";

// Storage keys (same as localStorage for compatibility)
export const IDB_KEYS = {
  STUDENTS: "ges_v1_students",
  SETTINGS: "ges_v1_settings",
};

// Database schema
interface RepotaDB extends DBSchema {
  "app-data": {
    key: string;
    value: unknown;
  };
}

// Track if IndexedDB is available
let isIndexedDBAvailable = true;
let db: IDBPDatabase<RepotaDB> | null = null;

/**
 * Check if IndexedDB is available (fails in Safari Private Mode)
 */
const checkIndexedDBAvailability = async (): Promise<boolean> => {
  try {
    // Try to open database
    const testDB = await openDB<RepotaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
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
    // Open database connection
    db = await openDB<RepotaDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      },
    });
    console.log("✅ IndexedDB initialized successfully");
  }
};

/**
 * Save data to storage (IndexedDB or localStorage fallback)
 */
export const saveToStorage = async <T>(key: string, value: T): Promise<boolean> => {
  try {
    if (isIndexedDBAvailable && db) {
      // IndexedDB: Can store 50MB+ easily
      await db.put(STORE_NAME, value, key);
    } else {
      // localStorage fallback: 5-10MB limit
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
    }
    return true;
  } catch (error: unknown) {
    // Handle quota errors
    if (error instanceof Error) {
      if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
        console.error("Storage quota exceeded");
        alert(
          "⚠️ STORAGE FULL: Cannot save more data. Please backup and clear old students or photos.",
        );
        return false;
      }
    }

    console.error("Storage save error:", error);
    return false;
  }
};

/**
 * Load data from storage (IndexedDB or localStorage fallback)
 */
export const loadFromStorage = async <T>(key: string): Promise<T | null> => {
  try {
    if (isIndexedDBAvailable && db) {
      // IndexedDB
      const value = await db.get(STORE_NAME, key);
      return (value as T) ?? null;
    } else {
      // localStorage fallback
      const jsonString = localStorage.getItem(key);
      return jsonString ? (JSON.parse(jsonString) as T) : null;
    }
  } catch (error) {
    console.error("Storage load error:", error);
    return null;
  }
};

/**
 * Delete specific key from storage
 */
export const deleteFromStorage = async (key: string): Promise<boolean> => {
  try {
    if (isIndexedDBAvailable && db) {
      await db.delete(STORE_NAME, key);
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
    if (isIndexedDBAvailable && db) {
      await db.clear(STORE_NAME);
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

    // Check if already migrated
    const existingStudents = await db.get(STORE_NAME, IDB_KEYS.STUDENTS);
    if (existingStudents) {
      return {
        success: true,
        studentsCount: Array.isArray(existingStudents) ? existingStudents.length : 0,
        settingsMigrated: true,
        error: "Data already in IndexedDB",
      };
    }

    // Migrate students
    const studentsJSON = localStorage.getItem(IDB_KEYS.STUDENTS);
    const students = studentsJSON ? JSON.parse(studentsJSON) : [];

    if (students.length > 0) {
      await db.put(STORE_NAME, students, IDB_KEYS.STUDENTS);
    }

    // Migrate settings
    const settingsJSON = localStorage.getItem(IDB_KEYS.SETTINGS);
    const settings = settingsJSON ? JSON.parse(settingsJSON) : null;

    if (settings) {
      await db.put(STORE_NAME, settings, IDB_KEYS.SETTINGS);
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
