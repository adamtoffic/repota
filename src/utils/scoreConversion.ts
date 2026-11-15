import type { ClassScoreComponent } from "../types";

/**
 * Clamp and convert a raw 0-100 exam score into the weighted exam component.
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
 * Convert stored weighted examScore back to the 0-100 display scale.
 */
export function formatExamWeightedAsRaw(examScore: number, maxExamScore: number): string {
  if (!examScore || maxExamScore <= 0) return "";
  return Math.round((examScore / maxExamScore) * 100).toString();
}

/**
 * Clamp a direct class score against the configured classScoreMax.
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
 * Update a single SBA class score component and recompute the weighted classScore total.
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
