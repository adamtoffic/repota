/**
 * Storage monitoring utilities to track localStorage fallback usage and IndexedDB quota.
 * Prevents bogus 5MB localStorage warnings when running on IndexedDB.
 */

import { getStorageType, IDB_KEYS as STORAGE_KEYS } from "./idbStorage";

export interface StorageStats {
  usedBytes: number;
  usedMB: number;
  totalEstimatedMB: number;
  usagePercent: number;
  breakdown: {
    students: number;
    settings: number;
    studentPhotos: number;
    logoAndSignatures: number;
  };
  studentCount: number;
  studentsWithPhotos: number;
  averagePhotoSize: number;
}

/**
 * Calculate the size of a string in bytes (including UTF-8 encoding)
 */
const getStringSize = (str: string): number => {
  return new Blob([str]).size;
};

/**
 * Get comprehensive storage statistics
 */
export const getStorageStats = (): StorageStats => {
  const students = localStorage.getItem(STORAGE_KEYS.STUDENTS) || "[]";
  const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS) || "{}";

  const studentData = JSON.parse(students) as Array<{ pictureUrl?: string }>;
  const settingsData = JSON.parse(settings) as {
    logoUrl?: string;
    headTeacherSignature?: string;
    teacherSignature?: string;
  };

  // Calculate sizes
  const studentsSize = getStringSize(students);
  const settingsSize = getStringSize(settings);

  // Extract photo data sizes
  let studentPhotosSize = 0;
  let studentsWithPhotos = 0;
  studentData.forEach((student) => {
    if (student.pictureUrl && student.pictureUrl.startsWith("data:image")) {
      const photoSize = getStringSize(student.pictureUrl);
      studentPhotosSize += photoSize;
      studentsWithPhotos++;
    }
  });

  // Extract logo and signature sizes
  let logoAndSigsSize = 0;
  if (settingsData.logoUrl?.startsWith("data:image")) {
    logoAndSigsSize += getStringSize(settingsData.logoUrl);
  }
  if (settingsData.headTeacherSignature?.startsWith("data:image")) {
    logoAndSigsSize += getStringSize(settingsData.headTeacherSignature);
  }
  if (settingsData.teacherSignature?.startsWith("data:image")) {
    logoAndSigsSize += getStringSize(settingsData.teacherSignature);
  }

  const totalUsed = studentsSize + settingsSize;
  const totalUsedMB = totalUsed / (1024 * 1024);

  // Estimate browser limit (conservative: 5MB for Safari)
  const estimatedLimit = 5;
  const usagePercent = (totalUsedMB / estimatedLimit) * 100;

  return {
    usedBytes: totalUsed,
    usedMB: parseFloat(totalUsedMB.toFixed(2)),
    totalEstimatedMB: estimatedLimit,
    usagePercent: parseFloat(usagePercent.toFixed(1)),
    breakdown: {
      students: studentsSize,
      settings: settingsSize,
      studentPhotos: studentPhotosSize,
      logoAndSignatures: logoAndSigsSize,
    },
    studentCount: studentData.length,
    studentsWithPhotos,
    averagePhotoSize:
      studentsWithPhotos > 0 ? Math.round(studentPhotosSize / studentsWithPhotos / 1024) : 0,
  };
};

/**
 * Check if localStorage fallback is approaching capacity (>70% = warning, >90% = critical).
 * Returns `"safe"` immediately when using IndexedDB (use `getAsyncStorageWarningLevel` for IDB quota checks).
 */
export const getStorageWarningLevel = (): "safe" | "warning" | "critical" => {
  if (getStorageType() === "indexeddb") {
    return "safe";
  }
  const stats = getStorageStats();
  if (stats.usagePercent >= 90) return "critical";
  if (stats.usagePercent >= 70) return "warning";
  return "safe";
};

/**
 * Storage-aware capacity check: inspects `navigator.storage.estimate()` on IndexedDB
 * and falls back to synchronous `localStorage` byte accounting when IDB is unavailable.
 */
export const getAsyncStorageWarningLevel = async (): Promise<
  "safe" | "warning" | "critical"
> => {
  if (getStorageType() === "localstorage") {
    return getStorageWarningLevel();
  }

  try {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      if (typeof usage === "number" && typeof quota === "number" && quota > 0) {
        const usagePercent = (usage / quota) * 100;
        if (usagePercent >= 90) return "critical";
        if (usagePercent >= 70) return "warning";
      }
    }
  } catch {
    // Ignore storage estimate permission/support errors on restricted WebViews
  }

  return "safe";
};
