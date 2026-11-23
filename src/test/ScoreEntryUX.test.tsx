import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import posthog from "posthog-js";
import { SubjectRow } from "../components/SubjectRow";
import { AcademicTab } from "../components/tabs/AcademicTab";
import { DetailsTab } from "../components/tabs/DetailsTab";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { QuickGradebook } from "../components/QuickGradebook";
import { Dashboard } from "../pages/Dashboard";
import { PrintPreview } from "../pages/PrintPreview";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { ToastContext } from "../context/ToastContextDefinition";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";
import { resetSessionAnalyticsGuards } from "../utils/analytics";
import { processStudent } from "../utils/gradeCalculator";
import { sortStudents } from "../utils/studentValidation";

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
  });
});
