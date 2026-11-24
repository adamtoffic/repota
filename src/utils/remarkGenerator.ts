// src/utils/remarkGenerator.ts
import type { ProcessedStudent, SchoolLevel, AcademicPeriod } from "../types";
import { REMARK_BANK, HEADMASTER_BANK, CONDUCT_TRAITS, INTERESTS } from "../constants/remarks";

// Helper: smart random picker avoiding recently used entries until exhausted
const getSmartRandom = (pool: string[], excludeList: string[] = []): string => {
  if (!pool || pool.length === 0) return "Good effort.";

  // A. Find remarks we haven't used yet
  const available = pool.filter((r) => !excludeList.includes(r));

  // B. If we have fresh ones, pick one!
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // C. If deck is empty (all used), reshuffle and pick any
  return pool[Math.floor(Math.random() * pool.length)];
};

// 1. TEACHER REMARK
/**
 * Selects a remark matching the student's score/attendance tier from `REMARK_BANK`.
 * `EXCELLENT` requires `averageScore >= 80` and attendance `>= 90%` (`attendanceTotal <= 0` defaults to `100%`).
 * Unknown `level` values fall back to `"PRIMARY"`; avoids entries in `excludeList` until the tier pool is exhausted.
 */
export const generateTeacherRemark = (
  student: ProcessedStudent,
  attendancePresent: number,
  attendanceTotal: number,
  level: SchoolLevel,
  excludeList: string[] = [],
): string => {
  const average = student.averageScore;
  const attendancePercentage =
    attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 100;

  // Fallback to PRIMARY if level key is missing
  const safeLevel = REMARK_BANK[level] ? level : "PRIMARY";
  const LEVEL_BANK = REMARK_BANK[safeLevel];

  let pool: string[] = LEVEL_BANK.POOR;
  if (average >= 80 && attendancePercentage >= 90) pool = LEVEL_BANK.EXCELLENT;
  else if (average >= 60) pool = LEVEL_BANK.GOOD;
  else if (average >= 50) pool = LEVEL_BANK.AVERAGE;

  return getSmartRandom(pool, excludeList);
};

// 2. HEADMASTER REMARK
/**
 * Selects a headteacher remark using promotional pools when `term` contains `"third"` or `"3rd"`.
 * Students below passing (`< 50` in promotional terms, `< 45` in normal terms) receive encouraging remarks
 * rather than promotion wording; avoids `excludeList` until the pool is exhausted.
 */
export const generateHeadmasterRemark = (
  averageScore: number,
  term: AcademicPeriod,
  excludeList: string[] = [],
): string => {
  const isPromotionalTerm =
    term.toLowerCase().includes("third") || term.toLowerCase().includes("3rd");

  let pool: string[];

  if (isPromotionalTerm) {
    // Only show promotional remarks for students with passing grades
    // Students with lower grades get encouraging remarks instead
    if (averageScore >= 75) pool = HEADMASTER_BANK.PROMOTIONAL.Excellent;
    else if (averageScore >= 50) pool = HEADMASTER_BANK.PROMOTIONAL.Good;
    else pool = HEADMASTER_BANK.PROMOTIONAL.Encouraging;
  } else {
    // Normal Terms - More positive tiering
    if (averageScore >= 80) pool = HEADMASTER_BANK.GENERAL.EXCELLENT;
    else if (averageScore >= 65) pool = HEADMASTER_BANK.GENERAL.GOOD;
    else if (averageScore >= 45) pool = HEADMASTER_BANK.GENERAL.AVERAGE;
    else pool = HEADMASTER_BANK.PROMOTIONAL.Encouraging; // Use encouraging remarks even in normal terms
  }

  return getSmartRandom(pool, excludeList);
};

// 3. ATTENDANCE RATING (For the "Attendance" box on the report)
/**
 * Maps attendance percentage to report labels:
 * `>= 95` `"Exemplary"`, `>= 80` `"Satisfactory"`, `>= 70` `"Fair"`, `< 70` `"Irregular"`.
 */
export const generateAttendanceRating = (attendancePercentage: number): string => {
  if (attendancePercentage >= 95) return "Exemplary";
  if (attendancePercentage >= 80) return "Satisfactory";
  if (attendancePercentage >= 70) return "Fair";
  return "Irregular";
};

// 4. NEW: CONDUCT TRAIT SHUFFLER
export const getRandomConductTrait = (exclude?: string): string => {
  return getSmartRandom(CONDUCT_TRAITS, exclude ? [exclude] : []);
};

// 5. NEW: INTEREST SHUFFLER
export const getRandomInterest = (exclude?: string): string => {
  return getSmartRandom(INTERESTS, exclude ? [exclude] : []);
};
