import type { ClassScoreComponent, SavedSubject } from "../types";

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
  const weightedScore = Math.round((clampedRaw * maxExamScore) / 100);
  return { clampedRaw, wasClamped, weightedScore };
}

/**
 * Converts a stored weighted `examScore` back to a rounded `0–100` display string.
 *
 * @returns Rounded `0–100` string, or `""` when `examScore` is `0`/falsy or `maxExamScore <= 0`.
 */
export function formatExamWeightedAsRaw(examScore: number, maxExamScore: number): string {
  if (!examScore || maxExamScore <= 0) return "";
  return Math.round((examScore * 100) / maxExamScore).toString();
}

/**
 * Resolves the exact `0–100` raw exam score for a subject. Uses `subject.examRawScore` when it
 * agrees with the stored weighted `examScore` under `maxExamScore`, avoiding rounding loss across
 * inputs like `89` at `/50`; falls back to deriving from weighted `examScore` otherwise.
 */
export function resolveExamRawScore(
  subject: Pick<SavedSubject, "examScore" | "examRawScore">,
  maxExamScore: number,
): number | undefined {
  if (!subject.examScore || maxExamScore <= 0) return undefined;
  if (typeof subject.examRawScore === "number" && Number.isFinite(subject.examRawScore)) {
    const { clampedRaw, weightedScore } = convertExamRawToWeighted(
      subject.examRawScore,
      maxExamScore,
    );
    if (weightedScore === subject.examScore) {
      return clampedRaw;
    }
  }
  return Math.round((subject.examScore * 100) / maxExamScore);
}

/**
 * Returns the UI/CSV display string (`0–100`) for a subject's exam score, preferring exact
 * persisted `examRawScore` when consistent with `examScore`, or `""` when unscored.
 */
export function getExamRawDisplayValue(
  subject: Pick<SavedSubject, "examScore" | "examRawScore">,
  maxExamScore: number,
): string {
  const raw = resolveExamRawScore(subject, maxExamScore);
  return raw !== undefined ? String(raw) : "";
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
 * `wasClamped` is `true` only when `rawScore > comp.maxScore` (matching `clampDirectClassScore` and `convertExamRawToWeighted`).
 */
export function updateComponentAndRecalculateClassScore(
  components: ClassScoreComponent[],
  componentId: string,
  rawScore: number,
  maxClassScore: number,
): { updatedComponents: ClassScoreComponent[]; classScore: number; wasClamped: boolean } {
  const safeRaw = Number.isFinite(rawScore) ? rawScore : 0;
  let wasClamped = false;
  const updatedComponents = components.map((comp) => {
    if (comp.id !== componentId) return comp;
    if (safeRaw > comp.maxScore) {
      wasClamped = true;
    }
    const clampedScore = Math.min(Math.max(safeRaw, 0), comp.maxScore);
    return { ...comp, score: clampedScore };
  });

  const totalActual =
    Math.round(updatedComponents.reduce((sum, comp) => sum + comp.score, 0) * 100) / 100;
  const totalMax = updatedComponents.reduce((sum, comp) => sum + comp.maxScore, 0);

  return {
    updatedComponents,
    classScore: totalMax > 0 ? Math.round((totalActual * maxClassScore) / totalMax) : 0,
    wasClamped,
  };
}
