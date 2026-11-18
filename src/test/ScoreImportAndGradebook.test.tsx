import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickGradebook } from "../components/QuickGradebook";
import { ScoreImportModal } from "../components/ScoreImportModal";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { ToastContext } from "../context/ToastContextDefinition";
import type { ProcessedStudent, SchoolSettings } from "../types";

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

const testSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 6",
  level: "JHS",
  classScoreMax: 50,
  examScoreMax: 50,
  defaultSubjects: ["Mathematics"],
  subjectComponentMap: {
    Mathematics: [
      { name: "CAT 1", maxScore: 15, category: "CAT" },
      { name: "Project", maxScore: 35, category: "PROJECT" },
    ],
  },
};

const studentOne: ProcessedStudent = {
  id: "s1",
  name: "Kwame Mensah",
  className: "Basic 6",
  gender: "Male",
  age: 12,
  totalScore: 0,
  averageScore: 0,
  classPosition: "Pending...",
  aggregate: null,
  subjects: [
    {
      id: "sub-1",
      name: "Mathematics",
      classScore: 0,
      examScore: 0,
      totalScore: 0,
      grade: 9,
      remark: "Lowest",
      classScoreComponents: [
        { id: "c1", name: "CAT 1", score: 0, maxScore: 15, category: "CAT" },
        { id: "c2", name: "Project", score: 0, maxScore: 35, category: "PROJECT" },
      ],
    },
  ],
};

const studentTwo: ProcessedStudent = {
  ...studentOne,
  id: "s2",
  name: "Ama Serwaa",
  gender: "Female",
  subjects: [
    {
      ...studentOne.subjects[0],
      id: "sub-2",
      classScoreComponents: [
        { id: "c3", name: "CAT 1", score: 0, maxScore: 15, category: "CAT" },
        { id: "c4", name: "Project", score: 0, maxScore: 35, category: "PROJECT" },
      ],
    },
  ],
};

describe("ScoreImportModal & QuickGradebook column paste", () => {
  it("parses and applies scored SBA components and exam scores to matched students", async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    const addStudent = vi.fn();
    const showToast = vi.fn();

    const ctx = {
      students: [studentOne, studentTwo],
      settings: testSettings,
      updateStudent,
      addStudent,
    } as unknown as SchoolContextType;

    render(
      <ToastContext.Provider value={{ showToast }}>
        <SchoolContext.Provider value={ctx}>
          <ScoreImportModal isOpen={true} onClose={vi.fn()} />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: {
        value: "Name\tCAT 1\tProject\tExam\nKwame Mensah\t15\t25\t80",
      },
    });

    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));
    expect(screen.getByText("Matched")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply scores/i }));
    expect(updateStudent).toHaveBeenCalledTimes(1);
    const updatedRecord = updateStudent.mock.calls[0][0];
    expect(updatedRecord.subjects[0].classScore).toBe(40);
    expect(updatedRecord.subjects[0].examScore).toBe(40);
    expect(updatedRecord.subjects[0].classScoreComponents[0].score).toBe(15);
    expect(updatedRecord.subjects[0].classScoreComponents[1].score).toBe(25);
  });

  it("fills consecutive students when pasting a vertical Excel column into QuickGradebook", () => {
    const onUpdateStudent = vi.fn();

    render(
      <QuickGradebook
        students={[studentOne, studentTwo]}
        settings={testSettings}
        onUpdateStudent={onUpdateStudent}
      />,
    );

    const firstExamInput = screen.getByLabelText("Kwame Mensah Exam Score");
    fireEvent.paste(firstExamInput, {
      clipboardData: {
        getData: () => "80\n90",
      },
    });

    expect(onUpdateStudent).toHaveBeenCalledTimes(2);
    expect(onUpdateStudent.mock.calls[0][0].subjects[0].examScore).toBe(40);
    expect(onUpdateStudent.mock.calls[1][0].subjects[0].examScore).toBe(45);
  });
});
