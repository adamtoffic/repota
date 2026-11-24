import { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import posthog from "posthog-js";
import { SubjectRow } from "../components/SubjectRow";
import { AcademicTab } from "../components/tabs/AcademicTab";
import { DetailsTab } from "../components/tabs/DetailsTab";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { QuickGradebook } from "../components/QuickGradebook";
import { DashboardStats } from "../components/DashboardStats";
import { Dashboard } from "../pages/Dashboard";
import { PrintPreview } from "../pages/PrintPreview";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { ToastContext } from "../context/ToastContextDefinition";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";
import { resetSessionAnalyticsGuards } from "../utils/analytics";
import {
  assignPositions,
  assignSubjectPositions,
  processStudent,
} from "../utils/gradeCalculator";
import { hasNoScoresEntered, sortStudents } from "../utils/studentValidation";
import indexCss from "../index.css?raw";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  useSearch: () => ({ id: undefined }),
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

const testSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 6",
  level: "JHS",
  defaultSubjects: ["Mathematics", "English"],
  classScoreMax: 50,
  examScoreMax: 50,
  examType: "TERMLY",
};

function makeStudent(
  id: string,
  name: string,
  subjects: SavedSubject[],
  averageScore = 0,
): ProcessedStudent {
  return {
    id,
    name,
    className: "Basic 6",
    gender: "Female",
    subjects,
    totalScore: subjects.reduce((acc, s) => acc + s.classScore + s.examScore, 0),
    averageScore,
    classPosition: averageScore > 0 ? "1st" : "Pending...",
    aggregate: undefined,
  };
}

function makeSchoolContext(students: ProcessedStudent[], settings = testSettings): SchoolContextType {
  return {
    students,
    settings,
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    loadError: null,
    isPersistenceSuspended: false,
    retryLoad: vi.fn(),
    suspendPersistence: vi.fn(),
    addStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
    deletePendingStudents: vi.fn(),
    updateSettings: vi.fn(),
    loadDemoData: vi.fn(),
    resetSchoolData: vi.fn(),
    importBackupData: vi.fn(),
    autoGenerateRemarks: vi.fn(),
    clearAllScores: vi.fn(),
    clearAllStudents: vi.fn(),
    clearStudentScores: vi.fn(),
    resetAllAppData: vi.fn().mockResolvedValue(true),
    detectComponentMismatches: () => ({
      hasOutdated: false,
      hasMissing: false,
      outdatedStudents: [],
      missingStudents: [],
    }),
    syncSubjectComponentsFromSettings: vi.fn(),
  };
}

