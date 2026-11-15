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
import { createAppRouter } from "../router";
import { setUnsavedChanges } from "../utils/preloadErrorHandler";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const demoSettings: SchoolSettings = {
  schoolName: "Demo Academy",
  academicYear: "2030/2031",
  term: "First Term",
  level: "JHS",
  defaultSubjects: ["English", "Mathematics"],
  totalAttendanceDays: 80,
  classScoreMax: 50,
  examScoreMax: 50,
  classSize: 30,
  nextTermStarts: "2031-01-12",
  headTeacherName: "Demo Head",
  classTeacherName: "Demo Teacher",
  className: "JHS 1",
  phoneNumber: "0200000000",
  address: "Demo Campus",
  email: "demo@example.com",
  schoolMotto: "Knowledge First",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  examType: "TERMLY",
  componentLibrary: [{ name: "Class Test 1", maxScore: 20, category: "CAT" }],
  subjectComponentMap: {
    English: [{ name: "Class Test 1", maxScore: 20, category: "CAT" }],
  },
};

const demoStudents: StudentRecord[] = [
  {
    id: "demo-student-1",
    name: "Student One",
    className: "JHS 1",
    gender: "Female",
    attendancePresent: 75,
    subjects: [
      {
        id: "sub-1",
        name: "English",
        classScore: 40,
        examScore: 42,
      },
    ],
  },
];

function renderAppAt(initialPath: string) {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const testRouter = createAppRouter(history);

  const utils = render(
    <SchoolProvider>
      <RouterProvider router={testRouter} />
    </SchoolProvider>,
  );

  return { ...utils, router: testRouter, history };
}

describe("NavigationShell and route exclusions", () => {
  beforeAll(async () => {
    await Promise.all([
      import("../pages/Dashboard"),
      import("../pages/SbaPage"),
      import("../pages/Analytics"),
      import("../pages/PrintPreview"),
      import("../pages/settings/SettingsHub"),
      import("../pages/settings/SettingsSchoolPage"),
      import("../pages/settings/SettingsAcademicPage"),
      import("../pages/settings/SettingsTemplatesPage"),
      import("../pages/settings/SettingsSecurityPage"),
    ]);
  }, 30000);

  beforeEach(() => {
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
        return { status: "found", value: demoStudents };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: demoSettings };
      }
      return { status: "empty" };
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders responsive desktop sidebar and mobile bottom bar across shell routes", async () => {
    renderAppAt("/");

    const sidebar = await screen.findByLabelText("Sidebar navigation");
    const mobileBar = screen.getByLabelText("Mobile bottom navigation");

    expect(sidebar).toHaveClass("hidden", "md:flex", "print:hidden");
    expect(mobileBar).toHaveClass("md:hidden", "print:hidden", "safe-bottom");

    // Primary tabs appear in both landmarks
    expect(screen.getAllByRole("link", { name: "Home" }).length).toBe(2);
    expect(screen.getAllByRole("link", { name: "SBA" }).length).toBe(2);
    expect(screen.getAllByRole("link", { name: "Analytics" }).length).toBe(2);
    expect(screen.getAllByRole("link", { name: "Settings" }).length).toBe(2);

    // Desktop sidebar includes Settings quick-jump sub-links and Print Reports CTA
    expect(screen.getByRole("link", { name: "School & Staff" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Class & Subjects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report Style" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Security & Backup" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Print Reports/i })).toBeInTheDocument();
  });

  it("navigates across Home, SBA, Analytics, Settings Hub, and Settings sub-pages", async () => {
    const { router } = renderAppAt("/");

    async function navigateTo(
      to:
        | "/"
        | "/sba"
        | "/analytics"
        | "/settings"
        | "/settings/school"
        | "/settings/academic"
        | "/settings/templates"
        | "/settings/security",
    ) {
      await act(async () => {
        await router.navigate({ to });
        await vi.dynamicImportSettled();
      });
    }

    await screen.findByRole("heading", { name: "Student Records" });
    expect(screen.getByPlaceholderText("Search students...")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Print" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quick actions" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Import student list/i })).toBeInTheDocument();

    // Workspace Class Tools menu replaces header Quick actions
    fireEvent.click(screen.getByRole("button", { name: /Class Tools/i }));
    expect(screen.getByRole("menuitem", { name: /Auto-Fill Teacher Remarks/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Export Broadsheet \(CSV\)/i })).toBeInTheDocument();

    // Navigate to SBA
    await navigateTo("/sba");
    expect(
      await screen.findByRole("heading", { name: /SBA & Continuous Assessment/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sync Tasks to Students/i })).toBeInTheDocument();

    // Navigate to Analytics
    await navigateTo("/analytics");
    expect(await screen.findByText(/Advanced Analytics/i)).toBeInTheDocument();

    // Navigate to Settings Hub (includes SBA & Grading card + 4 sub-page cards)
    await navigateTo("/settings");
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SBA & Grading" })).toBeInTheDocument();

    // Navigate through Settings sub-pages
    await navigateTo("/settings/school");
    expect(await screen.findByRole("heading", { name: "School Identity" })).toBeInTheDocument();

    await navigateTo("/settings/academic");
    expect(await screen.findByRole("heading", { name: "Academic Session" })).toBeInTheDocument();

    await navigateTo("/settings/templates");
    expect(await screen.findByRole("heading", { name: "Report Card Design" })).toBeInTheDocument();

    await navigateTo("/settings/security");
    expect(await screen.findByRole("heading", { name: "Security & Privacy" })).toBeInTheDocument();
  }, 15000);

  it("completely excludes the navigation shell on /print", async () => {
    renderAppAt("/print");

    expect(await screen.findByRole("heading", { name: "Print Preview" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Sidebar navigation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mobile bottom navigation")).not.toBeInTheDocument();
  });

  it("completely excludes the navigation shell when DataGate renders a load error", async () => {
    storage.loadFromStorageResult.mockResolvedValue({ status: "error" });

    renderAppAt("/");

    expect(await screen.findByText("Saved data could not be loaded")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sidebar navigation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mobile bottom navigation")).not.toBeInTheDocument();
  });

  it("completely excludes the navigation shell when DataGate renders incomplete rollback recovery", async () => {
    localStorage.setItem("repota_incomplete_rollback", "true");

    renderAppAt("/");

    expect(await screen.findByText("Saved data could not be loaded")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sidebar navigation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mobile bottom navigation")).not.toBeInTheDocument();
  });
});
