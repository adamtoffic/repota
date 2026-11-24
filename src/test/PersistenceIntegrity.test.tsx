import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";

const toastMock = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  deleteFromStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => toastMock,
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  getStorageType: vi.fn(() => "indexeddb"),
  ...storage,
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
  recordBackup: vi.fn(),
  getTimeSinceBackup: vi.fn(() => null),
}));

vi.mock("../utils/fileEncryption", () => ({
  encryptAppSealedBackup: vi.fn(async (payload: unknown) => ({
    version: "v2",
    encrypted: true,
    mode: "app",
    compressed: false,
    payload,
  })),
  encryptBackupFile: vi.fn(),
  decryptBackupFile: vi.fn(),
  isEncryptedFile: vi.fn(() => false),
  requiresPassword: vi.fn(() => false),
}));

import { DataBackup } from "../components/DataBackup";
import { DataGate } from "../components/DataGate";
import { SchoolIdentitySection } from "../components/settings/SchoolIdentitySection";
import { SchoolProvider } from "../context/SchoolContext";
import { SettingsFormProvider } from "../context/SettingsFormContext";
import {
  useSchoolActions,
  useSchoolLifecycle,
  useSchoolSettings,
} from "../hooks/useSchoolData";
import { setUnsavedChanges } from "../utils/preloadErrorHandler";

const seededSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Initial School",
  className: "Basic 5",
  level: "PRIMARY",
};

const seededStudents: StudentRecord[] = [
  {
    id: "stu-1",
    name: "Ama Mensah",
    className: "Basic 5",
    gender: "Female",
    subjects: [{ id: "sub-1", name: "English", classScore: 30, examScore: 40 }],
  },
];

describe("Persistence honesty, unmount flush, and export flush", () => {
  let memoryDb: Record<string, unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    setUnsavedChanges(false);
    vi.clearAllMocks();

    memoryDb = {
      ges_v1_students: structuredClone(seededStudents),
      ges_v1_settings: structuredClone(seededSettings),
    };

    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true, studentsCount: 0 });
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key in memoryDb) {
        return { status: "found", value: structuredClone(memoryDb[key]) };
      }
      return { status: "empty" };
    });
    storage.saveToStorage.mockImplementation(async (key: string, val: unknown) => {
      memoryDb[key] = structuredClone(val);
      return true;
    });
    storage.saveEntriesToStorage.mockImplementation(
      async (entries: Array<{ key: string; value: unknown }>) => {
        for (const entry of entries) {
          memoryDb[entry.key] = structuredClone(entry.value);
        }
        return true;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("skips redundant writes on cold boot and surfaces saveError instead of fake lastSaved when saveToStorage returns false", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SchoolProvider>{children}</SchoolProvider>
    );

    const { result } = renderHook(
      () => ({
        lifecycle: useSchoolLifecycle(),
        actions: useSchoolActions(),
      }),
      { wrapper },
    );

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        await Promise.resolve();
      }
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.lifecycle.isDataLoaded).toBe(true);
    // Cold boot hydration must NOT rewrite hydrated data back to storage or stamp lastSaved
    expect(storage.saveToStorage).not.toHaveBeenCalled();
    expect(storage.createBackupHeartbeat).not.toHaveBeenCalled();
    expect(result.current.lifecycle.lastSaved).toBeUndefined();
    expect(result.current.lifecycle.saveError).toBeNull();

    // Force next write to fail (returns false)
    storage.saveToStorage.mockResolvedValueOnce(false);
    act(() => {
      result.current.actions.updateStudent(
        { ...seededStudents[0], name: "Ama Updated" },
        true,
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(550);
      await Promise.resolve();
    });

    expect(storage.saveToStorage).toHaveBeenCalledTimes(1);
    expect(result.current.lifecycle.lastSaved).toBeUndefined();
    expect(storage.createBackupHeartbeat).not.toHaveBeenCalled();
    expect(result.current.lifecycle.saveError).toMatch(/couldn't be saved/i);

    // Next write succeeds -> saveError clears and lastSaved/heartbeat update honestly
    storage.saveToStorage.mockResolvedValueOnce(true);
    let flushed = false;
    await act(async () => {
      flushed = (await result.current.actions.flushPendingWrites?.()) ?? false;
    });

    expect(flushed).toBe(true);
    expect(result.current.lifecycle.saveError).toBeNull();
    expect(result.current.lifecycle.lastSaved).toBeInstanceOf(Date);
    expect(storage.createBackupHeartbeat).toHaveBeenCalledTimes(1);
  });

  it("flushes uncommitted SettingsFormContext draft changes on unmount", async () => {
    function NavHarness({ showSettings }: { showSettings: boolean }) {
      const settings = useSchoolSettings();
      return (
        <div>
          <span data-testid="committed-school">{settings.schoolName}</span>
          {showSettings && (
            <SettingsFormProvider>
              <SchoolIdentitySection />
            </SettingsFormProvider>
          )}
        </div>
      );
    }

    const { rerender } = render(
      <SchoolProvider>
        <DataGate>
          <NavHarness showSettings={true} />
        </DataGate>
      </SchoolProvider>,
    );

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        await Promise.resolve();
      }
    });

    fireEvent.change(screen.getByDisplayValue("Initial School"), {
      target: { value: "Quick Navigate Academy" },
    });

    // Unmount SettingsFormProvider IMMEDIATELY before its 500ms debounce timer fires
    rerender(
      <SchoolProvider>
        <DataGate>
          <NavHarness showSettings={false} />
        </DataGate>
      </SchoolProvider>,
    );

    expect(screen.getByTestId("committed-school")).toHaveTextContent(
      "Quick Navigate Academy",
    );

    // SchoolProvider (still mounted) debounces and writes the flushed change to IndexedDB
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await Promise.resolve();
    });
    expect(
      (memoryDb.ges_v1_settings as SchoolSettings).schoolName,
    ).toBe("Quick Navigate Academy");
  });

  it("flushes debounced settings edits before reading storage during DataBackup export", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    try {
      render(
        <SchoolProvider>
          <DataGate>
            <SettingsFormProvider>
              <SchoolIdentitySection />
              <DataBackup />
            </SettingsFormProvider>
          </DataGate>
        </SchoolProvider>,
      );

      await act(async () => {
        for (let i = 0; i < 6; i++) {
          await Promise.resolve();
        }
      });

      // Edit school motto WITHOUT waiting 1000ms for both debounce timers
      fireEvent.change(screen.getByPlaceholderText("e.g. Knowledge is Power"), {
        target: { value: "Export Fresh Motto" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save Class File" }));
        for (let i = 0; i < 6; i++) {
          await Promise.resolve();
        }
      });

      expect(
        (memoryDb.ges_v1_settings as SchoolSettings).schoolMotto,
      ).toBe("Export Fresh Motto");
      expect(clickSpy).toHaveBeenCalledTimes(1);
    } finally {
      clickSpy.mockRestore();
    }
  });
});
