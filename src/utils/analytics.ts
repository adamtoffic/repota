import posthog from "posthog-js";
import { getStorageType } from "./idbStorage";

export type ScoreEntryMode = "quick_gradebook" | "score_modal";

export interface RuntimeAnalyticsContext {
  is_standalone_pwa: boolean;
  is_offline: boolean;
  storage_type: "indexeddb" | "localstorage";
}

const scoreEntrySessionKeys = new Set<string>();

/**
 * Safely captures a PostHog event without letting telemetry errors disrupt app flows.
 */
export function captureEvent(eventName: string, properties?: Record<string, unknown>): void {
  try {
    if (typeof posthog?.capture === "function") {
      posthog.capture(eventName, properties);
    }
  } catch {
    // Analytics must never interrupt user actions
  }
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;

  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { standalone?: boolean }) : null;
  if (nav?.standalone === true) return true;

  try {
    return typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)").matches
      : false;
  } catch {
    return false;
  }
}

export function getRuntimeAnalyticsContext(): RuntimeAnalyticsContext {
  return {
    is_standalone_pwa: isStandalonePwa(),
    is_offline: typeof navigator !== "undefined" ? navigator.onLine === false : false,
    storage_type: getStorageType(),
  };
}

/**
 * Strips the student `id` query parameter from `/print?id=...` URLs so
 * per-student print previews do not fragment `$current_url` or leak IDs.
 */
export function sanitizePostHogUrl(rawUrl: unknown): unknown {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return rawUrl;
  }
  try {
    const parsed = new URL(rawUrl);
    if (parsed.pathname === "/print" && parsed.searchParams.has("id")) {
      parsed.searchParams.delete("id");
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export interface ScoreEntrySessionParams {
  entryMode: ScoreEntryMode;
  usedColumnPaste?: boolean;
  schoolLevel?: string;
  examType?: string;
}

/**
 * Emits `Score_Entry_Session` at most once per entry mode + paste style per session
 * to avoid per-keystroke noise while preserving score-entry UX adoption signal.
 */
export function trackScoreEntrySessionOnce(params: ScoreEntrySessionParams): boolean {
  const modeKey = `${params.entryMode}:${params.usedColumnPaste ? "paste" : "manual"}`;
  if (scoreEntrySessionKeys.has(modeKey)) {
    return false;
  }
  scoreEntrySessionKeys.add(modeKey);
  captureEvent("Score_Entry_Session", {
    entry_mode: params.entryMode,
    used_column_paste: Boolean(params.usedColumnPaste),
    school_level: params.schoolLevel || "unknown",
    exam_type: (params.examType || "TERMLY").trim().toUpperCase(),
  });
  return true;
}

export function resetSessionAnalyticsGuards(): void {
  scoreEntrySessionKeys.clear();
}
