/**
 * Storage monitoring utilities to track and manage localStorage usage
 * Helps prevent QuotaExceededError and optimize storage efficiency
 */

import { STORAGE_KEYS } from "./storage";

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
 * Check if storage is approaching capacity (>70% = warning, >90% = critical)
 */
export const getStorageWarningLevel = (): "safe" | "warning" | "critical" => {
  const stats = getStorageStats();
  if (stats.usagePercent >= 90) return "critical";
  if (stats.usagePercent >= 70) return "warning";
  return "safe";
};

/**
 * Calculate how many more students with photos can be stored
 */
export const calculateRemainingCapacity = (): {
  remainingMB: number;
  estimatedStudentsWithPhotos: number;
  estimatedStudentsWithoutPhotos: number;
} => {
  const stats = getStorageStats();
  const remainingMB = stats.totalEstimatedMB - stats.usedMB;
  const avgPhotoKB = stats.averagePhotoSize || 70; // Default 70KB if no photos yet

  // Estimate capacity
  const estimatedStudentsWithPhotos = Math.floor((remainingMB * 1024) / avgPhotoKB);
  const estimatedStudentsWithoutPhotos = Math.floor((remainingMB * 1024) / 0.5); // 500 bytes per student

  return {
    remainingMB: parseFloat(remainingMB.toFixed(2)),
    estimatedStudentsWithPhotos: Math.max(0, estimatedStudentsWithPhotos),
    estimatedStudentsWithoutPhotos: Math.max(0, estimatedStudentsWithoutPhotos),
  };
};

/**
 * Find students with largest photo sizes (for cleanup)
 */
export const findLargestPhotos = (
  limit = 5,
): Array<{ id: string; name: string; sizeKB: number }> => {
  const students = localStorage.getItem(STORAGE_KEYS.STUDENTS) || "[]";
  const studentData = JSON.parse(students) as Array<{
    id: string;
    name: string;
    pictureUrl?: string;
  }>;

  interface StudentWithSize {
    id: string;
    name: string;
    sizeKB: number;
  }

  const studentsWithSizes = studentData
    .filter((s) => s.pictureUrl?.startsWith("data:image"))
    .map(
      (s): StudentWithSize => ({
        id: s.id,
        name: s.name,
        sizeKB: Math.round(getStringSize(s.pictureUrl!) / 1024),
      }),
    )
    .sort((a, b) => b.sizeKB - a.sizeKB);

  return studentsWithSizes.slice(0, limit);
};

/**
 * Format bytes to human-readable format
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
