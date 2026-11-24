import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  migrateFromLocalStorage: vi.fn(),
  getStorageType: vi.fn(() => "indexeddb"),
}));

const pinSecurityMock = vi.hoisted(() => ({
  setupPin: vi.fn(async () => true),
  generateRecoveryCode: vi.fn(() => "ABC123"),
  isPinConfigured: vi.fn(() => false),
  isSameAsCurrentPin: vi.fn(async () => false),
  saveSecurityQuestions: vi.fn(async () => true),
}));

const biometricMock = vi.hoisted(() => ({
  isBiometricAvailable: vi.fn(async () => ({ available: false, type: null })),
  enrollBiometric: vi.fn(async () => ({ success: false, error: "Not available" })),
  getBiometricName: vi.fn(() => "Biometrics"),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => toastMock,
}));

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "ges_v1_students", SETTINGS: "ges_v1_settings" },
  ...storageMock,
}));

vi.mock("../utils/dataProtection", () => ({
  createBackupHeartbeat: vi.fn(),
  requestPersistentStorage: vi.fn(),
  detectDataLoss: vi.fn(() => false),
}));

vi.mock("../utils/pinSecurity", () => pinSecurityMock);
vi.mock("../utils/biometricAuth", () => biometricMock);

import { BulkAttendanceModal } from "../components/BulkAttendanceModal";
import { BulkPromotionModal } from "../components/BulkPromotionModal";
import { DataGate } from "../components/DataGate";
import { PinSetup } from "../components/PinSetup";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";
import { SchoolIdentitySection } from "../components/settings/SchoolIdentitySection";
import { SchoolProvider } from "../context/SchoolContext";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { SettingsFormProvider } from "../context/SettingsFormContext";

const baseSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Test Academy",
  className: "Basic 5",
  level: "PRIMARY",
  schoolType: "STANDARD",
  examType: "TERMLY",
  totalAttendanceDays: 70,
};

function makeProcessedStudent(id: string, name: string, avg = 72): ProcessedStudent {
  return {
    id,
    name,
    className: "Basic 5",
    gender: "Female",
    age: 11,
    totalScore: avg,
    averageScore: avg,
    classPosition: "1st",
    aggregate: null,
    attendancePresent: 50,
    subjects: [],
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
    clearAllStudents: vi.fn(),
    clearStudentScores: vi.fn(),
    removeAllStudentPhotos: vi.fn(),
    resetAllAppData: vi.fn().mockResolvedValue(true),
    loadDemoData: vi.fn(),
    updateClassNameForAll: vi.fn(),
    detectComponentMismatches: () => ({ hasOutdated: false, hasMissing: false }),
    syncSubjectComponentsFromSettings: vi.fn(),
    applySbaConfig: vi.fn(),
    updateAssessmentWeights: vi.fn(),
    checkDuplicateName: vi.fn(() => false),
    restoreDefaults: vi.fn(),
    autoGenerateRemarks: vi.fn(),
    retryLoad: vi.fn(),
    startFresh: vi.fn(),
    suspendPersistence: vi.fn(),
    resumePersistence: vi.fn(),
    markIncompleteRollback: vi.fn(),
    clearIncompleteRollback: vi.fn(),
  };
}

function getCapturedEvents(eventName: string) {
  return posthogMock.capture.mock.calls
    .filter(([name]) => name === eventName)
    .map(([, props]) => props as Record<string, unknown>);
}

describe("Tier 2 Feature Adoption Analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    storageMock.initStorage.mockResolvedValue(undefined);
    storageMock.migrateFromLocalStorage.mockResolvedValue({ success: true });
    storageMock.saveToStorage.mockResolvedValue(true);
    storageMock.saveEntriesToStorage.mockResolvedValue(true);
    storageMock.loadFromStorageResult.mockImplementation(async (key: string) => {
      if (key === "ges_v1_students") return { status: "found", value: [] };
      if (key === "ges_v1_settings") return { status: "found", value: baseSettings };
      return { status: "empty" };
    });
    pinSecurityMock.isPinConfigured.mockReturnValue(false);
    pinSecurityMock.setupPin.mockResolvedValue(true);
    biometricMock.isBiometricAvailable.mockResolvedValue({ available: false, type: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks School_Type_Changed with no-op guard", async () => {
    render(
      <SchoolProvider>
        <DataGate>
          <SettingsFormProvider>
            <SchoolIdentitySection />
          </SettingsFormProvider>
        </DataGate>
      </SchoolProvider>,
    );

    await waitFor(() => expect(screen.getByDisplayValue("Test Academy")).toBeInTheDocument());

    const standardRadio = screen.getByLabelText("Standard (GES)");
    const privateRadio = screen.getByLabelText("Private School");

    fireEvent.click(standardRadio);
    expect(getCapturedEvents("School_Type_Changed")).toHaveLength(0);

    fireEvent.click(privateRadio);
    expect(getCapturedEvents("School_Type_Changed")).toEqual([
      {
        previous_type: "STANDARD",
        new_type: "PRIVATE",
        school_level: "PRIMARY",
      },
    ]);
  });

  it("tracks Pwa_Install_Prompt_Action for both accepted install and dismissed prompt", async () => {
    const promptSpy = vi.fn(async () => undefined);
    const { unmount } = render(<PwaInstallPrompt />);

    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    installEvent.prompt = promptSpy;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    const installBtn = await screen.findByRole("button", { name: "Install" });
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptSpy).toHaveBeenCalledOnce();
    expect(getCapturedEvents("Pwa_Install_Prompt_Action")[0]).toEqual({
      outcome: "accepted",
      platform: "chromium",
    });
    unmount();

    render(<PwaInstallPrompt />);
    const dismissEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    dismissEvent.prompt = vi.fn(async () => undefined);
    dismissEvent.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => {
      window.dispatchEvent(dismissEvent);
    });

    const notNowBtn = await screen.findByRole("button", { name: "Not now" });
    fireEvent.click(notNowBtn);

    expect(getCapturedEvents("Pwa_Install_Prompt_Action")[1]).toEqual({
      outcome: "dismissed",
      platform: "chromium",
    });
  });

  it("tracks Class_Tool_Used for bulk_attendance and bulk_promotion", () => {
    const students = [
      makeProcessedStudent("s1", "Ama", 75),
      makeProcessedStudent("s2", "Kofi", 40),
    ];
    const ctx = makeSchoolContext(students);

    const attendanceView = render(
      <SchoolContext.Provider value={ctx}>
        <BulkAttendanceModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set All" }));
    fireEvent.click(screen.getByRole("button", { name: /save attendance/i }));
    expect(getCapturedEvents("Class_Tool_Used")[0]).toEqual({
      tool: "bulk_attendance",
      students_count: 2,
      school_level: "PRIMARY",
    });
    attendanceView.unmount();

    render(
      <SchoolContext.Provider value={ctx}>
        <BulkPromotionModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /apply promotion status/i }));
    expect(getCapturedEvents("Class_Tool_Used")[1]).toEqual({
      tool: "bulk_promotion",
      students_count: 2,
      school_level: "PRIMARY",
    });
  });

  it("tracks Pin_Lock_Configured after setup completes", async () => {
    const onComplete = vi.fn();
    render(<PinSetup onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.change(screen.getByPlaceholderText("••••"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.change(screen.getByPlaceholderText("••••"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(screen.getByRole("button", { name: "Next: Set Security Questions" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    });

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(getCapturedEvents("Pin_Lock_Configured")).toEqual([
      {
        is_change: false,
        biometric_enabled: false,
        security_questions_configured: false,
      },
    ]);
  });
});
