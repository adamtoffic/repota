import type {
  AssessmentCategory,
  ClassScoreComponent,
  ClassScoreComponentConfig,
  SchoolSettings,
  StudentRecord,
} from "../types";

export interface SbaPreset {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  tasks: ClassScoreComponentConfig[];
}

export interface WeightPreset {
  id: string;
  label: string;
  subtitle: string;
  classScoreMax: number;
  examScoreMax: number;
}

/**
 * Standard Ghanaian continuous-assessment task presets (GES / NaCCA).
 */
export const SBA_PRESETS: readonly SbaPreset[] = [
  {
    id: "ges_standard_4",
    name: "GES Standard (4 Tasks · /60)",
    description: "Balanced termly SBA split across tests, group work, and project.",
    recommended: true,
    tasks: [
      { name: "CAT 1", maxScore: 15, category: "CAT" },
      { name: "Group Work", maxScore: 15, category: "GROUP" },
      { name: "CAT 2", maxScore: 15, category: "CAT" },
      { name: "Project Work", maxScore: 15, category: "PROJECT" },
    ],
  },
  {
    id: "quick_3",
    name: "Quick 3-Task (/50)",
    description: "Compact SBA set for class tests, homework, and a term project.",
    tasks: [
      { name: "Class Test", maxScore: 20, category: "CAT" },
      { name: "Classwork / Homework", maxScore: 10, category: "HOMEWORK" },
      { name: "Project", maxScore: 20, category: "PROJECT" },
    ],
  },
  {
    id: "simple_2",
    name: "Two Class Tests (/40)",
    description: "Lightweight continuous assessment using two class tests.",
    tasks: [
      { name: "Test 1", maxScore: 20, category: "CAT" },
      { name: "Test 2", maxScore: 20, category: "CAT" },
    ],
  },
];

/**
 * Standard GES class-vs-exam weight presets summing to 100.
 */
export const WEIGHT_PRESETS: readonly WeightPreset[] = [
  {
    id: "50_50",
    label: "50 / 50",
    subtitle: "NaCCA / Primary & JHS",
    classScoreMax: 50,
    examScoreMax: 50,
  },
  {
    id: "30_70",
    label: "30 / 70",
    subtitle: "GES / SHS Standard",
    classScoreMax: 30,
    examScoreMax: 70,
  },
  {
    id: "40_60",
    label: "40 / 60",
    subtitle: "Balanced Split",
    classScoreMax: 40,
    examScoreMax: 60,
  },
];

/**
 * Normalizes an SBA task name for case-insensitive trimmed comparisons.
 */
export function normalizeTaskKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Derives a deduplicated `componentLibrary` strictly from active assignments in
 * `subjectComponentMap`, preventing orphaned library entries after edits or deletions.
 * Optionally backfills missing `category` metadata from `fallbackLibrary`.
 */
export function deriveLibraryFromSubjectMap(
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>,
  fallbackLibrary?: ClassScoreComponentConfig[],
): ClassScoreComponentConfig[] {
  const fallbackCategoryByKey = new Map<string, AssessmentCategory>();
  for (const item of fallbackLibrary ?? []) {
    if (item.category) {
      fallbackCategoryByKey.set(normalizeTaskKey(item.name), item.category);
    }
  }

  const seen = new Set<string>();
  const derived: ClassScoreComponentConfig[] = [];

  for (const tasks of Object.values(subjectComponentMap)) {
    for (const task of tasks) {
      const key = normalizeTaskKey(task.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const category = task.category ?? fallbackCategoryByKey.get(key);
      derived.push({
        name: task.name,
        maxScore: task.maxScore,
        ...(category !== undefined ? { category } : {}),
      });
    }
  }

  return derived;
}

/**
 * Checks whether every subject in `defaultSubjects` shares the exact same ordered SBA task list.
 */
export function areSubjectsUsingUniformTasks(
  defaultSubjects: string[],
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]> = {},
): { isUniform: boolean; sharedTasks: ClassScoreComponentConfig[] } {
  if (defaultSubjects.length === 0) {
    return { isUniform: true, sharedTasks: [] };
  }

  const baseline = subjectComponentMap[defaultSubjects[0]] ?? [];

  for (let i = 1; i < defaultSubjects.length; i++) {
    const current = subjectComponentMap[defaultSubjects[i]] ?? [];
    if (current.length !== baseline.length) {
      return { isUniform: false, sharedTasks: [] };
    }
    for (let j = 0; j < baseline.length; j++) {
      const a = baseline[j];
      const b = current[j];
      if (
        normalizeTaskKey(a.name) !== normalizeTaskKey(b.name) ||
        a.maxScore !== b.maxScore ||
        a.category !== b.category
      ) {
        return { isUniform: false, sharedTasks: [] };
      }
    }
  }

  return {
    isUniform: true,
    sharedTasks: baseline.map((task) => ({ ...task })),
  };
}

