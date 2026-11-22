import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SubjectRow } from "../components/SubjectRow";
import { AcademicTab } from "../components/tabs/AcademicTab";
import { DetailsTab } from "../components/tabs/DetailsTab";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { QuickGradebook } from "../components/QuickGradebook";
import { Dashboard } from "../pages/Dashboard";
import { PrintPreview } from "../pages/PrintPreview";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";
import {
  assignPositions,
  assignSubjectPositions,
  processStudent,
} from "../utils/gradeCalculator";
import { hasNoScoresEntered, sortStudents } from "../utils/studentValidation";

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
    clearStudentScores: vi.fn(),
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
  });

  describe("Dashboard stable entry & modal navigation", () => {
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

        // Open Student B (index 2 of 3)
        fireEvent.click(screen.getAllByText("Student B")[0]);
        expect(screen.getByText("(2 of 3)")).toBeInTheDocument();

        // Update Student B's Mathematics Exam Score so B overtakes A in live AVG_DESC
        fireEvent.change(screen.getByLabelText("Mathematics Exam Score"), {
          target: { value: "100" },
        });

        // Clicking Next must advance to Student C (3 of 3), NOT jump back to Student A
        const footer = screen.getByTestId("mobile-modal-footer");
        fireEvent.click(within(footer).getByRole("button", { name: "Next student" }));
        expect(screen.getByText("(3 of 3)")).toBeInTheDocument();
        expect((screen.getByRole("dialog").querySelector("select") as HTMLSelectElement).value).toBe(
          "sC",
        );

        // Close modal, switch to Quick Gradebook (current AVG_DESC order is [B (60), A (30), C (10)])
        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
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
});
