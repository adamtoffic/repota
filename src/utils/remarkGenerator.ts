// src/utils/remarkGenerator.ts
import type { ProcessedStudent, SchoolLevel, AcademicPeriod } from "../types";
import { REMARK_BANK, HEADMASTER_BANK } from "../constants/remarks";

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
  const LEVEL_BANK = REMARK_BANK[level] || REMARK_BANK["PRIMARY"];

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

// src/utils/remarkGenerator.ts

// ... (keep your existing generateTeacherRemark and generateConduct) ...

export const generateHeadmasterRemark = (averageScore: number, term: AcademicPeriod): string => {
  // NORMALIZE TERM CHECK (Handle "Third Term", "3rd Term", "Third Semester" etc.)
  const isPromotionalTerm =
    term.toLowerCase().includes("third") || term.toLowerCase().includes("3rd");

  // SCENARIO 1: THIRD TERM (Promotion Logic)
  if (isPromotionalTerm) {
    if (averageScore >= 50) return getRandom(HEADMASTER_BANK.PROMOTIONAL.Pass);
    if (averageScore >= 40) return getRandom(HEADMASTER_BANK.PROMOTIONAL.Probation);
    return getRandom(HEADMASTER_BANK.PROMOTIONAL.Fail);
  }

  // SCENARIO 2: FIRST/SECOND TERM (General Logic)
  if (averageScore >= 80) return getRandom(HEADMASTER_BANK.GENERAL.EXCELLENT);
  if (averageScore >= 60) return getRandom(HEADMASTER_BANK.GENERAL.GOOD);
  if (averageScore >= 50) return getRandom(HEADMASTER_BANK.GENERAL.AVERAGE);
  return getRandom(HEADMASTER_BANK.GENERAL.POOR);
};
