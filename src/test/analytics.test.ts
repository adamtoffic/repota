import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

const idbMock = vi.hoisted(() => ({
  getStorageType: vi.fn<"indexeddb" | "localstorage">(() => "indexeddb"),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

vi.mock("../utils/idbStorage", () => idbMock);

import {
  captureEvent,
  getRuntimeAnalyticsContext,
  registerPostHogClient,
  resetSessionAnalyticsGuards,
  sanitizePostHogUrl,
  trackScoreEntrySessionOnce,
} from "../utils/analytics";

describe("analytics helpers", () => {
  const originalMatchMedia = window.matchMedia;
  const originalOnLine = navigator.onLine;
  const originalStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;

  beforeEach(() => {
    vi.clearAllMocks();
    registerPostHogClient(posthogMock);
    resetSessionAnalyticsGuards();
    idbMock.getStorageType.mockReturnValue("indexeddb");
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(navigator, "onLine", { configurable: true, value: originalOnLine });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: originalStandalone,
    });
    vi.restoreAllMocks();
  });

  it("swallows posthog.capture errors in captureEvent", () => {
    posthogMock.capture.mockImplementationOnce(() => {
      throw new Error("network/storage failure");
    });

    expect(() => captureEvent("Test_Event", { ok: true })).not.toThrow();
    expect(posthogMock.capture).toHaveBeenCalledWith("Test_Event", { ok: true });
  });

  it("strips id query parameter from /print URLs while keeping other routes and params intact", () => {
    expect(sanitizePostHogUrl("https://repota.app/print?id=stu-123")).toBe(
      "https://repota.app/print",
    );
    expect(sanitizePostHogUrl("https://repota.app/print?id=stu-123&mode=bw")).toBe(
      "https://repota.app/print?mode=bw",
    );
    expect(sanitizePostHogUrl("https://repota.app/print")).toBe("https://repota.app/print");
    expect(sanitizePostHogUrl("https://repota.app/analytics?id=keep-me")).toBe(
      "https://repota.app/analytics?id=keep-me",
    );
    expect(sanitizePostHogUrl("not-a-valid-url")).toBe("not-a-valid-url");
    expect(sanitizePostHogUrl(undefined)).toBeUndefined();
  });

  it("reads standalone PWA, offline status, and storage type into runtime context", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    idbMock.getStorageType.mockReturnValue("localstorage");

    expect(getRuntimeAnalyticsContext()).toEqual({
      is_standalone_pwa: true,
      is_offline: true,
      storage_type: "localstorage",
    });
  });

  it("deduplicates Score_Entry_Session by mode and paste style until reset", () => {
    expect(
      trackScoreEntrySessionOnce({
        entryMode: "quick_gradebook",
        usedColumnPaste: false,
        schoolLevel: "JHS",
        examType: "termly",
      }),
    ).toBe(true);
    expect(
      trackScoreEntrySessionOnce({
        entryMode: "quick_gradebook",
        usedColumnPaste: false,
        schoolLevel: "JHS",
        examType: "termly",
      }),
    ).toBe(false);
    expect(
      trackScoreEntrySessionOnce({
        entryMode: "quick_gradebook",
        usedColumnPaste: true,
        schoolLevel: "JHS",
        examType: "termly",
      }),
    ).toBe(true);
    expect(
      trackScoreEntrySessionOnce({
        entryMode: "score_modal",
        usedColumnPaste: false,
        schoolLevel: "PRIMARY",
      }),
    ).toBe(true);

    expect(posthogMock.capture).toHaveBeenCalledTimes(3);
    expect(posthogMock.capture).toHaveBeenNthCalledWith(1, "Score_Entry_Session", {
      entry_mode: "quick_gradebook",
      used_column_paste: false,
      school_level: "JHS",
      exam_type: "TERMLY",
    });

    resetSessionAnalyticsGuards();
    expect(
      trackScoreEntrySessionOnce({
        entryMode: "quick_gradebook",
        usedColumnPaste: false,
        schoolLevel: "JHS",
      }),
    ).toBe(true);
    expect(posthogMock.capture).toHaveBeenCalledTimes(4);
  });
});
