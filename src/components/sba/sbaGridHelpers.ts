import type {
  ClassScoreComponent,
  ClassScoreComponentConfig,
  ProcessedStudent,
  SavedSubject,
} from "../../types";
import { normalizeTaskKey } from "../../utils/sbaReconciliation";
import { updateComponentAndRecalculateClassScore } from "../../utils/scoreConversion";

export function getMatchedComponent(
  subject: SavedSubject | undefined,
  taskName: string,
): ClassScoreComponent | undefined {
  if (!subject?.classScoreComponents) return undefined;
  const targetKey = normalizeTaskKey(taskName);
  return subject.classScoreComponents.find((c) => normalizeTaskKey(c.name) === targetKey);
}

/**
 * Aligns a student's saved SBA component array to the active task schema, clamping existing
 * scores to current task maxima and zero-filling missing tasks.
 */
export function buildBaselineComponents(
  existing: ClassScoreComponent[] | undefined,
  tasks: ClassScoreComponentConfig[],
  deterministicIdPrefix?: string,
): ClassScoreComponent[] {
  return tasks.map((task) => {
    const found = existing?.find(
      (c) => normalizeTaskKey(c.name) === normalizeTaskKey(task.name),
    );
    if (found) {
      return {
        ...found,
        name: task.name,
        maxScore: task.maxScore,
        score: Math.min(Math.max(found.score, 0), task.maxScore),
        category: task.category ?? found.category,
      };
    }
    return {
      id: deterministicIdPrefix ? `${deterministicIdPrefix}:${task.name}` : crypto.randomUUID(),
      name: task.name,
      score: 0,
      maxScore: task.maxScore,
      ...(task.category !== undefined ? { category: task.category } : {}),
    };
  });
}

export interface GridPasteResult {
  patches: Array<{ student: ProcessedStudent; updatedSubjects: SavedSubject[] }>;
  cellsUpdated: number;
  studentsUpdated: number;
  clampedCount: number;
}

/**
 * Parses a multi-cell spreadsheet paste (TSV/CSV grid) anchored at `(startStudentIdx, startTaskIdx)`
 * and computes per-student subject patches with clamped component scores and recalculated class totals.
 * Returns `null` for empty or single-cell pastes so native input paste continues unchanged.
 */
export function computeGridPastePatches({
  text,
  visibleStudents,
  startStudentIdx,
  startTaskIdx,
  activeSubject,
  tasks,
  maxClassScore,
}: {
  text: string;
  visibleStudents: ProcessedStudent[];
  startStudentIdx: number;
  startTaskIdx: number;
  activeSubject: string;
  tasks: ClassScoreComponentConfig[];
  maxClassScore: number;
}): GridPasteResult | null {
  if (!text || !/[\r\n\t]/.test(text)) return null;

  const pastedRows = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(/\t|,/));

  if (pastedRows.length === 0) return null;
  if (pastedRows.length === 1 && pastedRows[0].length <= 1) return null;

  let cellsUpdated = 0;
  let studentsUpdated = 0;
  let clampedCount = 0;
  const patches: Array<{ student: ProcessedStudent; updatedSubjects: SavedSubject[] }> = [];

  for (
    let rowOffset = 0;
    rowOffset < pastedRows.length && startStudentIdx + rowOffset < visibleStudents.length;
    rowOffset++
  ) {
    const student = visibleStudents[startStudentIdx + rowOffset];
    const sub = student.subjects.find((s) => s.name === activeSubject);
    if (!sub) continue;

    let workingComponents = buildBaselineComponents(sub.classScoreComponents, tasks);
    let nextClassScore = sub.classScore;
    let rowChanged = false;

    const rowCells = pastedRows[rowOffset];
    for (
      let colOffset = 0;
      colOffset < rowCells.length && startTaskIdx + colOffset < tasks.length;
      colOffset++
    ) {
      const rawCell = rowCells[colOffset].trim();
      if (!rawCell) continue;
      const numeric = Number(rawCell);
      if (!Number.isFinite(numeric)) continue;

      const targetTask = tasks[startTaskIdx + colOffset];
      const targetComp = workingComponents.find(
        (c) => normalizeTaskKey(c.name) === normalizeTaskKey(targetTask.name),
      );
      if (!targetComp) continue;

      const result = updateComponentAndRecalculateClassScore(
        workingComponents,
        targetComp.id,
        numeric,
        maxClassScore,
      );
      workingComponents = result.updatedComponents;
      nextClassScore = result.classScore;
      rowChanged = true;
      cellsUpdated++;
      if (result.wasClamped) {
        clampedCount++;
      }
    }

    if (rowChanged) {
      const updatedSubjects = student.subjects.map((item) =>
        item.id === sub.id
          ? { ...item, classScoreComponents: workingComponents, classScore: nextClassScore }
          : item,
      );
      patches.push({ student, updatedSubjects });
      studentsUpdated++;
    }
  }

  return { patches, cellsUpdated, studentsUpdated, clampedCount };
}
