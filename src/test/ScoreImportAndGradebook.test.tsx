import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickGradebook } from "../components/QuickGradebook";
import { ScoreImportModal } from "../components/ScoreImportModal";
import * as csvImportUtils from "../utils/csvImport";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createContexts = (studentList: ProcessedStudent[] = [studentOne, studentTwo]) => {
    const updateStudent = vi.fn();
    const addStudent = vi.fn();
    const setSettings = vi.fn();
    const showToast = vi.fn();
    const ctx = {
      students: studentList,
      settings: testSettings,
      updateStudent,
      addStudent,
      setSettings,
    } as unknown as SchoolContextType;
    return { ctx, updateStudent, addStudent, setSettings, toastCtx: { showToast } };
  };

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

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
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

  it("creates a newly detected SBA component in Settings and preserves existing scores when Keep Existing is chosen", async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    const setSettings = vi.fn();
    const showToast = vi.fn();

    const scienceSettings: SchoolSettings = {
      ...testSettings,
      defaultSubjects: ["Science"],
      componentLibrary: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      subjectComponentMap: {
        Science: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      },
    };

    const existingKwame: ProcessedStudent = {
      ...studentOne,
      subjects: [
        {
          id: "sub-sci-1",
          name: "Science",
          classScore: 33,
          examScore: 0,
          totalScore: 33,
          grade: 5,
          remark: "Beginning",
          classScoreComponents: [
            { id: "c1", name: "CAT 1", score: 10, maxScore: 15, category: "CAT" },
          ],
        },
      ],
    };

    const existingAma: ProcessedStudent = {
      ...studentTwo,
      subjects: [
        {
          id: "sub-sci-2",
          name: "Science",
          classScore: 0,
          examScore: 0,
          totalScore: 0,
          grade: 5,
          remark: "Beginning",
          classScoreComponents: [
            { id: "c2", name: "CAT 1", score: 0, maxScore: 15, category: "CAT" },
          ],
        },
      ],
    };

    const ctx = {
      students: [existingKwame, existingAma],
      settings: scienceSettings,
      updateStudent,
      addStudent: vi.fn(),
      setSettings,
    } as unknown as SchoolContextType;

    render(
      <ToastContext.Provider value={{ showToast }}>
        <SchoolContext.Provider value={ctx}>
          <ScoreImportModal isOpen={true} onClose={vi.fn()} initialSubject="Science" />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value:
          "Name\tCAT 1\tScience Project (/20)\nKwame Mensah\t14\t16\nAma Serwaa\t12\t18",
      },
    });

    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));

    expect(screen.getByText(/New SBA Component Detected for Science/i)).toBeInTheDocument();
    expect(screen.getByText(/1 existing score already recorded for Science/i)).toBeInTheDocument();

    // Choose "Keep existing scores" so Kwame keeps CAT 1 = 10 while getting Science Project = 16
    await user.click(screen.getByLabelText(/Keep existing scores/i));
    await user.click(screen.getByRole("button", { name: /apply scores/i }));

    expect(setSettings).toHaveBeenCalledTimes(1);
    const savedSettings = setSettings.mock.calls[0][0];
    expect(savedSettings.subjectComponentMap.Science.map((c: { name: string }) => c.name)).toEqual([
      "CAT 1",
      "Science Project",
    ]);

    expect(updateStudent).toHaveBeenCalledTimes(2);
    const updatedKwame = updateStudent.mock.calls[0][0];
    expect(updatedKwame.subjects[0].classScoreComponents).toHaveLength(2);
    expect(updatedKwame.subjects[0].classScoreComponents[0].score).toBe(10); // kept!
    expect(updatedKwame.subjects[0].classScoreComponents[1]).toMatchObject({
      name: "Science Project",
      score: 16,
      maxScore: 20,
    });
  });

  it("renders ScoreImportModal at desktop max-w-3xl width without max-w-md override", () => {
    const { ctx, toastCtx } = createContexts();
    render(
      <ToastContext.Provider value={toastCtx}>
        <SchoolContext.Provider value={ctx}>
          <ScoreImportModal isOpen={true} onClose={vi.fn()} initialSubject="Mathematics" />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-w-3xl");
    expect(dialog.className).not.toContain("max-w-md");
  });

  it("supports creating and importing a Single SBA Task and exporting an existing SBA component", async () => {
    const user = userEvent.setup();
    const { ctx, updateStudent, setSettings, toastCtx } = createContexts();
    const downloadSpy = vi.spyOn(csvImportUtils, "downloadCsvFile").mockImplementation(() => {});

    render(
      <ToastContext.Provider value={toastCtx}>
        <SchoolContext.Provider value={ctx}>
          <ScoreImportModal
            isOpen={true}
            onClose={vi.fn()}
            initialSubject="Mathematics"
            initialMode="SINGLE_COMPONENT"
            initialTaskName="CAT 1"
          />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    // Export existing SBA task CSV
    await user.click(screen.getByRole("button", { name: /Export CAT 1 \(CSV\)/i }));
    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy.mock.calls[0][1]).toContain("Mathematics_CAT_1_");

    // Switch selector to "+ Create New SBA Task..."
    await user.selectOptions(
      screen.getByLabelText("SBA Component"),
      "__CREATE_NEW_TASK__",
    );
    await user.type(screen.getByLabelText("New SBA Task Name"), "English Summary Group Work");
    await user.clear(screen.getByLabelText("New SBA Max Score"));
    await user.type(screen.getByLabelText("New SBA Max Score"), "20");
    await user.selectOptions(screen.getByLabelText("New SBA Category"), "GROUP");

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value: "Name\tEnglish Summary Group Work (/20)\nKwame Mensah\t18\nAma Serwaa\t16",
      },
    });

    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));
    await user.click(screen.getByRole("button", { name: /apply scores/i }));

    expect(setSettings).toHaveBeenCalledTimes(1);
    const updatedSettings = setSettings.mock.calls[0][0];
    expect(
      updatedSettings.subjectComponentMap.Mathematics.some(
        (t: { name: string; maxScore: number; category: string }) =>
          t.name === "English Summary Group Work" && t.maxScore === 20 && t.category === "GROUP",
      ),
    ).toBe(true);

    expect(updateStudent).toHaveBeenCalledTimes(2);
    const updatedKwame = updateStudent.mock.calls[0][0];
    expect(
      updatedKwame.subjects[0].classScoreComponents.find(
        (c: { name: string }) => c.name === "English Summary Group Work",
      )?.score,
    ).toBe(18);
    expect(updatedKwame.subjects[0].examScore).toBe(0);

    downloadSpy.mockRestore();
  });

  it("imports Final Exam (/100) scores separately without overwriting SBA components", async () => {
    const user = userEvent.setup();
    const seededKwame: ProcessedStudent = {
      ...studentOne,
      subjects: [
        {
          ...studentOne.subjects[0],
          classScore: 15,
          examScore: 0,
          classScoreComponents: [
            { id: "c1", name: "CAT 1", score: 15, maxScore: 15, category: "CAT" },
            { id: "c2", name: "Project", score: 0, maxScore: 35, category: "PROJECT" },
          ],
        },
      ],
    };

    const { ctx, updateStudent, toastCtx } = createContexts([seededKwame, studentTwo]);

    render(
      <ToastContext.Provider value={toastCtx}>
        <SchoolContext.Provider value={ctx}>
          <ScoreImportModal isOpen={true} onClose={vi.fn()} initialSubject="Mathematics" />
        </SchoolContext.Provider>
      </ToastContext.Provider>,
    );

    await user.click(screen.getByRole("tab", { name: /Final Exam/i }));

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value: "Name\tExam (/100)\nKwame Mensah\t80\nAma Serwaa\t70",
      },
    });

    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));
    await user.click(screen.getByRole("button", { name: /apply scores/i }));

    expect(updateStudent).toHaveBeenCalledTimes(2);
    const updatedKwame = updateStudent.mock.calls[0][0];
    expect(updatedKwame.subjects[0].examScore).toBe(40); // 80/100 * 50
    expect(updatedKwame.subjects[0].classScore).toBe(15); // SBA preserved
    expect(updatedKwame.subjects[0].classScoreComponents[0].score).toBe(15);
  });

  it("lets QuickGradebook export an SBA component CSV and trigger pre-targeted import", async () => {
    const user = userEvent.setup();
    const onOpenScoreImport = vi.fn();
    const downloadSpy = vi.spyOn(csvImportUtils, "downloadCsvFile").mockImplementation(() => {});

    render(
      <QuickGradebook
        students={[studentOne, studentTwo]}
        settings={testSettings}
        onUpdateStudent={vi.fn()}
        onOpenScoreImport={onOpenScoreImport}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Gradebook score column"), "COMP:CAT 1");
    await user.click(screen.getByRole("button", { name: /Export Task CSV/i }));
    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy.mock.calls[0][1]).toContain("Mathematics_CAT_1_");

    await user.click(screen.getByRole("button", { name: /^Import$/i }));
    expect(onOpenScoreImport).toHaveBeenCalledWith("Mathematics", "CAT 1");

    downloadSpy.mockRestore();
  });
});
