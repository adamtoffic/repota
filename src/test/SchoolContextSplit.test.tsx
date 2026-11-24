import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolProvider } from "../context/SchoolContext";
import {
  useSchoolActions,
  useSchoolLifecycle,
  useSchoolSettings,
  useSchoolStudents,
} from "../hooks/useSchoolData";

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  initStorage: vi.fn().mockResolvedValue(undefined),
  migrateFromLocalStorage: vi.fn().mockResolvedValue({ success: true, studentsCount: 0 }),
  loadFromStorageResult: vi.fn().mockResolvedValue({ status: "empty" }),
  saveToStorage: vi.fn().mockResolvedValue(true),
  saveEntriesToStorage: vi.fn().mockResolvedValue(true),
  getStorageType: vi.fn(() => "indexeddb"),
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: vi.fn(),
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

describe("SchoolContext slice isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("isolates settings, student, action, and lifecycle subscribers across updates and save ticks", async () => {
    let actionsRenders = 0;
    let settingsRenders = 0;
    let studentsRenders = 0;
    let lifecycleRenders = 0;

    function ActionsProbe() {
      actionsRenders++;
      const { addStudent } = useSchoolActions();
      return (
        <button
          type="button"
          onClick={() =>
            addStudent(
              {
                id: `stu-${actionsRenders}-${Date.now()}`,
                name: "Kofi",
                className: "Basic 4",
                gender: "Male",
                subjects: [],
              },
              true,
            )
          }
        >
          Add Probe Student
        </button>
      );
    }

    function SettingsProbe() {
      settingsRenders++;
      const settings = useSchoolSettings();
      return <span data-testid="settings-probe">{settings.schoolName}</span>;
    }

    function StudentsProbe() {
      studentsRenders++;
      const students = useSchoolStudents();
      return <span data-testid="students-probe">{students.length}</span>;
    }

    function LifecycleProbe() {
      lifecycleRenders++;
      const { isSaving } = useSchoolLifecycle();
      return <span data-testid="lifecycle-probe">{isSaving ? "saving" : "idle"}</span>;
    }

    render(
      <SchoolProvider>
        <ActionsProbe />
        <SettingsProbe />
        <StudentsProbe />
        <LifecycleProbe />
      </SchoolProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const baselineActions = actionsRenders;
    const baselineSettings = settingsRenders;
    const baselineStudents = studentsRenders;
    const baselineLifecycle = lifecycleRenders;

    // Trigger adding a student (changes students + starts 500ms isSaving debounce, then settles)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Probe Student" }));
    });

    expect(screen.getByTestId("students-probe")).toHaveTextContent("1");
    expect(screen.getByTestId("lifecycle-probe")).toHaveTextContent("saving");

    // Finish debounce -> lifecycle flips back to idle & sets lastSaved
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
    });

    expect(screen.getByTestId("lifecycle-probe")).toHaveTextContent("idle");
    // Action-only and Settings-only probes NEVER re-rendered for student writes or save ticks
    expect(actionsRenders).toBe(baselineActions);
    expect(settingsRenders).toBe(baselineSettings);
    // Students probe only rendered ONCE more for the new student, NOT again for the idle/lastSaved tick
    expect(studentsRenders).toBe(baselineStudents + 1);
    // Lifecycle probe tracked saving -> idle transitions
    expect(lifecycleRenders).toBeGreaterThan(baselineLifecycle);

    vi.useRealTimers();
  });
});
