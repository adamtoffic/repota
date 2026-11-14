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

import { SchoolProvider, MIGRATION_WAIT_TIMEOUT_MS } from "../context/SchoolContext";
import { hasUnsavedChanges, setUnsavedChanges } from "../utils/preloadErrorHandler";
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
    setUnsavedChanges(false);
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

  it("dismisses fresh confirm modal and clears active recovery action when isLocked engages", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "error" })
      .mockResolvedValueOnce({ status: "error" });

    const { rerender } = render(
      <SchoolProvider isLocked={false}>
        <DataGate>
          <Settings />
        </DataGate>
      </SchoolProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
    expect(screen.getByText(/replaces any saved data/i)).toBeInTheDocument();

    rerender(
      <SchoolProvider isLocked={true}>
        <DataGate>
          <Settings />
        </DataGate>
      </SchoolProvider>,
    );

    expect(screen.queryByText(/replaces any saved data/i)).not.toBeInTheDocument();
  });

  it("clears activeRecoveryAction when startFresh returns early because storage is not ready", async () => {
    storage.initStorage.mockRejectedValue(new Error("IndexedDB not ready"));

    render(
      <SchoolProvider isLocked={false}>
        <DataGate>
          <Settings />
        </DataGate>
      </SchoolProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "Start fresh" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
    expect(screen.getByText(/replaces any saved data/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Start fresh", exact: true })[1]);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "Start fresh" })).not.toBeDisabled();
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

  it("marks settings as error and retains recovery gate when stored settings are corrupted", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "found", value: seededStudents })
      .mockResolvedValueOnce({ status: "found", value: "not-an-object" as unknown as SchoolSettings });

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hasLoadErrorMessage()).toBe(true);
  });

  it("awaits in-flight migration before startFresh saves fresh data", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    const migrationDeferred = deferred<{ success: boolean }>();
    storage.migrateFromLocalStorage.mockReturnValue(migrationDeferred.promise);

    function TestConsumer() {
      const { startFresh } = useSchoolData();
      return (
        <button type="button" onClick={startFresh}>
          Trigger Start Fresh
        </button>
      );
    }

    render(
      <SchoolProvider>
        <TestConsumer />
      </SchoolProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Trigger Start Fresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Start fresh", exact: true }));

    expect(storage.saveToStorage).not.toHaveBeenCalled();

    await act(async () => {
      migrationDeferred.resolve({ success: false });
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(storage.saveToStorage).toHaveBeenCalledWith("ges_v1_settings", expect.any(Object));
  });

  it("disables Try again, Start fresh, and Load Class File while a recovery action is active", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "error" })
      .mockResolvedValueOnce({ status: "error" });

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const tryAgainBtn = screen.getByRole("button", { name: "Try again" });
    const startFreshBtn = screen.getByRole("button", { name: "Start fresh" });
    const loadFileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    expect(tryAgainBtn).not.toBeDisabled();
    expect(startFreshBtn).not.toBeDisabled();
    expect(loadFileInput).not.toBeDisabled();

    fireEvent.click(startFreshBtn);

    expect(tryAgainBtn).toBeDisabled();
    expect(startFreshBtn).toBeDisabled();
    expect(loadFileInput).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(tryAgainBtn).not.toBeDisabled();
    expect(startFreshBtn).not.toBeDisabled();
    expect(loadFileInput).not.toBeDisabled();
  });

  it("invalidates pending startFresh when isLocked engages before migration settles", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    const migrationDeferred = deferred<{ success: boolean }>();
    storage.migrateFromLocalStorage.mockReturnValue(migrationDeferred.promise);

    function TestConsumer() {
      const { startFresh, activeRecoveryAction } = useSchoolData();
      return (
        <div>
          <span data-testid="recovery-action">{activeRecoveryAction ?? "none"}</span>
          <button type="button" onClick={startFresh}>
            Trigger Start Fresh
          </button>
        </div>
      );
    }

    const { rerender } = render(
      <SchoolProvider isLocked={false}>
        <TestConsumer />
      </SchoolProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Trigger Start Fresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Start fresh", exact: true }));
    expect(screen.getByTestId("recovery-action")).toHaveTextContent("fresh");

    // Lock before migration settles, then unlock again
    rerender(
      <SchoolProvider isLocked={true}>
        <TestConsumer />
      </SchoolProvider>,
    );
    expect(screen.getByTestId("recovery-action")).toHaveTextContent("none");

    rerender(
      <SchoolProvider isLocked={false}>
        <TestConsumer />
      </SchoolProvider>,
    );

    // Resolve migration after token invalidation: startFresh must NOT write
    await act(async () => {
      migrationDeferred.resolve({ success: false });
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(storage.saveToStorage).not.toHaveBeenCalled();
  });

  it("retains exclusive recovery ownership when isLocked engages after startFresh writes begin", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.migrateFromLocalStorage.mockResolvedValue({ success: false });
    const saveDeferred = deferred<boolean>();
    storage.saveToStorage.mockReturnValue(saveDeferred.promise);

    function TestConsumer() {
      const { startFresh, activeRecoveryAction } = useSchoolData();
      return (
        <div>
          <span data-testid="recovery-action">{activeRecoveryAction ?? "none"}</span>
          <button type="button" onClick={startFresh}>
            Trigger Start Fresh
          </button>
        </div>
      );
    }

    const { rerender } = render(
      <SchoolProvider isLocked={false}>
        <TestConsumer />
      </SchoolProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Trigger Start Fresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Start fresh", exact: true }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(storage.saveToStorage).toHaveBeenCalled();
    expect(screen.getByTestId("recovery-action")).toHaveTextContent("fresh");

    // Lock while saves are still in-flight: ownership must stay "fresh"
    rerender(
      <SchoolProvider isLocked={true}>
        <TestConsumer />
      </SchoolProvider>,
    );
    expect(screen.getByTestId("recovery-action")).toHaveTextContent("fresh");

    // Once saves finish, ownership releases cleanly
    await act(async () => {
      saveDeferred.resolve(true);
      await Promise.resolve();
    });
    expect(screen.getByTestId("recovery-action")).toHaveTextContent("none");
  });

  it("bounds waitForMigration by MIGRATION_WAIT_TIMEOUT_MS and aborts startFresh without writes", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    const neverSettlingMigration = deferred<{ success: boolean }>();
    storage.migrateFromLocalStorage.mockReturnValue(neverSettlingMigration.promise);

    function TestConsumer() {
      const { startFresh, waitForMigration } = useSchoolData();
      return (
        <div>
          <button type="button" onClick={startFresh}>
            Trigger Start Fresh
          </button>
          <button
            type="button"
            onClick={() => {
              waitForMigration?.().catch(() => {});
            }}
          >
            Trigger Wait
          </button>
        </div>
      );
    }

    render(
      <SchoolProvider isLocked={false}>
        <TestConsumer />
      </SchoolProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Trigger Start Fresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Start fresh", exact: true }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIGRATION_WAIT_TIMEOUT_MS + 50);
    });

    expect(storage.saveToStorage).not.toHaveBeenCalled();
    neverSettlingMigration.resolve({ success: false });
  });

  it("keeps unsaved write marker set when an older write resolves true after a newer write fails", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorage
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(seededSettings);

    const firstStudentSave = deferred<boolean>();
    const secondStudentSave = deferred<boolean>();

    storage.saveToStorage.mockImplementation(async (key: string, value: unknown) => {
      if (key === "ges_v1_students" && Array.isArray(value)) {
        if (value.length === 1) return firstStudentSave.promise;
        if (value.length === 2) return secondStudentSave.promise;
      }
      return true;
    });

    function AddManyStudents() {
      const { addStudent } = useSchoolData();
      return (
        <button
          type="button"
          onClick={() =>
            addStudent(
              {
                id: `s-${Math.random()}`,
                name: "Test Student",
                className: "JHS 2",
                gender: "Male",
                subjects: [],
              },
              true,
            )
          }
        >
          Add Student Sequenced
        </button>
      );
    }

    render(
      <SchoolProvider>
        <AddManyStudents />
      </SchoolProvider>,
    );

    // Wait for cold-start hydration to finish completely
    await act(async () => {
      for (let i = 0; i < 6; i++) {
        await Promise.resolve();
      }
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    // Trigger write #1 (length 1) and flush debounce
    fireEvent.click(screen.getByRole("button", { name: "Add Student Sequenced" }));
    await act(async () => {
      vi.advanceTimersByTime(550);
      await Promise.resolve();
    });
    expect(storage.saveToStorage).toHaveBeenCalledWith(
      "ges_v1_students",
      expect.arrayContaining([expect.objectContaining({ name: "Test Student" })]),
    );

    // Trigger write #2 (length 2) and flush debounce before write #1 resolves
    fireEvent.click(screen.getByRole("button", { name: "Add Student Sequenced" }));
    await act(async () => {
      vi.advanceTimersByTime(550);
      await Promise.resolve();
    });
    expect(
      storage.saveToStorage.mock.calls.some(
        ([k, v]) => k === "ges_v1_students" && Array.isArray(v) && v.length === 2,
      ),
    ).toBe(true);

    // Newer write (#2) fails with false; older write (#1) resolves true out-of-order
    await act(async () => {
      secondStudentSave.resolve(false);
      await Promise.resolve();
    });
    await act(async () => {
      firstStudentSave.resolve(true);
      await Promise.resolve();
    });

    expect(hasUnsavedChanges()).toBe(true);
  });

  it("preserves reset baseline when Reset confirmation opens before debounced autosave settles", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorage
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(seededSettings);

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    const mottoInput = screen.getByDisplayValue("Learn and Lead");
    fireEvent.change(mottoInput, { target: { value: "Draft Motto" } });
    expect(mottoInput).toHaveValue("Draft Motto");

    // Click Reset immediately before 500ms autosave runs
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Discard Changes?")).toBeInTheDocument();

    // Advance past debounce window while modal is open
    await act(async () => {
      vi.advanceTimersByTime(700);
      await Promise.resolve();
    });

    // Confirm Reset: must restore original seeded baseline, not "Draft Motto"
    fireEvent.click(screen.getByRole("button", { name: "Yes, Discard Changes" }));
    expect(screen.getByDisplayValue("Learn and Lead")).toBeInTheDocument();
  });

  it("applies deferred autosave baseline on cancelled Reset and restores it on a subsequent Reset", async () => {
    storage.initStorage.mockResolvedValue(undefined);
    storage.loadFromStorage
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(seededSettings);

    renderSettings();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    const mottoInput = screen.getByDisplayValue("Learn and Lead");
    fireEvent.change(mottoInput, { target: { value: "Autosaved Motto" } });

    // Fire 500ms debounce so setSettings runs and queues the baseline RAF, without flushing RAF yet
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    // Open Reset before RAF settles, then cancel it
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Discard Changes?")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByDisplayValue("Autosaved Motto")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();

    // Now make a transient edit and confirm Reset: must restore "Autosaved Motto"
    fireEvent.change(screen.getByDisplayValue("Autosaved Motto"), {
      target: { value: "Temporary Edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Discard Changes" }));
    expect(screen.getByDisplayValue("Autosaved Motto")).toBeInTheDocument();
  });
});
