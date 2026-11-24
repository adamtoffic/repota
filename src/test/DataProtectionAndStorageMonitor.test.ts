import { beforeEach, describe, expect, it, vi } from "vitest";

const storageTypeMock = vi.hoisted(() => ({
  getStorageType: vi.fn<"indexeddb" | "localstorage">(() => "indexeddb"),
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  getStorageType: storageTypeMock.getStorageType,
}));

import { createBackupHeartbeat, detectDataLoss } from "../utils/dataProtection";
import { getAsyncStorageWarningLevel, getStorageWarningLevel } from "../utils/storageMonitor";

describe("detectDataLoss & storageMonitor storage-awareness", () => {
  beforeEach(() => {
    localStorage.clear();
    storageTypeMock.getStorageType.mockReturnValue("indexeddb");
    vi.restoreAllMocks();
  });

  it("does not report false data loss on IndexedDB when IDB contains data even if localStorage is empty", () => {
    createBackupHeartbeat();

    // Typical IndexedDB session: legacy localStorage keys have been removed
    expect(detectDataLoss()).toBe(false);
    expect(detectDataLoss({ studentsEmpty: false, settingsEmpty: false })).toBe(false);
    expect(detectDataLoss({ studentsEmpty: true, settingsEmpty: false })).toBe(false);

    // True wipe: user had data previously AND both IndexedDB keys came back empty
    expect(detectDataLoss({ studentsEmpty: true, settingsEmpty: true })).toBe(true);
  });

  it("still detects missing localStorage keys when running in localStorage fallback mode", () => {
    storageTypeMock.getStorageType.mockReturnValue("localstorage");
    createBackupHeartbeat();

    expect(detectDataLoss()).toBe(true);

    localStorage.setItem("ges_v1_students", "[]");
    localStorage.setItem("ges_v1_settings", "{}");
    expect(detectDataLoss()).toBe(false);
  });

  it("returns safe synchronously on IndexedDB and checks navigator.storage.estimate asynchronously", async () => {
    localStorage.setItem("ges_v1_students", "x".repeat(1000));
    expect(getStorageWarningLevel()).toBe("safe");

    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 95, quota: 100 }),
      },
    });
    expect(await getAsyncStorageWarningLevel()).toBe("critical");

    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 75, quota: 100 }),
      },
    });
    expect(await getAsyncStorageWarningLevel()).toBe("warning");
  });
});
