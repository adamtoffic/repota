import { useRef, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { needsClassSubjectsOrSbaSync } from "../context/school/schoolStudentMutations";
import { useDialogA11y } from "../hooks/useDialogA11y";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";

const storage = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  createBackupHeartbeat: vi.fn(),
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: {
    STUDENTS: "ges_v1_students",
    SETTINGS: "ges_v1_settings",
  },
  getStorageType: vi.fn(() => "indexeddb"),
  subscribeToStorageSync: vi.fn(() => () => {}),
  ...storage,
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: storage.createBackupHeartbeat,
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
  getTimeSinceBackup: vi.fn(() => null),
}));

import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { SchoolProvider } from "../context/SchoolContext";
import { createAppRouter } from "../router";

function makeSchoolCtx(overrides: Partial<SchoolContextType> = {}): SchoolContextType {
  return {
    students: [],
    settings: DEFAULT_SETTINGS,
    isDataLoaded: true,
    isStorageReady: true,
    loadStatus: { students: "ok", settings: "ok" },
    loadError: false,
    isPersistenceSuspended: false,
    isRollbackIncomplete: false,
    isSaving: false,
    lastSaved: undefined,
    saveError: null,
    setSettings: vi.fn(),
    addStudent: vi.fn(),
    deleteStudent: vi.fn(),
    deletePendingStudents: vi.fn(),
    updateStudent: vi.fn(),
    clearAllScores: vi.fn(),
    clearStudentScores: vi.fn(),
    removeAllStudentPhotos: vi.fn(),
    updateClassNameForAll: vi.fn(),
    clearAllStudents: vi.fn(),
    restoreDefaults: vi.fn(),
    resetAllAppData: vi.fn(async () => true),
    loadDemoData: vi.fn(),
    detectComponentMismatches: vi.fn(() => ({ hasOutdated: false, hasMissing: false })),
    syncSubjectComponentsFromSettings: vi.fn(),
    applySbaConfig: vi.fn(() => DEFAULT_SETTINGS),
    updateAssessmentWeights: vi.fn(() => DEFAULT_SETTINGS),
    checkDuplicateName: vi.fn(() => false),
    autoGenerateRemarks: vi.fn(),
    retryLoad: vi.fn(),
    startFresh: vi.fn(),
    suspendPersistence: vi.fn(),
    resumePersistence: vi.fn(),
    markIncompleteRollback: vi.fn(),
    clearIncompleteRollback: vi.fn(),
    waitForMigration: vi.fn(async () => {}),
    ...overrides,
  };
}

const twoStudents: ProcessedStudent[] = [
  {
    id: "s1",
    name: "Ama Mensah",
    className: "Basic 4",
    gender: "Female",
    attendancePresent: 65,
    subjects: [{ id: "sub1", name: "English Language", classScore: 35, examScore: 40 }],
    totalScore: 75,
    averageScore: 75,
    classPosition: "1st",
    aggregate: null,
  },
  {
    id: "s2",
    name: "Kojo Boateng",
    className: "Basic 4",
    gender: "Male",
    attendancePresent: 64,
    subjects: [{ id: "sub2", name: "English Language", classScore: 30, examScore: 35 }],
    totalScore: 65,
    averageScore: 65,
    classPosition: "2nd",
    aggregate: null,
  },
];

function SelectFirstDialogHarness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ isOpen: open, onClose: () => setOpen(false), dialogRef });

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Launch Select Dialog
      </button>
      {open && (
        <div ref={dialogRef} role="dialog" tabIndex={-1}>
          <select aria-label="Leading Picker">
            <option value="1">One</option>
          </select>
          <button type="button">Safe Action</button>
        </div>
      )}
    </div>
  );
}

