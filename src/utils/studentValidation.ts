import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";

export type DashboardFilter =
  | "ALL"
  | "PENDING"
  | "NO_SCORES"
  | "PARTIAL_SCORES"
  | "MISSING_PHOTOS"
  | "FAILING";

export function hasNoScoresEntered(student: StudentRecord): boolean {
  return (
    student.subjects.length === 0 ||
    !student.subjects.some((sub) => sub.classScore > 0 || sub.examScore > 0)
  );
}

export function isStudentPending(
  student: StudentRecord,
  settings?: Pick<SchoolSettings, "defaultSubjects">,
): boolean {
  const expectedCount = settings?.defaultSubjects?.length ?? 0;
  if (student.subjects.length === 0) return true;
  if (expectedCount > 0 && student.subjects.length < expectedCount) return true;
  return student.subjects.some((sub) => sub.classScore === 0 || sub.examScore === 0);
}

export function hasPartialScores(
  student: StudentRecord,
  settings?: Pick<SchoolSettings, "defaultSubjects">,
): boolean {
  return isStudentPending(student, settings) && !hasNoScoresEntered(student);
}

export function hasMissingPhoto(student: StudentRecord): boolean {
  return !student.pictureUrl;
}

export function isStudentFailing(
  student: ProcessedStudent,
  settings?: Pick<SchoolSettings, "defaultSubjects">,
): boolean {
  return !isStudentPending(student, settings) && student.averageScore < 50;
}

export function getScoredSubjectCounts(student: StudentRecord): {
  scored: number;
  completed: number;
  total: number;
} {
  const total = student.subjects.length;
  const scored = student.subjects.filter(
    (sub) => sub.classScore > 0 || sub.examScore > 0,
  ).length;
  const completed = student.subjects.filter(
    (sub) => sub.classScore > 0 && sub.examScore > 0,
  ).length;
  return { scored, completed, total };
}
