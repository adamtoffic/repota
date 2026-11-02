import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolSettings } from "../types";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: {
    STUDENTS: "ges_v1_students",
    SETTINGS: "ges_v1_settings",
  },
  getStorageType: vi.fn(() => "indexeddb"),
  ...storage,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

import { SchoolProvider } from "../context/SchoolContext";
import { useSchoolData } from "../hooks/useSchoolData";
import { DataGate } from "../components/DataGate";
import { Dashboard } from "../pages/Dashboard";
import { Settings } from "../pages/Settings";

const seededSettings: SchoolSettings = {
  schoolName: "Seeded Academy",
  academicYear: "2030/2031",
  term: "Second Term",
  level: "JHS",
  defaultSubjects: ["English", "Mathematics"],
  totalAttendanceDays: 90,
  classScoreMax: 60,
  examScoreMax: 40,
  classSize: 42,
  nextTermStarts: "2031-01-10",
  headTeacherName: "Head Teacher",
  classTeacherName: "Class Teacher",
  className: "JHS 2",
  phoneNumber: "0240000000",
  address: "Seeded Location",
  email: "seeded@example.com",
  schoolMotto: "Learn and Lead",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  examType: "TERMLY",
  componentLibrary: [{ name: "Class Test", maxScore: 20, category: "CAT" }],
  subjectComponentMap: {
    English: [{ name: "Class Test", maxScore: 20, category: "CAT" }],
  },
};

