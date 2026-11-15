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
});
