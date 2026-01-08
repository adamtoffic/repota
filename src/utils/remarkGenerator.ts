// src/utils/remarkGenerator.ts
import type { ProcessedStudent, SchoolLevel, AcademicPeriod } from "../types";
import { REMARK_BANK, HEADMASTER_BANK, CONDUCT_TRAITS, INTERESTS } from "../constants/remarks";

// Helper: safe random picker
const getRandom = (arr: string[]) =>
  arr && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "Good effort.";

// 1. TEACHER REMARK
export const generateTeacherRemark = (
  student: ProcessedStudent,
  attendancePresent: number,
  attendanceTotal: number,
  level: SchoolLevel,
): string => {
  const average = student.averageScore;
  const attendancePercentage =
    attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 100;

  // Fallback to PRIMARY if level key is missing
  const safeLevel = REMARK_BANK[level] ? level : "PRIMARY";
  const LEVEL_BANK = REMARK_BANK[safeLevel];

  if (average >= 80 && attendancePercentage >= 90) return getRandom(LEVEL_BANK.EXCELLENT);
  if (average >= 60) return getRandom(LEVEL_BANK.GOOD);
  if (average >= 50) return getRandom(LEVEL_BANK.AVERAGE);
  return getRandom(LEVEL_BANK.POOR);
};

// 2. HEADMASTER REMARK
export const generateHeadmasterRemark = (averageScore: number, term: AcademicPeriod): string => {
  // Handle "Third Term", "3rd Term", "Third Semester"
  const isPromotionalTerm =
    term.toLowerCase().includes("third") || term.toLowerCase().includes("3rd");

  if (isPromotionalTerm) {
    if (averageScore >= 50) return getRandom(HEADMASTER_BANK.PROMOTIONAL.Pass);
    if (averageScore >= 40) return getRandom(HEADMASTER_BANK.PROMOTIONAL.Probation);
    return getRandom(HEADMASTER_BANK.PROMOTIONAL.Fail);
  }

  // Normal Terms
  if (averageScore >= 80) return getRandom(HEADMASTER_BANK.GENERAL.EXCELLENT);
  if (averageScore >= 60) return getRandom(HEADMASTER_BANK.GENERAL.GOOD);
  if (averageScore >= 50) return getRandom(HEADMASTER_BANK.GENERAL.AVERAGE);
  return getRandom(HEADMASTER_BANK.GENERAL.POOR);
};

// 3. ATTENDANCE RATING (For the "Attendance" box on the report)
export const generateAttendanceRating = (attendancePercentage: number): string => {
  if (attendancePercentage >= 95) return "Exemplary";
  if (attendancePercentage >= 80) return "Satisfactory";
  if (attendancePercentage >= 70) return "Fair";
  return "Irregular";
};

// 4. NEW: CONDUCT TRAIT SHUFFLER
export const getRandomConductTrait = (): string => {
  return getRandom(CONDUCT_TRAITS);
};

// 5. NEW: INTEREST SHUFFLER
export const getRandomInterest = (): string => {
  return getRandom(INTERESTS);
};
