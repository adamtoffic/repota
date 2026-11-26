import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<Record<string, unknown>> }) =>
      React.cloneElement(children, { width: 400, height: 300 }),
  };
});

import { BarChart, BarChartTooltip } from "../components/charts/BarChart";
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
  schoolName: "Responsive Academy",
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
  className: "JHS 2A",
  phoneNumber: "0200000000",
  address: "Accra",
  email: "resp@example.com",
  schoolMotto: "Excellence",
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
    className: "JHS 2A",
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

describe("Responsive breakpoints and live UX bug fixes (Branch 3)", () => {
  beforeAll(async () => {
    await Promise.all([
      import("../pages/Dashboard"),
      import("../pages/PrintPreview"),
      import("../pages/settings/SettingsAcademicPage"),
      import("../pages/settings/SettingsTemplatesPage"),
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
    vi.restoreAllMocks();
  });

  it("allows backspacing and editing hex color inputs cleanly in ReportTemplateSection and reverts invalid drafts on blur", async () => {
    renderAppAt("/settings/templates");

    const primaryHex = (await screen.findByLabelText("Primary hex color")) as HTMLInputElement;
    const accentHex = screen.getByLabelText("Accent hex color") as HTMLInputElement;

    expect(primaryHex.value).toBe("#1e3a8a");

    // Partial typing stays in input instead of immediately snapping back to #1e3a8a
    fireEvent.change(primaryHex, { target: { value: "#ff" } });
    expect(primaryHex.value).toBe("#ff");

    // Completing a valid 6-digit hex updates the active color picker too
    fireEvent.change(primaryHex, { target: { value: "#112233" } });
    expect(primaryHex.value).toBe("#112233");
    const primaryPicker = screen.getByLabelText("Primary Color") as HTMLInputElement;
    expect(primaryPicker.value).toBe("#112233");

    // Typing an incomplete accent hex preserves draft during editing, then reverts on blur
    fireEvent.change(accentHex, { target: { value: "#ab" } });
    expect(accentHex.value).toBe("#ab");
    fireEvent.blur(accentHex);
    expect(accentHex.value).toBe("#d97706");
  });

  it("generates unique gradient IDs across multiple BarCharts and formats tooltips accurately", () => {
    const { container } = render(
      <div>
        <BarChart
          data={[{ label: "70-79", value: 4 }]}
          valueFormatter={(v) => `${v} ${v === 1 ? "student" : "students"}`}
        />
        <BarChart
          data={[{ label: "Math", value: 78 }]}
          valueFormatter={(v) => `${v}%`}
        />
      </div>,
    );

    const gradientIds = Array.from(container.querySelectorAll("linearGradient")).map((el) => el.id);
    expect(gradientIds).toHaveLength(2);
    expect(new Set(gradientIds).size).toBe(2);

    const countTooltip = render(
      <BarChartTooltip
        active={true}
        payload={[{ payload: { name: "70-79", fill: "#3b82f6" }, value: 4 }]}
        valueFormatter={(v) => `${v} ${v === 1 ? "student" : "students"}`}
      />,
    );
    expect(screen.getByText("4 students")).toBeInTheDocument();
    expect(screen.queryByText("4%")).not.toBeInTheDocument();
    countTooltip.unmount();

    render(
      <BarChartTooltip
        active={true}
        payload={[{ payload: { name: "Math", fill: "#10b981" }, value: 78 }]}
        valueFormatter={(v) => `${v}%`}
      />,
    );
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("wraps AcademicSessionSection add-subject Input in a flex-1 wrapper", async () => {
    renderAppAt("/settings/academic");
    const subjectInput = await screen.findByLabelText("New subject name");
    expect(subjectInput.closest(".flex-1")).not.toBeNull();
  });

  it("renders a visible Home class context strip without max-md:sr-only and stretches StudentList rank pills + mobile buttons", async () => {
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 1100 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });

    try {
      const { container } = renderAppAt("/");

      const heading = await screen.findByRole("heading", { level: 1, name: "JHS 2A" });
      expect(heading.className).not.toContain("sr-only");
      expect(screen.getByText("Termly (50/50)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Quick add student" })).toBeInTheDocument();

      const table = await screen.findByRole("table");
      expect(table.innerHTML).toContain("min-w-8");

      const mobileCard = screen.getByTestId("mobile-student-card");
      const editBtn = within(mobileCard).getByRole("button", { name: "Edit Scores" });
      expect(editBtn.className).toContain("min-h-11");
      expect(container.querySelector(".lg\\:hidden")).not.toBeNull();
    } finally {
      if (origOffsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", origOffsetWidth);
      if (origOffsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", origOffsetHeight);
    }
  });

  it("renders dynamic PrintPreview screen scale without hardcoded h-[126mm] and supports Fit vs 100% zoom on compact viewports", async () => {
    const origInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    try {
      const { container } = renderAppAt("/print");

      const zoomGroup = await screen.findByRole("group", { name: "Preview zoom" });
      const fitBtn = within(zoomGroup).getByRole("button", { name: "Fit" });
      const fullBtn = within(zoomGroup).getByRole("button", { name: "100%" });
      expect(fitBtn).toHaveAttribute("aria-pressed", "true");

      const wrapper = container.querySelector(".report-wrapper") as HTMLElement;
      expect(wrapper).not.toBeNull();
      expect(wrapper.className).not.toContain("h-[126mm]");
      const stage = container.querySelector(".report-scale-stage") as HTMLElement;
      expect(stage.style.transform).toContain("scale(");

      fireEvent.click(fullBtn);
      expect(fullBtn).toHaveAttribute("aria-pressed", "true");
      expect(stage.style.transform).toBe("");
    } finally {
      Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
    }
  });
});
