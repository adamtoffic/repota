import type {
  ExamType,
  SavedSubject,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import {
  deriveLibraryFromSubjectMap,
  normalizeTaskKey,
  reconcileStudentsWithSbaConfig,
} from "../../utils/sbaReconciliation";

function clearStudentSubjectScores(student: StudentRecord): StudentRecord {
  return {
    ...student,
    subjects: student.subjects.map((sub) => ({
      ...sub,
      classScore: 0,
      examScore: 0,
      classScoreComponents: sub.classScoreComponents
        ? sub.classScoreComponents.map((comp) => ({
            ...comp,
            score: 0,
          }))
        : undefined,
    })),
  };
}

export function clearAllStudentScoresData(students: StudentRecord[]): StudentRecord[] {
  return students.map(clearStudentSubjectScores);
}

export function clearSingleStudentScoresData(
  students: StudentRecord[],
  id: string,
): StudentRecord[] {
  return students.map((student) =>
    student.id === id ? clearStudentSubjectScores(student) : student,
  );
}

export function filterActiveNonPendingStudents(students: StudentRecord[]): {
  activeStudents: StudentRecord[];
  removedCount: number;
} {
  const activeStudents = students.filter(
    (s) =>
      s.subjects.length > 0 && s.subjects.some((sub) => sub.classScore > 0 || sub.examScore > 0),
  );
  return {
    activeStudents,
    removedCount: students.length - activeStudents.length,
  };
}

export function removeAllPhotosFromStudents(students: StudentRecord[]): {
  nextStudents: StudentRecord[];
  removedCount: number;
} {
  let removedCount = 0;
  const nextStudents = students.map((student) => {
    if (!student.pictureUrl) return student;
    removedCount += 1;
    return { ...student, pictureUrl: undefined };
  });
  return { nextStudents, removedCount };
}

export function updateStudentsClassName(
  students: StudentRecord[],
  newClassName: string,
): StudentRecord[] {
  return students.map((s) => ({ ...s, className: newClassName }));
}

export function detectStudentComponentMismatches(
  students: StudentRecord[],
  settings: SchoolSettings,
): { hasOutdated: boolean; hasMissing: boolean } {
  const { subjectComponentMap, examType } = settings;
  if (examType === "MOCK") {
    return { hasOutdated: false, hasMissing: false };
  }

  const map = subjectComponentMap ?? {};
  let hasOutdated = false;
  let hasMissing = false;

  for (const student of students) {
    for (const subject of student.subjects) {
      const settingsComponents = map[subject.name] || [];
      const currentComponents = subject.classScoreComponents || [];

      if (settingsComponents.length > 0 && currentComponents.length === 0) {
        hasMissing = true;
      }

      for (const config of settingsComponents) {
        const existing = currentComponents.find(
          (c) => normalizeTaskKey(c.name) === normalizeTaskKey(config.name),
        );
        if (!existing) {
          hasMissing = true;
        } else if (
          existing.maxScore !== config.maxScore ||
          (config.category !== undefined && existing.category !== config.category)
        ) {
          hasOutdated = true;
        }
      }

      for (const current of currentComponents) {
        if (
          !settingsComponents.some(
            (config) => normalizeTaskKey(config.name) === normalizeTaskKey(current.name),
          )
        ) {
          hasOutdated = true;
        }
      }

      if (hasOutdated && hasMissing) {
        return { hasOutdated, hasMissing };
      }
    }
  }

  return { hasOutdated, hasMissing };
}

export function syncClassSubjectsAndSbaData(
  students: StudentRecord[],
  settings: SchoolSettings,
): {
  nextStudents: StudentRecord[];
  subjectsAddedCount: number;
  modifiedStudentCount: number;
} {
  const masterList = settings.defaultSubjects || [];
  let subjectsAddedCount = 0;

  const withAddedSubjects = students.map((student) => {
    const missing = masterList.filter(
      (name) => !student.subjects.some((sub) => sub.name === name),
    );
    if (missing.length === 0) return student;
    subjectsAddedCount += missing.length;
    const additions: SavedSubject[] = missing.map((name) => ({
      id: crypto.randomUUID(),
      name,
      classScore: 0,
      examScore: 0,
      ...(settings.examType !== "MOCK" && settings.subjectComponentMap?.[name]?.length
        ? {
            classScoreComponents: settings.subjectComponentMap[name].map((task) => ({
              id: crypto.randomUUID(),
              name: task.name,
              score: 0,
              maxScore: task.maxScore,
              category: task.category,
            })),
          }
        : {}),
    }));
    return { ...student, subjects: [...student.subjects, ...additions] };
  });

  const { students: reconciled, modifiedStudentCount } = reconcileStudentsWithSbaConfig(
    withAddedSubjects,
    settings,
    { onClearTasks: "preserve_class_score" },
  );

  return {
    nextStudents: reconciled,
    subjectsAddedCount,
    modifiedStudentCount,
  };
}

export function normalizeSbaConfigSettings(rawNext: SchoolSettings): SchoolSettings {
  const nextMap = rawNext.subjectComponentMap ?? {};
  return {
    ...rawNext,
    subjectComponentMap: nextMap,
    componentLibrary: deriveLibraryFromSubjectMap(nextMap, rawNext.componentLibrary),
  };
}

export function normalizeAssessmentWeightSettings(
  prevSettings: SchoolSettings,
  nextClassScoreMax: number,
  nextExamScoreMax: number,
  explicitExamType?: ExamType,
): {
  nextSettings: SchoolSettings;
  clampedClass: number;
  clampedExam: number;
  nextExamType: ExamType;
  shouldRescale: boolean;
} {
  const nextExamType = explicitExamType ?? prevSettings.examType ?? "TERMLY";
  const clampedClass =
    nextExamType === "MOCK"
      ? 0
      : Math.min(100, Math.max(0, Math.round(nextClassScoreMax)));
  const clampedExam =
    nextExamType === "MOCK"
      ? 100
      : Math.min(100, Math.max(0, Math.round(nextExamScoreMax)));

  const nextSettings: SchoolSettings = {
    ...prevSettings,
    examType: nextExamType,
    classScoreMax: clampedClass,
    examScoreMax: clampedExam,
  };

  const weightsChanged =
    prevSettings.classScoreMax !== clampedClass ||
    prevSettings.examScoreMax !== clampedExam;
  const shouldRescale = weightsChanged || prevSettings.examType !== nextExamType;

  return {
    nextSettings,
    clampedClass,
    clampedExam,
    nextExamType,
    shouldRescale,
  };
}
