import type {
  ClassScoreComponent,
  ClassScoreComponentConfig,
  SavedSubject,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import {
  buildDefaultSubjectsForStudent,
  normalizeComponentNameKey,
  parseSbaScoreImport,
  type NewSbaColumnOverride,
  type SbaConflictPolicy,
  type SbaImportMode,
} from "../../utils/csvImport";
import { deriveLibraryFromSubjectMap } from "../../utils/sbaReconciliation";
import { updateComponentAndRecalculateClassScore } from "../../utils/scoreConversion";

export type ParsedScoreImportResult = ReturnType<typeof parseSbaScoreImport>;
export type ParsedScoreImportRow = ParsedScoreImportResult["rows"][number];
export type DetectedNewScoreColumn = ParsedScoreImportResult["detectedNewColumns"][number];

export function resolveDetectedColumnOverride(
  col: DetectedNewScoreColumn,
  newColumnOverrides: Record<number, NewSbaColumnOverride>,
): NewSbaColumnOverride {
  return (
    newColumnOverrides[col.colIndex] ?? {
      enabled: true,
      name: col.suggestedName,
      maxScore: col.suggestedMaxScore,
      category: col.suggestedCategory,
    }
  );
}

/**
 * Merges a single parsed import row into an existing (or newly initialized) subject record,
 * preserving SBA components during exam-only imports and respecting conflict resolution policy.
 */
export function applyScoreRowToSubject({
  existingSubject,
  row,
  tasks,
  activeSubject,
  activeMode,
  conflictPolicy,
  classScoreMax,
}: {
  existingSubject: SavedSubject | undefined;
  row: ParsedScoreImportRow;
  tasks: ClassScoreComponentConfig[];
  activeSubject: string;
  activeMode: SbaImportMode;
  conflictPolicy: SbaConflictPolicy;
  classScoreMax: number;
}): SavedSubject {
  const baseSubject: SavedSubject = existingSubject ?? {
    id: crypto.randomUUID(),
    name: activeSubject,
    classScore: 0,
    examScore: 0,
  };

  const nextExamScore =
    row.examRawScore !== undefined ? row.examRawScore.weighted : baseSubject.examScore;
  const nextExamRawScore =
    row.examRawScore !== undefined
      ? nextExamScore > 0
        ? row.examRawScore.raw
        : undefined
      : baseSubject.examRawScore;

  const withExam = (target: SavedSubject): SavedSubject => {
    if (nextExamRawScore !== undefined) {
      target.examRawScore = nextExamRawScore;
    } else {
      delete target.examRawScore;
    }
    return target;
  };

  // Exam-only imports preserve existing SBA components & classScore untouched
  if (
    activeMode === "EXAM_ONLY" &&
    row.componentScores.length === 0 &&
    !row.directClassScore
  ) {
    return withExam({
      ...baseSubject,
      examScore: nextExamScore,
    });
  }

  let nextComponents: ClassScoreComponent[] | undefined = baseSubject.classScoreComponents
    ? baseSubject.classScoreComponents.map((c) => {
        const matchingConfig = tasks.find(
          (t) => normalizeComponentNameKey(t.name) === normalizeComponentNameKey(c.name),
        );
        return matchingConfig
          ? {
              ...c,
              maxScore: matchingConfig.maxScore,
              score: Math.min(c.score, matchingConfig.maxScore),
              category: matchingConfig.category ?? c.category,
            }
          : { ...c };
      })
    : tasks.length > 0
      ? tasks.map((t) => ({
          id: crypto.randomUUID(),
          name: t.name,
          score: 0,
          maxScore: t.maxScore,
          category: t.category,
        }))
      : row.componentScores.length > 0
        ? row.componentScores.map((c) => ({
            id: crypto.randomUUID(),
            name: c.name,
            score: 0,
            maxScore: c.maxScore,
            category: c.category,
          }))
        : undefined;

  if (nextComponents) {
    for (const task of tasks) {
      const taskKey = normalizeComponentNameKey(task.name);
      if (!nextComponents.some((c) => normalizeComponentNameKey(c.name) === taskKey)) {
        nextComponents.push({
          id: crypto.randomUUID(),
          name: task.name,
          score: 0,
          maxScore: task.maxScore,
          category: task.category,
        });
      }
    }
  }

  let nextClassScore = baseSubject.classScore;

  if (row.componentScores.length > 0 && nextComponents) {
    for (const compPatch of row.componentScores) {
      const patchKey = normalizeComponentNameKey(compPatch.name);
      let target = nextComponents.find((c) => normalizeComponentNameKey(c.name) === patchKey);
      if (!target) {
        target = {
          id: crypto.randomUUID(),
          name: compPatch.name,
          score: 0,
          maxScore: compPatch.maxScore,
          category: compPatch.category,
        };
        nextComponents.push(target);
      }

      const shouldKeepExisting =
        conflictPolicy === "KEEP_EXISTING" &&
        compPatch.existingScore !== undefined &&
        compPatch.existingScore > 0;
      const scoreToApply = shouldKeepExisting ? compPatch.existingScore! : compPatch.score;

      const res = updateComponentAndRecalculateClassScore(
        nextComponents,
        target.id,
        scoreToApply,
        classScoreMax,
      );
      nextComponents = res.updatedComponents;
      nextClassScore = res.classScore;
    }
  } else if (row.directClassScore) {
    const shouldKeepExisting =
      conflictPolicy === "KEEP_EXISTING" &&
      row.directClassScore.existingScore !== undefined &&
      row.directClassScore.existingScore > 0;
    nextClassScore = shouldKeepExisting
      ? row.directClassScore.existingScore!
      : row.directClassScore.score;
  }

  return withExam({
    ...baseSubject,
    classScore: nextClassScore,
    examScore: nextExamScore,
    ...(nextComponents ? { classScoreComponents: nextComponents } : {}),
  });
}

/**
 * Builds the full atomic import plan (settings schema additions, updated student records,
 * newly created student records, and zero-filled SBA component additions for untouched students).
 */
export function buildScoreImportPlan({
  parsedResult,
  activeSubject,
  activeMode,
  activeSingleTask,
  activeTasks,
  students,
  settings,
  newColumnOverrides,
  createUnmatched,
  conflictPolicy,
}: {
  parsedResult: ParsedScoreImportResult;
  activeSubject: string;
  activeMode: SbaImportMode;
  activeSingleTask: ClassScoreComponentConfig | undefined;
  activeTasks: ClassScoreComponentConfig[];
  students: StudentRecord[];
  settings: SchoolSettings;
  newColumnOverrides: Record<number, NewSbaColumnOverride>;
  createUnmatched: boolean;
  conflictPolicy: SbaConflictPolicy;
}): {
  enabledNewTasks: ClassScoreComponentConfig[];
  nextSettings: SchoolSettings | null;
  updatedRecords: Map<string, StudentRecord>;
  newRecords: StudentRecord[];
  updatedCount: number;
  createdCount: number;
} {
  // 1. Collect newly created SBA tasks (either auto-detected in FULL_SUBJECT or explicit in SINGLE_COMPONENT)
  const enabledNewTasks: ClassScoreComponentConfig[] = parsedResult.detectedNewColumns
    .map((col) => resolveDetectedColumnOverride(col, newColumnOverrides))
    .filter((ov) => ov.enabled && ov.name.trim().length > 0)
    .map((ov) => ({
      name: ov.name.trim(),
      maxScore: Math.min(100, Math.max(1, ov.maxScore)),
      category: ov.category,
    }));

  if (
    activeMode === "SINGLE_COMPONENT" &&
    activeSingleTask &&
    !activeTasks.some(
      (t) => normalizeComponentNameKey(t.name) === normalizeComponentNameKey(activeSingleTask.name),
    )
  ) {
    enabledNewTasks.push(activeSingleTask);
  }

  const mergedTasksForCreation = [...activeTasks];
  for (const t of enabledNewTasks) {
    const tKey = normalizeComponentNameKey(t.name);
    if (!mergedTasksForCreation.some((e) => normalizeComponentNameKey(e.name) === tKey)) {
      mergedTasksForCreation.push(t);
    }
  }

  let effectiveSettings = settings;
  let nextSettings: SchoolSettings | null = null;
  if (enabledNewTasks.length > 0) {
    const currentMap = settings.subjectComponentMap ?? {};
    const currentSubTasks = currentMap[activeSubject] ?? [];
    const nextSubTasks = [...currentSubTasks];
    for (const task of mergedTasksForCreation) {
      const taskKey = normalizeComponentNameKey(task.name);
      if (!nextSubTasks.some((t) => normalizeComponentNameKey(t.name) === taskKey)) {
        nextSubTasks.push(task);
      }
    }

    const nextMap = {
      ...currentMap,
      [activeSubject]: nextSubTasks,
    };

    effectiveSettings = {
      ...settings,
      componentLibrary: deriveLibraryFromSubjectMap(nextMap, settings.componentLibrary),
      subjectComponentMap: nextMap,
    };
    nextSettings = effectiveSettings;
  }

  // 2. Collect matched updates & new students, plus new-task sync patches, before committing atomically
  const studentMap = new Map<string, StudentRecord>(students.map((s) => [s.id, s]));
  const updatedRecords = new Map<string, StudentRecord>();
  const newRecords: StudentRecord[] = [];
  const touchedStudentIds = new Set<string>();
  let updatedCount = 0;
  let createdCount = 0;

  parsedResult.rows.forEach((row, idx) => {
    if (row.matchedStudentId && studentMap.has(row.matchedStudentId)) {
      const student = studentMap.get(row.matchedStudentId)!;
      const existingSub = student.subjects.find(
        (s) => s.name.trim().toLowerCase() === activeSubject.trim().toLowerCase(),
      );
      const updatedSub = applyScoreRowToSubject({
        existingSubject: existingSub,
        row,
        tasks: mergedTasksForCreation,
        activeSubject,
        activeMode,
        conflictPolicy,
        classScoreMax: settings.classScoreMax,
      });
      const nextSubjects = existingSub
        ? student.subjects.map((s) =>
            s === existingSub || (existingSub.id && s.id === existingSub.id) ? updatedSub : s,
          )
        : [...student.subjects, updatedSub];

      const nextRecord: StudentRecord = { ...student, subjects: nextSubjects };
      studentMap.set(student.id, nextRecord);
      touchedStudentIds.add(student.id);
      updatedRecords.set(student.id, nextRecord);
      updatedCount++;
      return;
    }

    if (createUnmatched && row.isNewStudent) {
      const defaultSubs = buildDefaultSubjectsForStudent(effectiveSettings);
      const targetExisting = defaultSubs.find(
        (s) => s.name.trim().toLowerCase() === activeSubject.trim().toLowerCase(),
      );
      const updatedSub = applyScoreRowToSubject({
        existingSubject: targetExisting,
        row,
        tasks: mergedTasksForCreation,
        activeSubject,
        activeMode,
        conflictPolicy,
        classScoreMax: settings.classScoreMax,
      });
      const nextSubjects = targetExisting
        ? defaultSubs.map((s) => (s.id === targetExisting.id ? updatedSub : s))
        : [...defaultSubs, updatedSub];

      const newStudent: StudentRecord = {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        name: row.studentName,
        gender: "Male",
        className: effectiveSettings.className || "Class",
        subjects: nextSubjects,
        attendancePresent: 0,
      };
      newRecords.push(newStudent);
      createdCount++;
    }
  });

  // 3. Keep remaining existing students synced with active + newly created SBA tasks (score: 0)
  if (enabledNewTasks.length > 0 && updatedCount + createdCount > 0) {
    students.forEach((student) => {
      if (touchedStudentIds.has(student.id)) return;
      const existingSub = student.subjects.find(
        (s) => s.name.trim().toLowerCase() === activeSubject.trim().toLowerCase(),
      );
      if (!existingSub) return;

      const existingComps = existingSub.classScoreComponents ?? [];
      const additions = mergedTasksForCreation
        .filter(
          (t) =>
            !existingComps.some(
              (c) => normalizeComponentNameKey(c.name) === normalizeComponentNameKey(t.name),
            ),
        )
        .map((t) => ({
          id: crypto.randomUUID(),
          name: t.name,
          score: 0,
          maxScore: t.maxScore,
          category: t.category,
        }));
      if (additions.length === 0) return;

      const nextComps = [...existingComps, ...additions];
      const totalActual = nextComps.reduce((sum, c) => sum + c.score, 0);
      const totalMax = nextComps.reduce((sum, c) => sum + c.maxScore, 0);
      const nextClassScore =
        totalMax > 0 ? Math.round((totalActual / totalMax) * settings.classScoreMax) : 0;

      updatedRecords.set(student.id, {
        ...student,
        subjects: student.subjects.map((s) =>
          s === existingSub || (existingSub.id && s.id === existingSub.id)
            ? { ...s, classScoreComponents: nextComps, classScore: nextClassScore }
            : s,
        ),
      });
    });
  }

  return {
    enabledNewTasks,
    nextSettings,
    updatedRecords,
    newRecords,
    updatedCount,
    createdCount,
  };
}
