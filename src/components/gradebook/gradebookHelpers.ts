import type {
  ClassScoreComponentConfig,
  ProcessedStudent,
  SavedSubject,
} from "../../types";
import { parseOptionalNumber } from "../../utils/csv/tabularParser";
import { normalizeTaskKey } from "../../utils/sbaReconciliation";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  resolveExamRawScore,
  updateComponentAndRecalculateClassScore,
} from "../../utils/scoreConversion";

export type FocusColumn = "CLASS_EXAM" | "CLASS_ONLY" | "EXAM_ONLY" | `COMP:${string}`;

export interface OrderSnapshot {
  key: string;
  ids: string[];
  knownRosterIds: Set<string>;
}

/**
 * Keeps frozen student row IDs synced with the active filter session key while appending
 * newly added students without re-sorting mid-entry.
 */
export function syncOrderSnapshot(
  current: OrderSnapshot,
  nextKey: string,
  nextStudents: ProcessedStudent[],
  rosterStudents: ProcessedStudent[],
): OrderSnapshot | null {
  if (current.key !== nextKey) {
    return {
      key: nextKey,
      ids: nextStudents.map((student) => student.id),
      knownRosterIds: new Set(rosterStudents.map((student) => student.id)),
    };
  }

  const unseenIds = new Set<string>();
  for (const student of rosterStudents) {
    if (!current.knownRosterIds.has(student.id)) {
      unseenIds.add(student.id);
    }
  }
  if (unseenIds.size === 0) return null;

  const newlyMatchingIds = nextStudents
    .filter((student) => unseenIds.has(student.id))
    .map((student) => student.id);
  const nextKnown = new Set(current.knownRosterIds);
  unseenIds.forEach((id) => nextKnown.add(id));

  return {
    key: nextKey,
    ids: [...current.ids, ...newlyMatchingIds],
    knownRosterIds: nextKnown,
  };
}

export function resolveStudentsFromSnapshot(
  ids: string[],
  rosterById: Map<string, ProcessedStudent>,
): ProcessedStudent[] {
  const resolved: ProcessedStudent[] = [];
  for (const id of ids) {
    const latest = rosterById.get(id);
    if (latest) resolved.push(latest);
  }
  return resolved;
}

export function isStudentUnscoredInGradebook(
  student: ProcessedStudent,
  activeSubject: string,
  activeFocusColumn: FocusColumn,
  isMockExam: boolean,
): boolean {
  const sub = student.subjects.find((s) => s.name === activeSubject);
  if (!sub) return true;
  if (activeFocusColumn.startsWith("COMP:")) {
    const compKey = normalizeTaskKey(activeFocusColumn.slice("COMP:".length));
    const comp = sub.classScoreComponents?.find((c) => normalizeTaskKey(c.name) === compKey);
    return !comp || comp.score === 0;
  }
  if (isMockExam || activeFocusColumn === "EXAM_ONLY") {
    return sub.examScore === 0;
  }
  if (activeFocusColumn === "CLASS_ONLY") {
    return sub.classScore === 0;
  }
  return sub.classScore === 0 || sub.examScore === 0;
}

