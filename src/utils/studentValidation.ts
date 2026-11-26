import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";

export type DashboardFilter =
  "ALL" | "PENDING" | "NO_SCORES" | "PARTIAL_SCORES" | "MISSING_PHOTOS" | "FAILING";

export type StudentSortOption =
  "DEFAULT" | "NAME_ASC" | "NAME_DESC" | "AVG_DESC" | "AVG_ASC" | "INCOMPLETE_FIRST";

export type SubjectScoreStatus = "complete" | "partial" | "unscored";

/**
 * Classifies a subject's entry completeness.
 * In `MOCK` mode only `examScore > 0` is required; in `TERMLY` mode both `classScore > 0`
 * and `examScore > 0` are required for `"complete"` (`0` is treated as unentered).
 */
export function getSubjectScoreStatus(
  subject: SavedSubject,
  isMockExam = false,
): SubjectScoreStatus {
  if (isMockExam) {
    return subject.examScore > 0 ? "complete" : "unscored";
  }
  if (subject.classScore > 0 && subject.examScore > 0) return "complete";
  if (subject.classScore > 0 || subject.examScore > 0) return "partial";
  return "unscored";
}

/**
 * Returns `true` when `subjects` is empty or every subject has zero entered or stashed scores
 * (`classScore <= 0`, `examScore <= 0`, no `savedDirectClassScore > 0`, and no SBA component `score > 0`).
 */
export function hasNoScoresEntered(student: StudentRecord): boolean {
  return (
    student.subjects.length === 0 ||
    !student.subjects.some(
      (sub) =>
        sub.classScore > 0 ||
        sub.examScore > 0 ||
        (sub.savedDirectClassScore !== undefined && sub.savedDirectClassScore > 0) ||
        Boolean(sub.classScoreComponents?.some((comp) => comp.score > 0)),
    )
  );
}

/**
 * Returns `true` when a student record is incomplete for report generation:
 * has no subjects, has fewer subjects than `settings.defaultSubjects.length` (when provided),
 * or is missing required scores (`examScore === 0` in `MOCK` mode; `classScore === 0 || examScore === 0`
 * in `TERMLY` mode).
 */
export function isStudentPending(
  student: StudentRecord,
  settings?: Pick<SchoolSettings, "defaultSubjects"> & Partial<Pick<SchoolSettings, "examType">>,
): boolean {
  const expectedCount = settings?.defaultSubjects?.length ?? 0;
  if (student.subjects.length === 0) return true;
  if (expectedCount > 0 && student.subjects.length < expectedCount) return true;
  const isMockExam = settings?.examType === "MOCK";
  return student.subjects.some((sub) =>
    isMockExam ? sub.examScore === 0 : sub.classScore === 0 || sub.examScore === 0,
  );
}

/**
 * Returns `true` when a student is still pending (`isStudentPending`) but already has at least
 * one non-zero class or exam score entered (`!hasNoScoresEntered`).
 */
export function hasPartialScores(
  student: StudentRecord,
  settings?: Pick<SchoolSettings, "defaultSubjects"> & Partial<Pick<SchoolSettings, "examType">>,
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
  settings?: Pick<SchoolSettings, "defaultSubjects"> & Partial<Pick<SchoolSettings, "examType">>,
): boolean {
  return !isStudentPending(student, settings) && student.averageScore < 50;
}

/**
 * Summarizes subject score progress:
 * - `scored`: subjects with any non-zero score (`getSubjectScoreStatus !== "unscored"`)
 * - `completed`: subjects satisfying all required inputs (`getSubjectScoreStatus === "complete"`)
 * - `total`: total number of enrolled subjects on the record
 */
export function getScoredSubjectCounts(
  student: StudentRecord,
  isMockExam = false,
): {
  scored: number;
  completed: number;
  total: number;
} {
  const total = student.subjects.length;
  let scored = 0;
  let completed = 0;

  for (const sub of student.subjects) {
    const status = getSubjectScoreStatus(sub, isMockExam);
    if (status !== "unscored") scored += 1;
    if (status === "complete") completed += 1;
  }

  return { scored, completed, total };
}

/**
 * Returns the original `students` array reference when `sortBy === "DEFAULT"`;
 * otherwise returns a newly sorted copy using alphabetical tie-breaking on `name`.
 */
export function sortStudents(
  students: ProcessedStudent[],
  sortBy: StudentSortOption,
  settings?: Pick<SchoolSettings, "defaultSubjects"> & Partial<Pick<SchoolSettings, "examType">>,
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