export interface ReconcileSbaOptions {
  /** Maps old task names to new task names so renames preserve existing student scores. */
  renamedTasks?: Record<string, string>;
  /** Controls whether clearing all SBA tasks on a subject preserves its `classScore` (`"preserve_class_score"`, default) or resets it to `0`. */
  onClearTasks?: "preserve_class_score" | "zero";
}

/**
 * Reconciles every student's `subjects[].classScoreComponents` and weighted `classScore`
 * against `settings.subjectComponentMap` and `settings.classScoreMax`.
 *
 * - Leaves students untouched when `settings.examType === "MOCK"` so SBA data survives Mock toggles.
 * - Tracks modifications strictly per-subject so untouched subjects keep their values and references.
 * - Propagates `category` updates and clamps existing scores to updated `maxScore` bounds.
 */
export function reconcileStudentsWithSbaConfig(
  students: StudentRecord[],
  settings: Pick<SchoolSettings, "examType" | "classScoreMax" | "subjectComponentMap">,
  options?: ReconcileSbaOptions,
): { students: StudentRecord[]; modifiedStudentCount: number } {
  if (settings.examType === "MOCK") {
    return { students, modifiedStudentCount: 0 };
  }

  const subjectComponentMap = settings.subjectComponentMap ?? {};
  const onClearTasks = options?.onClearTasks ?? "preserve_class_score";

  const oldKeysByNewKey = new Map<string, string[]>();
  for (const [oldName, newName] of Object.entries(options?.renamedTasks ?? {})) {
    const oldKey = normalizeTaskKey(oldName);
    const newKey = normalizeTaskKey(newName);
    if (!oldKey || !newKey) continue;
    const list = oldKeysByNewKey.get(newKey) ?? [];
    list.push(oldKey);
    oldKeysByNewKey.set(newKey, list);
  }

  let modifiedStudentCount = 0;

  const updatedStudents = students.map((student) => {
    let studentModified = false;

    const updatedSubjects = student.subjects.map((subject) => {
      const settingsComponents = subjectComponentMap[subject.name] ?? [];
      const currentComponents = subject.classScoreComponents ?? [];

      if (settingsComponents.length === 0) {
        if (currentComponents.length > 0) {
          studentModified = true;
          return {
            ...subject,
            classScoreComponents: undefined,
            classScore: onClearTasks === "zero" ? 0 : subject.classScore,
          };
        }
        return subject;
      }

      let subjectModified = currentComponents.length !== settingsComponents.length;
      const consumedIndices = new Set<number>();

      const findExistingIndex = (config: ClassScoreComponentConfig): number => {
        const targetKey = normalizeTaskKey(config.name);
        const directIdx = currentComponents.findIndex(
          (c, idx) => !consumedIndices.has(idx) && normalizeTaskKey(c.name) === targetKey,
        );
        if (directIdx !== -1) return directIdx;

        const oldKeys = oldKeysByNewKey.get(targetKey) ?? [];
        for (const oldKey of oldKeys) {
          const renamedIdx = currentComponents.findIndex(
            (c, idx) => !consumedIndices.has(idx) && normalizeTaskKey(c.name) === oldKey,
          );
          if (renamedIdx !== -1) return renamedIdx;
        }

        return -1;
      };

      const syncedComponents: ClassScoreComponent[] = settingsComponents.map((config, orderIdx) => {
        const existingIdx = findExistingIndex(config);
        if (existingIdx !== -1) {
          consumedIndices.add(existingIdx);
          const existing = currentComponents[existingIdx];
          const clampedScore = Math.min(Math.max(existing.score, 0), config.maxScore);
          const nextCategory = config.category ?? existing.category;

          if (
            existingIdx !== orderIdx ||
            existing.name !== config.name ||
            existing.maxScore !== config.maxScore ||
            existing.score !== clampedScore ||
            existing.category !== nextCategory
          ) {
            subjectModified = true;
          }

          return {
            ...existing,
            name: config.name,
            maxScore: config.maxScore,
            score: clampedScore,
            ...(nextCategory !== undefined ? { category: nextCategory } : {}),
          };
        }

        subjectModified = true;
        return {
          id: crypto.randomUUID(),
          name: config.name,
          score: 0,
          maxScore: config.maxScore,
          ...(config.category !== undefined ? { category: config.category } : {}),
        };
      });

      const totalScore = syncedComponents.reduce((sum, comp) => sum + comp.score, 0);
      const totalMax = syncedComponents.reduce((sum, comp) => sum + comp.maxScore, 0);
      const percentage = totalMax > 0 ? totalScore / totalMax : 0;
      const convertedClassScore = Math.round(percentage * settings.classScoreMax);

      if (subject.classScore !== convertedClassScore) {
        subjectModified = true;
      }

      if (!subjectModified) {
        return subject;
      }

      studentModified = true;
      return {
        ...subject,
        classScoreComponents: syncedComponents,
        classScore: convertedClassScore,
      };
    });

    if (!studentModified) {
      return student;
    }

    modifiedStudentCount++;
    return {
      ...student,
      subjects: updatedSubjects,
    };
  });

  return { students: updatedStudents, modifiedStudentCount };
}

