// src/utils/storage.ts

export const STORAGE_KEYS = {
  STUDENTS: "ges_v1_students",
  SETTINGS: "ges_v1_settings",
};

export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: unknown) {
    // ✅ Use 'unknown' instead of 'any'

    // 1. Check if 'e' is a standard Error object
    if (e instanceof Error) {
      if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
        console.error("Storage quota exceeded");
        alert(
          "⚠️ STORAGE FULL: Your browser cannot save more data. Please backup your data and clear old students or images.",
        );
        return false;
      }
    }

    // 2. Handle other non-standard errors
    console.error("Local Storage Error:", e);
    return false;
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error("Error reading from storage", e);
    return null;
  }
};
