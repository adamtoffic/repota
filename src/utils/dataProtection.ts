// src/utils/dataProtection.ts
// Protection against data loss from Android cleaner apps

import { getStorageType, IDB_KEYS as STORAGE_KEYS } from "./idbStorage";

/**
 * Create a backup timestamp to detect if storage was wiped
 */
const BACKUP_CHECK_KEY = "repota_backup_check";
const LAST_BACKUP_KEY = "repota_last_backup";
const HAD_DATA_BEFORE_KEY = "repota_had_data"; // Track if user ever had data

/**
 * Check if data was recently lost (cleared by cleaner app or external eviction).
 * When IndexedDB is active, pass `storageSnapshot` from post-hydration load results;
 * checking `localStorage` keys under IndexedDB causes false positives on every launch.
 */
export const detectDataLoss = (storageSnapshot?: {
  studentsEmpty: boolean;
  settingsEmpty: boolean;
}): boolean => {
  let backupCheck: string | null = null;
  let hadDataBefore: string | null = null;
  let hasStudents: string | null = null;
  let hasSettings: string | null = null;
  try {
    backupCheck = localStorage.getItem(BACKUP_CHECK_KEY);
    hadDataBefore = localStorage.getItem(HAD_DATA_BEFORE_KEY);
    if (hadDataBefore !== "true" || !backupCheck) {
      return false;
    }
    if (storageSnapshot) {
      return storageSnapshot.studentsEmpty && storageSnapshot.settingsEmpty;
    }
    if (getStorageType() === "indexeddb") {
      return false;
    }
    hasStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    hasSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  } catch {
    return false;
  }

  return !hasStudents || !hasSettings;
};

/**
 * Create a heartbeat to know storage is intact
 * Also marks that user has data (to detect future losses)
 */
export const createBackupHeartbeat = (): void => {
  try {
    localStorage.setItem(BACKUP_CHECK_KEY, Date.now().toString());
    localStorage.setItem(HAD_DATA_BEFORE_KEY, "true"); // Mark that user has data
  } catch {
    // Ignore blocked or quota-full localStorage when primary IDB storage succeeded
  }
};

/**
 * Store last successful backup timestamp
 */
export const recordBackup = (): void => {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    // Ignore blocked or quota-full localStorage after backup export
  }
};

/**
 * Get time since last backup
 */
export const getTimeSinceBackup = (): string | null => {
  try {
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (!lastBackup) return null;

    const date = new Date(lastBackup);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  } catch {
    return null;
  }
};

/**
 * Enable persistent storage (prevents automatic cleanup on Android)
 * Only works on newer browsers
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (!navigator.storage || !navigator.storage.persist) {
    return false; // Not supported
  }

  try {
    const isPersisted = await navigator.storage.persist();
    if (isPersisted) {
      // Storage persistence granted
    } else {
      // Storage may be cleared - data is safe in localStorage but not guaranteed to persist
    }
    return isPersisted;
  } catch (error) {
    console.error("Failed to request persistent storage:", error);
    return false;
  }
};

/**
 * Check if storage is already persistent
 */
export const checkStoragePersistence = async (): Promise<boolean> => {
  if (!navigator.storage || !navigator.storage.persisted) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    return isPersisted;
  } catch {
    return false;
  }
};