export type SbaTaskChangeImpact =
  | { type: "delete_task"; taskName: string }
  | { type: "shrink_max"; taskName: string; newMaxScore: number }
  | { type: "replace_all"; nextTasks: ClassScoreComponentConfig[] }
  | { type: "clear_tasks" };

/**
 * Counts how many students and individual recorded component scores (`score > 0`)
 * would be deleted or clamped by a proposed SBA task edit across `subjectNames`.
 */
export function impactOfSbaTaskChange(
  students: StudentRecord[],
  subjectNames: string[],
  change: SbaTaskChangeImpact,
): { affectedStudentCount: number; affectedScoreCount: number } {
  const subjectSet = new Set(subjectNames);
  let affectedStudentCount = 0;
  let affectedScoreCount = 0;

  const nextTaskMap =
    change.type === "replace_all"
      ? new Map(change.nextTasks.map((t) => [normalizeTaskKey(t.name), t]))
      : null;

  for (const student of students) {
    let studentAffected = false;

    for (const sub of student.subjects) {
      if (!subjectSet.has(sub.name)) continue;
      const components = sub.classScoreComponents ?? [];
      if (components.length === 0) continue;

      if (change.type === "delete_task") {
        const targetKey = normalizeTaskKey(change.taskName);
        for (const comp of components) {
          if (normalizeTaskKey(comp.name) === targetKey && comp.score > 0) {
            affectedScoreCount++;
            studentAffected = true;
          }
        }
      } else if (change.type === "shrink_max") {
        const targetKey = normalizeTaskKey(change.taskName);
        for (const comp of components) {
          if (normalizeTaskKey(comp.name) === targetKey && comp.score > change.newMaxScore) {
            affectedScoreCount++;
            studentAffected = true;
          }
        }
      } else if (change.type === "replace_all" && nextTaskMap) {
        for (const comp of components) {
          if (comp.score <= 0) continue;
          const next = nextTaskMap.get(normalizeTaskKey(comp.name));
          if (!next || comp.score > next.maxScore) {
            affectedScoreCount++;
            studentAffected = true;
          }
        }
      } else if (change.type === "clear_tasks") {
        for (const comp of components) {
          if (comp.score > 0) {
            affectedScoreCount++;
            studentAffected = true;
          }
        }
      }
    }

    if (studentAffected) {
      affectedStudentCount++;
    }
  }

  return { affectedStudentCount, affectedScoreCount };
}

/**
 * Counts students with existing scores affected when changing `(prevClassMax, prevExamMax)`
 * to `(nextClassMax, nextExamMax)`.
 */
export function countAffectedStudentsForWeightChange(
  students: StudentRecord[],
  prevClassMax: number,
  prevExamMax: number,
  nextClassMax: number,
  nextExamMax: number,
): number {
  const classChanged = prevClassMax !== nextClassMax;
  const examChanged = prevExamMax !== nextExamMax;
  if (!classChanged && !examChanged) return 0;

  let affected = 0;
  for (const student of students) {
    let studentAffected = false;
    for (const sub of student.subjects) {
      if (examChanged && sub.examScore > 0) {
        studentAffected = true;
        break;
      }
      if (classChanged) {
        const hasComps = Boolean(sub.classScoreComponents && sub.classScoreComponents.length > 0);
        if (!hasComps && sub.classScore > 0) {
          studentAffected = true;
          break;
        }
        if (hasComps && sub.classScoreComponents) {
          const totalActual = sub.classScoreComponents.reduce((sum, c) => sum + c.score, 0);
          const totalMax = sub.classScoreComponents.reduce((sum, c) => sum + c.maxScore, 0);
          const nextScaled =
            nextClassMax > 0 && totalMax > 0 ? Math.round((totalActual / totalMax) * nextClassMax) : 0;
          if (sub.classScore !== nextScaled) {
            studentAffected = true;
            break;
          }
        }
      }
    }
    if (studentAffected) affected++;
  }

  return affected;
}

