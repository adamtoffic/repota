import fs from "node:fs";
import path from "node:path";
import { act, render, screen, within } from "@testing-library/react";
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
  subscribeToStorageSync: vi.fn(() => () => {}),
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

import { Button, IconButton } from "../components/ui";
import { PageHeader } from "../components/ui/PageHeader";
import { DashboardToolbar } from "../components/DashboardToolbar";
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
  schoolName: "A11y Academy",
  academicYear: "2026/2027",
  term: "First Term",
  level: "JHS",
  defaultSubjects: ["English", "Mathematics"],
  totalAttendanceDays: 80,
  classScoreMax: 50,
  examScoreMax: 50,
  classSize: 30,
  nextTermStarts: "2027-01-12",
  headTeacherName: "Head Teacher",
  classTeacherName: "Class Teacher",
  className: "JHS 1",
  phoneNumber: "0200000000",
  address: "Accra",
  email: "a11y@example.com",
  schoolMotto: "Access For All",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  examType: "TERMLY",
  componentLibrary: [],
  subjectComponentMap: {},
};

const demoStudents: StudentRecord[] = [
  {
    id: "stu-1",
    name: "Ama Mensah",
    className: "JHS 1",
    gender: "Female",
    attendancePresent: 75,
    subjects: [
      { id: "s1", name: "English", classScore: 40, examScore: 42 },
      { id: "s2", name: "Mathematics", classScore: 38, examScore: 40 },
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

  return { ...utils, router: testRouter };
}

describe("Accessibility foundation (WCAG P0)", () => {
  beforeAll(async () => {
    await Promise.all([
      import("../pages/Dashboard"),
      import("../pages/SbaPage"),
      import("../pages/Analytics"),
      import("../pages/PrintPreview"),
      import("../pages/settings/SettingsHub"),
      import("../pages/settings/SettingsAcademicPage"),
    ]);
  }, 30000);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setUnsavedChanges(false);
    storage.initStorage.mockReset().mockResolvedValue(undefined);
    storage.migrateFromLocalStorage
      .mockReset()
      .mockResolvedValue({ success: true, studentsCount: 0 });
    storage.saveToStorage.mockReset().mockResolvedValue(true);
    storage.saveEntriesToStorage.mockReset().mockResolvedValue(true);
    storage.loadFromStorageResult.mockReset().mockImplementation(async (key: string) => {
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

  it("allows mobile pinch-to-zoom in index.html viewport meta", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
    const viewportMatch = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/i);
    expect(viewportMatch).not.toBeNull();
    const content = viewportMatch![1];
    expect(content).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(content).not.toMatch(/maximum-scale\s*=\s*1(\.0)?/i);
  });

  it("renders skip link, labeled navigation landmarks, header landmark, and single h1 across routes", async () => {
    const { router, container } = renderAppAt("/");

    const skipLink = await screen.findByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");

    expect(screen.getByLabelText("Sidebar navigation")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Mobile bottom navigation" }),
    ).toBeInTheDocument();

    const shellRoutes: Array<"/" | "/sba" | "/analytics" | "/settings" | "/settings/academic"> = [
      "/",
      "/sba",
      "/analytics",
      "/settings",
      "/settings/academic",
    ];

    for (const to of shellRoutes) {
      await act(async () => {
        await router.navigate({ to });
        await vi.dynamicImportSettled();
      });

      const main = container.querySelector("main#main-content");
      expect(main).not.toBeNull();
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      if (to === "/") {
        const interactiveInsideSrOnly = Array.from(main!.querySelectorAll("a, button")).filter(
          (el) => el.closest(".sr-only, .max-md\\:sr-only"),
        );
        expect(interactiveInsideSrOnly).toHaveLength(0);
      }
    }

    await act(async () => {
      await router.navigate({ to: "/print" });
      await vi.dynamicImportSettled();
    });
    expect(container.querySelector("main#main-content")).not.toBeNull();
    const printToolbar = screen.getByTestId("print-sticky-toolbar");
    expect(within(printToolbar).getByRole("heading", { level: 1, name: "Print Preview" })).toBeInTheDocument();
  }, 15000);

  it("renders PageHeader as a header landmark without an h1", () => {
    const { container } = render(<PageHeader schoolName="A11y Academy" />);
    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("nav")).toBeNull();
    expect(container.querySelector("h1")).toBeNull();
  });

  it("defaults Button and IconButton to type='button' with focus-visible rings", () => {
    render(
      <div>
        <Button>Save</Button>
        <IconButton aria-label="Edit">
          <span aria-hidden="true">E</span>
        </IconButton>
      </div>,
    );

    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn.className).toContain("focus-visible:ring-2");

    const iconBtn = screen.getByRole("button", { name: "Edit" });
    expect(iconBtn).toHaveAttribute("type", "button");
    expect(iconBtn.className).toContain("focus-visible:ring-2");
  });

  it("provides student-specific aria-labels on desktop StudentList actions and aria-pressed on filter pills", async () => {
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 960 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });

    try {
      renderAppAt("/");

      const table = await screen.findByRole("table");
      expect(
        within(table).getByRole("button", { name: "Edit scores for Ama Mensah" }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("link", { name: "Print report for Ama Mensah" }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("button", { name: "Delete Ama Mensah" }),
      ).toBeInTheDocument();

      render(
        <DashboardToolbar
          searchQuery=""
          onSearchChange={() => {}}
          activeFilter="ALL"
          onFilterChange={() => {}}
          onExport={() => {}}
          onDeletePending={() => {}}
          onAutoRemarks={() => {}}
          onClearScores={() => {}}
          onExportStudentList={() => {}}
        />,
      );

      const allFilter = screen.getByRole("button", { name: "All" });
      expect(allFilter).toHaveAttribute("type", "button");
      expect(allFilter).toHaveAttribute("aria-pressed", "true");
    } finally {
      if (origOffsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", origOffsetWidth);
      if (origOffsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", origOffsetHeight);
    }
  });

  it("labels subject removal buttons in AcademicSessionSection", async () => {
    renderAppAt("/settings/academic");

    expect(await screen.findByRole("button", { name: "Remove English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Mathematics" })).toBeInTheDocument();
  });
});
