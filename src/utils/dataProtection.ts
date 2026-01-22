// src/utils/dataProtection.ts
// Protection against data loss from Android cleaner apps

import { STORAGE_KEYS } from "./storage";

/**
 * Create a backup timestamp to detect if LocalStorage was wiped
 */
const BACKUP_CHECK_KEY = "repota_backup_check";
const LAST_BACKUP_KEY = "repota_last_backup";

/**
 * Check if data was recently lost (cleared by cleaner app)
 * Returns true if storage appears to have been wiped
 */
export const detectDataLoss = (): boolean => {
  const backupCheck = localStorage.getItem(BACKUP_CHECK_KEY);
  const hasStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  const hasSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

  // If backup check exists but data is missing, storage was cleared
  if (backupCheck && (!hasStudents || !hasSettings)) {
    return true;
  }

  return false;
};

/**
 * Create a heartbeat to know storage is intact
 */
export const createBackupHeartbeat = (): void => {
  localStorage.setItem(BACKUP_CHECK_KEY, Date.now().toString());
};

/**
 * Store last successful backup timestamp
 */
export const recordBackup = (): void => {
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
};

/**
 * Get time since last backup
 */
export const getTimeSinceBackup = (): string | null => {
  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
  if (!lastBackup) return null;

  const date = new Date(lastBackup);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
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
      console.log("✅ Storage will not be cleared automatically");
    } else {
      console.log("⚠️ Storage may be cleared by the browser/system");
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
