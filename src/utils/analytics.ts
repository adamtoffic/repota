import { resolveAppEnv, shouldSendAnalytics } from "./analyticsEnv";
import { getStorageType } from "./idbStorage";

export type ScoreEntryMode = "quick_gradebook" | "score_modal" | "sba_markbook";

export interface RuntimeAnalyticsContext {
  is_standalone_pwa: boolean;
  is_offline: boolean;
  storage_type: "indexeddb" | "localstorage";
}

export interface PostHogClientLike {
  capture?: (eventName: string, properties?: Record<string, unknown>) => void;
}

const MAX_PENDING_ANALYTICS_EVENTS = 50;
const scoreEntrySessionKeys = new Set<string>();
const pendingAnalyticsEvents: Array<{
  eventName: string;
  properties?: Record<string, unknown>;
}> = [];
let posthogClient: PostHogClientLike | null = null;
let analyticsInitPromise: Promise<void> | null = null;

/**
 * Registers an initialized `posthog-js` client (or Vitest mock) and flushes any
 * events captured before dynamic initialization completed.
 */
export function registerPostHogClient(client: PostHogClientLike | null): void {
  posthogClient = client;
  if (!client || typeof client.capture !== "function" || pendingAnalyticsEvents.length === 0) {
    return;
  }

  const queued = pendingAnalyticsEvents.splice(0, pendingAnalyticsEvents.length);
  for (const item of queued) {
    try {
      client.capture(item.eventName, item.properties);
    } catch {
      // Analytics must never interrupt user actions
    }
  }
}

/**
 * Dynamically loads and initializes `posthog-js` outside the critical boot path.
 * No-ops completely (without fetching `posthog-js`) on non-production hosts unless `forceInTest` is set.
 */
export function initPostHogAnalytics(options?: { forceInTest?: boolean }): Promise<void> {
  const appEnv = resolveAppEnv();
  const isAnalyticsEnabled = shouldSendAnalytics(appEnv);
  if (!isAnalyticsEnabled && !options?.forceInTest) {
    return Promise.resolve();
  }
  if (analyticsInitPromise) {
    return analyticsInitPromise;
  }

  analyticsInitPromise = (async () => {
    try {
      const { default: posthog } = await import("posthog-js");
      if (!posthog || typeof posthog.init !== "function") {
        return;
      }

      posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
        api_host: import.meta.env.VITE_POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: "history_change",
        capture_pageleave: "if_capture_pageview",
        autocapture: true,
        persistence: "localStorage", // Queues events while offline
        disable_session_recording: !isAnalyticsEnabled,

        mask_all_text: true,
        mask_all_element_attributes: true,

        session_recording: {
          maskAllInputs: true,
          maskTextSelector: "*",
          blockSelector: "img",
          maskTextFn: (text, element) =>
            element?.closest('[data-record="true"]') ? text : "*".repeat(text.length),
        },

        before_send: (event) => {
          if (!event || !isAnalyticsEnabled) return null;
          const nextProperties: Record<string, unknown> = {
            ...getRuntimeAnalyticsContext(),
            ...event.properties,
            app_env: appEnv,
          };
          if (event.properties?.$current_url !== undefined) {
            nextProperties.$current_url = sanitizePostHogUrl(event.properties.$current_url);
          }
          return {
            ...event,
            properties: nextProperties,
          };
        },
      });

      registerPostHogClient(posthog);
    } catch {
      analyticsInitPromise = null;
    }
  })();

  return analyticsInitPromise;
}

/**
 * Safely captures a PostHog event without letting telemetry errors disrupt app flows.
 * Queues events captured before lazy `posthog-js` initialization settles.
 */
export function captureEvent(eventName: string, properties?: Record<string, unknown>): void {
  try {
    if (posthogClient) {
      if (typeof posthogClient.capture === "function") {
        posthogClient.capture(eventName, properties);
      }
      return;
    }

    if (pendingAnalyticsEvents.length < MAX_PENDING_ANALYTICS_EVENTS) {
      pendingAnalyticsEvents.push({ eventName, properties });
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
  pendingAnalyticsEvents.length = 0;
}
