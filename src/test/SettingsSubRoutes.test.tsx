import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolSettings, StudentRecord } from "../types";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
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
  getTimeSinceBackup: vi.fn(() => null),
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
    storage.saveEntriesToStorage.mockReset();
    storage.migrateFromLocalStorage.mockReset();
    storage.createBackupHeartbeat.mockReset();

    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true, studentsCount: 0 });
    storage.saveToStorage.mockResolvedValue(true);
    storage.saveEntriesToStorage.mockResolvedValue(true);
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
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
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
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
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

  it("does not render a header Reset button while auto-saving edits across Settings sub-routes", async () => {
    const { router } = renderSubRouteApp("/settings/school");
    await flushHydrationAndImports();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    fireEvent.change(screen.getByDisplayValue("Learn and Lead"), {
      target: { value: "Updated Motto" },
    });

    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();

    // Navigate to another sub-route while 500ms autosave settles
    await act(async () => {
      await router.navigate({ to: "/settings/templates" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Navigate back to /settings/school and confirm edit auto-saved cleanly
    await act(async () => {
      await router.navigate({ to: "/settings/school" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    expect(screen.getByDisplayValue("Updated Motto")).toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: /Grading weights and exam mode/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Manage Tasks/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Import CSV/i })).toBeDisabled();

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

  it("applies the active subject SBA tasks to every default subject in one click", async () => {
    renderSubRouteApp("/sba");
    await flushHydrationAndImports();

    fireEvent.click(screen.getByRole("button", { name: /Manage Tasks/i }));
    fireEvent.click(screen.getByRole("button", { name: /Apply to all subjects/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const savedSettings = storage.saveToStorage.mock.calls
      .filter(([key]) => key === "ges_v1_settings")
      .map(([, val]) => val as SchoolSettings)
      .at(-1);

    expect(savedSettings?.subjectComponentMap?.English).toEqual([
      { name: "Class Test", maxScore: 20, category: "CAT" },
    ]);
    expect(savedSettings?.subjectComponentMap?.Mathematics).toEqual([
      { name: "Class Test", maxScore: 20, category: "CAT" },
    ]);
  });

  it("renders SettingsHub live style/backup metadata, mobile section pills, and template print shortcut", async () => {
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: seededStudents };
      }
      if (key === "ges_v1_settings") {
        return {
          status: "found",
          value: { ...seededSettings, useCustomTemplateColor: true },
        };
      }
      return { status: "empty" };
    });

    const { router } = renderSubRouteApp("/settings");
    await flushHydrationAndImports();

    expect(screen.getByText(/Original • Custom Colors/i)).toBeInTheDocument();
    expect(screen.getByText(/PIN Off • No backup yet/i)).toBeInTheDocument();

    await act(async () => {
      await router.navigate({ to: "/settings/templates" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "School" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Class" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Report Style" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Security" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "SBA" })).not.toBeInTheDocument();

    const printLink = screen.getByRole("link", { name: /Preview & Print Report Cards/i });
    expect(printLink).toHaveAttribute("href", "/print");

    await act(async () => {
      await router.navigate({ to: "/settings/security" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    const securityNav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(within(securityNav).getByRole("link", { name: "Security" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("protects /settings/academic Exam Type toggle with SbaWeightsModal and uses SHS 30/70 default", async () => {
    const shsSettings: SchoolSettings = {
      ...seededSettings,
      level: "SHS",
      classScoreMax: 30,
      examScoreMax: 70,
    };
    const shsStudents: StudentRecord[] = [
      {
        id: "student-1",
        name: "Student One",
        className: "SHS 1",
        gender: "Female",
        subjects: [
          {
            id: "sub-eng",
            name: "English",
            classScore: 24,
            examScore: 56, // 80 raw / 100 * 70
          },
        ],
      },
    ];

    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: shsStudents };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: shsSettings };
      }
      return { status: "empty" };
    });

    renderSubRouteApp("/settings/academic");
    await flushHydrationAndImports();

    fireEvent.click(screen.getByRole("button", { name: /Mock Exam/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Grading Weights & Exam Mode/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/1 student has existing scores affected/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Apply Grading Split/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    let savedSettings = storage.saveToStorage.mock.calls
      .filter(([key]) => key === "ges_v1_settings")
      .map(([, val]) => val as SchoolSettings)
      .at(-1);
    expect(savedSettings).toMatchObject({
      examType: "MOCK",
      classScoreMax: 0,
      examScoreMax: 100,
    });

    // Resuming Termly for SHS opens SbaWeightsModal pre-set to 30/70
    fireEvent.click(screen.getByRole("button", { name: /Termly/i }));
    const resumeDialog = screen.getByRole("dialog");
    fireEvent.click(within(resumeDialog).getByRole("button", { name: /Apply Grading Split/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    savedSettings = storage.saveToStorage.mock.calls
      .filter(([key]) => key === "ges_v1_settings")
      .map(([, val]) => val as SchoolSettings)
      .at(-1);
    expect(savedSettings).toMatchObject({
      examType: "TERMLY",
      classScoreMax: 30,
      examScoreMax: 70,
    });
  });

  it("supports 3-tier Reset & Cleanup options on /settings/security with typed RESET safeguard", async () => {
    const { router } = renderSubRouteApp("/settings/security");
    await flushHydrationAndImports();

    // 1. Restore Factory Defaults immediately syncs settings inputs while keeping student records
    fireEvent.click(screen.getByRole("button", { name: "Restore Factory Defaults" }));
    expect(screen.getByText("Restore Default Settings?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Restore Defaults" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await act(async () => {
      await router.navigate({ to: "/settings/school" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });
    expect(screen.getByDisplayValue("My School Name")).toBeInTheDocument();

    // 2. Remove All Students clears students while preserving school identity
    await act(async () => {
      await router.navigate({ to: "/settings/security" });
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    const removeAllBtn = screen.getByRole("button", { name: /Remove All Students \(1\)/i });
    fireEvent.click(removeAllBtn);
    expect(screen.getByText("Remove All Students?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Remove All Students" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const savedStudents = storage.saveToStorage.mock.calls
      .filter(([key]) => key === "ges_v1_students")
      .map(([, val]) => val as StudentRecord[])
      .at(-1);
    expect(savedStudents).toEqual([]);
    expect(screen.getByRole("button", { name: "Remove All Students" })).toBeDisabled();

    // 3. Reset Entire App requires typing RESET before confirmation is enabled
    fireEvent.click(screen.getByRole("button", { name: "Reset Entire App" }));
    expect(screen.getByText("Reset Entire App?")).toBeInTheDocument();

    const wipeBtn = screen.getByRole("button", { name: "Yes, Wipe Everything" });
    expect(wipeBtn).toBeDisabled();

    const keywordInput = screen.getByLabelText(/Type RESET to confirm/i);
    fireEvent.change(keywordInput, { target: { value: "reset" } });
    expect(wipeBtn).toBeEnabled();

    await act(async () => {
      fireEvent.click(wipeBtn);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText("Reset Entire App?")).not.toBeInTheDocument();
  });

  it("prompts before Reset Labels and preserves entered Private School fee amounts", async () => {
    const privateSettings: SchoolSettings = {
      ...seededSettings,
      schoolType: "PRIVATE",
      privateFeeItems: [
        { id: "school-fees", label: "Tuition Levies", amount: 450, cycle: "Per Term", enabled: true },
        { id: "canteen-fees", label: "Feeding", amount: 120, cycle: "Daily", enabled: true },
        { id: "first-aid-fees", label: "Health Fund", amount: 30, cycle: "Per Term", enabled: false },
      ],
    };

    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: seededStudents };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: privateSettings };
      }
      return { status: "empty" };
    });

    renderSubRouteApp("/settings/school");
    await flushHydrationAndImports();

    fireEvent.click(screen.getByRole("button", { name: /Reset Labels/i }));
    expect(screen.getByText("Reset Fee Labels?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Reset Labels" }));

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

    expect(savedSettings?.privateFeeItems).toEqual([
      { id: "school-fees", label: "School Fees", amount: 450, cycle: "Per Term", enabled: true },
      { id: "canteen-fees", label: "Canteen Fees", amount: 120, cycle: "Daily", enabled: true },
      { id: "first-aid-fees", label: "First Aid Fees", amount: 30, cycle: "Per Term", enabled: false },
    ]);
  });
});
