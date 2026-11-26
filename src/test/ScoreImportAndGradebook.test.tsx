import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickGradebook } from "../components/QuickGradebook";
import { ScoreImportModal } from "../components/ScoreImportModal";
import { SubjectRow } from "../components/SubjectRow";
import * as csvImportUtils from "../utils/csvImport";
import { processStudent } from "../utils/gradeCalculator";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

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
    const ctx = {
      students: studentList,
      settings: testSettings,
      updateStudent,
      addStudent,
      setSettings,
    } as unknown as SchoolContextType;
    return { ctx, updateStudent, addStudent, setSettings };
  };

  it("parses and applies scored SBA components and exam scores to matched students", async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    const addStudent = vi.fn();

    const ctx = {
      students: [studentOne, studentTwo],
      settings: testSettings,
      updateStudent,
      addStudent,
    } as unknown as SchoolContextType;

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
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
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal isOpen={true} onClose={vi.fn()} initialSubject="Science" />
      </SchoolContext.Provider>,
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
    const { ctx } = createContexts();
    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal isOpen={true} onClose={vi.fn()} initialSubject="Mathematics" />
      </SchoolContext.Provider>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-w-3xl");
    expect(dialog.className).not.toContain("max-w-md");

    const tablist = screen.getByRole("tablist", { name: /score import mode/i });
    expect(tablist.className).toContain("min-w-0");
    expect(tablist.className).toContain("w-full");
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("whitespace-normal");
      expect(tab.className).not.toMatch(/(?:^|\s)whitespace-nowrap(?:\s|$)/);
    }
  });

  it("supports creating and importing a Single SBA Task and exporting an existing SBA component", async () => {
    const user = userEvent.setup();
    const { ctx, updateStudent, setSettings } = createContexts();
    const downloadSpy = vi.spyOn(csvImportUtils, "downloadCsvFile").mockImplementation(() => {});

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal
          isOpen={true}
          onClose={vi.fn()}
          initialSubject="Mathematics"
          initialMode="SINGLE_COMPONENT"
          initialTaskName="CAT 1"
        />
      </SchoolContext.Provider>,
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

    const { ctx, updateStudent } = createContexts([seededKwame, studentTwo]);

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal isOpen={true} onClose={vi.fn()} initialSubject="Mathematics" />
      </SchoolContext.Provider>,
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

  it("blocks over-max scores in preview until clamping is allowed and validates new task max score", async () => {
    const user = userEvent.setup();
    const { ctx, updateStudent } = createContexts();

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal
          isOpen={true}
          onClose={vi.fn()}
          initialSubject="Mathematics"
          initialMode="SINGLE_COMPONENT"
          initialTaskName="__CREATE_NEW_TASK__"
        />
      </SchoolContext.Provider>,
    );

    await user.type(screen.getByLabelText("New SBA Task Name"), "Quiz 2");
    await user.clear(screen.getByLabelText("New SBA Max Score"));
    await user.type(screen.getByLabelText("New SBA Max Score"), "150");
    expect(screen.getByText(/Max score must be between 1 and 100/i)).toBeInTheDocument();

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Name\tQuiz 2\nKwame Mensah\t80\nAma Serwaa\t12" },
    });
    expect(screen.getByRole("button", { name: /preview & validate scores/i })).toBeDisabled();

    // Set valid max score 15, now 80 exceeds max
    await user.clear(screen.getByLabelText("New SBA Max Score"));
    await user.type(screen.getByLabelText("New SBA Max Score"), "15");
    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));

    expect(screen.getByText(/1 score exceeds the maximum allowed limit/i)).toBeInTheDocument();
    expect(screen.getByText(/80 > \/15!/i)).toBeInTheDocument();
    const applyBtn = screen.getByRole("button", { name: /apply scores/i });
    expect(applyBtn).toBeDisabled();

    // Explicitly opt into clamping
    await user.click(screen.getByLabelText(/Clamp scores above maximum to allowed limit/i));
    expect(applyBtn).toBeEnabled();
    await user.click(applyBtn);

    expect(updateStudent).toHaveBeenCalledTimes(2);
    expect(
      updateStudent.mock.calls[0][0].subjects[0].classScoreComponents.find(
        (c: { name: string }) => c.name === "Quiz 2",
      )?.score,
    ).toBe(15);
  });

  it("blocks applying when 0 rows match existing students so empty components are not synced", async () => {
    const user = userEvent.setup();
    const { ctx, updateStudent, setSettings } = createContexts();

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal
          isOpen={true}
          onClose={vi.fn()}
          initialSubject="Mathematics"
          initialMode="SINGLE_COMPONENT"
          initialTaskName="__CREATE_NEW_TASK__"
        />
      </SchoolContext.Provider>,
    );

    await user.type(screen.getByLabelText("New SBA Task Name"), "Oral Drill");
    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Name\tOral Drill (/15)\nCompletely Different Name\t12" },
    });

    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));
    expect(screen.getByText(/did not match any existing student/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply scores/i })).toBeDisabled();
    expect(updateStudent).not.toHaveBeenCalled();
    expect(setSettings).not.toHaveBeenCalled();
  });

  it("uploads single-SBA CSVs across 5 components + final exam (89/100) into store and renders values in SubjectRow", async () => {
    const user = userEvent.setup();
    const englishTasks = [
      { name: "CAT 1", maxScore: 10, category: "CAT" as const },
      { name: "CAT 2", maxScore: 10, category: "CAT" as const },
      { name: "Group Work", maxScore: 10, category: "GROUP" as const },
      { name: "Homework", maxScore: 10, category: "HOMEWORK" as const },
      { name: "Project", maxScore: 20, category: "PROJECT" as const },
    ];
    const initialSettings: SchoolSettings = {
      ...DEFAULT_SETTINGS,
      schoolName: "Test Academy",
      className: "Basic 6",
      level: "JHS",
      classScoreMax: 50,
      examScoreMax: 50,
      defaultSubjects: ["Mathematics", "English"],
      subjectComponentMap: {
        English: englishTasks,
        Mathematics: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
      },
    };
    const initialStudents: StudentRecord[] = [
      {
        id: "stu-eng-1",
        name: "Kwame Mensah",
        className: "Basic 6",
        gender: "Male",
        subjects: [
          { id: "m1", name: "Mathematics", classScore: 0, examScore: 0 },
          { id: "e1", name: "English", classScore: 0, examScore: 0 },
        ],
      },
    ];

    function StatefulHarness() {
      const [settings, setSettings] = useState<SchoolSettings>(initialSettings);
      const [rawStudents, setRawStudents] = useState<StudentRecord[]>(initialStudents);
      const processed = rawStudents.map((s) => processStudent(s, settings.level));

      const ctx = {
        students: processed,
        settings,
        setSettings,
        updateStudent: (updated: StudentRecord) => {
          setRawStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        },
        addStudent: (added: StudentRecord) => {
          setRawStudents((prev) => [...prev, added]);
        },
      } as unknown as SchoolContextType;

      const engSubject = processed[0].subjects.find((s) => s.name === "English")!;

      return (
        <SchoolContext.Provider value={ctx}>
          <ScoreImportModal isOpen={true} onClose={vi.fn()} initialSubject="Mathematics" />
          <SubjectRow
            key={engSubject.classScoreComponents?.length ?? 0}
            subject={engSubject}
            level={settings.level}
            maxClassScore={settings.classScoreMax}
            maxExamScore={settings.examScoreMax}
            onChange={vi.fn()}
          />
        </SchoolContext.Provider>
      );
    }

    const { baseElement } = render(<StatefulHarness />);
    const fileInput = baseElement.querySelector('input[type="file"]') as HTMLInputElement;

    // 1. Upload CSV for 1 SBA component ("Group Work (/10)") named English_Group_Work_Template.csv
    const csv1 = new File(['"Name","Group Work (/10)"\n"Kwame Mensah","8"'], "English_Group_Work_Template.csv", {
      type: "text/csv",
    });
    await user.upload(fileInput, csv1);

    // Auto-selects English + Single SBA Task ("Group Work"), computes aggregate over all 5 tasks (8/60 * 50 = 7)
    expect(screen.getByLabelText(/Target Subject/i)).toHaveValue("English");
    expect(screen.getByLabelText("SBA Component")).toHaveValue("Group Work");
    expect(screen.getByText(/8\/60 \(5 tasks\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /apply scores/i }));

    // Edit Student Scores view (SubjectRow) shows the actual non-empty component value (8) and class score (7/50)
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();
    expect(screen.getByText(/Class Score: 7\/50/i)).toBeInTheDocument();

    // 2. Upload remaining 4 SBA components together: CAT 1=10, CAT 2=8, Homework=9, Project=16
    // Sum = 10 + 8 + 8 + 9 + 16 = 51 / 60 => Math.round(51/60 * 50) = 43
    const csv2 = new File(
      [
        "Name,CAT 1 (/10),CAT 2 (/10),Homework (/10),Project (/20)\nKwame Mensah,10,8,9,16",
      ],
      "English_Remaining_SBA.csv",
      { type: "text/csv" },
    );
    await user.upload(fileInput, csv2);
    expect(screen.getByText(/51\/60 \(5 tasks\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /apply scores/i }));
    expect(screen.getByText(/Class Score: 43\/50/i)).toBeInTheDocument();

    // 3. Upload Final Exam = 89 / 100 -> 45/50 weighted; Class 43 preserved -> Total = 88
    const csvExam = new File(["Name,Exam (/100)\nKwame Mensah,89"], "English_Final_Exam.csv", {
      type: "text/csv",
    });
    await user.upload(fileInput, csvExam);
    expect(screen.getByText(/45 \(89%\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /apply scores/i }));

    expect(screen.getByText(/Class Score: 43\/50/i)).toBeInTheDocument();
    expect(screen.getByText(/= 45\/50/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("89")).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
  });

  it("keeps Mathematics without classScoreComponents untouched during EXAM_ONLY import", async () => {
    const user = userEvent.setup();
    const { ctx, updateStudent } = createContexts([
      {
        ...studentOne,
        subjects: [{ id: "sub-raw", name: "Mathematics", classScore: 30, examScore: 0, totalScore: 30, grade: 9, remark: "Lowest" }],
      },
    ]);

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreImportModal
          isOpen={true}
          onClose={vi.fn()}
          initialSubject="Mathematics"
          initialMode="EXAM_ONLY"
        />
      </SchoolContext.Provider>,
    );

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Name\tExam (/100)\nKwame Mensah\t89" },
    });

    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));
    await user.click(screen.getByRole("button", { name: /apply scores/i }));

    expect(updateStudent).toHaveBeenCalledTimes(1);
    const updatedSub = updateStudent.mock.calls[0][0].subjects[0];
    expect(updatedSub.classScore).toBe(30);
    expect(updatedSub.examScore).toBe(45);
    expect(updatedSub.classScoreComponents).toBeUndefined();
  });

  it("discovers tasks from subjectComponentMap, copies category on Add Subject, and focuses SBA task on pill click", async () => {
    const user = userEvent.setup();
    const onUpdateStudent = vi.fn();
    const studentWithMissingMath: ProcessedStudent = {
      ...studentOne,
      id: "s-missing",
      name: "Kojo Asante",
      subjects: [],
    };
    const settingsFromMap: SchoolSettings = {
      ...testSettings,
      componentLibrary: [],
      subjectComponentMap: {
        Mathematics: [
          { name: "CAT 1", maxScore: 15, category: "CAT" },
          { name: "Project", maxScore: 35, category: "PROJECT" },
        ],
      },
    };

    const { rerender } = render(
      <QuickGradebook
        students={[studentOne, studentWithMissingMath]}
        settings={settingsFromMap}
        onUpdateStudent={onUpdateStudent}
      />,
    );

    // Dropdown exposes tasks configured in settings.subjectComponentMap
    expect(screen.getByRole("option", { name: "SBA: CAT 1 (/15)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "SBA: Project (/35)" })).toBeInTheDocument();

    // Add Subject copies configured tasks including category metadata
    await user.click(screen.getByRole("button", { name: /Add Subject/i }));
    expect(onUpdateStudent).toHaveBeenCalledTimes(1);
    const addedSubject = onUpdateStudent.mock.calls[0][0].subjects[0];
    expect(addedSubject.classScoreComponents).toHaveLength(2);
    expect(addedSubject.classScoreComponents[0]).toMatchObject({
      name: "CAT 1",
      maxScore: 15,
      score: 0,
      category: "CAT",
    });

    // Clicking the Class SBA pill in CLASS_EXAM mode switches focusColumn to COMP:CAT 1
    rerender(
      <QuickGradebook
        students={[studentOne]}
        settings={settingsFromMap}
        onUpdateStudent={onUpdateStudent}
      />,
    );
    await user.click(screen.getByRole("button", { name: /· SBA/i }));
    expect(screen.getByLabelText("Kwame Mensah CAT 1 Score")).toBeInTheDocument();
  });
});