describe("ScoreEntryModal initial focus & contextual Class Tools sync", () => {
  beforeAll(async () => {
    await import("../pages/Dashboard");
  }, 30000);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storage.initStorage.mockReset().mockResolvedValue(undefined);
    storage.migrateFromLocalStorage
      .mockReset()
      .mockResolvedValue({ success: true, studentsCount: 0 });
    storage.saveToStorage.mockReset().mockResolvedValue(true);
    storage.saveEntriesToStorage.mockReset().mockResolvedValue(true);
  });

  it("focuses the dialog container instead of <select aria-label='Switch student'> when ScoreEntryModal opens", () => {
    render(
      <SchoolContext.Provider value={makeSchoolCtx()}>
        <ScoreEntryModal
          student={twoStudents[0]}
          level="JHS"
          isOpen={true}
          onClose={vi.fn()}
          onUpdateStudent={vi.fn()}
          allStudents={twoStudents}
          onNavigate={vi.fn()}
        />
      </SchoolContext.Provider>,
    );

    const dialog = screen.getByRole("dialog");
    const studentSwitcher = screen.getByLabelText("Switch student");
    expect(document.activeElement).toBe(dialog.firstElementChild);
    expect(document.activeElement).not.toBe(studentSwitcher);
  });

  it("skips leading <select> under default useDialogA11y initialFocus='first'", () => {
    render(<SelectFirstDialogHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Launch Select Dialog" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Safe Action" }));
  });

  it("detects accurately when students need subject additions or SBA task reconciliation", () => {
    const baseSettings: SchoolSettings = {
      ...DEFAULT_SETTINGS,
      defaultSubjects: ["English", "Mathematics"],
      examType: "TERMLY",
      subjectComponentMap: {
        English: [{ name: "CAT 1", maxScore: 20, category: "CAT" }],
        Mathematics: [{ name: "CAT 1", maxScore: 20, category: "CAT" }],
      },
    };

    const syncedStudent: StudentRecord = {
      id: "stu-1",
      name: "Ama",
      className: "JHS 1",
      gender: "Female",
      attendancePresent: 70,
      subjects: [
        {
          id: "sub-e",
          name: "English",
          classScore: 15,
          examScore: 40,
          classScoreComponents: [{ id: "c1", name: "CAT 1", score: 15, maxScore: 20, category: "CAT" }],
        },
        {
          id: "sub-m",
          name: "Mathematics",
          classScore: 16,
          examScore: 42,
          classScoreComponents: [{ id: "c2", name: "CAT 1", score: 16, maxScore: 20, category: "CAT" }],
        },
      ],
    };

    expect(needsClassSubjectsOrSbaSync([], baseSettings)).toBe(false);
    expect(needsClassSubjectsOrSbaSync([syncedStudent], baseSettings)).toBe(false);

    expect(
      needsClassSubjectsOrSbaSync([syncedStudent], {
        ...baseSettings,
        defaultSubjects: ["English", "Mathematics", "Science"],
      }),
    ).toBe(true);

    expect(
      needsClassSubjectsOrSbaSync([syncedStudent], {
        ...baseSettings,
        subjectComponentMap: {
          ...baseSettings.subjectComponentMap,
          English: [{ name: "CAT 1", maxScore: 30, category: "CAT" }],
        },
      }),
    ).toBe(true);

    expect(
      needsClassSubjectsOrSbaSync([syncedStudent], {
        ...baseSettings,
        examType: "MOCK",
        subjectComponentMap: {
          ...baseSettings.subjectComponentMap,
          English: [{ name: "CAT 1", maxScore: 30, category: "CAT" }],
        },
      }),
    ).toBe(false);
  });

  it("hides Sync Subjects & SBA Tasks in Class Tools when synced and shows it with Update badge when out of sync", async () => {
    const user = userEvent.setup();
    const syncedSettings: SchoolSettings = {
      ...DEFAULT_SETTINGS,
      defaultSubjects: ["English Language"],
      subjectComponentMap: {},
    };

    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: [twoStudents[0]] };
      }
      if (key === "ges_v1_settings") {
        return { status: "found", value: syncedSettings };
      }
      return { status: "empty" };
    });

    const syncedRender = render(
      <SchoolProvider>
        <RouterProvider
          router={createAppRouter(createMemoryHistory({ initialEntries: ["/"] }))}
        />
      </SchoolProvider>,
    );

    await screen.findAllByText("Ama Mensah");
    await user.click(screen.getByRole("button", { name: /Class Tools/i }));
    expect(screen.queryByRole("menuitem", { name: /Sync Subjects & SBA Tasks/i })).toBeNull();
    syncedRender.unmount();

    storage.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") {
        return { status: "found", value: [twoStudents[0]] };
      }
      if (key === "ges_v1_settings") {
        return {
          status: "found",
          value: { ...syncedSettings, defaultSubjects: ["English Language", "Computing"] },
        };
      }
      return { status: "empty" };
    });

    render(
      <SchoolProvider>
        <RouterProvider
          router={createAppRouter(createMemoryHistory({ initialEntries: ["/"] }))}
        />
      </SchoolProvider>,
    );

    await screen.findAllByText("Ama Mensah");
    await user.click(screen.getByRole("button", { name: /Class Tools/i }));
    const syncItem = screen.getByRole("menuitem", { name: /Sync Subjects & SBA Tasks/i });
    expect(syncItem).toBeInTheDocument();
    expect(within(syncItem).getByText("Update")).toBeInTheDocument();
  });
});