/**
 * Updates stored weighted `classScore` and `examScore` values when grading weights change.
 *
 * - SBA-tracked subjects always recompute `classScore` losslessly from raw `classScoreComponents`
 *   while leaving component arrays intact (even when `nextClassMax === 0` in Mock mode).
 * - Direct class scores and weighted exam scores either scale proportionally (`"rescale"`)
 *   or cap at the new maxima (`"clamp"`).
 */
export function rescaleStudentsForWeightChange(
  students: StudentRecord[],
  prevClassMax: number,
  prevExamMax: number,
  nextClassMax: number,
  nextExamMax: number,
  mode: "rescale" | "clamp",
): StudentRecord[] {
  const classChanged = prevClassMax !== nextClassMax;
  const examChanged = prevExamMax !== nextExamMax;
  if (!classChanged && !examChanged) return students;

  return students.map((student) => {
    let studentModified = false;

    const updatedSubjects = student.subjects.map((sub) => {
      let nextClassScore = sub.classScore;
      let nextExamScore = sub.examScore;

      if (classChanged) {
        if (sub.classScoreComponents && sub.classScoreComponents.length > 0) {
          const totalActual = sub.classScoreComponents.reduce((sum, c) => sum + c.score, 0);
          const totalMax = sub.classScoreComponents.reduce((sum, c) => sum + c.maxScore, 0);
          nextClassScore =
            nextClassMax > 0 && totalMax > 0 ? Math.round((totalActual / totalMax) * nextClassMax) : 0;
        } else if (mode === "rescale" && prevClassMax > 0) {
          nextClassScore = Math.min(
            nextClassMax,
            Math.max(0, Math.round((sub.classScore / prevClassMax) * nextClassMax)),
          );
        } else {
          nextClassScore = Math.min(Math.max(sub.classScore, 0), nextClassMax);
        }
      }

      if (examChanged) {
        if (mode === "rescale" && prevExamMax > 0 && nextExamMax > 0) {
          nextExamScore = Math.min(
            nextExamMax,
            Math.max(0, Math.round((sub.examScore / prevExamMax) * nextExamMax)),
          );
        } else {
          nextExamScore = Math.min(Math.max(sub.examScore, 0), nextExamMax);
        }
      }

      if (nextClassScore === sub.classScore && nextExamScore === sub.examScore) {
        return sub;
      }

      studentModified = true;
      return {
        ...sub,
        classScore: nextClassScore,
        examScore: nextExamScore,
      };
    });

    return studentModified ? { ...student, subjects: updatedSubjects } : student;
  });
}

export interface SbaPaceStats {
  totalTasks: number;
  gradedTasks: number;
  rawSum: number;
  rawMax: number;
  gradedMax: number;
  scaledClassScore: number;
  /** Average percentage across only graded tasks (`score > 0`), or `null` when no tasks have been graded yet. */
  pacePercent: number | null;
  /** `true` when at least one task is graded (`> 0`) and at least one configured task remains ungraded (`0`). */
  isPartialMidTerm: boolean;
}

/**
 * Computes mid-term SBA completion and pace metrics alongside the final proportional `scaledClassScore`.
 */
export function calculateSbaPaceStats(
  components: ClassScoreComponent[],
  maxClassScore: number,
): SbaPaceStats {
  const totalTasks = components.length;
  let gradedTasks = 0;
  let rawSum = 0;
  let rawMax = 0;
  let gradedMax = 0;

  for (const comp of components) {
    rawSum += comp.score;
    rawMax += comp.maxScore;
    if (comp.score > 0) {
      gradedTasks += 1;
      gradedMax += comp.maxScore;
    }
  }

  const scaledClassScore = rawMax > 0 ? Math.round((rawSum / rawMax) * maxClassScore) : 0;
  const pacePercent = gradedMax > 0 ? Math.round((rawSum / gradedMax) * 100) : null;
  const isPartialMidTerm = gradedTasks > 0 && gradedTasks < totalTasks;

  return {
    totalTasks,
    gradedTasks,
    rawSum,
    rawMax,
    gradedMax,
    scaledClassScore,
    pacePercent,
    isPartialMidTerm,
  };
}

/**
 * Returns `true` when a student is missing `activeSubject` or has any configured SBA task ungraded (`0`).
 */
export function isStudentUnscoredForSba(
  student: Pick<StudentRecord, "subjects">,
  activeSubject: string,
  tasks: ClassScoreComponentConfig[],
): boolean {
  const subject = student.subjects.find((s) => s.name === activeSubject);
  if (!subject) return true;
  if (tasks.length === 0) return subject.classScore <= 0;
  return tasks.some((task) => {
    const targetKey = normalizeTaskKey(task.name);
    const comp = subject.classScoreComponents?.find(
      (c) => normalizeTaskKey(c.name) === targetKey,
    );
    return !comp || comp.score <= 0;
  });
}
