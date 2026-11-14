import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolSettings, StudentRecord } from "../types";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: {
    STUDENTS: "ges_v1_students",
    SETTINGS: "ges_v1_settings",
  },
  getStorageType: vi.fn(() => "indexeddb"),
  ...storage,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

import { SchoolProvider } from "../context/SchoolContext";
import { useSchoolData } from "../hooks/useSchoolData";
import { createAppRouter } from "../router";
import { setUnsavedChanges } from "../utils/preloadErrorHandler";

const seededSettings: SchoolSettings = {
  schoolName: "Seeded Academy",
  academicYear: "2030/2031",
  term: "Second Term",
  level: "JHS",
  defaultSubjects: ["English", "Mathematics"],
  totalAttendanceDays: 90,
  classScoreMax: 60,
  examScoreMax: 40,
  classSize: 42,
  nextTermStarts: "2031-01-10",
  headTeacherName: "Head Teacher",
  classTeacherName: "Class Teacher",
  className: "JHS 2",
  phoneNumber: "0240000000",
  address: "Seeded Location",
  email: "seeded@example.com",
  schoolMotto: "Learn and Lead",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  examType: "TERMLY",
  componentLibrary: [{ name: "Class Test", maxScore: 20, category: "CAT" }],
  subjectComponentMap: {
    English: [{ name: "Class Test", maxScore: 20, category: "CAT" }],
  },
};

const seededStudents: StudentRecord[] = [
  {
    id: "student-1",
    name: "Student One",
    className: "JHS 2",
    gender: "Female",
    subjects: [],
  },
];

function PersistenceControl() {
  const { suspendPersistence } = useSchoolData();
  return (
    <button type="button" onClick={suspendPersistence}>
      Suspend Persistence Test
    </button>
  );
}

async function flushHydrationAndImports() {
  await act(async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await vi.dynamicImportSettled();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function renderSubRouteApp(initialPath: string, withControl = false) {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const testRouter = createAppRouter(history);

  const utils = render(
    <SchoolProvider>
      {withControl && <PersistenceControl />}
      <RouterProvider router={testRouter} />
    </SchoolProvider>,
  );

  return { ...utils, router: testRouter };
}

describe("Settings sub-routes shared state and invariants", () => {
  beforeAll(async () => {
    await Promise.all([
      import("../pages/SbaPage"),
      import("../pages/settings/SettingsHub"),
      import("../pages/settings/SettingsSchoolPage"),
      import("../pages/settings/SettingsAcademicPage"),
      import("../pages/settings/SettingsTemplatesPage"),
      import("../pages/settings/SettingsSecurityPage"),
    ]);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    setUnsavedChanges(false);

    storage.initStorage.mockReset();
    storage.loadFromStorage.mockReset();
    storage.loadFromStorageResult.mockReset();
    storage.saveToStorage.mockReset();
    storage.migrateFromLocalStorage.mockReset();
    storage.createBackupHeartbeat.mockReset();

    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true, studentsCount: 0 });
    storage.saveToStorage.mockResolvedValue(true);
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: seededStudents };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: seededSettings };
      }
      return { status: "empty" };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shares one draft and 500ms debounced auto-save across Settings sub-routes", async () => {
    const { router } = renderSubRouteApp("/settings/school");
    await flushHydrationAndImports();

    // Edit School Name on /settings/school
    fireEvent.change(screen.getByDisplayValue("Seeded Academy"), {
      target: { value: "Unified Academy" },
    });

    // Navigate to /settings/academic before 500ms debounce fires
    await act(async () => {
      await router.navigate({ to: "/settings/academic" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    // Edit Class Size on /settings/academic
    fireEvent.change(screen.getByDisplayValue("42"), {
      target: { value: "48" },
    });

    // Advance past both 500ms debounces (form -> context -> storage)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const savedSettings = storage.saveToStorage.mock.calls
      .filter(([key]) => key === "ges_v1_settings")
      .map(([, val]) => val as SchoolSettings)
      .at(-1);

    expect(savedSettings).toMatchObject({
      schoolName: "Unified Academy",
      classSize: 48,
    });
  });

  it("preserves the Class Name confirmation modal flow and student propagation on /settings/academic", async () => {
    renderSubRouteApp("/settings/academic");
    await flushHydrationAndImports();

    // Let initial settle finish
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    const classNameInput = screen.getByDisplayValue("JHS 2");

    // 1. Change and blur -> cancel reverts to baseline
    fireEvent.change(classNameInput, { target: { value: "JHS 3" } });
    fireEvent.blur(classNameInput);

    expect(screen.getByText("Update Class Name Everywhere?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No, Keep Old Name" }));
    expect(screen.getByDisplayValue("JHS 2")).toBeInTheDocument();

    // 2. Change and blur -> confirm updates settings and all students
    fireEvent.change(screen.getByDisplayValue("JHS 2"), { target: { value: "JHS 3" } });
    fireEvent.blur(screen.getByDisplayValue("JHS 3"));

    expect(screen.getByText("Update Class Name Everywhere?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Update Everyone" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    const savedSettings = storage.saveToStorage.mock.calls
      .filter(([key]) => key === "ges_v1_settings")
      .map(([, val]) => val as SchoolSettings)
      .at(-1);
    const savedStudents = storage.saveToStorage.mock.calls
      .filter(([key]) => key === "ges_v1_students")
      .map(([, val]) => val as StudentRecord[])
      .at(-1);

    expect(savedSettings?.className).toBe("JHS 3");
    expect(savedStudents?.[0]?.className).toBe("JHS 3");
  });

  it("discards cross-route unsaved edits back to saved baseline when Reset is confirmed", async () => {
    const { router } = renderSubRouteApp("/settings/school");
    await flushHydrationAndImports();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    fireEvent.change(screen.getByDisplayValue("Learn and Lead"), {
      target: { value: "Transient Motto" },
    });

    // Navigate to another sub-route before 500ms autosave settles
    await act(async () => {
      await router.navigate({ to: "/settings/templates" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    // Reset action remains accessible across sub-routes
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Discard Changes?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Discard Changes" }));

    // Navigate back to /settings/school and confirm baseline was restored
    await act(async () => {
      await router.navigate({ to: "/settings/school" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    expect(screen.getByDisplayValue("Learn and Lead")).toBeInTheDocument();
  });

  it("enforces read-only locks when persistence is suspended while keeping DataBackup usable", async () => {
    const { router } = renderSubRouteApp("/settings/school", true);
    await flushHydrationAndImports();

    fireEvent.click(screen.getByRole("button", { name: "Suspend Persistence Test" }));

    expect(screen.getByDisplayValue("Seeded Academy")).toBeDisabled();
    expect(screen.getByText(/Persistence is suspended/i)).toBeInTheDocument();

    // Check /sba read-only lock
    await act(async () => {
      await router.navigate({ to: "/sba" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: /Sync Tasks to Students/i })).toBeDisabled();
    expect(screen.getByDisplayValue("60")).toBeDisabled();

    // Check /settings/security: Security & Privacy controls disabled, DataBackup file input enabled
    await act(async () => {
      await router.navigate({ to: "/settings/security" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: /Enable PIN Lock/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Restore Factory Defaults" })).toBeDisabled();
    const backupFileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(backupFileInput).not.toBeDisabled();
  });
});