const seededStudents = [
  {
    id: "student-1",
    name: "Student One",
    className: "JHS 2",
    gender: "Female" as const,
    subjects: [],
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function renderSettings() {
  return render(
    <SchoolProvider>
      <DataGate>
        <Settings />
      </DataGate>
    </SchoolProvider>,
  );
}

function renderDashboard() {
  return render(
    <SchoolProvider>
      <DataGate>
        <Dashboard />
      </DataGate>
    </SchoolProvider>,
  );
}

function AddStudentAction() {
  const { addStudent, settings } = useSchoolData();

  return (
    <>
      <div data-testid="context-school-name">{settings.schoolName}</div>
      <button
        type="button"
        onClick={() =>
          addStudent({
            id: "student-2",
            name: "Student Two",
            className: "JHS 2",
            gender: "Male",
            subjects: [],
          }, true)
        }
      >
        Add test student
      </button>
    </>
  );
}

function renderSettingsWithStudentAction() {
  return render(
    <SchoolProvider>
      <DataGate>
        <Settings />
      </DataGate>
      <AddStudentAction />
    </SchoolProvider>,
  );
}

function hasLoadErrorMessage() {
  return screen
    .queryAllByRole("alert")
    .some((alert) => alert.textContent?.includes("Saved data could not be loaded"));
}

describe("Settings cold start", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storage.initStorage.mockReset();
    storage.loadFromStorage.mockReset();
    storage.loadFromStorageResult.mockReset();
    storage.saveToStorage.mockReset();
    storage.createBackupHeartbeat.mockReset();
    storage.migrateFromLocalStorage.mockReset();
    storage.migrateFromLocalStorage.mockResolvedValue({
      success: true,
      studentsCount: 0,
    });
    storage.saveToStorage.mockResolvedValue(true);
    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      const value = await storage.loadFromStorage(key);
      return value == null ? { status: "empty" } : { status: "found", value };
    });
  });

  it("does not render the form while the initial load is pending", async () => {
    const initialization = deferred<void>();
    storage.initStorage.mockReturnValue(initialization.promise);

    renderSettings();

    expect(screen.getByText("Loading Repota...")).toBeInTheDocument();
    expect(screen.queryByLabelText("School Name")).not.toBeInTheDocument();
    expect(storage.saveToStorage).not.toHaveBeenCalled();

    await act(async () => {
      initialization.resolve();
    });

  });

  it("does not render the Dashboard empty state or add button while loading", async () => {
    const initialization = deferred<void>();
    storage.initStorage.mockReturnValue(initialization.promise);

    renderDashboard();

    expect(screen.getByText("Loading Repota...")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to your new Class Dashboard!")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add your first student" })).not.toBeInTheDocument();

    await act(async () => {
      initialization.resolve();
    });
  });

  it("does not persist default settings while the initial load is pending", async () => {
    const initialization = deferred<void>();
    storage.initStorage.mockReturnValue(initialization.promise);

    renderSettings();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(storage.saveToStorage).not.toHaveBeenCalled();

    await act(async () => {
      initialization.resolve();
    });
  });

  it("renders the seeded settings after loading", async () => {
    const initialization = deferred<void>();
    const students = deferred<unknown>();
    const settings = deferred<SchoolSettings>();
    storage.initStorage.mockReturnValue(initialization.promise);
    storage.loadFromStorage
      .mockReturnValueOnce(students.promise)
      .mockReturnValueOnce(settings.promise);

    renderSettings();
    expect(screen.getByText("Loading Repota...")).toBeInTheDocument();

    await act(async () => {
      initialization.resolve();
      students.resolve([]);
      settings.resolve(seededSettings);
      await Promise.resolve();
    });

    expect(screen.getByDisplayValue("Seeded Academy")).toBeInTheDocument();
    expect(screen.getAllByText("English").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue("My School Name")).not.toBeInTheDocument();
  });

  it("saves edits based on seeded settings after both debounce windows", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorage
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(seededSettings);

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const schoolName = screen.getByDisplayValue("Seeded Academy");
    const motto = screen.getByDisplayValue("Learn and Lead");

    await act(async () => {
      fireEvent.change(motto, { target: { value: "Learning Together" } });
    });
    expect(motto).toHaveValue("Learning Together");

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    const savedSettings = storage.saveToStorage.mock.calls
      .map((call) => call[1])
      .filter((value) => value && typeof value === "object" && "schoolName" in value)
      .at(-1) as
      | SchoolSettings
      | undefined;

    expect(schoolName).toHaveValue("Seeded Academy");
    expect(savedSettings).toMatchObject({
      schoolName: "Seeded Academy",
      defaultSubjects: seededSettings.defaultSubjects,
      componentLibrary: seededSettings.componentLibrary,
      schoolMotto: "Learning Together",
    });
    expect(savedSettings?.schoolName).not.toBe("My School Name");
  });

  it("never saves hydrated data as defaults or an empty student list", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorage
      .mockResolvedValueOnce(seededStudents)
      .mockResolvedValueOnce(seededSettings);

    renderSettings();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(storage.saveToStorage.mock.calls).not.toEqual(
      expect.arrayContaining([
        ["ges_v1_students", []],
        ["ges_v1_settings", expect.objectContaining({ schoolName: "My School Name" })],
      ]),
    );
    expect(
      storage.saveToStorage.mock.calls.some(
        ([key, value]) => key === "ges_v1_students" && Array.isArray(value) && value.length === 0,
      ),
    ).toBe(false);
    expect(
      storage.saveToStorage.mock.calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "My School Name",
      ),
    ).toBe(false);
  });

  it("persists immediate edits on top of hydrated settings and students", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorage
      .mockResolvedValueOnce(seededStudents)
      .mockResolvedValueOnce(seededSettings);

    renderSettingsWithStudentAction();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue("Seeded Academy"), {
        target: { value: "Edited Academy" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add test student" }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const calls = storage.saveToStorage.mock.calls;
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_students" && Array.isArray(value) && value.length === 2,
      ),
    ).toBe(true);
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "Edited Academy",
      ),
    ).toBe(true);
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_students" && Array.isArray(value) && value.length === 0,
      ),
    ).toBe(false);
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "My School Name",
      ),
    ).toBe(false);
  });

  it("persists edits normally after hydrated debounce guards settle", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorage
      .mockResolvedValueOnce(seededStudents)
      .mockResolvedValueOnce(seededSettings);

    renderSettingsWithStudentAction();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue("Seeded Academy"), {
        target: { value: "Settled Academy" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add test student" }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const calls = storage.saveToStorage.mock.calls;
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_students" && Array.isArray(value) && value.length === 2,
      ),
    ).toBe(true);
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "Settled Academy",
      ),
    ).toBe(true);
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_students" && Array.isArray(value) && value.length === 0,
      ),
    ).toBe(false);
    expect(
      calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "My School Name",
      ),
    ).toBe(false);
  });

  it("leaves loading state and renders defaults when storage loading fails", async () => {
    storage.initStorage.mockRejectedValue(new Error("storage unavailable"));

    renderSettings();

    await act(async () => {
      await Promise.resolve();
    });
    expect(hasLoadErrorMessage()).toBe(true);
    expect(screen.queryByDisplayValue("My School Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading Repota...")).not.toBeInTheDocument();
  });

  it("blocks student persistence and shows an error when the student read fails", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "error" })
      .mockResolvedValueOnce({ status: "found", value: seededSettings });

    renderSettingsWithStudentAction();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hasLoadErrorMessage()).toBe(true);
    expect(screen.getByTestId("context-school-name")).toHaveTextContent("Seeded Academy");
    fireEvent.click(screen.getByRole("button", { name: "Add test student" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(
      storage.saveToStorage.mock.calls.some(([key]) => key === "ges_v1_students"),
    ).toBe(false);
    expect(storage.createBackupHeartbeat).not.toHaveBeenCalled();
  });

  it("saves students but never settings when only the settings read fails", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "found", value: seededStudents })
      .mockResolvedValueOnce({ status: "error" });

    renderSettingsWithStudentAction();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Add test student" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(
      storage.saveToStorage.mock.calls.some(([key]) => key === "ges_v1_students"),
    ).toBe(true);
    expect(
      storage.saveToStorage.mock.calls.some(([key]) => key === "ges_v1_settings"),
    ).toBe(false);
    expect(storage.createBackupHeartbeat).not.toHaveBeenCalled();
  });

  it("allows a new user's first edit without showing a load error", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "empty" })
      .mockResolvedValueOnce({ status: "empty" });

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.change(screen.getByDisplayValue("My School Name"), {
      target: { value: "New School" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(hasLoadErrorMessage()).toBe(false);
    expect(
      storage.saveToStorage.mock.calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "New School",
      ),
    ).toBe(true);
  });

  it("retries a failed load and then saves seeded edits", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    const retryStudents = deferred<{
      status: "found";
      value: typeof seededStudents;
    }>();
    const retrySettings = deferred<{
      status: "found";
      value: SchoolSettings;
    }>();
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "error" })
      .mockResolvedValueOnce({ status: "error" })
      .mockReturnValueOnce(retryStudents.promise)
      .mockReturnValueOnce(retrySettings.promise);

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await act(async () => {
      retryStudents.resolve({ status: "found", value: seededStudents });
      retrySettings.resolve({ status: "found", value: seededSettings });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hasLoadErrorMessage()).toBe(false);
    expect(screen.getByDisplayValue("Seeded Academy")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Seeded Academy"), {
      target: { value: "Retry Academy" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(
      storage.saveToStorage.mock.calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "Retry Academy",
      ),
    ).toBe(true);
    expect(
      storage.saveToStorage.mock.calls.some(
        ([key, value]) => key === "ges_v1_students" && Array.isArray(value) && value.length === 0,
      ),
    ).toBe(false);
    expect(
      storage.saveToStorage.mock.calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "My School Name",
      ),
    ).toBe(false);
  });

  it("starts fresh only after confirmation and then saves edits", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "error" })
      .mockResolvedValueOnce({ status: "error" });

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
    expect(screen.getByText(/replaces any saved data/i)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Start fresh", exact: true })[1]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(hasLoadErrorMessage()).toBe(false);
    fireEvent.change(screen.getByDisplayValue("My School Name"), {
      target: { value: "Fresh School" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(
      storage.saveToStorage.mock.calls.some(
        ([key, value]) => key === "ges_v1_settings" && value?.schoolName === "Fresh School",
      ),
    ).toBe(true);
  });

  it("blocks persistence when storage initialization rejects", async () => {
    storage.initStorage.mockRejectedValue(new Error("storage unavailable"));

    renderSettingsWithStudentAction();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Add test student" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(hasLoadErrorMessage()).toBe(true);
    expect(storage.saveToStorage).not.toHaveBeenCalled();
  });

  it("marks a never-resolving load as failed after the timeout", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    const pending = deferred<unknown>();
    storage.loadFromStorageResult.mockReturnValue(pending.promise);

    renderSettings();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(hasLoadErrorMessage()).toBe(true);
    pending.resolve({ status: "found", value: seededSettings });
  });
});
