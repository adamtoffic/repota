import type { SchoolSettings, StudentRecord } from "../types";
import { processStudent } from "./gradeCalculator";
import {
  generateTeacherRemark,
  getRandomConductTrait,
  getRandomInterest,
} from "./remarkGenerator";

/**
 * Populates unique varied `teacherRemark` strings and fallback `conduct` / `interest` values
 * across `students` without mutating inputs, optionally reporting incremental progress.
 */
export function applyAutoRemarksToStudents(
  students: StudentRecord[],
  settings: SchoolSettings,
  onProgress?: (current: number, total: number) => void,
): StudentRecord[] {
  const usedTeacherRemarks: string[] = [];
  const total = students.length;

  return students.map((student, index) => {
    const processed = processStudent(student, settings.level);

    const teacherRemark = generateTeacherRemark(
      processed,
      student.attendancePresent ?? 0,
      settings.totalAttendanceDays ?? 0,
      settings.level,
      usedTeacherRemarks,
    );
    usedTeacherRemarks.push(teacherRemark);

    const conduct = student.conduct || getRandomConductTrait();
    const interest = student.interest || getRandomInterest();

    if (onProgress) {
      queueMicrotask(() => onProgress(index + 1, total));
    }

    return {
      ...student,
      teacherRemark,
      conduct,
      interest,
    };
  });
}
