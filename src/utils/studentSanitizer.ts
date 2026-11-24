import type {
  ProcessedStudent,
  ProcessedSubject,
  SavedSubject,
  StudentRecord,
} from "../types";

function stripSubjectDerivedFields(subject: SavedSubject | ProcessedSubject): SavedSubject {
  const cleaned = { ...(subject as SavedSubject & Record<string, unknown>) };
  delete cleaned.totalScore;
  delete cleaned.grade;
  delete cleaned.remark;
  delete cleaned.subjectPosition;
  return cleaned as SavedSubject;
}

/**
 * Strips runtime-derived `ProcessedStudent` / `ProcessedSubject` fields and defunct
 * legacy remark keys so only persisted `StudentRecord` state is kept in storage.
 */
export function stripDerivedStudentFields(
  student: StudentRecord | ProcessedStudent,
): StudentRecord {
  const cleaned = { ...(student as StudentRecord & Record<string, unknown>) };
  delete cleaned.age;
  delete cleaned.averageScore;
  delete cleaned.totalScore;
  delete cleaned.classPosition;
  delete cleaned.aggregate;
  delete cleaned.headMasterRemark;
  delete cleaned.attendanceRemark;
  return {
    ...(cleaned as StudentRecord),
    subjects: (student.subjects || []).map(stripSubjectDerivedFields),
  };
}
