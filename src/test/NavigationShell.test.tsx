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
  getTimeSinceBackup: vi.fn(() => null),
}));

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { ScrollButton } from "../components/ScrollButton";
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

    // Navigate to SBA Markbook
    await navigateTo("/sba");
    expect(
      await screen.findByRole("heading", { name: /SBA Markbook/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Manage Tasks/i })).toBeInTheDocument();

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

  it("filters dashboard students directly from warning cards and deep-links missing photo to Details tab", async () => {
    const demoWarningStudents: StudentRecord[] = [
      {
        id: "demo-zero",
        name: "Student Zero",
        className: "JHS 1",
        gender: "Female",
        attendancePresent: 70,
        pictureUrl: "data:image/png;base64,abc",
        subjects: [
          { id: "z1", name: "English", classScore: 0, examScore: 0 },
          { id: "z2", name: "Mathematics", classScore: 0, examScore: 0 },
        ],
      },
      {
        id: "demo-partial",
        name: "Student Partial",
        className: "JHS 1",
        gender: "Male",
        attendancePresent: 72,
        pictureUrl: "data:image/png;base64,def",
        subjects: [
          { id: "p1", name: "English", classScore: 30, examScore: 0 },
          { id: "p2", name: "Mathematics", classScore: 35, examScore: 40 },
        ],
      },
      {
        id: "demo-nophoto",
        name: "Student NoPhoto",
        className: "JHS 1",
        gender: "Female",
        attendancePresent: 78,
        pictureUrl: "",
        subjects: [
          { id: "n1", name: "English", classScore: 40, examScore: 45 },
          { id: "n2", name: "Mathematics", classScore: 42, examScore: 44 },
        ],
      },
    ];

    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: demoWarningStudents };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: demoSettings };
      }
      return { status: "empty" };
    });

    renderAppAt("/");

    expect(await screen.findByText("Student Zero")).toBeInTheDocument();
    expect(screen.getByText("Student Partial")).toBeInTheDocument();
    expect(screen.getByText("Student NoPhoto")).toBeInTheDocument();

    // Score progress badges & missing photo pill appear on cards
    expect(screen.getByText("0/2 Scored")).toBeInTheDocument();
    expect(screen.getByText("1/2 Scored")).toBeInTheDocument();
    expect(screen.getByText("2/2 Scored")).toBeInTheDocument();
    expect(screen.getByText("No Photo")).toBeInTheDocument();

    // Filter by "no scores entered" and toggle back
    const noScoresBtn = screen.getByRole("button", { name: /1 student has no scores entered/i });
    fireEvent.click(noScoresBtn);
    expect(screen.getByText("Student Zero")).toBeInTheDocument();
    expect(screen.queryByText("Student Partial")).not.toBeInTheDocument();
    expect(screen.queryByText("Student NoPhoto")).not.toBeInTheDocument();

    fireEvent.click(noScoresBtn);
    expect(screen.getByText("Student Partial")).toBeInTheDocument();
    expect(screen.getByText("Student NoPhoto")).toBeInTheDocument();

    // Filter by "incomplete scores"
    const partialBtn = screen.getByRole("button", { name: /1 student with incomplete scores/i });
    fireEvent.click(partialBtn);
    expect(screen.getByText("Student Partial")).toBeInTheDocument();
    expect(screen.queryByText("Student Zero")).not.toBeInTheDocument();
    expect(screen.queryByText("Student NoPhoto")).not.toBeInTheDocument();

    // Filter by "missing photo" and open student -> lands on Student Details tab
    const missingPhotoBtn = screen.getByRole("button", { name: /1 student missing photo/i });
    fireEvent.click(missingPhotoBtn);
    expect(screen.getByText("Student NoPhoto")).toBeInTheDocument();
    expect(screen.queryByText("Student Zero")).not.toBeInTheDocument();
    expect(screen.queryByText("Student Partial")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Edit Scores/i }));
    expect(screen.getByRole("tab", { name: /Student Details/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Academic Scores/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByDisplayValue("Student NoPhoto")).toBeInTheDocument();

    // Closing modal and dismissing photo warning resets active photo filter
    fireEvent.click(screen.getByRole("button", { name: /Close modal/i }));
    fireEvent.click(screen.getByRole("button", { name: /Dismiss missing photos warning/i }));
    expect(sessionStorage.getItem("repota_dismiss_photo_warning")).toBe("true");
    expect(screen.queryByRole("button", { name: /1 student missing photo/i })).not.toBeInTheDocument();
    expect(screen.getByText("Student Zero")).toBeInTheDocument();
  });

  it("auto-hides AutoSaveIndicator after 3.5 seconds while keeping saving state visible", () => {
    vi.useFakeTimers();
    try {
      const savedAt = new Date();
      const { rerender } = render(<AutoSaveIndicator isSaving={false} lastSaved={savedAt} />);

      expect(screen.getByText(/Saved just now/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3500);
      });

      expect(screen.queryByText(/Saved just now/i)).not.toBeInTheDocument();

      rerender(<AutoSaveIndicator isSaving={true} lastSaved={savedAt} />);
      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(screen.getByText(/Saving\.\.\./i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks AutoSaveIndicator pointer-events-none and disables mobile fixed overlay hit-testing while editing inputs", async () => {
    const originalScrollYDesc = Object.getOwnPropertyDescriptor(window, "scrollY");
    const originalInnerHeightDesc = Object.getOwnPropertyDescriptor(window, "innerHeight");
    const originalScrollHeightDesc = Object.getOwnPropertyDescriptor(
      document.documentElement,
      "scrollHeight",
    );

    Object.defineProperty(window, "scrollY", { configurable: true, get: () => 400 });
    Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 800 });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => 2400,
    });

    try {
      const { container: indicatorContainer } = render(
        <AutoSaveIndicator isSaving={true} lastSaved={new Date()} />,
      );
      expect(indicatorContainer.firstElementChild?.className).toContain("pointer-events-none");

      const { container: scrollContainer } = render(<ScrollButton />);
      const scrollWrapper = scrollContainer.firstElementChild as HTMLElement;

      renderAppAt("/");
      await screen.findByPlaceholderText("Search students...");

      vi.useFakeTimers();

      fireEvent.click(screen.getByRole("button", { name: /Quick Gradebook/i }));
      const examInput = screen.getByLabelText("Student One Exam Score") as HTMLInputElement;
      const searchInput = screen.getByPlaceholderText("Search students...") as HTMLInputElement;
      const sortSelect = screen.getByLabelText("Sort students") as HTMLSelectElement;

      const mobileBar = screen.getByLabelText("Mobile bottom navigation");
      const mobilePill = mobileBar.firstElementChild as HTMLElement;
      expect(mobileBar).toHaveAttribute("data-hide-on-mobile-sheet", "true");

      expect(mobileBar.className).not.toContain("invisible");
      expect(mobilePill.className).toContain("pointer-events-auto");
      expect(scrollWrapper.className).not.toContain("max-md:pointer-events-none");

      // Focusing a <select> must NOT hide mobile chrome (iOS keeps <select> active after picker closes)
      act(() => {
        sortSelect.focus();
      });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(mobileBar.className).not.toContain("invisible");

      // Focusing an editable input hides mobile nav pill + ScrollButton hit-testing
      act(() => {
        examInput.focus();
      });
      expect(mobileBar).toHaveAttribute("aria-hidden", "true");
      expect(mobileBar.className).toContain("invisible");
      expect(mobilePill.className).toContain("pointer-events-none");
      expect(scrollWrapper.className).toContain("max-md:pointer-events-none");
      expect(scrollWrapper.className).toContain("max-md:invisible");

      // Rapid blur -> focus to another input within 180ms keeps overlays continuously hidden
      act(() => {
        fireEvent.blur(examInput);
        vi.advanceTimersByTime(100);
      });
      expect(mobileBar.className).toContain("invisible");
      act(() => {
        searchInput.focus();
        vi.advanceTimersByTime(200);
      });
      expect(mobileBar.className).toContain("invisible");

      // Blur to non-editable body restores mobile overlays after 180ms settle window
      act(() => {
        searchInput.blur();
        fireEvent.focusOut(searchInput);
        vi.advanceTimersByTime(150);
      });
      expect(mobileBar.className).toContain("invisible");

      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(mobileBar.className).not.toContain("invisible");
      expect(mobilePill.className).toContain("pointer-events-auto");
      expect(scrollWrapper.className).not.toContain("max-md:pointer-events-none");
    } finally {
      vi.useRealTimers();
      if (originalScrollYDesc) {
        Object.defineProperty(window, "scrollY", originalScrollYDesc);
      }
      if (originalInnerHeightDesc) {
        Object.defineProperty(window, "innerHeight", originalInnerHeightDesc);
      }
      if (originalScrollHeightDesc) {
        Object.defineProperty(document.documentElement, "scrollHeight", originalScrollHeightDesc);
      }
    }
  });
});
