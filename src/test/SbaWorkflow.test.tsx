import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolProvider } from "../context/SchoolContext";
import { useSchoolData } from "../hooks/useSchoolData";
import { SbaPage } from "../pages/SbaPage";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";

const toastMock = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
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
  ...storage,
}));

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

function StudentSubjectProbe({ onSubjects }: { onSubjects: (names: string[]) => void }) {
  const { students } = useSchoolData();
  const names = students[0]?.subjects[0]?.classScoreComponents?.map((c) => c.name) ?? [];
  onSubjects(names);
  return (
    <div data-testid="student-components">
      {names.length > 0 ? names.join(",") : "none"}
    </div>
  );
}

function LoadedSbaHarness({ onSubjects }: { onSubjects: (names: string[]) => void }) {
  const { isDataLoaded } = useSchoolData();
  if (!isDataLoaded) {
    return <div>Loading school data...</div>;
  }
  return (
    <>
      <SbaPage />
      <StudentSubjectProbe onSubjects={onSubjects} />
    </>
  );
}

describe("SBA workflow end-to-end", () => {
  const baseSettings: SchoolSettings = {
    ...DEFAULT_SETTINGS,
    schoolName: "Test Academy",
    className: "Basic 5",
    level: "PRIMARY",
    examType: "TERMLY",
    classScoreMax: 50,
    examScoreMax: 50,
    defaultSubjects: ["Mathematics", "Science"],
    componentLibrary: [],
    subjectComponentMap: {},
  };

  const baseStudents: StudentRecord[] = [
    {
      id: "stu-1",
      name: "Ama Mensah",
      className: "Basic 5",
      subjects: [
        { id: "sub-math", name: "Mathematics", classScore: 0, examScore: 0 },
        { id: "sub-sci", name: "Science", classScore: 0, examScore: 0 },
      ],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: true });
    storage.saveToStorage.mockResolvedValue(true);
    storage.createBackupHeartbeat.mockResolvedValue(undefined);
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: structuredClone(baseStudents) };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: structuredClone(baseSettings) };
      }
      return { status: "empty" };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds an SBA task, assigns it to all subjects, surfaces the mismatch banner after auto-save, and syncs to students", async () => {
    const capturedComponents: string[][] = [];

    render(
      <SchoolProvider>
        <LoadedSbaHarness onSubjects={(names) => capturedComponents.push(names)} />
      </SchoolProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test Academy")).toBeInTheDocument();
      expect(screen.getByText("Sync Tasks to Students")).toBeInTheDocument();
    });

    expect(screen.queryByText("Student SBA tasks are out of sync")).not.toBeInTheDocument();

    // Switch to fake timers after SchoolProvider finished async IndexedDB initialization
    vi.useFakeTimers();

    const taskNameInput = screen.getByPlaceholderText("e.g. Natural Science Project");
    const maxScoreInput = screen.getByPlaceholderText("15");

    fireEvent.change(taskNameInput, { target: { value: "Midterm Quiz" } });
    fireEvent.change(maxScoreInput, { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));

    expect(screen.getByText("1 Task Defined")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Assign All Tasks to All Subjects/i }));

    // Advance past SettingsFormProvider 500ms debounce + rAF baseline sync so settings commit to SchoolContext
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByText("Student SBA tasks are out of sync")).toBeInTheDocument();
    expect(screen.getByText("Outdated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sync Tasks to Students/i }));

    expect(screen.queryByText("Student SBA tasks are out of sync")).not.toBeInTheDocument();
    expect(screen.getByTestId("student-components")).toHaveTextContent("Midterm Quiz");
    expect(capturedComponents.at(-1)).toEqual(["Midterm Quiz"]);
  });

  it("flushes SBA assignments before opening ScoreImportModal and syncs newly imported tasks back to SbaPage", async () => {
    render(
      <SchoolProvider>
        <LoadedSbaHarness onSubjects={() => {}} />
      </SchoolProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test Academy")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Import Scores \(CSV\)/i })).toBeInTheDocument();
    });

    // Assign a task WITHOUT waiting 500ms debounce, then immediately click Import Scores (CSV)
    fireEvent.change(screen.getByPlaceholderText("e.g. Natural Science Project"), {
      target: { value: "Quiz 1" },
    });
    fireEvent.change(screen.getByPlaceholderText("15"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Assign All Tasks to All Subjects/i }));

    fireEvent.click(screen.getByRole("button", { name: /Import Scores \(CSV\)/i }));

    // Modal immediately sees flushed Mathematics SBA task from SbaPage
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" &&
          Boolean(node.textContent?.includes("Mathematics SBA: 1 component")),
      ),
    ).toBeInTheDocument();

    // Switch to Single SBA Task and create a brand-new SBA component "Essay Work"
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

    // Wait a tick for modal close & SbaPage re-render: SbaPage immediately shows "Essay Work"
    expect(screen.getAllByText("Essay Work").length).toBeGreaterThan(0);

    // Syncing tasks across students keeps both Quiz 1 and Essay Work cleanly without wiping
    fireEvent.click(screen.getByRole("button", { name: /Sync Tasks to Students/i }));
    expect(screen.getByTestId("student-components")).toHaveTextContent("Quiz 1,Essay Work");
  });

  it("clarifies Export Broadsheet label, displays per-subject raw mark totals, and opens per-subject ScoreImportModal", async () => {
    render(
      <SchoolProvider>
        <LoadedSbaHarness onSubjects={() => {}} />
      </SchoolProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test Academy")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Export Broadsheet \(CSV\)/i })).toBeInTheDocument();
    });

    // Add a task and assign it so both Mathematics and Science show their raw mark totals
    fireEvent.change(screen.getByPlaceholderText("e.g. Natural Science Project"), {
      target: { value: "Group Drill" },
    });
    fireEvent.change(screen.getByPlaceholderText("15"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Assign All Tasks to All Subjects/i }));

    expect(screen.getAllByText("1 task • /10 raw → 50% Class")).toHaveLength(2);

    // Clicking Science's Import Scores shortcut opens ScoreImportModal pre-targeted to Science
    fireEvent.click(screen.getByRole("button", { name: "Import scores for Science" }));
    expect(screen.getByLabelText(/Target Subject/i)).toHaveValue("Science");
  });
});