export function computeGradebookColumnStats({
  sessionStudents,
  activeSubject,
  activeTaskConfig,
  activeFocusColumn,
  isMockExam,
  maxClassScore,
  maxExamScore,
}: {
  sessionStudents: ProcessedStudent[];
  activeSubject: string;
  activeTaskConfig: ClassScoreComponentConfig | undefined;
  activeFocusColumn: FocusColumn;
  isMockExam: boolean;
  maxClassScore: number;
  maxExamScore: number;
}): { scored: number; avgLabel: string } {
  if (!activeSubject || sessionStudents.length === 0) return { scored: 0, avgLabel: "" };
  if (activeTaskConfig) {
    const scores: number[] = [];
    const targetKey = normalizeTaskKey(activeTaskConfig.name);
    sessionStudents.forEach((student) => {
      const sub = student.subjects.find((s) => s.name === activeSubject);
      const comp = sub?.classScoreComponents?.find((c) => normalizeTaskKey(c.name) === targetKey);
      if (comp && comp.score > 0) scores.push(comp.score);
    });
    const avg =
      scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "0";
    return {
      scored: scores.length,
      avgLabel: `Avg: ${avg}/${activeTaskConfig.maxScore}`,
    };
  }

  if (activeFocusColumn === "CLASS_ONLY") {
    const scores: number[] = [];
    sessionStudents.forEach((student) => {
      const sub = student.subjects.find((s) => s.name === activeSubject);
      if (sub && sub.classScore > 0) scores.push(sub.classScore);
    });
    const avg =
      scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "0";
    return {
      scored: scores.length,
      avgLabel: `Avg: ${avg}/${maxClassScore}`,
    };
  }

  if (!isMockExam && activeFocusColumn === "EXAM_ONLY") {
    const rawScores: number[] = [];
    sessionStudents.forEach((student) => {
      const sub = student.subjects.find((s) => s.name === activeSubject);
      if (sub && sub.examScore > 0) {
        const resolved = resolveExamRawScore(sub, maxExamScore);
        rawScores.push(
          resolved ?? (maxExamScore > 0 ? Math.round((sub.examScore * 100) / maxExamScore) : 0),
        );
      }
    });
    const avg =
      rawScores.length > 0
        ? (rawScores.reduce((a, b) => a + b, 0) / rawScores.length).toFixed(1)
        : "0";
    return {
      scored: rawScores.length,
      avgLabel: `Avg: ${avg}/100`,
    };
  }

  const totals: number[] = [];
  sessionStudents.forEach((student) => {
    const sub = student.subjects.find((s) => s.name === activeSubject);
    if (!sub) return;
    const hasAny = isMockExam ? sub.examScore > 0 : sub.classScore > 0 || sub.examScore > 0;
    if (hasAny) totals.push((sub.classScore || 0) + (sub.examScore || 0));
  });
  const avg =
    totals.length > 0 ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : "0";
  return { scored: totals.length, avgLabel: `Avg: ${avg}%` };
}

/**
 * Computes subject update patches when a multi-row spreadsheet column is pasted into the gradebook.
 * Returns `null` when clipboard text is single-line or start student is not found.
 */
export function computeGradebookPastePatches({
  text,
  visibleStudents,
  startStudentId,
  activeSubject,
  field,
  activeComponentName,
  isMockExam,
  maxClassScore,
  maxExamScore,
}: {
  text: string;
  visibleStudents: ProcessedStudent[];
  startStudentId: string;
  activeSubject: string;
  field: "class" | "exam" | "comp";
  activeComponentName: string | null;
  isMockExam: boolean;
  maxClassScore: number;
  maxExamScore: number;
}): Array<{ student: ProcessedStudent; updatedSubject: SavedSubject }> | null {
  if (!text || !/[\r\n]/.test(text)) return null;

  const lines = text.split(/\r?\n/).map((line) => line.trim());
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  if (lines.length <= 1) return null;

  const startIndex = visibleStudents.findIndex((student) => student.id === startStudentId);
  if (startIndex === -1) return null;

  let lineOffset = 0;
  const patches: Array<{ student: ProcessedStudent; updatedSubject: SavedSubject }> = [];

  for (let idx = startIndex; idx < visibleStudents.length && lineOffset < lines.length; idx++) {
    const targetStudent = visibleStudents[idx];
    const rawCell = lines[lineOffset].split(/\t|,/)[0].trim();
    lineOffset++;
    if (rawCell === "") continue;
    const numeric = parseOptionalNumber(rawCell);
    if (numeric === undefined || numeric < 0) continue;

    const sub = targetStudent.subjects.find((s) => s.name === activeSubject);
    if (!sub) continue;

    if (field === "comp" && activeComponentName) {
      const targetKey = normalizeTaskKey(activeComponentName);
      const comp = sub.classScoreComponents?.find((c) => normalizeTaskKey(c.name) === targetKey);
      if (!comp || !sub.classScoreComponents) continue;
      const { updatedComponents, classScore } = updateComponentAndRecalculateClassScore(
        sub.classScoreComponents,
        comp.id,
        numeric,
        maxClassScore,
      );
      patches.push({
        student: targetStudent,
        updatedSubject: {
          ...sub,
          classScoreComponents: updatedComponents,
          classScore,
        },
      });
    } else if (field === "class") {
      if (!isMockExam && sub.classScoreComponents?.length) continue;
      const { score } = clampDirectClassScore(numeric, maxClassScore);
      patches.push({ student: targetStudent, updatedSubject: { ...sub, classScore: score } });
    } else if (field === "exam") {
      const { clampedRaw, weightedScore } = convertExamRawToWeighted(numeric, maxExamScore);
      const updatedSub: SavedSubject = { ...sub, examScore: weightedScore };
      if (weightedScore > 0) {
        updatedSub.examRawScore = clampedRaw;
      } else {
        delete updatedSub.examRawScore;
      }
      patches.push({
        student: targetStudent,
        updatedSubject: updatedSub,
      });
    }
  }

  return patches;
}
