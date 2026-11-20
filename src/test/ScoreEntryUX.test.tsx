import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SubjectRow } from "../components/SubjectRow";
import { AcademicTab } from "../components/tabs/AcademicTab";
import { DetailsTab } from "../components/tabs/DetailsTab";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { QuickGradebook } from "../components/QuickGradebook";
import { PrintPreview } from "../pages/PrintPreview";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { ProcessedStudent, SavedSubject, SchoolSettings } from "../types";
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
});
