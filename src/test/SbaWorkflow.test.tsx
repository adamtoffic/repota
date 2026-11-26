import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolProvider } from "../context/SchoolContext";
import { useSchoolData } from "../hooks/useSchoolData";
import { SbaPage } from "../pages/SbaPage";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";
import { registerPostHogClient, resetSessionAnalyticsGuards } from "../utils/analytics";
import * as csvImportUtils from "../utils/csvImport";

const toastMock = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to?: string }) => (
    <a href={to ?? "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => toastMock,
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  getStorageType: vi.fn(() => "indexeddb"),
  subscribeToStorageSync: vi.fn(() => () => {}),
  ...storage,
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

vi.mock("../utils/analyticsEnv", () => ({
  isProductionAnalyticsHost: () => true,
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

function StudentSbaProbe() {
  const { students, settings } = useSchoolData();

  const formatSub = (studentIndex: number, subjectName: string) => {
    const sub = students[studentIndex]?.subjects.find((s) => s.name === subjectName);
    if (!sub) return "none";
    const comps = (sub.classScoreComponents ?? [])
      .map((c) => `${c.name}:${c.score}/${c.maxScore}:${c.category ?? ""}`)
      .join(",");
    return `cls=${sub.classScore};exam=${sub.examScore};[${comps}]`;
  };

  return (
    <div>
      <div data-testid="stu0-math">{formatSub(0, "Mathematics")}</div>
      <div data-testid="stu0-eng">{formatSub(0, "English")}</div>
      <div data-testid="stu1-math">{formatSub(1, "Mathematics")}</div>
      <div data-testid="settings-library">
        {(settings.componentLibrary ?? []).map((c) => c.name).join(",")}
      </div>
      <div data-testid="settings-map-math">
        {(settings.subjectComponentMap?.Mathematics ?? []).map((c) => c.name).join(",")}
      </div>
      <div data-testid="settings-map-eng">
        {(settings.subjectComponentMap?.English ?? []).map((c) => c.name).join(",")}
      </div>
      <div data-testid="settings-weights">
        {`${settings.examType}:${settings.classScoreMax}/${settings.examScoreMax}`}
      </div>
    </div>
  );
}

function LoadedSbaHarness() {
  const { isDataLoaded } = useSchoolData();
  if (!isDataLoaded) {
    return <div>Loading school data...</div>;
  }
  return (
    <>
      <SbaPage />
      <StudentSbaProbe />
    </>
  );
}

function renderSbaWorkflow() {
  return render(
    <SchoolProvider>
      <LoadedSbaHarness />
    </SchoolProvider>,
  );
}

const baseSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 5",
  level: "PRIMARY",
  examType: "TERMLY",
  classScoreMax: 50,
  examScoreMax: 50,
  defaultSubjects: ["Mathematics", "English"],
  componentLibrary: [],
  subjectComponentMap: {},
};

const baseStudents: StudentRecord[] = [
  {
    id: "stu-1",
    name: "Ama Mensah",
    className: "Basic 5",
    gender: "Female",
    subjects: [
      { id: "sub-m1", name: "Mathematics", classScore: 0, examScore: 40 },
      { id: "sub-e1", name: "English", classScore: 0, examScore: 35 },
    ],
  },
  {
    id: "stu-2",
    name: "Kofi Boateng",
    className: "Basic 5",
    gender: "Male",
    subjects: [
      { id: "sub-m2", name: "Mathematics", classScore: 0, examScore: 30 },
      { id: "sub-e2", name: "English", classScore: 0, examScore: 28 },
    ],
  },
];

function seedStorage(students: StudentRecord[], settings: SchoolSettings) {
  storage.loadFromStorageResult.mockImplementation(async (key: string) => {
    if (key === "ges_v1_students") {
      return { status: "found", value: structuredClone(students) };
    }
    if (key === "ges_v1_settings") {
      return { status: "found", value: structuredClone(settings) };
    }
    return { status: "empty" };
  });
}

describe("SBA Markbook workflow end-to-end", () => {
  const originalMatchMedia = window.matchMedia;

  const setViewportDesktop = (isDesktop: boolean) => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query === "(min-width: 1024px)" ? isDesktop : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  beforeEach(() => {
    setViewportDesktop(true);
    localStorage.clear();
    sessionStorage.clear();
    registerPostHogClient(posthogMock);
    resetSessionAnalyticsGuards();
    vi.clearAllMocks();
    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true });
    storage.saveToStorage.mockResolvedValue(true);
    storage.saveEntriesToStorage.mockResolvedValue(true);
    storage.createBackupHeartbeat.mockResolvedValue(undefined);
    seedStorage(baseStudents, baseSettings);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("mounts only the mobile pill view without desktop table on mobile viewports", async () => {
    setViewportDesktop(false);
    const gesTasks = [{ name: "CAT 1", maxScore: 15, category: "CAT" as const }];
    seedStorage(baseStudents, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByLabelText("Ama Mensah CAT 1 Score (Mobile)")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Ama Mensah CAT 1 Score")).not.toBeInTheDocument();
  });

  it("onboards with GES Standard preset and automatically reconciles students without a Sync button", async () => {
    renderSbaWorkflow();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /SBA Markbook/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Set up SBA tasks for/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sync Tasks to Students/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /GES Standard \(4 Tasks/i }));

    // Multi-column grid immediately appears for Mathematics and reconciles students atomically
    expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    expect(screen.getByLabelText("Ama Mensah Group Work Score")).toBeInTheDocument();
    expect(screen.getByLabelText("Ama Mensah CAT 2 Score")).toBeInTheDocument();
    expect(screen.getByLabelText("Ama Mensah Project Work Score")).toBeInTheDocument();

    expect(screen.getByTestId("stu0-math")).toHaveTextContent(
      "CAT 1:0/15:CAT,Group Work:0/15:GROUP,CAT 2:0/15:CAT,Project Work:0/15:PROJECT",
    );
    expect(screen.getByTestId("stu0-eng")).toHaveTextContent(
      "CAT 1:0/15:CAT,Group Work:0/15:GROUP,CAT 2:0/15:CAT,Project Work:0/15:PROJECT",
    );
    expect(screen.queryByRole("button", { name: /Reconcile Tasks/i })).not.toBeInTheDocument();
  });

  it("scores multi-column cells with live Raw, Class, mid-term pace, and Score_Entry_Session telemetry", async () => {
    const gesTasks = [
      { name: "CAT 1", maxScore: 15, category: "CAT" as const },
      { name: "Group Work", maxScore: 15, category: "GROUP" as const },
      { name: "CAT 2", maxScore: 15, category: "CAT" as const },
      { name: "Project Work", maxScore: 15, category: "PROJECT" as const },
    ];
    seedStorage(baseStudents, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Ama Mensah CAT 1 Score"), {
      target: { value: "12" },
    });

    // Live Raw (12/60), Class (12/60 * 50 = 10/50), and mid-term pace (1/4 · 80% pace)
    expect(screen.getAllByText("12/60").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10/50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1/4 · 80% pace").length).toBeGreaterThan(0);

    expect(posthogMock.capture).toHaveBeenCalledWith(
      "Score_Entry_Session",
      expect.objectContaining({
        entry_mode: "sba_markbook",
        used_column_paste: false,
        school_level: "PRIMARY",
        exam_type: "TERMLY",
      }),
    );
  });

  it("pastes a 2D spreadsheet block across rows and tasks and tracks used_column_paste analytics", async () => {
    const gesTasks = [
      { name: "CAT 1", maxScore: 15, category: "CAT" as const },
      { name: "Group Work", maxScore: 15, category: "GROUP" as const },
    ];
    seedStorage(baseStudents, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    });

    const firstCell = screen.getByLabelText("Ama Mensah CAT 1 Score");
    fireEvent.paste(firstCell, {
      clipboardData: {
        getData: () => "12\t10\n14\t15",
      },
    });

    expect(screen.getByTestId("stu0-math")).toHaveTextContent(
      "cls=37;exam=40;[CAT 1:12/15:CAT,Group Work:10/15:GROUP]",
    );
    expect(screen.getByTestId("stu1-math")).toHaveTextContent(
      "cls=48;exam=30;[CAT 1:14/15:CAT,Group Work:15/15:GROUP]",
    );

    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Pasted 4 scores across 2 students",
      "success",
    );

    expect(posthogMock.capture).toHaveBeenCalledWith(
      "Score_Entry_Session",
      expect.objectContaining({
        entry_mode: "sba_markbook",
        used_column_paste: true,
      }),
    );
  });

  it("supports Task Manager CRUD, inline rename preserving marks, shrink confirmation, deletion, and per-subject override", async () => {
    const gesTasks = [
      { name: "CAT 1", maxScore: 15, category: "CAT" as const },
      { name: "Group Work", maxScore: 15, category: "GROUP" as const },
    ];
    seedStorage(baseStudents, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    });

    // Score 12/15 in CAT 1 first
    fireEvent.change(screen.getByLabelText("Ama Mensah CAT 1 Score"), {
      target: { value: "12" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Manage Tasks/i }));
    const taskDialog = within(screen.getByRole("dialog"));

    // Add task "Class Quiz" (/10, CAT)
    fireEvent.change(taskDialog.getByLabelText("New task category"), { target: { value: "CAT" } });
    fireEvent.change(taskDialog.getByLabelText("New task name"), { target: { value: "Class Quiz" } });
    fireEvent.change(taskDialog.getByLabelText("New task max score"), { target: { value: "10" } });
    fireEvent.click(taskDialog.getByRole("button", { name: /Add Task/i }));
    expect(screen.getByTestId("settings-map-math")).toHaveTextContent("CAT 1,Group Work,Class Quiz");

    // Inline rename "CAT 1" -> "Midterm CAT" preserves existing score 12
    fireEvent.click(taskDialog.getByRole("button", { name: "Edit CAT 1" }));
    fireEvent.change(taskDialog.getByLabelText("Edit task name"), {
      target: { value: "Midterm CAT" },
    });
    fireEvent.click(taskDialog.getByRole("button", { name: /^Save$/i }));
    expect(screen.getByTestId("stu0-math")).toHaveTextContent("Midterm CAT:12/15");

    // Shrink max score 15 -> 10 triggers destructive impact confirmation and clamps 12 -> 10
    fireEvent.click(taskDialog.getByRole("button", { name: "Edit Midterm CAT" }));
    fireEvent.change(taskDialog.getByLabelText("Edit task max score"), { target: { value: "10" } });
    fireEvent.click(taskDialog.getByRole("button", { name: /^Save$/i }));
    expect(taskDialog.getByRole("alert")).toHaveTextContent(/1 recorded score across 1 student/i);
    fireEvent.click(taskDialog.getByRole("button", { name: /Confirm & Update/i }));
    expect(screen.getByTestId("stu0-math")).toHaveTextContent("Midterm CAT:10/10");

    // Delete "Group Work" cascades from both subjectComponentMap and componentLibrary
    fireEvent.click(taskDialog.getByRole("button", { name: "Remove Group Work" }));
    expect(screen.getByTestId("settings-map-math")).toHaveTextContent("Midterm CAT,Class Quiz");
    expect(screen.getByTestId("settings-library")).toHaveTextContent("Midterm CAT,Class Quiz");
    expect(screen.getByTestId("settings-library")).not.toHaveTextContent("Group Work");

    // Switch to English and add a subject-specific task without touching Mathematics
    fireEvent.click(taskDialog.getByRole("button", { name: /Close task manager/i }));
    fireEvent.change(screen.getByLabelText("SBA subject"), { target: { value: "English" } });
    fireEvent.click(screen.getByRole("button", { name: /Manage Tasks/i }));
    const englishDialog = within(screen.getByRole("dialog"));
    fireEvent.click(englishDialog.getByRole("tab", { name: /Only English/i }));
    fireEvent.change(englishDialog.getByLabelText("New task name"), {
      target: { value: "Oral Reading" },
    });
    fireEvent.change(englishDialog.getByLabelText("New task max score"), { target: { value: "10" } });
    fireEvent.click(englishDialog.getByRole("button", { name: /Add Task/i }));

    expect(screen.getByTestId("settings-map-eng")).toHaveTextContent(
      "Midterm CAT,Class Quiz,Oral Reading",
    );
    expect(screen.getByTestId("settings-map-math")).not.toHaveTextContent("Oral Reading");
  });

  it("clamps weight inputs, rescales 50/50 to 30/70, and pauses/resumes SBA cleanly across Mock Exam toggles", async () => {
    const gesTasks = [{ name: "CAT 1", maxScore: 20, category: "CAT" as const }];
    const seededWithScores: StudentRecord[] = [
      {
        ...baseStudents[0],
        subjects: [
          {
            id: "sub-m1",
            name: "Mathematics",
            classScore: 25,
            examScore: 40, // 80/100 raw under 50/50 -> must rescale to 56/70
            classScoreComponents: [{ id: "c1", name: "CAT 1", score: 10, maxScore: 20, category: "CAT" }],
          },
          { id: "sub-e1", name: "English", classScore: 0, examScore: 0 },
        ],
      },
    ];
    seedStorage(seededWithScores, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Grading weights and exam mode/i })).toBeInTheDocument();
    });

    // Open Weights Modal via accessible labels, check input clamping >100 -> 100/0, then pick 30/70 preset
    fireEvent.click(screen.getByRole("button", { name: /Grading weights and exam mode/i }));
    const weightDialog = within(screen.getByRole("dialog"));
    const classWeightInput = weightDialog.getByLabelText(
      "Continuous Assessment %",
    ) as HTMLInputElement;
    const examWeightInput = weightDialog.getByLabelText("Examination %") as HTMLInputElement;
    fireEvent.change(classWeightInput, { target: { value: "120" } });
    expect(classWeightInput.value).toBe("100");
    expect(examWeightInput.value).toBe("0");

    fireEvent.click(weightDialog.getByRole("button", { name: /30 \/ 70/i }));
    fireEvent.click(weightDialog.getByRole("button", { name: /Apply Grading Split/i }));

    expect(screen.getByRole("button", { name: /Grading weights and exam mode/i })).toHaveTextContent(
      "Termly · 30/70",
    );
    expect(screen.getByTestId("stu0-math")).toHaveTextContent("cls=15;exam=56;[CAT 1:10/20:CAT]");

    // Toggle to Mock Exam (0/100): SBA pauses cleanly, tasks preserved, then resume to Termly
    fireEvent.click(screen.getByRole("button", { name: /Grading weights and exam mode/i }));
    const mockDialog = within(screen.getByRole("dialog"));
    fireEvent.click(mockDialog.getByRole("button", { name: /Mock Exam \(0\/100\)/i }));
    fireEvent.click(mockDialog.getByRole("button", { name: /Apply Grading Split/i }));

    expect(screen.getByText(/Mock Exam mode is active \(0\/100\)/i)).toBeInTheDocument();
    expect(screen.getByTestId("stu0-math")).toHaveTextContent("CAT 1:10/20:CAT");

    fireEvent.click(screen.getByRole("button", { name: /Switch to Termly Mode/i }));
    expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grading weights and exam mode/i })).toHaveTextContent(
      "Termly · 50/50",
    );
  });

  it("exports SBA markbook CSV with Raw Total/Pace telemetry and syncs new imported CSV tasks back to SbaPage", async () => {
    const downloadSpy = vi.spyOn(csvImportUtils, "downloadCsvFile").mockImplementation(() => {});
    const gesTasks = [{ name: "Quiz 1", maxScore: 10, category: "CAT" as const }];
    const syncedStudent: StudentRecord = {
      ...baseStudents[0],
      subjects: [
        {
          id: "sub-m1",
          name: "Mathematics",
          classScore: 0,
          examScore: 40,
          classScoreComponents: [
            { id: "qm1", name: "Quiz 1", score: 0, maxScore: 10, category: "CAT" },
          ],
        },
        {
          id: "sub-e1",
          name: "English",
          classScore: 0,
          examScore: 35,
          classScoreComponents: [
            { id: "qe1", name: "Quiz 1", score: 0, maxScore: 10, category: "CAT" },
          ],
        },
      ],
    };
    seedStorage([syncedStudent], {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Export SBA CSV/i })).toBeInTheDocument();
    });

    // Export SBA CSV for Mathematics
    fireEvent.click(screen.getByRole("button", { name: /Export SBA CSV/i }));
    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy.mock.calls[0][1]).toMatch(/^Mathematics_SBA_Sheet_.*\.csv$/);
    expect(downloadSpy.mock.calls[0][0]).toContain("Raw Total (/10)");
    expect(downloadSpy.mock.calls[0][0]).toContain("SBA Pace (%)");
    expect(posthogMock.capture).toHaveBeenCalledWith(
      "Class_Tool_Used",
      expect.objectContaining({
        tool: "sba_sheet_csv_export",
        students_count: 1,
        school_level: "PRIMARY",
      }),
    );

    // Switch to English, open Import CSV pre-targeted to English, import new "Essay Work (/20)"
    fireEvent.change(screen.getByLabelText("SBA subject"), { target: { value: "English" } });
    fireEvent.click(screen.getByRole("button", { name: /Import CSV/i }));
    expect(screen.getByLabelText(/Target Subject/i)).toHaveValue("English");

    fireEvent.click(screen.getByRole("tab", { name: /Single SBA Task/i }));
    fireEvent.change(screen.getByLabelText("SBA Component"), {
      target: { value: "__CREATE_NEW_TASK__" },
    });
    fireEvent.change(screen.getByLabelText("New SBA Task Name"), {
      target: { value: "Essay Work" },
    });
    fireEvent.change(screen.getByLabelText("New SBA Max Score"), { target: { value: "20" } });

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Name\tEssay Work (/20)\nAma Mensah\t15" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Preview & Validate Scores/i }));
    fireEvent.click(screen.getByRole("button", { name: /Apply Scores/i }));

    expect(screen.getByLabelText("Ama Mensah Essay Work Score")).toHaveValue("15");
    expect(screen.getByTestId("settings-map-eng")).toHaveTextContent("Quiz 1,Essay Work");
    expect(screen.queryByRole("button", { name: /Reconcile Tasks/i })).not.toBeInTheDocument();
  });

  it("scopes Unscored only filter to the active mid-term task, keeps edited rows pinned, and refreshes cleanly", async () => {
    const gesTasks = [
      { name: "CAT 1", maxScore: 15, category: "CAT" as const },
      { name: "Group Work", maxScore: 15, category: "GROUP" as const },
      { name: "CAT 2", maxScore: 15, category: "CAT" as const },
      { name: "Project Work", maxScore: 15, category: "PROJECT" as const },
    ];
    const seededMidTerm: StudentRecord[] = [
      {
        ...baseStudents[0],
        subjects: [
          {
            id: "sub-m1",
            name: "Mathematics",
            classScore: 10,
            examScore: 40,
            classScoreComponents: [
              { id: "c1", name: "CAT 1", score: 12, maxScore: 15, category: "CAT" },
              { id: "c2", name: "Group Work", score: 0, maxScore: 15, category: "GROUP" },
              { id: "c3", name: "CAT 2", score: 0, maxScore: 15, category: "CAT" },
              { id: "c4", name: "Project Work", score: 0, maxScore: 15, category: "PROJECT" },
            ],
          },
        ],
      },
      {
        ...baseStudents[1],
        subjects: [
          {
            id: "sub-m2",
            name: "Mathematics",
            classScore: 0,
            examScore: 30,
            classScoreComponents: [
              { id: "k1", name: "CAT 1", score: 0, maxScore: 15, category: "CAT" },
              { id: "k2", name: "Group Work", score: 0, maxScore: 15, category: "GROUP" },
              { id: "k3", name: "CAT 2", score: 0, maxScore: 15, category: "CAT" },
              { id: "k4", name: "Project Work", score: 0, maxScore: 15, category: "PROJECT" },
            ],
          },
        ],
      },
    ];
    seedStorage(seededMidTerm, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    });

    // Mid-term: Ama has CAT 1 scored (12), Kofi does not; future tasks are 0 for everyone.
    // Toggling Unscored only smartly scopes to CAT 1, hiding Ama and keeping Kofi visible.
    const unscoredBtn = screen.getByRole("button", { name: /Unscored only/i });
    expect(unscoredBtn).toHaveTextContent("1");
    fireEvent.click(unscoredBtn);

    const taskFilter = screen.getByLabelText("Filter unscored by task") as HTMLSelectElement;
    expect(taskFilter.value).toBe("CAT 1");
    expect(screen.queryByLabelText("Ama Mensah CAT 1 Score")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Kofi Boateng CAT 1 Score")).toBeInTheDocument();

    // Entering Kofi's CAT 1 keeps Kofi pinned in place while showing the Refresh list control
    fireEvent.change(screen.getByLabelText("Kofi Boateng CAT 1 Score"), {
      target: { value: "14" },
    });
    expect(screen.getByLabelText("Kofi Boateng CAT 1 Score")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh list/i })).toBeInTheDocument();

    // Refreshing reveals the task-specific all-scored empty state
    fireEvent.click(screen.getByRole("button", { name: /Refresh list/i }));
    expect(
      screen.getByText(/All students have marks entered for/i).closest("p"),
    ).toHaveTextContent("All students have marks entered for CAT 1");

    // Switching to "Any missing task" restores both students (since Group Work..Project Work are 0)
    fireEvent.change(screen.getByLabelText("Filter unscored by task"), { target: { value: "" } });
    expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    expect(screen.getByLabelText("Kofi Boateng CAT 1 Score")).toBeInTheDocument();

    // Clicking Show All Students clears filter cleanly after switching back to empty state
    fireEvent.change(screen.getByLabelText("Filter unscored by task"), {
      target: { value: "CAT 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Show All Students/i }));
    expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    expect(screen.getByLabelText("Kofi Boateng CAT 1 Score")).toBeInTheDocument();
  });

  it("supports student search, decimal entry with invalid-char rejection, and direct column gear task editing", async () => {
    const gesTasks = [
      { name: "CAT 1", maxScore: 15, category: "CAT" as const },
      { name: "Group Work", maxScore: 15, category: "GROUP" as const },
    ];
    seedStorage(baseStudents, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByLabelText("Search students")).toBeInTheDocument();
    });

    // Search filters to Kofi; missing query shows Clear search card; clearing restores both rows
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "kofi" } });
    expect(screen.queryByLabelText("Ama Mensah CAT 1 Score")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Kofi Boateng CAT 1 Score")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "zzzzz" } });
    expect(screen.getByText(/No students match your search/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear search/i }));
    expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();

    // Decimal input (12.) -> (12.5) saves cleanly, while non-numeric ('e', '-5') is rejected
    const amaCell = screen.getByLabelText("Ama Mensah CAT 1 Score") as HTMLInputElement;
    fireEvent.change(amaCell, { target: { value: "12." } });
    expect(amaCell.value).toBe("12.");
    fireEvent.change(amaCell, { target: { value: "12.5" } });
    expect(amaCell.value).toBe("12.5");
    fireEvent.change(amaCell, { target: { value: "-5" } });
    expect(amaCell.value).toBe("12.5");
    fireEvent.change(amaCell, { target: { value: "12e" } });
    expect(amaCell.value).toBe("12.5");

    // Column header gear pre-opens SbaTaskManagerModal directly in edit mode for CAT 1
    fireEvent.click(screen.getByRole("button", { name: "Configure CAT 1" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Edit task name")).toHaveValue("CAT 1");
    expect(dialog.getByLabelText("Edit task max score")).toHaveValue(15);
  });

  it("resumes Mock Mode to 30/70 automatically for SHS classes", async () => {
    const gesTasks = [{ name: "CAT 1", maxScore: 20, category: "CAT" as const }];
    seedStorage(baseStudents, {
      ...baseSettings,
      level: "SHS",
      examType: "MOCK",
      classScoreMax: 0,
      examScoreMax: 100,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByText(/Mock Exam mode is active \(0\/100\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Switch to Termly Mode/i }));
    expect(screen.getByRole("button", { name: /Grading weights and exam mode/i })).toHaveTextContent(
      "Termly · 30/70",
    );
  });

  it("keeps mobile PageHeader sticky on visit and releases stickiness only during editable input focus", async () => {
    const gesTasks = [{ name: "CAT 1", maxScore: 15, category: "CAT" as const }];
    seedStorage(baseStudents, {
      ...baseSettings,
      componentLibrary: gesTasks,
      subjectComponentMap: { Mathematics: gesTasks, English: gesTasks },
    });

    const { container } = renderSbaWorkflow();
    await waitFor(() => {
      expect(screen.getByLabelText("Ama Mensah CAT 1 Score")).toBeInTheDocument();
    });

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header).toHaveClass("sticky", "top-0", "z-30");

    // Focusing an editable score input temporarily unsticks PageHeader for iOS keyboard hit-testing
    fireEvent.focusIn(screen.getByLabelText("Ama Mensah CAT 1 Score"));
    expect(header).toHaveClass("relative");
    expect(header).not.toHaveClass("sticky");
  });
});
