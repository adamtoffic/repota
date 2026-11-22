import type { ClassScoreComponent } from "../types";

/**
 * Clamps a raw `0–100` exam score and converts it into the weighted `0..maxExamScore` scale.
 * Non-finite inputs coerce to `0`. `wasClamped` is `true` only when `rawScore > 100` (not `< 0`).
 */
export function convertExamRawToWeighted(
  rawScore: number,
  maxExamScore: number,
): { clampedRaw: number; wasClamped: boolean; weightedScore: number } {
  const safeRaw = Number.isFinite(rawScore) ? rawScore : 0;
  const wasClamped = safeRaw > 100;
  const clampedRaw = Math.min(Math.max(safeRaw, 0), 100);
  const weightedScore = Math.round((clampedRaw / 100) * maxExamScore);
  return { clampedRaw, wasClamped, weightedScore };
}

/**
 * Converts a stored weighted `examScore` back to a rounded `0–100` display string.
 *
 * @returns Rounded `0–100` string, or `""` when `examScore` is `0`/falsy or `maxExamScore <= 0`.
 */
export function formatExamWeightedAsRaw(examScore: number, maxExamScore: number): string {
  if (!examScore || maxExamScore <= 0) return "";
  return Math.round((examScore / maxExamScore) * 100).toString();
}

/**
 * Clamps and rounds a direct class score against `0..maxClassScore`.
 * Non-finite inputs coerce to `0`; `wasClamped` is `true` only when `rawScore > maxClassScore`.
 */
export function clampDirectClassScore(
  rawScore: number,
  maxClassScore: number,
): { score: number; wasClamped: boolean } {
  const safeRaw = Number.isFinite(rawScore) ? rawScore : 0;
  const wasClamped = safeRaw > maxClassScore;
  const clamped = Math.min(Math.max(safeRaw, 0), maxClassScore);
  return { score: Math.round(clamped), wasClamped };
}

/**
 * Clamps one SBA class-score component to `0..comp.maxScore`, returns a new component array,
 * and scales the combined component percentage proportionally onto `0..maxClassScore` (`Math.round`).
 */
export function updateComponentAndRecalculateClassScore(
  components: ClassScoreComponent[],
  componentId: string,
  rawScore: number,
  maxClassScore: number,
): { updatedComponents: ClassScoreComponent[]; classScore: number } {
  const safeRaw = Number.isFinite(rawScore) ? rawScore : 0;
  const updatedComponents = components.map((comp) => {
    if (comp.id !== componentId) return comp;
    const clampedScore = Math.min(Math.max(safeRaw, 0), comp.maxScore);
    return { ...comp, score: clampedScore };
  });

  const totalActual = updatedComponents.reduce((sum, comp) => sum + comp.score, 0);
  const totalMax = updatedComponents.reduce((sum, comp) => sum + comp.maxScore, 0);
  const percentage = totalMax > 0 ? totalActual / totalMax : 0;

  return {
    updatedComponents,
    classScore: Math.round(percentage * maxClassScore),
  };
}
