import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";

export type DashboardFilter =
  "ALL" | "PENDING" | "NO_SCORES" | "PARTIAL_SCORES" | "MISSING_PHOTOS" | "FAILING";

export type StudentSortOption =
  "DEFAULT" | "NAME_ASC" | "NAME_DESC" | "AVG_DESC" | "AVG_ASC" | "INCOMPLETE_FIRST";

/**
 * Returns `true` when `subjects` is empty or every subject has `classScore <= 0` and `examScore <= 0`.
 */
export function hasNoScoresEntered(student: StudentRecord): boolean {
  return (
    student.subjects.length === 0 ||
    !student.subjects.some((sub) => sub.classScore > 0 || sub.examScore > 0)
  );
}

/**
 * Returns `true` when a student record is incomplete for report generation:
 * has no subjects, has fewer subjects than `settings.defaultSubjects.length` (when provided),
 * or has `classScore === 0 || examScore === 0` on any subject (`0` is treated as unentered).
 */
export function isStudentPending(
  student: StudentRecord,
  settings?: Pick<SchoolSettings, "defaultSubjects">,
): boolean {
  const expectedCount = settings?.defaultSubjects?.length ?? 0;
  if (student.subjects.length === 0) return true;
  if (expectedCount > 0 && student.subjects.length < expectedCount) return true;
  return student.subjects.some((sub) => sub.classScore === 0 || sub.examScore === 0);
}

/**
 * Returns `true` when a student is still pending (`isStudentPending`) but already has at least
 * one non-zero class or exam score entered (`!hasNoScoresEntered`).
 */
export function hasPartialScores(
  student: StudentRecord,
  settings?: Pick<SchoolSettings, "defaultSubjects">,
): boolean {
  return isStudentPending(student, settings) && !hasNoScoresEntered(student);
}

export function hasMissingPhoto(student: StudentRecord): boolean {
  return !student.pictureUrl;
}

/**
 * Returns `true` only for completed (non-pending) students whose `averageScore < 50`.
 * Excludes pending students so unscored records do not inflate failure counts.
 */
export function isStudentFailing(
  student: ProcessedStudent,
  settings?: Pick<SchoolSettings, "defaultSubjects">,
): boolean {
  return !isStudentPending(student, settings) && student.averageScore < 50;
}

/**
 * Summarizes subject score progress:
 * - `scored`: subjects with `classScore > 0 || examScore > 0`
 * - `completed`: subjects with both `classScore > 0 && examScore > 0`
 * - `total`: total number of enrolled subjects on the record
 */
export function getScoredSubjectCounts(student: StudentRecord): {
  scored: number;
  completed: number;
  total: number;
} {
  const total = student.subjects.length;
  const scored = student.subjects.filter((sub) => sub.classScore > 0 || sub.examScore > 0).length;
  const completed = student.subjects.filter(
    (sub) => sub.classScore > 0 && sub.examScore > 0,
  ).length;
  return { scored, completed, total };
}

/**
 * Returns the original `students` array reference when `sortBy === "DEFAULT"`;
 * otherwise returns a newly sorted copy using alphabetical tie-breaking on `name`.
 */
export function sortStudents(
  students: ProcessedStudent[],
  sortBy: StudentSortOption,
  settings?: Pick<SchoolSettings, "defaultSubjects">,
): ProcessedStudent[] {
  if (sortBy === "DEFAULT") return students;

  return [...students].sort((a, b) => {
    switch (sortBy) {
      case "NAME_ASC":
        return a.name.localeCompare(b.name);
      case "NAME_DESC":
        return b.name.localeCompare(a.name);
      case "AVG_DESC": {
        const diff = b.averageScore - a.averageScore;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      case "AVG_ASC": {
        const diff = a.averageScore - b.averageScore;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      case "INCOMPLETE_FIRST": {
        const aPending = isStudentPending(a, settings) ? 0 : 1;
        const bPending = isStudentPending(b, settings) ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return a.name.localeCompare(b.name);
      }
      default:
        return 0;
    }
  });
}
