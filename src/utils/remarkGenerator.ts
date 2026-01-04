// src/utils/remarkGenerator.ts
import type { ProcessedStudent, SchoolLevel } from "../types";
import { REMARK_BANK } from "../constants/remarks";

const getRandom = (arr: string[]) =>
  arr ? arr[Math.floor(Math.random() * arr.length)] : "Good effort.";

export const generateTeacherRemark = (
  student: ProcessedStudent,
  attendancePresent: number,
  attendanceTotal: number,
  level: SchoolLevel,
): string => {
  const average = student.averageScore;
  const attendancePercentage =
    attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 100;

  // 1. SELECT THE CORRECT BANK BASED ON LEVEL
  // Fallback to "Primary" if level matches nothing
  const LEVEL_BANK = REMARK_BANK[level] || REMARK_BANK["Primary"];

  // 2. PICK THE CATEGORY
  if (average >= 80 && attendancePercentage >= 90) return getRandom(LEVEL_BANK.EXCELLENT);
  if (average >= 60) return getRandom(LEVEL_BANK.GOOD);
  if (average >= 50) return getRandom(LEVEL_BANK.AVERAGE);
  return getRandom(LEVEL_BANK.POOR);
};

export const generateConduct = (attendancePercentage: number): string => {
  if (attendancePercentage >= 95) return "Exemplary";
  if (attendancePercentage >= 80) return "Satisfactory";
  if (attendancePercentage >= 70) return "Fair";
  return "Irregular";
};