describe("Phase 3 Teacher UX & Score Entry", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetSessionAnalyticsGuards();
    vi.clearAllMocks();
  });

  describe("SubjectRow input sync", () => {
    it("clears displayed exam input immediately when examScore is reset externally to 0", () => {
      const subject: SavedSubject = {
        id: "sub-1",
        name: "Mathematics",
        classScore: 30,
        examScore: 40, // 80/100
      };
      const onChange = vi.fn();

      const { rerender } = render(
        <SubjectRow
          subject={subject}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={onChange}
        />,
      );

      const examInput = screen.getByLabelText("Mathematics Exam Score") as HTMLInputElement;
      expect(examInput.value).toBe("80");

      rerender(
        <SubjectRow
          subject={{ ...subject, classScore: 0, examScore: 0 }}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={onChange}
        />,
      );

      expect((screen.getByLabelText("Mathematics Exam Score") as HTMLInputElement).value).toBe("");
    });
  });

  describe("AcademicTab & ScoreEntryModal ergonomics", () => {
    it("shows accurate 'Changes auto-save' copy in AcademicTab", () => {
      const student = makeStudent("s1", "Student One", [
        { id: "sub-1", name: "Mathematics", classScore: 25, examScore: 35 },
        { id: "sub-2", name: "English", classScore: 20, examScore: 30 },
      ]);
      const ctx = makeSchoolContext([student]);

      render(
        <SchoolContext.Provider value={ctx}>
          <AcademicTab student={student} level="JHS" onUpdate={vi.fn()} />
        </SchoolContext.Provider>,
      );

      expect(screen.getByText("Changes auto-save")).toBeInTheDocument();
      expect(screen.queryByText(/Auto-saves on blur/i)).not.toBeInTheDocument();
    });

    it("renders mobile thumb-zone footer controls and ignores swipes inside numeric inputs", () => {
      const students = [
        makeStudent("s1", "Student One", [
          { id: "sub-1", name: "Mathematics", classScore: 25, examScore: 35 },
        ]),
        makeStudent("s2", "Student Two", [
          { id: "sub-2", name: "Mathematics", classScore: 30, examScore: 40 },
        ]),
      ];
      const ctx = makeSchoolContext(students);
      const onNavigate = vi.fn();
      const onClose = vi.fn();

      render(
        <SchoolContext.Provider value={ctx}>
          <ScoreEntryModal
            student={students[0]}
            level="JHS"
            isOpen={true}
            onClose={onClose}
            onUpdateStudent={vi.fn()}
            allStudents={students}
            onNavigate={onNavigate}
          />
        </SchoolContext.Provider>,
      );

      const footer = screen.getByTestId("mobile-modal-footer");
      expect(within(footer).getByRole("button", { name: "Previous student" })).toBeDisabled();
      const nextBtn = within(footer).getByRole("button", { name: "Next student" });
      fireEvent.click(nextBtn);
      expect(onNavigate).toHaveBeenCalledWith("s2");

      onNavigate.mockClear();

      // Swipe starting inside a score input should NOT trigger navigation
      const examInput = screen.getByLabelText("Mathematics Exam Score");
      fireEvent.touchStart(examInput, { touches: [{ clientX: 300, clientY: 100 }] });
      fireEvent.touchEnd(examInput, { changedTouches: [{ clientX: 50, clientY: 100 }] });
      expect(onNavigate).not.toHaveBeenCalled();

      // Swipe on modal surface itself DOES trigger navigation
      const dialog = screen.getByRole("dialog").firstElementChild as HTMLElement;
      fireEvent.touchStart(dialog, { touches: [{ clientX: 300, clientY: 100 }] });
      fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 50, clientY: 100 }] });
      expect(onNavigate).toHaveBeenCalledWith("s2");
    });
  });

  describe("sortStudents utility", () => {
    const completeHigh = makeStudent(
      "a",
      "Zara Mensah",
      [
        { id: "1", name: "Mathematics", classScore: 40, examScore: 45 },
        { id: "2", name: "English", classScore: 42, examScore: 40 },
      ],
      84,
    );
    const completeLow = makeStudent(
      "b",
      "Ama Boateng",
      [
        { id: "3", name: "Mathematics", classScore: 25, examScore: 25 },
        { id: "4", name: "English", classScore: 30, examScore: 20 },
      ],
      50,
    );
    const pendingStudent = makeStudent(
      "c",
      "Kojo Antwi",
      [{ id: "5", name: "Mathematics", classScore: 0, examScore: 0 }],
      0,
    );
    const list = [completeHigh, completeLow, pendingStudent];

    it("sorts deterministically by name, average, and completeness without mutating input", () => {
      expect(sortStudents(list, "NAME_ASC").map((s) => s.name)).toEqual([
        "Ama Boateng",
        "Kojo Antwi",
        "Zara Mensah",
      ]);
      expect(sortStudents(list, "NAME_DESC").map((s) => s.name)).toEqual([
        "Zara Mensah",
        "Kojo Antwi",
        "Ama Boateng",
      ]);
      expect(sortStudents(list, "AVG_DESC").map((s) => s.id)).toEqual(["a", "b", "c"]);
      expect(sortStudents(list, "AVG_ASC").map((s) => s.id)).toEqual(["c", "b", "a"]);
      expect(
        sortStudents(list, "INCOMPLETE_FIRST", testSettings).map((s) => s.id),
      ).toEqual(["c", "b", "a"]);
      // Input untouched
      expect(list.map((s) => s.id)).toEqual(["a", "b", "c"]);
    });
  });

  describe("QuickGradebook", () => {
    it("updates subject scores inline, advances focus on Enter, and adds missing subjects", () => {
      const students = [
        makeStudent("s1", "Student One", [
          { id: "m1", name: "Mathematics", classScore: 20, examScore: 25 },
          { id: "e1", name: "English", classScore: 30, examScore: 30 },
        ]),
        makeStudent("s2", "Student Two", [
          { id: "m2", name: "Mathematics", classScore: 0, examScore: 0 },
        ]),
      ];
      const onUpdateStudent = vi.fn();

      render(
        <QuickGradebook
          students={students}
          settings={testSettings}
          onUpdateStudent={onUpdateStudent}
        />,
      );

      // Update Student One's Mathematics Exam Score (/100 -> converted to /50)
      const s1Exam = screen.getByLabelText("Student One Exam Score") as HTMLInputElement;
      fireEvent.change(s1Exam, { target: { value: "80" } });
      expect(onUpdateStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "s1",
          subjects: expect.arrayContaining([
            expect.objectContaining({ id: "m1", examScore: 40 }),
          ]),
        }),
        true,
      );

      // Pressing Enter moves focus to Student Two's Exam Score
      const s2Exam = screen.getByLabelText("Student Two Exam Score") as HTMLInputElement;
      fireEvent.keyDown(s1Exam, { key: "Enter" });
      expect(document.activeElement).toBe(s2Exam);

      // Switch to English: Student Two lacks English and gets an "+ Add Subject" action
      fireEvent.change(screen.getByLabelText("Gradebook subject"), {
        target: { value: "English" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add Subject/i }));
      expect(onUpdateStudent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: "s2",
          subjects: expect.arrayContaining([expect.objectContaining({ name: "English" })]),
        }),
        true,
      );
    });

    it("filters to unscored students without dropping a row mid-entry when 'Unscored only' is active", () => {
      const initialStudents = [
        makeStudent("s1", "Scored Student", [
          { id: "m1", name: "Mathematics", classScore: 30, examScore: 40 },
        ]),
        makeStudent("s2", "Unscored Student", [
          { id: "m2", name: "Mathematics", classScore: 0, examScore: 0 },
        ]),
      ];

      function ControlledGradebook() {
        const [rows, setRows] = useState<ProcessedStudent[]>(initialStudents);
        return (
          <QuickGradebook
            students={rows}
            settings={testSettings}
            onUpdateStudent={(updated) => {
              setRows((prev) =>
                prev.map((row) =>
                  row.id === updated.id ? { ...row, subjects: updated.subjects } : row,
                ),
              );
            }}
          />
        );
      }

      render(<ControlledGradebook />);

      expect(screen.getByText("Termly (50/50)")).toBeInTheDocument();
      expect(screen.getByText(/1\. Scored Student/)).toBeInTheDocument();
      expect(screen.getByText(/2\. Unscored Student/)).toBeInTheDocument();

      const filterBtn = screen.getByRole("button", { name: /Unscored only/i });
      fireEvent.click(filterBtn);
      expect(filterBtn).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByText(/Scored Student/)).not.toBeInTheDocument();
      expect(screen.getByText(/Unscored Student/)).toBeInTheDocument();

      // Enter both Class & Exam scores: row stays mounted because it's pinned until toggle off
      fireEvent.change(screen.getByLabelText("Unscored Student Class Score"), {
        target: { value: "35" },
      });
      fireEvent.change(screen.getByLabelText("Unscored Student Exam Score"), {
        target: { value: "80" },
      });
      expect(screen.getByText(/Unscored Student/)).toBeInTheDocument();

      // Toggle off and back on: now both students are scored, showing completion state
      fireEvent.click(filterBtn);
      expect(screen.getByText(/1\. Scored Student/)).toBeInTheDocument();
      fireEvent.click(filterBtn);
      expect(screen.getByText(/All students have scores entered for this view/i)).toBeInTheDocument();
    });

    it("preserves roll order and advances focus downward when Student B overtakes Student A through assignPositions", () => {
      const initialRecords: StudentRecord[] = [
        {
          id: "sA",
          name: "Student A",
          className: "Basic 6",
          subjects: [{ id: "mA", name: "Mathematics", classScore: 10, examScore: 10 }],
        },
        {
          id: "sB",
          name: "Student B",
          className: "Basic 6",
          subjects: [{ id: "mB", name: "Mathematics", classScore: 0, examScore: 0 }],
        },
        {
          id: "sC",
          name: "Student C",
          className: "Basic 6",
          subjects: [{ id: "mC", name: "Mathematics", classScore: 0, examScore: 0 }],
        },
      ];

      function RollOrderGradebookHarness() {
        const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
        const processed = useMemo(
          () =>
            assignPositions(
              assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
            ),
          [records],
        );

        return (
          <div>
            <div data-testid="positions">
              {processed.map((s) => `${s.id}:${s.classPosition}`).join(",")}
            </div>
            <QuickGradebook
              students={processed}
              allStudents={processed}
              sessionKey="|ALL|DEFAULT"
              settings={testSettings}
              onUpdateStudent={(updated) =>
                setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
              }
            />
          </div>
        );
      }

      render(<RollOrderGradebookHarness />);

      const sBExam = screen.getByLabelText("Student B Exam Score") as HTMLInputElement;
      const sCExam = screen.getByLabelText("Student C Exam Score") as HTMLInputElement;
      sBExam.focus();

      // Entering 80/100 (weighted 40) makes Student B overtake Student A (20) to become 1st
      fireEvent.change(sBExam, { target: { value: "80" } });

      expect(screen.getByTestId("positions").textContent).toBe("sA:2nd,sB:1st,sC:3rd");
      expect(screen.getByText("1. Student A")).toBeInTheDocument();
      expect(screen.getByText("2. Student B")).toBeInTheDocument();
      expect(screen.getByText("3. Student C")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Order locked/i })).not.toBeInTheDocument();

      fireEvent.keyDown(sBExam, { key: "ArrowDown" });
      expect(document.activeElement).toBe(sCExam);

      fireEvent.keyDown(sCExam, { key: "ArrowUp" });
      expect(document.activeElement).toBe(sBExam);

      fireEvent.keyDown(sBExam, { key: "Enter" });
      expect(document.activeElement).toBe(sCExam);
    });

    it("locks row order under score-dependent AVG_DESC sort and re-applies on demand", () => {
      const initialRecords: StudentRecord[] = [
        {
          id: "sA",
          name: "Student A",
          className: "Basic 6",
          subjects: [{ id: "mA", name: "Mathematics", classScore: 10, examScore: 10 }],
        },
        {
          id: "sB",
          name: "Student B",
          className: "Basic 6",
          subjects: [{ id: "mB", name: "Mathematics", classScore: 5, examScore: 5 }],
        },
        {
          id: "sC",
          name: "Student C",
          className: "Basic 6",
          subjects: [{ id: "mC", name: "Mathematics", classScore: 0, examScore: 0 }],
        },
      ];

      function SortedGradebookHarness() {
        const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
        const processed = useMemo(
          () =>
            assignPositions(
              assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
            ),
          [records],
        );
        const sorted = useMemo(
          () => sortStudents(processed, "AVG_DESC", testSettings),
          [processed],
        );

        return (
          <QuickGradebook
            students={sorted}
            allStudents={processed}
            sessionKey="|ALL|AVG_DESC"
            settings={testSettings}
            onUpdateStudent={(updated) =>
              setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            }
          />
        );
      }

      render(<SortedGradebookHarness />);

      const sBExam = screen.getByLabelText("Student B Exam Score") as HTMLInputElement;
      const sCExam = screen.getByLabelText("Student C Exam Score") as HTMLInputElement;
      sBExam.focus();

      // Student B jumps from 10 to 50 total, overtaking Student A (20)
      fireEvent.change(sBExam, { target: { value: "80" } });

      // Row order remains locked at [A, B, C] until teacher clicks Re-apply
      expect(screen.getByText("1. Student A")).toBeInTheDocument();
      expect(screen.getByText("2. Student B")).toBeInTheDocument();
      expect(screen.getByText("3. Student C")).toBeInTheDocument();

      fireEvent.keyDown(sBExam, { key: "ArrowDown" });
      expect(document.activeElement).toBe(sCExam);

      const reapplyBtn = screen.getByRole("button", { name: /Order locked · Re-apply/i });
      fireEvent.click(reapplyBtn);

      expect(screen.getByText("1. Student B")).toBeInTheDocument();
      expect(screen.getByText("2. Student A")).toBeInTheDocument();
      expect(screen.getByText("3. Student C")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Order locked/i })).not.toBeInTheDocument();
    });

    it("keeps the last student mounted and focused mid-typing under parent NO_SCORES filter", () => {
      const initialRecords: StudentRecord[] = [
        {
          id: "sA",
          name: "Scored Alpha",
          className: "Basic 6",
          subjects: [{ id: "mA", name: "Mathematics", classScore: 20, examScore: 30 }],
        },
        {
          id: "sB",
          name: "Unscored Beta",
          className: "Basic 6",
          subjects: [{ id: "mB", name: "Mathematics", classScore: 0, examScore: 0 }],
        },
      ];

      function FilteredGradebookHarness() {
        const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
        const [filterActive, setFilterActive] = useState(true);
        const processed = useMemo(
          () =>
            assignPositions(
              assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
            ),
          [records],
        );
        const filtered = useMemo(
          () => (filterActive ? processed.filter(hasNoScoresEntered) : processed),
          [filterActive, processed],
        );

        return (
          <QuickGradebook
            students={filtered}
            allStudents={processed}
            sessionKey={filterActive ? "|NO_SCORES|DEFAULT" : "|ALL|DEFAULT"}
            settings={testSettings}
            onUpdateStudent={(updated) =>
              setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            }
            onClearParentFilters={() => setFilterActive(false)}
          />
        );
      }

      render(<FilteredGradebookHarness />);

      const classInput = screen.getByLabelText("Unscored Beta Class Score") as HTMLInputElement;
      classInput.focus();

      // First digit immediately fails hasNoScoresEntered (filtered becomes [])
      fireEvent.change(classInput, { target: { value: "4" } });
      expect(screen.getByLabelText("Unscored Beta Class Score")).toBe(classInput);
      expect(document.activeElement).toBe(classInput);

      // Second digit finishes cleanly on the same mounted input
      fireEvent.change(classInput, { target: { value: "45" } });
      expect(classInput.value).toBe("45");

      fireEvent.click(screen.getByRole("button", { name: /Order locked · Re-apply/i }));
      expect(
        screen.getByText(/No students match the current search or filter/i),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Clear Search & Filters/i }));
      expect(screen.getByText("1. Scored Alpha")).toBeInTheDocument();
      expect(screen.getByText("2. Unscored Beta")).toBeInTheDocument();
    });

    it("keeps multi-column Excel pastes (Class then Exam) aligned to each student through assignPositions", () => {
      const initialRecords: StudentRecord[] = [
        {
          id: "sA",
          name: "Student A",
          className: "Basic 6",
          subjects: [{ id: "mA", name: "Mathematics", classScore: 0, examScore: 0 }],
        },
        {
          id: "sB",
          name: "Student B",
          className: "Basic 6",
          subjects: [{ id: "mB", name: "Mathematics", classScore: 0, examScore: 0 }],
        },
        {
          id: "sC",
          name: "Student C",
          className: "Basic 6",
          subjects: [{ id: "mC", name: "Mathematics", classScore: 0, examScore: 0 }],
        },
      ];

      function PasteHarness() {
        const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
        const processed = useMemo(
          () =>
            assignPositions(
              assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
            ),
          [records],
        );

        return (
          <div>
            <div data-testid="summary">
              {processed
                .map((s) => `${s.id}:${s.subjects[0].classScore}/${s.subjects[0].examScore}`)
                .join("|")}
            </div>
            <QuickGradebook
              students={processed}
              allStudents={processed}
              sessionKey="|ALL|DEFAULT"
              settings={testSettings}
              onUpdateStudent={(updated) =>
                setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
              }
            />
          </div>
        );
      }

      render(<PasteHarness />);

      fireEvent.paste(screen.getByLabelText("Student A Class Score"), {
        clipboardData: { getData: () => "20\n45\n10" },
      });
      fireEvent.paste(screen.getByLabelText("Student A Exam Score"), {
        clipboardData: { getData: () => "60\n80\n90" },
      });

      expect(screen.getByTestId("summary").textContent).toBe("sA:20/30|sB:45/40|sC:10/45");
    });

    it("supports single-column EXAM_ONLY and CLASS_ONLY focus modes with per-column Unscored filtering", () => {
      const initialRecords: StudentRecord[] = [
        {
          id: "sA",
          name: "Student A",
          className: "Basic 6",
          subjects: [{ id: "mA", name: "Mathematics", classScore: 30, examScore: 0 }],
        },
        {
          id: "sB",
          name: "Student B",
          className: "Basic 6",
          subjects: [{ id: "mB", name: "Mathematics", classScore: 0, examScore: 40 }],
        },
      ];

      function ColumnModeHarness() {
        const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
        const processed = useMemo(
          () =>
            assignPositions(
              assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
            ),
          [records],
        );

        return (
          <QuickGradebook
            students={processed}
            allStudents={processed}
            sessionKey="|ALL|DEFAULT"
            settings={testSettings}
            onUpdateStudent={(updated) =>
              setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            }
          />
        );
      }

      render(<ColumnModeHarness />);

      const columnSelect = screen.getByLabelText("Gradebook score column") as HTMLSelectElement;

      // Default CLASS_EXAM shows both inputs per row
      expect(screen.getByLabelText("Student A Class Score")).toBeInTheDocument();
      expect(screen.getByLabelText("Student A Exam Score")).toBeInTheDocument();

      // Switch to EXAM_ONLY: only Exam inputs exist in DOM (so iOS ▼ steps 1 row per tap)
      fireEvent.change(columnSelect, { target: { value: "EXAM_ONLY" } });
      expect(screen.queryByLabelText("Student A Class Score")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Student B Class Score")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Student A Exam Score")).toBeInTheDocument();
      expect(screen.getByLabelText("Student B Exam Score")).toBeInTheDocument();
      expect(screen.getByText("Avg: 80.0/100")).toBeInTheDocument();

      // Unscored only in EXAM_ONLY shows only Student A (examScore === 0)
      fireEvent.click(screen.getByRole("button", { name: /Unscored only/i }));
      expect(screen.getByText(/Student A/)).toBeInTheDocument();
      expect(screen.queryByText(/Student B/)).not.toBeInTheDocument();

      // Switch to CLASS_ONLY: only Class inputs exist, and Unscored shows only Student B
      fireEvent.change(columnSelect, { target: { value: "CLASS_ONLY" } });
      expect(screen.queryByLabelText("Student B Exam Score")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Student B Class Score")).toBeInTheDocument();
      expect(screen.queryByText(/Student A/)).not.toBeInTheDocument();
      expect(screen.getByText("Avg: 30.0/50")).toBeInTheDocument();
    });

    it("renders iOS-safe text numeric inputs and defers Exam draft normalization until after blur", () => {
      vi.useFakeTimers();
      try {
        const initialRecords: StudentRecord[] = [
          {
            id: "sA",
            name: "Student A",
            className: "Basic 6",
            subjects: [{ id: "mA", name: "Mathematics", classScore: 20, examScore: 0 }],
          },
          {
            id: "sB",
            name: "Student B",
            className: "Basic 6",
            subjects: [{ id: "mB", name: "Mathematics", classScore: 25, examScore: 0 }],
          },
        ];

        function BlurDraftHarness() {
          const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
          const processed = useMemo(
            () =>
              assignPositions(
                assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
              ),
            [records],
          );
          return (
            <QuickGradebook
              students={processed}
              allStudents={processed}
              sessionKey="|ALL|DEFAULT"
              settings={testSettings}
              onUpdateStudent={(updated) =>
                setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
              }
            />
          );
        }

        render(<BlurDraftHarness />);

        const sAClass = screen.getByLabelText("Student A Class Score") as HTMLInputElement;
        const sAExam = screen.getByLabelText("Student A Exam Score") as HTMLInputElement;

        expect(sAClass).toHaveAttribute("type", "text");
        expect(sAClass).toHaveAttribute("inputmode", "numeric");
        expect(sAClass).toHaveAttribute("pattern", "[0-9]*");
        expect(sAExam).toHaveAttribute("type", "text");
        expect(sAExam).toHaveAttribute("inputmode", "numeric");
        expect(sAExam).toHaveAttribute("pattern", "[0-9]*");

        // Non-numeric text is ignored without wiping the current value
        fireEvent.change(sAClass, { target: { value: "20abc" } });
        expect(sAClass.value).toBe("20");

        // 89/100 converts to 45/50 while preserving exact raw "89"
        fireEvent.change(sAExam, { target: { value: "89" } });
        expect(sAExam.value).toBe("89");
        fireEvent.blur(sAExam);
        act(() => {
          vi.advanceTimersByTime(190);
        });
        expect(sAExam.value).toBe("89");

        // Non-canonical numeric draft "89." is held across the 180ms WebKit settle window before normalizing
        fireEvent.focus(sAExam);
        fireEvent.change(sAExam, { target: { value: "89." } });
        expect(sAExam.value).toBe("89.");

        fireEvent.blur(sAExam);
        act(() => {
          vi.advanceTimersByTime(150);
        });
        expect(sAExam.value).toBe("89.");

        act(() => {
          vi.advanceTimersByTime(40);
        });
        expect(sAExam.value).toBe("89");
      } finally {
        vi.useRealTimers();
      }
    });

    it("renders rows inside a semantic form without overflow-hidden and links explicit htmlFor labels outside score inputs", () => {
      const sbaSettings: SchoolSettings = {
        ...testSettings,
        componentLibrary: [{ name: "Quiz 1", maxScore: 20, category: "CAT" }],
        subjectComponentMap: {
          Mathematics: [{ name: "Quiz 1", maxScore: 20, category: "CAT" }],
        },
      };
      const studentRecords = [
        makeStudent("stu/1", "Student Alpha", [
          {
            id: "sub-alpha",
            name: "Mathematics",
            classScore: 15,
            examScore: 30,
          },
        ]),
        makeStudent("stu/2", "Student Beta", [
          {
            id: "sub-beta",
            name: "Mathematics",
            classScore: 10,
            examScore: 25,
            classScoreComponents: [{ id: "c1", name: "Quiz 1", maxScore: 20, score: 10 }],
          },
        ]),
      ];

      const { container } = render(
        <QuickGradebook
          students={studentRecords}
          settings={sbaSettings}
          onUpdateStudent={vi.fn()}
        />,
      );

      expect(container.firstElementChild?.className).not.toContain("overflow-hidden");
      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();

      const alphaClass = screen.getByLabelText("Student Alpha Class Score") as HTMLInputElement;
      const alphaExam = screen.getByLabelText("Student Alpha Exam Score") as HTMLInputElement;
      for (const input of [alphaClass, alphaExam]) {
        expect(form).toContainElement(input);
        expect(input.closest("label")).toBeNull();
        expect(input.id).toBeTruthy();
        expect(input.name).toBe(input.id);
        expect(input.className).toContain("scroll-mt-24");
        expect(input.className).toContain("scroll-mb-40");
        expect(container.querySelector(`label[for="${input.id}"]`)).toBeInTheDocument();
      }

      // Switch to SBA task column and confirm sibling label + input structure
      fireEvent.change(screen.getByLabelText("Gradebook score column"), {
        target: { value: "COMP:Quiz 1" },
      });
      const betaQuiz = screen.getByLabelText("Student Beta Quiz 1 Score") as HTMLInputElement;
      expect(form).toContainElement(betaQuiz);
      expect(betaQuiz.closest("label")).toBeNull();
      expect(betaQuiz.id).toBeTruthy();
      expect(container.querySelector(`label[for="${betaQuiz.id}"]`)).toBeInTheDocument();
    });
  });

  describe("Dashboard stable entry & modal navigation", () => {
    it("switches PageHeader off sticky positioning in Quick Gradebook and suppresses ValidationWarnings", () => {
      localStorage.setItem("repota_welcome_tour_v2", "true");
      try {
        const records: StudentRecord[] = [
          {
            id: "sA",
            name: "Student A",
            className: "Basic 6",
            subjects: [{ id: "mA", name: "Mathematics", classScore: 0, examScore: 0 }],
          },
        ];
        const processed = assignPositions(
          assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
        );
        const ctx = makeSchoolContext(processed, testSettings);

        const { container } = render(
          <SchoolContext.Provider value={ctx}>
            <Dashboard />
          </SchoolContext.Provider>,
        );

        const headerNav = container.querySelector("nav");
        expect(headerNav?.className).toContain("sticky");
        expect(screen.getByText(/1 student has no scores entered/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Quick Gradebook/i }));
        expect(headerNav?.className).not.toContain("sticky");
        expect(headerNav?.className).toContain("relative");
        expect(screen.queryByText(/1 student has no scores entered/i)).not.toBeInTheDocument();
      } finally {
        localStorage.removeItem("repota_welcome_tour_v2");
      }
    });

    it("keeps DashboardStats Pending Entry and Pass Rate cards mounted as the same button node when counts cross 0", () => {
      const pendingStudent = makeStudent("s1", "Student One", [
        { id: "m1", name: "Mathematics", classScore: 0, examScore: 0 },
        { id: "e1", name: "English", classScore: 0, examScore: 0 },
      ]);
      const passingStudent = makeStudent(
        "s1",
        "Student One",
        [
          { id: "m1", name: "Mathematics", classScore: 35, examScore: 40 },
          { id: "e1", name: "English", classScore: 35, examScore: 40 },
        ],
        75,
      );
      const failingStudent = makeStudent(
        "s1",
        "Student One",
        [
          { id: "m1", name: "Mathematics", classScore: 10, examScore: 15 },
          { id: "e1", name: "English", classScore: 10, examScore: 15 },
        ],
        25,
      );
      const onFilterChange = vi.fn();

      const { rerender } = render(
        <DashboardStats
          students={[pendingStudent]}
          settings={testSettings}
          activeFilter="ALL"
          onFilterChange={onFilterChange}
        />,
      );

      const pendingBtn = screen.getByRole("button", { name: /Pending Entry/i });
      const passRateBtn = screen.getByRole("button", { name: /Pass Rate/i });
      expect(pendingBtn).toBeEnabled();
      expect(passRateBtn).toBeDisabled();

      // Transition pending 1 -> 0: element identity remains the exact same <button>
      rerender(
        <DashboardStats
          students={[passingStudent]}
          settings={testSettings}
          activeFilter="ALL"
          onFilterChange={onFilterChange}
        />,
      );
      expect(screen.getByRole("button", { name: /Pending Entry/i })).toBe(pendingBtn);
      expect(pendingBtn).toBeDisabled();
      expect(screen.getByRole("button", { name: /Pass Rate/i })).toBe(passRateBtn);

      // Transition failing 0 -> 1: Pass Rate element identity remains the exact same <button>
      rerender(
        <DashboardStats
          students={[failingStudent]}
          settings={testSettings}
          activeFilter="ALL"
          onFilterChange={onFilterChange}
        />,
      );
      expect(screen.getByRole("button", { name: /Pass Rate/i })).toBe(passRateBtn);
      expect(passRateBtn).toBeEnabled();
    });
    it("keeps ScoreEntryModal Next/Prev and QuickGradebook navigation stable when scores change rank under AVG_DESC", () => {
      localStorage.setItem("repota_welcome_tour_v2", "true");
      try {
        const initialRecords: StudentRecord[] = [
          {
            id: "sA",
            name: "Student A",
            className: "Basic 6",
            subjects: [{ id: "mA", name: "Mathematics", classScore: 15, examScore: 15 }],
          },
          {
            id: "sB",
            name: "Student B",
            className: "Basic 6",
            subjects: [{ id: "mB", name: "Mathematics", classScore: 10, examScore: 10 }],
          },
          {
            id: "sC",
            name: "Student C",
            className: "Basic 6",
            subjects: [{ id: "mC", name: "Mathematics", classScore: 5, examScore: 5 }],
          },
        ];

        function DashboardHarness() {
          const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
          const processed = useMemo(
            () =>
              assignPositions(
                assignSubjectPositions(records.map((r) => processStudent(r, testSettings.level))),
              ),
            [records],
          );

          const ctx: SchoolContextType = {
            ...makeSchoolContext(processed, testSettings),
            updateStudent: (updated) =>
              setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r))),
          };

          return (
            <SchoolContext.Provider value={ctx}>
              <Dashboard />
            </SchoolContext.Provider>
          );
        }

        render(<DashboardHarness />);

        // Sort by Average Descending: [Student A (30), Student B (20), Student C (10)]
        fireEvent.change(screen.getByLabelText("Sort students"), {
          target: { value: "AVG_DESC" },
        });

        const dashboardShell = screen.getByTestId("dashboard-background-shell");
        expect(dashboardShell).not.toHaveClass("max-sm:hidden");

        // Open Student B (index 2 of 3)
        fireEvent.click(screen.getAllByText("Student B")[0]);
        expect(screen.getByText("2 / 3")).toBeInTheDocument();
        expect(dashboardShell).toHaveClass("max-sm:hidden");
        expect(document.documentElement.dataset.mobileSheetOpen).toBe("true");

        // Update Student B's Mathematics Exam Score so B overtakes A in live AVG_DESC
        fireEvent.change(screen.getByLabelText("Mathematics Exam Score"), {
          target: { value: "100" },
        });

        // Clicking Next must advance to Student C (3 / 3), NOT jump back to Student A
        const footer = screen.getByTestId("mobile-modal-footer");
        fireEvent.click(within(footer).getByRole("button", { name: "Next student" }));
        expect(screen.getByText("3 / 3")).toBeInTheDocument();
        expect(screen.getByLabelText("Switch student")).toHaveValue("sC");

        // Close modal, switch to Quick Gradebook (current AVG_DESC order is [B (60), A (30), C (10)])
        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(dashboardShell).not.toHaveClass("max-sm:hidden");
        expect(document.documentElement.dataset.mobileSheetOpen).toBeUndefined();
        fireEvent.click(screen.getByRole("button", { name: /Quick Gradebook/i }));

        expect(screen.getByText("1. Student B")).toBeInTheDocument();
        expect(screen.getByText("2. Student A")).toBeInTheDocument();
        expect(screen.getByText("3. Student C")).toBeInTheDocument();

        // Make Student C (total 50) overtake Student A (total 30); row order stays [B, A, C]
        const sAExam = screen.getByLabelText("Student A Exam Score") as HTMLInputElement;
        const sCExam = screen.getByLabelText("Student C Exam Score") as HTMLInputElement;
        sCExam.focus();
        fireEvent.change(sCExam, { target: { value: "90" } });

        fireEvent.keyDown(sCExam, { key: "ArrowUp" });
        expect(document.activeElement).toBe(sAExam);

        // Re-applying sort moves Student C above Student A
        fireEvent.click(screen.getByRole("button", { name: /Order locked · Re-apply/i }));
        expect(screen.getByText("1. Student B")).toBeInTheDocument();
        expect(screen.getByText("2. Student C")).toBeInTheDocument();
        expect(screen.getByText("3. Student A")).toBeInTheDocument();
      } finally {
        localStorage.removeItem("repota_welcome_tour_v2");
      }
    });
  });

  describe("PrintPreview Ready Students filter", () => {
    it("filters to complete students when 'Ready' is toggled", () => {
      const completeStudent = makeStudent(
        "s1",
        "Complete Student",
        [
          { id: "m1", name: "Mathematics", classScore: 35, examScore: 40 },
          { id: "e1", name: "English", classScore: 30, examScore: 35 },
        ],
        70,
      );
      const pendingStudent = makeStudent(
        "s2",
        "Incomplete Student",
        [{ id: "m2", name: "Mathematics", classScore: 0, examScore: 0 }],
        0,
      );

      const ctx = makeSchoolContext([completeStudent, pendingStudent]);
      render(
        <SchoolContext.Provider value={ctx}>
          <PrintPreview />
        </SchoolContext.Provider>,
      );

      expect(screen.getByText("Complete Student")).toBeInTheDocument();
      expect(screen.getByText("Incomplete Student")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Ready (1)" }));
      expect(screen.getByText("Complete Student")).toBeInTheDocument();
      expect(screen.queryByText("Incomplete Student")).not.toBeInTheDocument();
    });

    it("renders visible mobile labels, template style shortcut, and dismissible photo warning outside sticky toolbar", () => {
      const student = makeStudent(
        "s1",
        "Student Photo Missing",
        [{ id: "m1", name: "Mathematics", classScore: 35, examScore: 40 }],
        75,
      );

      const ctx = makeSchoolContext([student]);
      render(
        <SchoolContext.Provider value={ctx}>
          <PrintPreview />
        </SchoolContext.Provider>,
      );

      expect(screen.getByText("Color")).not.toHaveClass("hidden");
      expect(screen.getByText("B&W")).not.toHaveClass("hidden");
      expect(screen.getByText("Print")).not.toHaveClass("hidden");
      expect(screen.getByLabelText("Customize report style")).toHaveAttribute(
        "to",
        "/settings/templates",
      );

      const toolbar = screen.getByTestId("print-sticky-toolbar");
      const warningText = screen.getByText(/1 student missing photo/i);
      expect(toolbar).not.toContainElement(warningText);

      fireEvent.click(screen.getByRole("button", { name: "Dismiss missing photo warning" }));
      expect(screen.queryByText(/1 student missing photo/i)).not.toBeInTheDocument();
    });
  });

  describe("DetailsTab immediate auto-save", () => {
    it("auto-saves text edits immediately through onUpdate without a redundant Save button", () => {
      const student = makeStudent("s1", "Student One", []);
      const ctx = makeSchoolContext([student]);
      const onUpdate = vi.fn();

      render(
        <SchoolContext.Provider value={ctx}>
          <DetailsTab student={student} onUpdate={onUpdate} />
        </SchoolContext.Provider>,
      );

      expect(screen.queryByRole("button", { name: /All Changes Saved/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Save Student Details/i }),
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText("Write a custom remark..."), {
        target: { value: "Focused and diligent." },
      });

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "s1",
          teacherRemark: "Focused and diligent.",
        }),
        true,
      );
    });
  });

  describe("ScoreEntryModal Redesign UX & Guardrails", () => {
    it("displays live student pulse metrics, omits aggregate for KG, shows readiness badges, and tracks MOCK telemetry", () => {
      const scoredStudent: ProcessedStudent = {
        ...makeStudent(
          "s1",
          "Ama Mensah",
          [
            { id: "sub-1", name: "Mathematics", classScore: 40, examScore: 40 },
            { id: "sub-2", name: "English", classScore: 35, examScore: 35 },
          ],
          75,
        ),
        classPosition: "2nd",
        aggregate: 10,
      };
      const ctx = makeSchoolContext([scoredStudent]);

      const { rerender } = render(
        <SchoolContext.Provider value={ctx}>
          <ScoreEntryModal
            student={scoredStudent}
            level="JHS"
            isOpen={true}
            onClose={vi.fn()}
            onUpdateStudent={vi.fn()}
          />
        </SchoolContext.Provider>,
      );

      const pulse = screen.getByTestId("student-pulse-strip");
      expect(within(pulse).getByText("75%")).toBeInTheDocument();
      expect(within(pulse).getByText("10")).toBeInTheDocument();
      expect(within(pulse).getByText("2nd")).toBeInTheDocument();
      expect(within(pulse).getByText(/2\/2/)).toBeInTheDocument();
      expect(screen.getByText("3 missing")).toBeInTheDocument();
      expect(screen.getByLabelText("All subjects complete")).toBeInTheDocument();

      // KG hides Aggregate and Mock mode treats examScore > 0 as complete + reports examType: "MOCK"
      const mockSettings: SchoolSettings = {
        ...testSettings,
        level: "KG",
        examType: "MOCK",
        classScoreMax: 0,
        examScoreMax: 100,
      };
      const mockStudent: ProcessedStudent = {
        ...makeStudent("s1", "Ama Mensah", [
          { id: "sub-1", name: "Mathematics", classScore: 0, examScore: 70 },
        ], 70),
        attendancePresent: 50,
        teacherRemark: "Great progress.",
        pictureUrl: "data:image/png;base64,abc",
      };
      const mockCtx = makeSchoolContext([mockStudent], mockSettings);
      const onUpdateStudent = vi.fn();

      rerender(
        <SchoolContext.Provider value={mockCtx}>
          <ScoreEntryModal
            student={mockStudent}
            level="KG"
            isOpen={true}
            onClose={vi.fn()}
            onUpdateStudent={onUpdateStudent}
          />
        </SchoolContext.Provider>,
      );

      expect(within(screen.getByTestId("student-pulse-strip")).queryByText("Aggregate:")).not.toBeInTheDocument();
      expect(within(screen.getByTestId("student-pulse-strip")).getByText(/1\/1/)).toBeInTheDocument();
      expect(screen.getByLabelText("Details complete")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Mathematics Exam Score"), { target: { value: "82" } });
      expect(posthog.capture).toHaveBeenCalledWith(
        "Score_Entry_Session",
        expect.objectContaining({
          entry_mode: "score_modal",
          exam_type: "MOCK",
          school_level: "KG",
        }),
      );
    });

    it("isolates Escape so pressing Escape closes nested ConfirmModal before ScoreEntryModal", () => {
      const student = makeStudent("s1", "Student One", [
        { id: "sub-1", name: "Mathematics", classScore: 25, examScore: 35 },
      ]);
      const ctx = makeSchoolContext([student]);
      const onClose = vi.fn();

      render(
        <SchoolContext.Provider value={ctx}>
          <ScoreEntryModal
            student={student}
            level="JHS"
            isOpen={true}
            onClose={onClose}
            onUpdateStudent={vi.fn()}
          />
        </SchoolContext.Provider>,
      );

      fireEvent.click(screen.getByRole("button", { name: /Clear all scores/i }));
      expect(screen.getByText("Clear All Scores?")).toBeInTheDocument();

      // First Escape dismisses only ConfirmModal
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByText("Clear All Scores?")).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      // Second Escape closes ScoreEntryModal
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("rejects diagonal scroll swipes while honoring deliberate horizontal swipes", () => {
      const students = [
        makeStudent("s1", "Student One", [
          { id: "sub-1", name: "Mathematics", classScore: 25, examScore: 35 },
        ]),
        makeStudent("s2", "Student Two", [
          { id: "sub-2", name: "Mathematics", classScore: 30, examScore: 40 },
        ]),
      ];
      const ctx = makeSchoolContext(students);
      const onNavigate = vi.fn();

      render(
        <SchoolContext.Provider value={ctx}>
          <ScoreEntryModal
            student={students[0]}
            level="JHS"
            isOpen={true}
            onClose={vi.fn()}
            onUpdateStudent={vi.fn()}
            allStudents={students}
            onNavigate={onNavigate}
          />
        </SchoolContext.Provider>,
      );

      const dialogSheet = screen.getByRole("dialog").firstElementChild as HTMLElement;

      // 45-degree diagonal thumb scroll must NOT navigate
      fireEvent.touchStart(dialogSheet, { touches: [{ clientX: 200, clientY: 200 }] });
      fireEvent.touchEnd(dialogSheet, { changedTouches: [{ clientX: 140, clientY: 140 }] });
      expect(onNavigate).not.toHaveBeenCalled();

      // Deliberate horizontal swipe left navigates to s2
      fireEvent.touchStart(dialogSheet, { touches: [{ clientX: 300, clientY: 100 }] });
      fireEvent.touchEnd(dialogSheet, { changedTouches: [{ clientX: 140, clientY: 110 }] });
      expect(onNavigate).toHaveBeenCalledWith("s2");
    });

    it("keeps modal navigation roster stable under active Dashboard filters until modal closes", () => {
      localStorage.setItem("repota_welcome_tour_v2", "true");
      const initialRecords: StudentRecord[] = [
        {
          id: "s1",
          name: "Alice Mensah",
          className: "Basic 6",
          gender: "Female",
          subjects: [
            { id: "a1", name: "Mathematics", classScore: 0, examScore: 0 },
            { id: "a2", name: "English", classScore: 0, examScore: 0 },
          ],
        },
        {
          id: "s2",
          name: "Bob Owusu",
          className: "Basic 6",
          gender: "Male",
          subjects: [
            { id: "b1", name: "Mathematics", classScore: 0, examScore: 0 },
            { id: "b2", name: "English", classScore: 0, examScore: 0 },
          ],
        },
      ];

      function ControlledDashboard() {
        const [records, setRecords] = useState<StudentRecord[]>(initialRecords);
        const processed = records.map((rec) => processStudent(rec, testSettings.level));
        const ctx: SchoolContextType = {
          ...makeSchoolContext(processed, testSettings),
          updateStudent: (updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          },
        };

        return (
          <ToastContext.Provider value={{ showToast: vi.fn() }}>
            <SchoolContext.Provider value={ctx}>
              <Dashboard />
            </SchoolContext.Provider>
          </ToastContext.Provider>
        );
      }

      render(<ControlledDashboard />);

      // Activate NO_SCORES filter from ValidationWarnings
      fireEvent.click(screen.getByRole("button", { name: /2 students have no scores entered/i }));

      // Open Alice in ScoreEntryModal
      fireEvent.click(screen.getAllByText("Alice Mensah")[0]);
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();

      // Enter Mathematics scores for Alice -> Alice no longer matches NO_SCORES in Dashboard!
      fireEvent.change(within(dialog).getByLabelText("Mathematics Class Score"), {
        target: { value: "35" },
      });
      fireEvent.change(within(dialog).getByLabelText("Mathematics Exam Score"), {
        target: { value: "80" },
      });

      // Modal roster stays locked at 1 / 2 and Next navigates cleanly to Bob Owusu
      expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();
      fireEvent.click(within(dialog).getAllByRole("button", { name: "Next student" })[0]);
      expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
      expect(within(dialog).getByLabelText("Switch student")).toHaveValue("s2");

      // Close modal -> Dashboard now reflects only Bob Owusu under NO_SCORES
      fireEvent.click(within(dialog).getByRole("button", { name: "Close modal" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice Mensah")).not.toBeInTheDocument();
      expect(screen.getAllByText("Bob Owusu").length).toBeGreaterThan(0);
    });

    it("shows honest SubjectRow status badges, single total node, and SBA component clamping", () => {
      const onChange = vi.fn();
      const unscored: SavedSubject = {
        id: "sub-1",
        name: "Mathematics",
        classScore: 0,
        examScore: 0,
        classScoreComponents: [
          { id: "c1", name: "CAT 1", score: 0, maxScore: 10 },
          { id: "c2", name: "Project", score: 0, maxScore: 20 },
        ],
      };

      const { rerender } = render(
        <SubjectRow
          subject={unscored}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={onChange}
        />,
      );

      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();

      // Over-max SBA component clamps to maxScore and reports Max 10
      const catInput = screen.getByLabelText("Mathematics CAT 1 Score");
      fireEvent.change(catInput, { target: { value: "15" } });
      expect(screen.getByText("Max 10")).toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          classScoreComponents: expect.arrayContaining([
            expect.objectContaining({ id: "c1", score: 10 }),
          ]),
        }),
      );

      // Partial state shows Partial + Need exam
      rerender(
        <SubjectRow
          subject={{ ...unscored, classScore: 30, examScore: 0 }}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={onChange}
        />,
      );
      expect(screen.getByText("Partial")).toBeInTheDocument();
      expect(screen.getByText("Need exam")).toBeInTheDocument();

      // Complete state renders exactly one Total node ("75")
      rerender(
        <SubjectRow
          subject={{ ...unscored, classScore: 35, examScore: 40 }}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={onChange}
        />,
      );
      expect(screen.getAllByText("75")).toHaveLength(1);
    });

    it("supports AcademicTab keyboard navigation, SBA hydration, Incomplete pinning, Focus Mode add, and SBA accordion", () => {
      const sbaSettings: SchoolSettings = {
        ...testSettings,
        defaultSubjects: ["Mathematics", "English", "Science"],
        subjectComponentMap: {
          Mathematics: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
          English: [{ name: "Quiz", maxScore: 10, category: "CAT" }],
          Science: [{ name: "Lab", maxScore: 20, category: "PROJECT" }],
        },
      };

      // 1. Direct keyboard navigation + Add Missing SBA hydration
      const studentDirect = makeStudent("s1", "Student One", [
        { id: "m1", name: "Mathematics", classScore: 20, examScore: 0 },
        { id: "e1", name: "English", classScore: 0, examScore: 0 },
      ]);
      const onUpdateDirect = vi.fn();

      const { unmount } = render(
        <SchoolContext.Provider value={makeSchoolContext([studentDirect], sbaSettings)}>
          <AcademicTab student={studentDirect} level="JHS" onUpdate={onUpdateDirect} />
        </SchoolContext.Provider>,
      );

      const mathClass = screen.getByLabelText("Mathematics Class Score");
      const mathExam = screen.getByLabelText("Mathematics Exam Score");
      const engClass = screen.getByLabelText("English Class Score");

      mathClass.focus();
      fireEvent.keyDown(mathClass, { key: "Enter" });
      expect(document.activeElement).toBe(mathExam);

      fireEvent.keyDown(mathExam, { key: "Enter" });
      expect(document.activeElement).toBe(engClass);

      fireEvent.keyDown(engClass, { key: "ArrowUp" });
      expect(document.activeElement).toBe(mathClass);

      fireEvent.keyDown(mathClass, { key: "ArrowDown" });
      expect(document.activeElement).toBe(engClass);

      // Add Missing attaches configured SBA components
      fireEvent.click(screen.getByRole("button", { name: "Add Missing" }));
      expect(onUpdateDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          subjects: expect.arrayContaining([
            expect.objectContaining({
              name: "Science",
              classScoreComponents: expect.arrayContaining([
                expect.objectContaining({ name: "Lab", maxScore: 20 }),
              ]),
            }),
          ]),
        }),
      );
      unmount();

      // 2. Multi-subject SBA accordion defaults collapsed + Incomplete pinning + Focus add
      function ControlledAcademic() {
        const [studentState, setStudentState] = useState<ProcessedStudent>(
          makeStudent("s2", "Student Two", [
            {
              id: "m2",
              name: "Mathematics",
              classScore: 40,
              examScore: 40,
              classScoreComponents: [{ id: "mc1", name: "CAT 1", score: 12, maxScore: 15 }],
            },
            {
              id: "e2",
              name: "English",
              classScore: 0,
              examScore: 0,
              classScoreComponents: [{ id: "ec1", name: "Quiz", score: 0, maxScore: 10 }],
            },
          ]),
        );
        const [focusSub, setFocusSub] = useState<string | null>(null);

        return (
          <SchoolContext.Provider value={makeSchoolContext([studentState], sbaSettings)}>
            <AcademicTab
              student={studentState}
              level="JHS"
              filterSubject={focusSub}
              availableSubjects={sbaSettings.defaultSubjects}
              onFilterSubjectChange={setFocusSub}
              onUpdate={(updated) => setStudentState({ ...studentState, subjects: updated.subjects })}
            />
          </SchoolContext.Provider>
        );
      }

      render(<ControlledAcademic />);

      // Multi-subject SBA rows start collapsed; Expand SBA opens both
      expect(screen.queryByLabelText("Mathematics CAT 1 Score")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Expand SBA/i }));
      expect(screen.getByLabelText("Mathematics CAT 1 Score")).toBeInTheDocument();
      expect(screen.getByLabelText("English Quiz Score")).toBeInTheDocument();

      // Incomplete filter shows only English and pins it while scoring
      fireEvent.click(screen.getByRole("button", { name: /Incomplete \(1\)/i }));
      expect(screen.queryByLabelText("Mathematics Exam Score")).not.toBeInTheDocument();
      expect(screen.getByLabelText("English Exam Score")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("English Quiz Score"), { target: { value: "8" } });
      fireEvent.change(screen.getByLabelText("English Exam Score"), { target: { value: "80" } });
      expect(screen.getByLabelText("English Exam Score")).toBeInTheDocument();

      // Focus Mode on missing subject ("Science") offers + Add Science and hydrates Lab SBA task
      fireEvent.change(screen.getByLabelText("Filter by subject"), {
        target: { value: "Science" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add Science/i }));
      expect(screen.getByLabelText("Science Lab Score")).toBeInTheDocument();
    });

    it("enforces DetailsTab validation guardrails, attendance clamping, remark guards, and one-tap autofill", () => {
      const unscored = makeStudent("s1", "Kofi Mensah", [
        { id: "m1", name: "Mathematics", classScore: 0, examScore: 0 },
      ]);
      const onUpdateUnscored = vi.fn();
      const customSettings: SchoolSettings = { ...testSettings, totalAttendanceDays: 60 };

      const { rerender } = render(
        <SchoolContext.Provider value={makeSchoolContext([unscored], customSettings)}>
          <DetailsTab student={unscored} onUpdate={onUpdateUnscored} />
        </SchoolContext.Provider>,
      );

      // Smart Generate is disabled when unscored
      const smartGenBtn = screen.getByRole("button", { name: /Smart Generate/i });
      expect(smartGenBtn).toBeDisabled();
      expect(
        screen.getByText(/Enter at least one score to auto-generate a performance-matched remark/i),
      ).toBeInTheDocument();

      // Empty name blocks blank save and restores original on blur
      const nameInput = screen.getByPlaceholderText("e.g. Kwame Mensah") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "   " } });
      expect(screen.getByText("Student name cannot be empty")).toBeInTheDocument();
      expect(onUpdateUnscored).not.toHaveBeenCalled();
      fireEvent.blur(nameInput);
      expect(nameInput.value).toBe("Kofi Mensah");
      expect(screen.queryByText("Student name cannot be empty")).not.toBeInTheDocument();

      // Attendance > totalAttendanceDays clamps to 60 and displays live rating
      const attendanceInput = screen.getByLabelText("Days Present") as HTMLInputElement;
      fireEvent.change(attendanceInput, { target: { value: "95" } });
      expect(screen.getByText("Max 60 days")).toBeInTheDocument();
      expect(screen.getByText("100% · Exemplary")).toBeInTheDocument();
      expect(onUpdateUnscored).toHaveBeenLastCalledWith(
        expect.objectContaining({ attendancePresent: 60 }),
        true,
      );

      // Scored student: Auto-fill Empty populates conduct, interest, and remark in one call; Smart Generate avoids current remark
      const scored: ProcessedStudent = {
        ...makeStudent(
          "s2",
          "Abena Boateng",
          [{ id: "m2", name: "Mathematics", classScore: 40, examScore: 40 }],
          80,
        ),
        attendancePresent: 55,
      };
      const onUpdateScored = vi.fn();

      rerender(
        <SchoolContext.Provider value={makeSchoolContext([scored], customSettings)}>
          <DetailsTab student={scored} onUpdate={onUpdateScored} />
        </SchoolContext.Provider>,
      );

      fireEvent.click(screen.getByRole("button", { name: /Auto-fill Empty/i }));
      const autoFilledRecord = onUpdateScored.mock.calls.at(-1)?.[0] as StudentRecord;
      expect(autoFilledRecord.conduct).toBeTruthy();
      expect(autoFilledRecord.interest).toBeTruthy();
      expect(autoFilledRecord.teacherRemark).toBeTruthy();

      const firstRemark = autoFilledRecord.teacherRemark;
      fireEvent.click(screen.getByRole("button", { name: /Smart Generate/i }));
      const regeneratedRecord = onUpdateScored.mock.calls.at(-1)?.[0] as StudentRecord;
      expect(regeneratedRecord.teacherRemark).not.toBe(firstRemark);
    });

    it("uses iOS-safe text numeric inputs across SubjectRow and preserves legacy promotionStatus in DetailsTab", () => {
      const onSubjectChange = vi.fn();
      const sbaSubject: SavedSubject = {
        id: "sub-1",
        name: "Mathematics",
        classScore: 0,
        examScore: 0,
        classScoreComponents: [{ id: "c1", name: "CAT 1", score: 0, maxScore: 10 }],
      };

      const { rerender } = render(
        <SubjectRow
          subject={sbaSubject}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={onSubjectChange}
        />,
      );

      const sbaInput = screen.getByLabelText("Mathematics CAT 1 Score") as HTMLInputElement;
      const examInput = screen.getByLabelText("Mathematics Exam Score") as HTMLInputElement;
      for (const input of [sbaInput, examInput]) {
        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveAttribute("inputmode", "numeric");
        expect(input).toHaveAttribute("pattern", "[0-9]*");
        expect(input).toHaveClass("text-base", "scroll-mt-24", "scroll-mb-40");
      }

      fireEvent.change(sbaInput, { target: { value: "abc" } });
      fireEvent.change(examInput, { target: { value: "abc" } });
      expect(onSubjectChange).not.toHaveBeenCalled();

      // Direct class input (no SBA components) also uses text numeric attributes and guards non-numeric input
      rerender(
        <SubjectRow
          subject={{ id: "sub-2", name: "English", classScore: 0, examScore: 0 }}
          level="JHS"
          maxClassScore={50}
          maxExamScore={50}
          onChange={onSubjectChange}
        />,
      );
      const classInput = screen.getByLabelText("English Class Score") as HTMLInputElement;
      expect(classInput).toHaveAttribute("type", "text");
      expect(classInput).toHaveAttribute("inputmode", "numeric");
      expect(classInput).toHaveAttribute("pattern", "[0-9]*");
      expect(classInput).toHaveClass("text-base", "scroll-mt-24", "scroll-mb-40");
      fireEvent.change(classInput, { target: { value: "abc" } });
      expect(onSubjectChange).not.toHaveBeenCalled();

      // DetailsTab preserves legacy/renamed promotionStatus (e.g. "Repeated Basic 4" on a "Basic 5" student)
      const legacyStudent: ProcessedStudent = {
        ...makeStudent("s-legacy", "Kojo Mensah", []),
        className: "Basic 5",
        promotionStatus: "Repeated Basic 4",
      };
      render(
        <SchoolContext.Provider value={makeSchoolContext([legacyStudent])}>
          <DetailsTab student={legacyStudent} onUpdate={vi.fn()} />
        </SchoolContext.Provider>,
      );

      const promoSelect = screen.getByLabelText("Promotion Status") as HTMLSelectElement;
      const daysPresentInput = screen.getByLabelText("Days Present") as HTMLInputElement;
      const teacherRemarkTextarea = screen.getByLabelText("Teacher's Remark") as HTMLTextAreaElement;
      expect(promoSelect.value).toBe("Repeated Basic 4");
      expect(within(promoSelect).getByRole("option", { name: "Repeated Basic 4" })).toBeInTheDocument();
      expect(promoSelect).toHaveClass("text-base");
      expect(daysPresentInput).toHaveClass("text-base", "scroll-mt-24", "scroll-mb-40");
      expect(teacherRemarkTextarea).toHaveClass("text-base");
    });

    it("hides mobile modal footer on focus, stays hidden across quick hops, and restores after 180ms blur", () => {
      vi.useFakeTimers();
      try {
        const s1 = makeStudent("s1", "Ama Mensah", [
          { id: "sub-1", name: "Mathematics", classScore: 0, examScore: 0 },
          { id: "sub-2", name: "English", classScore: 0, examScore: 0 },
        ]);
        const s2 = makeStudent("s2", "Kofi Boateng", [
          { id: "sub-1", name: "Mathematics", classScore: 0, examScore: 0 },
        ]);
        const students = [s1, s2];

        render(
          <SchoolContext.Provider value={makeSchoolContext(students)}>
            <ScoreEntryModal
              student={s1}
              level="JHS"
              isOpen={true}
              onClose={vi.fn()}
              onUpdateStudent={vi.fn()}
              allStudents={students}
              onNavigate={vi.fn()}
            />
          </SchoolContext.Provider>,
        );

        const footer = screen.getByTestId("mobile-modal-footer");
        expect(footer).toHaveClass("pointer-events-auto", "visible", "opacity-100");
        expect(footer).not.toHaveAttribute("aria-hidden");

        const mathClassInput = screen.getByLabelText("Mathematics Class Score") as HTMLInputElement;
        const mathExamInput = screen.getByLabelText("Mathematics Exam Score") as HTMLInputElement;

        // Focusing an input hides the mobile footer so it cannot obscure scrolled inputs on iOS
        fireEvent.focusIn(mathClassInput);
        expect(footer).toHaveClass("pointer-events-none", "invisible", "opacity-0");
        expect(footer).toHaveAttribute("aria-hidden", "true");

        // Rapid hops (< 180ms) keep the footer hidden continuously
        fireEvent.focusOut(mathClassInput, { relatedTarget: mathExamInput });
        act(() => {
          vi.advanceTimersByTime(100);
        });
        fireEvent.focusIn(mathExamInput);
        act(() => {
          vi.advanceTimersByTime(120);
        });
        expect(footer).toHaveClass("pointer-events-none", "invisible", "opacity-0");
        expect(footer).toHaveAttribute("aria-hidden", "true");

        // Blurring completely restores the footer only after the 180ms debounce window
        fireEvent.focusOut(mathExamInput, { relatedTarget: null });
        act(() => {
          vi.advanceTimersByTime(179);
        });
        expect(footer).toHaveClass("pointer-events-none", "invisible", "opacity-0");

        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(footer).toHaveClass("pointer-events-auto", "visible", "opacity-100");
        expect(footer).not.toHaveAttribute("aria-hidden");
      } finally {
        vi.useRealTimers();
      }
    });

    it("renders in native document flow on mobile while preserving desktop backdrop modal semantics", () => {
      const s1 = makeStudent("s1", "Ama Mensah", [
        { id: "sub-1", name: "Mathematics", classScore: 0, examScore: 0 },
        { id: "sub-2", name: "English", classScore: 0, examScore: 0 },
      ]);
      const s2 = makeStudent("s2", "Kofi Boateng", [
        { id: "sub-1", name: "Mathematics", classScore: 0, examScore: 0 },
      ]);

      const { unmount } = render(
        <SchoolContext.Provider value={makeSchoolContext([s1, s2])}>
          <ScoreEntryModal
            student={s1}
            level="JHS"
            isOpen={true}
            onClose={vi.fn()}
            onUpdateStudent={vi.fn()}
            allStudents={[s1, s2]}
            onNavigate={vi.fn()}
          />
        </SchoolContext.Provider>,
      );

      const dialog = screen.getByRole("dialog");
      const dialogClasses = dialog.className.split(/\s+/);
      expect(dialog).toHaveClass("relative", "sm:fixed", "sm:inset-0");
      expect(dialogClasses).not.toContain("fixed");
      expect(dialogClasses).not.toContain("overflow-hidden");
      expect(dialogClasses).not.toContain("overflow-y-auto");
      expect(dialogClasses).not.toContain("max-sm:overflow-y-auto");
      expect(dialog.matches('[class~="fixed"][class~="inset-0"][class*="z-"]')).toBe(false);
      expect(indexCss).not.toContain('[class*="fixed"]');
      expect(indexCss).toContain('[class~="fixed"][class~="inset-0"][class*="z-"]');
      expect(document.documentElement.dataset.mobileSheetOpen).toBe("true");

      const sheet = dialog.firstElementChild as HTMLElement;
      expect(sheet).toHaveClass("sm:overflow-hidden");
      expect(sheet.className.split(/\s+/)).not.toContain("overflow-hidden");

      const mathClassInput = screen.getByLabelText("Mathematics Class Score");
      const mathExamInput = screen.getByLabelText("Mathematics Exam Score");
      const form = mathClassInput.closest("form");
      expect(form).not.toBeNull();
      expect(form).toHaveAttribute("novalidate");
      expect(mathClassInput).toHaveClass("scroll-mt-24", "scroll-mb-40", "text-base");
      expect(mathExamInput).toHaveClass("scroll-mt-24", "scroll-mb-40", "text-base");

      const switcherSelect = screen.getByLabelText("Switch student");
      const subjectFilterSelect = screen.getByLabelText("Filter by subject");
      expect(switcherSelect).toHaveClass("text-base");
      expect(subjectFilterSelect).toHaveClass("text-base");

      unmount();
      expect(document.documentElement.dataset.mobileSheetOpen).toBeUndefined();
    });

    it("avoids post-blur draft churn on round-trip exam scores and defers rounding normalization by 180ms", () => {
      vi.useFakeTimers();
      try {
        function ControlledSubjectRow() {
          const [subject, setSubject] = useState<SavedSubject>({
            id: "sub-1",
            name: "Mathematics",
            classScore: 40,
            examScore: 0,
          });
          return (
            <SubjectRow
              subject={subject}
              level="JHS"
              maxClassScore={50}
              maxExamScore={50}
              onChange={setSubject}
            />
          );
        }

        render(<ControlledSubjectRow />);
        const examInput = screen.getByLabelText("Mathematics Exam Score") as HTMLInputElement;
        const setTimeoutSpy = vi.spyOn(window, "setTimeout");

        // Round-trip score "80" (weighted 40 -> formats to "80"): zero blur timer churn
        fireEvent.focus(examInput);
        fireEvent.change(examInput, { target: { value: "80" } });
        expect(examInput.value).toBe("80");
        setTimeoutSpy.mockClear();

        fireEvent.blur(examInput);
        expect(setTimeoutSpy).not.toHaveBeenCalled();

        // Exact raw "89" (weighted 45 with persisted examRawScore 89): zero blur timer churn
        fireEvent.focus(examInput);
        fireEvent.change(examInput, { target: { value: "89" } });
        expect(examInput.value).toBe("89");
        setTimeoutSpy.mockClear();

        fireEvent.blur(examInput);
        expect(setTimeoutSpy).not.toHaveBeenCalled();

        // Non-canonical numeric draft "89.": keeps "89." until 180ms after blur
        fireEvent.focus(examInput);
        fireEvent.change(examInput, { target: { value: "89." } });
        expect(examInput.value).toBe("89.");

        fireEvent.blur(examInput);
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(setTimeoutSpy.mock.calls[0]?.[1]).toBe(180);
        expect(examInput.value).toBe("89.");

        // Refocusing within 180ms cancels normalization so "89." stays intact
        act(() => {
          vi.advanceTimersByTime(100);
        });
        fireEvent.focus(examInput);
        act(() => {
          vi.advanceTimersByTime(150);
        });
        expect(examInput.value).toBe("89.");

        // Blurring for the full 180ms normalizes "89." -> "89"
        fireEvent.blur(examInput);
        act(() => {
          vi.advanceTimersByTime(179);
        });
        expect(examInput.value).toBe("89.");

        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(examInput.value).toBe("89");

        setTimeoutSpy.mockRestore();
      } finally {
        vi.useRealTimers();
      }
    });

    it("locks body overflow only on desktop modal viewports and leaves mobile document scroll unlocked", () => {
      const originalMatchMedia = window.matchMedia;
      const originalOverflow = document.body.style.overflow;
      const s1 = makeStudent("s1", "Ama Mensah", [
        { id: "sub-1", name: "Mathematics", classScore: 0, examScore: 0 },
      ]);

      const mockViewport = (isDesktop: boolean) => {
        Object.defineProperty(window, "matchMedia", {
          writable: true,
          configurable: true,
          value: vi.fn((query: string) => ({
            matches: query === "(min-width: 640px)" ? isDesktop : false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
          })),
        });
      };

      try {
        document.body.style.overflow = "";
        mockViewport(false);
        const mobileRender = render(
          <SchoolContext.Provider value={makeSchoolContext([s1])}>
            <ScoreEntryModal
              student={s1}
              level="JHS"
              isOpen={true}
              onClose={vi.fn()}
              onUpdateStudent={vi.fn()}
            />
          </SchoolContext.Provider>,
        );
        expect(document.body.style.overflow).toBe("");
        mobileRender.unmount();

        mockViewport(true);
        const desktopRender = render(
          <SchoolContext.Provider value={makeSchoolContext([s1])}>
            <ScoreEntryModal
              student={s1}
              level="JHS"
              isOpen={true}
              onClose={vi.fn()}
              onUpdateStudent={vi.fn()}
            />
          </SchoolContext.Provider>,
        );
        expect(document.body.style.overflow).toBe("hidden");
        desktopRender.unmount();
        expect(document.body.style.overflow).toBe("");
      } finally {
        Object.defineProperty(window, "matchMedia", {
          writable: true,
          configurable: true,
          value: originalMatchMedia,
        });
        document.body.style.overflow = originalOverflow;
        delete document.documentElement.dataset.mobileSheetOpen;
      }
    });
  });
});
