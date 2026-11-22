import type { ReactNode } from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { ProcessedStudent, SchoolSettings } from "../types";

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const storageMock = vi.hoisted(() => ({
  initStorage: vi.fn(),
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
  deleteFromStorage: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
  getStorageType: vi.fn<"indexeddb" | "localstorage">(() => "indexeddb"),
}));

const dataProtectionMock = vi.hoisted(() => ({
  createBackupHeartbeat: vi.fn(),
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
  recordBackup: vi.fn(),
}));

const fileEncryptionMock = vi.hoisted(() => ({
  encryptAppSealedBackup: vi.fn(),
  encryptBackupFile: vi.fn(),
  decryptBackupFile: vi.fn(),
  isEncryptedFile: vi.fn(() => false),
  requiresPassword: vi.fn(() => false),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => toastMock,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
  RouterProvider: () => null,
  createRouter: vi.fn(),
  createRoute: vi.fn(),
  createRootRoute: vi.fn(),
}));

vi.mock("../router", () => ({
  router: {},
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  STORAGE_QUOTA_EXCEEDED_EVENT: "repota:storage-quota-exceeded",
  ...storageMock,
}));

vi.mock("../utils/dataProtection", () => dataProtectionMock);
vi.mock("../utils/fileEncryption", () => fileEncryptionMock);
vi.mock("../utils/pinSecurity", () => ({
  isPinConfigured: () => false,
}));
vi.mock("../components/OfflineDetector", () => ({ OfflineDetector: () => null }));
vi.mock("../components/PwaInstallPrompt", () => ({ PwaInstallPrompt: () => null }));

import App from "../App";
import { DataBackup } from "../components/DataBackup";
import { QuickGradebook } from "../components/QuickGradebook";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { ScoreImportModal } from "../components/ScoreImportModal";
import { SchoolProvider } from "../context/SchoolContext";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { ToastContext } from "../context/ToastContextDefinition";
import { useSchoolData } from "../hooks/useSchoolData";
import { resetSessionAnalyticsGuards } from "../utils/analytics";
import { createBackupPayload } from "../utils/backupValidation";
import { STORAGE_QUOTA_EXCEEDED_EVENT } from "../utils/idbStorage";

const baseSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 6",
  level: "JHS",
  examType: "TERMLY",
  classScoreMax: 50,
  examScoreMax: 50,
  defaultSubjects: ["Mathematics"],
  subjectComponentMap: {
    Mathematics: [{ name: "CAT 1", maxScore: 15, category: "CAT" }],
  },
};

function makeProcessedStudent(id: string, name: string): ProcessedStudent {
  return {
    id,
    name,
    className: "Basic 6",
    gender: "Female",
    age: 13,
    totalScore: 0,
    averageScore: 0,
    classPosition: "Pending...",
    aggregate: null,
    subjects: [
      {
        id: `${id}-m`,
        name: "Mathematics",
        classScore: 10,
        examScore: 20,
        totalScore: 30,
        grade: 7,
        remark: "Low",
        classScoreComponents: [{ id: `${id}-c1`, name: "CAT 1", score: 5, maxScore: 15, category: "CAT" }],
      },
    ],
  };
}

function makeSchoolContext(students: ProcessedStudent[]): SchoolContextType {
  return {
    students,
    settings: baseSettings,
    isDataLoaded: true,
    isStorageReady: true,
    loadStatus: { students: "ok", settings: "ok" },
    loadError: false,
    isPersistenceSuspended: false,
    isRollbackIncomplete: false,
    isSaving: false,
    setSettings: vi.fn(),
    addStudent: vi.fn(),
    deleteStudent: vi.fn(),
    deletePendingStudents: vi.fn(),
    updateStudent: vi.fn(),
    clearAllScores: vi.fn(),
    clearStudentScores: vi.fn(),
    removeAllStudentPhotos: vi.fn(),
    loadDemoData: vi.fn(),
    updateClassNameForAll: vi.fn(),
    detectComponentMismatches: () => ({ hasOutdated: false, hasMissing: false }),
    syncSubjectComponentsFromSettings: vi.fn(),
    checkDuplicateName: vi.fn(() => false),
    restoreDefaults: vi.fn(),
    autoGenerateRemarks: vi.fn(),
    retryLoad: vi.fn(),
    startFresh: vi.fn(),
    suspendPersistence: vi.fn(),
    resumePersistence: vi.fn(),
    markIncompleteRollback: vi.fn(),
    clearIncompleteRollback: vi.fn(),
    waitForMigration: vi.fn().mockResolvedValue(undefined),
  };
}

