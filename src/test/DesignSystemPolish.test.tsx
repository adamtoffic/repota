import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { DashboardStats } from "../components/DashboardStats";
import { StudentList } from "../components/StudentList";
import { ValidationWarnings } from "../components/ValidationWarnings";
import { SchoolContext } from "../context/SchoolContextDefinition";
import type { ProcessedStudent, SchoolSettings } from "../types";
import { DARK_THEME_COLOR, LIGHT_THEME_COLOR } from "../utils/theme";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const baseSettings: SchoolSettings = {
  schoolName: "Design Polish Academy",
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
  email: "polish@example.com",
  schoolMotto: "Excellence",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  examType: "TERMLY",
  componentLibrary: [],
  subjectComponentMap: {},
};

function makeProcessedStudent(
  id: string,
  name: string,
  classPosition: string,
  averageScore: number,
  options: { emptySubjects?: boolean; missingPhoto?: boolean } = {},
): ProcessedStudent {
  return {
    id,
    name,
    className: "JHS 1",
    gender: "Female",
    pictureUrl: options.missingPhoto ? "" : "data:image/png;base64,photo",
    subjects: options.emptySubjects
      ? []
      : [
          {
            id: `${id}-eng`,
            name: "English",
            classScore: 30,
            examScore: Math.max(0, averageScore - 30),
            totalScore: averageScore,
            grade: averageScore >= 80 ? 1 : 5,
            remark: averageScore >= 50 ? "Pass" : "Fail",
          },
          {
            id: `${id}-math`,
            name: "Mathematics",
            classScore: 30,
            examScore: Math.max(0, averageScore - 30),
            totalScore: averageScore,
            grade: averageScore >= 80 ? 1 : 5,
            remark: averageScore >= 50 ? "Pass" : "Fail",
          },
        ],
    totalScore: options.emptySubjects ? 0 : averageScore * 2,
    averageScore: options.emptySubjects ? 0 : averageScore,
    classPosition,
    aggregate: 6,
    attendancePresent: 70,
  };
}

function renderWithRouterAndSchool(ui: React.ReactNode) {
  const rootRoute = createRootRoute({
    component: () => <>{ui}</>,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return render(
    <SchoolContext.Provider
      value={{
        students: [],
        rawStudents: [],
        settings: baseSettings,
        isDataLoaded: true,
        isSaving: false,
        lastSaved: null,
        saveError: null,
        loadError: null,
        isRollbackIncomplete: false,
        activeRecoveryAction: null,
        setActiveRecoveryAction: vi.fn(),
        retryLoad: vi.fn(),
        startFresh: vi.fn(),
        addStudent: vi.fn(),
        updateStudent: vi.fn(),
        batchUpdateStudents: vi.fn(),
        deleteStudent: vi.fn(),
        updateSettings: vi.fn(),
        loadDemoData: vi.fn(),
        clearAllStudents: vi.fn(),
        deletePendingStudents: vi.fn(),
        autoGenerateRemarks: vi.fn(),
        clearAllScores: vi.fn(),
        syncSubjectComponentsFromSettings: vi.fn(),
        syncClassSubjectsAndSba: vi.fn(),
        resetAllData: vi.fn(),
      }}
    >
      <RouterProvider router={router} />
    </SchoolContext.Provider>,
  );
}

describe("Branch 5 design system polish", () => {
  it("bundles self-hosted Inter Variable woff2 and configures warm light & aligned dark tokens while isolating paper", () => {
    const fontPath = path.resolve(
      process.cwd(),
      "src/assets/fonts/inter-latin-wght-normal.woff2",
    );
    expect(fs.existsSync(fontPath)).toBe(true);
    expect(fs.statSync(fontPath).size).toBeGreaterThan(20_000);

    const css = fs.readFileSync(path.resolve(process.cwd(), "src/index.css"), "utf8");
    expect(css).toContain('font-family: "Inter";');
    expect(css).toContain('./assets/fonts/inter-latin-wght-normal.woff2');
    expect(css).toContain("--surface-canvas: #f7f7f5;");
    expect(css).toContain("--surface-canvas: #0b101b;");
    expect(css).toContain("--brand-primary: #2e52b5;");
    expect(css).toMatch(/\.report-page,\s*\[data-paper-surface="true"\]/);
    expect(css).toContain("--surface-card: #ffffff;");

    const html = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
    expect(html).toContain(`"${DARK_THEME_COLOR}"`);
    expect(html).toContain(`"${LIGHT_THEME_COLOR}"`);
  });

  it("removes pulsing animate-ping dots from DashboardStats even when alerts are active", () => {
    const students = [
      makeProcessedStudent("s1", "Pending Student", "Pending...", 0, { emptySubjects: true }),
      makeProcessedStudent("s2", "Failing Student", "2nd", 35),
    ];

    const { container } = render(
      <DashboardStats
        students={students}
        settings={baseSettings}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
      />,
    );

    expect(container.querySelector(".animate-ping")).toBeNull();
    expect(screen.getByText("Pending Entry")).toBeInTheDocument();
    expect(screen.getByText("Pass Rate")).toBeInTheDocument();
  });

  it("highlights Top 3 positions in Repota Gold and keeps 4th+ ranks neutral in StudentList", async () => {
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 960 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });

    try {
      const students = [
        makeProcessedStudent("s1", "First Student", "1st", 92),
        makeProcessedStudent("s2", "Second Student", "2nd", 88),
        makeProcessedStudent("s3", "Third Student", "3rd", 84),
        makeProcessedStudent("s4", "Fourth Student", "4th", 76),
      ];

      renderWithRouterAndSchool(
        <StudentList
          students={students}
          onAddStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
          onEditStudent={vi.fn()}
        />,
      );

      const table = await screen.findByRole("table");
      for (const topRank of ["1st", "2nd", "3rd"]) {
        const badge = within(table).getByText(topRank);
        expect(badge.className).toContain("amber-");
      }
      const fourthBadge = within(table).getByText("4th");
      expect(fourthBadge.className).toContain("bg-subtle");
      expect(fourthBadge.className).not.toContain("amber-");
    } finally {
      if (origOffsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", origOffsetWidth);
      if (origOffsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", origOffsetHeight);
    }
  });

  it("renders ValidationWarnings without duplicate warning emoji while keeping interactive filter toggles", () => {
    const onFilterChange = vi.fn();
    const students = [
      makeProcessedStudent("s1", "Ama Mensah", "Pending...", 0, {
        emptySubjects: true,
        missingPhoto: true,
      }),
    ];

    render(
      <ValidationWarnings
        students={students}
        settings={baseSettings}
        activeFilter="ALL"
        onFilterChange={onFilterChange}
      />,
    );

    const noScoresBtn = screen.getByRole("button", { name: /1 student has no scores entered/i });
    expect(noScoresBtn.textContent).not.toContain("⚠️");
    fireEvent.click(noScoresBtn);
    expect(onFilterChange).toHaveBeenCalledWith("NO_SCORES");
  });
});