function getCapturedEvents(eventName: string) {
  return posthogMock.capture.mock.calls
    .filter(([name]) => name === eventName)
    .map(([, props]) => props as Record<string, unknown>);
}

describe("Tier 1 Funnel & Reliability Analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    resetSessionAnalyticsGuards();
    storageMock.initStorage.mockResolvedValue(undefined);
    storageMock.migrateFromLocalStorage.mockResolvedValue({ success: true });
    storageMock.saveToStorage.mockResolvedValue(true);
    storageMock.saveEntriesToStorage.mockResolvedValue(true);
    storageMock.deleteFromStorage.mockResolvedValue(true);
    storageMock.getStorageType.mockReturnValue("indexeddb");
    dataProtectionMock.detectDataLoss.mockReturnValue(false);
    fileEncryptionMock.encryptAppSealedBackup.mockResolvedValue({
      version: "v2",
      encrypted: true,
      mode: "app",
      compressed: false,
      salt: "salt",
      iv: "iv",
      data: "ciphertext",
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:backup");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks Scores_Imported from ScoreImportModal", async () => {
    const user = userEvent.setup();
    const ctx = makeSchoolContext([makeProcessedStudent("s1", "Kwame Mensah")]);

    render(
      <ToastContext.Provider value={toastMock}>
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

    const textarea = screen
      .getAllByRole("textbox")
      .find((el) => el.tagName === "TEXTAREA") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Name\tCAT 1 (/15)\nKwame Mensah\t14" },
    });

    await user.click(screen.getByRole("button", { name: /preview & validate scores/i }));
    await user.click(screen.getByRole("button", { name: /apply scores/i }));

    expect(getCapturedEvents("Scores_Imported")).toEqual([
      {
        mode: "SINGLE_COMPONENT",
        students_updated: 1,
        students_created: 0,
        new_tasks_created: 0,
        school_level: "JHS",
        exam_type: "TERMLY",
      },
    ]);
  });

  it("tracks deduplicated Score_Entry_Session across QuickGradebook typing, column paste, and ScoreEntryModal", () => {
    const students = [
      makeProcessedStudent("s1", "Student One"),
      makeProcessedStudent("s2", "Student Two"),
    ];
    const ctx = makeSchoolContext(students);

    const { unmount } = render(
      <QuickGradebook
        students={students}
        settings={baseSettings}
        onUpdateStudent={vi.fn()}
      />,
    );

    const s1Exam = screen.getByLabelText("Student One Exam Score");
    fireEvent.change(s1Exam, { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Student Two Exam Score"), { target: { value: "75" } });

    expect(getCapturedEvents("Score_Entry_Session")).toHaveLength(1);
    expect(getCapturedEvents("Score_Entry_Session")[0]).toEqual({
      entry_mode: "quick_gradebook",
      used_column_paste: false,
      school_level: "JHS",
      exam_type: "TERMLY",
    });

    fireEvent.paste(s1Exam, {
      clipboardData: {
        getData: () => "70\n85",
      },
    });
    expect(getCapturedEvents("Score_Entry_Session")).toHaveLength(2);
    expect(getCapturedEvents("Score_Entry_Session")[1]).toMatchObject({
      entry_mode: "quick_gradebook",
      used_column_paste: true,
    });
    unmount();

    render(
      <SchoolContext.Provider value={ctx}>
        <ScoreEntryModal
          student={students[0]}
          level="JHS"
          isOpen={true}
          onClose={vi.fn()}
          onUpdateStudent={vi.fn()}
        />
      </SchoolContext.Provider>,
    );

    const modalExamInput = screen.getByLabelText("Mathematics Exam Score");
    fireEvent.change(modalExamInput, { target: { value: "90" } });
    fireEvent.blur(modalExamInput);

    expect(getCapturedEvents("Score_Entry_Session")).toHaveLength(3);
    expect(getCapturedEvents("Score_Entry_Session")[2]).toEqual({
      entry_mode: "score_modal",
      used_column_paste: false,
      school_level: "JHS",
      exam_type: "TERMLY",
    });
  });

  it("tracks Data_Loss_Detected in SchoolProvider and Storage_Quota_Exceeded in App", async () => {
    dataProtectionMock.detectDataLoss.mockReturnValue(true);
    storageMock.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") return { status: "found", value: [] };
      if (key === "ges_v1_settings") return { status: "found", value: baseSettings };
      return { status: "empty" };
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SchoolProvider>{children}</SchoolProvider>
    );
    const { result } = renderHook(() => useSchoolData(), { wrapper });
    await waitFor(() => expect(result.current.isDataLoaded).toBe(true));

    expect(getCapturedEvents("Data_Loss_Detected")).toEqual([
      { storage_type: "indexeddb" },
    ]);

    render(<App />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(STORAGE_QUOTA_EXCEEDED_EVENT, { detail: { message: "Quota exceeded" } }),
      );
    });

    expect(getCapturedEvents("Storage_Quota_Exceeded")).toEqual([
      { storage_type: "indexeddb" },
    ]);
  });

  it("tracks Backup_Exported and Backup_Restored in DataBackup", async () => {
    const rawStudents = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Ama Mensah",
        className: "Basic 6",
        gender: "Female",
        subjects: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Mathematics",
            classScore: 15,
            examScore: 25,
          },
        ],
      },
    ];
    const cleanBackupSettings: SchoolSettings = {
      ...baseSettings,
      logoUrl: "data:image/png;base64,iVBORw0KGgo=",
    };
    storageMock.loadFromStorageResult
      .mockResolvedValueOnce({ status: "found", value: rawStudents })
      .mockResolvedValueOnce({ status: "found", value: cleanBackupSettings })
      .mockResolvedValueOnce({ status: "found", value: rawStudents })
      .mockResolvedValueOnce({ status: "found", value: cleanBackupSettings });

    const ctx = makeSchoolContext([
      makeProcessedStudent("11111111-1111-4111-8111-111111111111", "Ama Mensah"),
    ]);
    const { container } = render(
      <SchoolContext.Provider value={ctx}>
        <DataBackup />
      </SchoolContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Class File" }));
    await waitFor(() => expect(getCapturedEvents("Backup_Exported")).toHaveLength(1));

    expect(getCapturedEvents("Backup_Exported")[0]).toEqual({
      password_protected: false,
      delivery_method: "download",
      students_count: 1,
      is_demo: false,
    });

    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
    const restoreInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const backupPayload = JSON.stringify(createBackupPayload(rawStudents, cleanBackupSettings));
    const backupFile = new File([backupPayload], "class.repota", {
      type: "application/json",
    });

    fireEvent.change(restoreInput, { target: { files: [backupFile] } });
    const confirmBtn = await screen.findByRole("button", { name: "Yes, Load File" });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(getCapturedEvents("Backup_Restored")).toHaveLength(1));
    expect(getCapturedEvents("Backup_Restored")[0]).toEqual({
      students_count: 1,
      from_recovery_mode: false,
      had_warnings: false,
    });
    reload.mockRestore();
  });
});
