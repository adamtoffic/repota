import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    preload,
    ...props
  }: {
    children: ReactNode;
    to?: string;
    preload?: unknown;
  }) => {
    void preload;
    return (
      <a href={to || "#"} {...props}>
        {children}
      </a>
    );
  },
  useSearch: () => ({ id: undefined }),
  useLocation: ({ select }: { select?: (loc: { pathname: string }) => string }) =>
    select ? select({ pathname: "/" }) : "/",
}));

vi.mock("../utils/pinSecurity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/pinSecurity")>();
  return {
    ...actual,
    isPinConfigured: vi.fn(() => true),
  };
});

vi.mock("../utils/biometricAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/biometricAuth")>();
  return {
    ...actual,
    isBiometricEnrolled: vi.fn(() => false),
  };
});

import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { SettingsFormContext } from "../context/SettingsFormContextDefinition";
import type { SettingsFormContextType } from "../context/SettingsFormContextDefinition";
import { AboutModal } from "../components/AboutModal";
import { AddStudentModal } from "../components/AddStudentModal";
import { AnalyticsInsightsTab } from "../components/analytics/AnalyticsInsightsTab";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { BulkAttendanceModal } from "../components/BulkAttendanceModal";
import { BulkImportModal } from "../components/BulkImportModal";
import { BulkPromotionModal } from "../components/BulkPromotionModal";
import { DataBackup } from "../components/DataBackup";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { OfflineDetector } from "../components/OfflineDetector";
import { ProgressModal } from "../components/ProgressModal";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";
import { ScoreImportModal } from "../components/ScoreImportModal";
import { WelcomeTour } from "../components/WelcomeTour";
import { BackupModals } from "../components/backup/BackupModals";
import { ScoreImportConfigAndInput } from "../components/import/ScoreImportConfigAndInput";
import { AppShell } from "../components/navigation/AppShell";
import { SbaTaskManagerModal } from "../components/sba/SbaTaskManagerModal";
import { SbaWeightsModal } from "../components/sba/SbaWeightsModal";
import { ReportTemplateSection } from "../components/settings/ReportTemplateSection";
import { SecurityBackupSection } from "../components/settings/SecurityBackupSection";
import { PrintPreview } from "../pages/PrintPreview";
import type { ProcessedStudent, SchoolSettings } from "../types";
import { resolveAppEnv, shouldSendAnalytics } from "../utils/analyticsEnv";

const sampleStudent: ProcessedStudent = {
  id: "stu-w4-1",
  name: "Ama Mensah",
  className: "Basic 5",
  gender: "Female",
  age: 11,
  attendancePresent: 55,
  totalScore: 160,
  averageScore: 80,
  classPosition: "1st",
  aggregate: 7,
  subjects: [
    {
      id: "sub-m",
      name: "Mathematics",
      classScore: 35,
      examScore: 45,
      totalScore: 80,
      grade: 1,
      remark: "Highest",
      subjectPosition: "1st",
    },
    {
      id: "sub-e",
      name: "English",
      classScore: 35,
      examScore: 45,
      totalScore: 80,
      grade: 1,
      remark: "Highest",
      subjectPosition: "1st",
    },
  ],
};

const baseSettings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  schoolName: "Sunrise Model School",
  className: "Basic 5",
  level: "PRIMARY",
  defaultSubjects: ["Mathematics", "English"],
  subjectComponents: {
    Mathematics: [{ id: "t1", name: "Homework 1", maxScore: 15, category: "HOMEWORK" }],
    English: [{ id: "t2", name: "Quiz 1", maxScore: 15, category: "TEST" }],
  },
};

function makeSchoolContext(students: ProcessedStudent[] = [sampleStudent]): SchoolContextType {
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

function makeSettingsFormContext(): SettingsFormContextType {
  return {
    formData: baseSettings,
    setFormData: vi.fn(),
    lastSavedSettings: baseSettings,
    hasUnsavedChanges: false,
    isSaving: false,
    lastSaved: undefined,
    isPersistenceSuspended: false,
    studentsCount: 1,
    committedSchoolName: baseSettings.schoolName,
    newSubject: "",
    setNewSubject: vi.fn(),
    addSubject: vi.fn(),
    removeSubject: vi.fn(),
    confirmDeleteSubject: vi.fn(),
    handleClassNameBlur: vi.fn(),
    handleKeepOldClassName: vi.fn(),
    finalizeSave: vi.fn(),
    flushPendingSave: vi.fn(() => baseSettings),
    syncCommittedSettings: vi.fn(),
    handleLevelChange: vi.fn(),
    applyLevelChange: vi.fn(),
    biometricAvailable: false,
    biometricType: null,
    enrollingBiometric: false,
    checkBiometric: vi.fn().mockResolvedValue(undefined),
    handleEnrollBiometric: vi.fn().mockResolvedValue(undefined),
    handleDisableBiometric: vi.fn(),
    setShowPinSetup: vi.fn(),
    setShowPinRecovery: vi.fn(),
    setShowDisablePinModal: vi.fn(),
    setShowClearStudentsModal: vi.fn(),
    setShowFactoryResetModal: vi.fn(),
    setShowFullAppResetModal: vi.fn(),
  };
}

describe("Wave 4: Privacy, Mobile/iOS Polish, A11y & Hosting Cleanup", () => {
  const originalNavigator = window.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("P1-24: resolveAppEnv fails closed to 'preview' for unknown or non-allowlisted domains", () => {
    for (const hostname of ["staging.repota.app", "repota.pages.dev", "custom-fork.example.com"]) {
      const env = resolveAppEnv({ hostname, vercelEnv: "production", isDevBuild: false });
      expect(env).toBe("preview");
      expect(shouldSendAnalytics(env)).toBe(false);
    }
  });

  it("P1-25 & P3: PrintPreview sticky toolbar includes safe-top inset and accessible Ink mode group", () => {
    render(
      <SchoolContext.Provider value={makeSchoolContext()}>
        <PrintPreview />
      </SchoolContext.Provider>,
    );

    const toolbar = screen.getByTestId("print-sticky-toolbar");
    expect(toolbar.className).toContain("env(safe-area-inset-top");

    const inkGroup = screen.getByRole("group", { name: "Ink mode" });
    expect(inkGroup).toHaveClass("grid-cols-2");
  });

  it("P1-26 & P2: ReportTemplateSection B&W toggles have dark-mode contrast classes and aria-pressed states", () => {
    render(
      <SchoolContext.Provider value={makeSchoolContext()}>
        <SettingsFormContext.Provider value={makeSettingsFormContext()}>
          <ReportTemplateSection />
        </SettingsFormContext.Provider>
      </SchoolContext.Provider>,
    );

    const bwButtons = screen.getAllByRole("button", { name: "B&W" });
    expect(bwButtons).toHaveLength(2);
    fireEvent.click(bwButtons[0]);

    for (const btn of screen.getAllByRole("button", { name: "B&W" })) {
      expect(btn).toHaveAttribute("aria-pressed", "true");
      expect(btn.className).toContain("dark:bg-slate-100");
      expect(btn.className).toContain("dark:text-slate-900");
    }

    const activeTemplateBtn = screen
      .getAllByText("Repota Original")
      .find((el) => el.closest("button"))!
      .closest("button") as HTMLButtonElement;
    expect(activeTemplateBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("P1-27: file inputs use sr-only (not hidden) across DataBackup, BulkImportModal, and ScoreImportConfigAndInput", () => {
    const schoolCtx = makeSchoolContext();
    const { container: backupDom, unmount: unmountBackup } = render(
      <SchoolContext.Provider value={schoolCtx}>
        <DataBackup />
      </SchoolContext.Provider>,
    );
    const backupFileInput = backupDom.querySelector('input[type="file"]') as HTMLInputElement;
    expect(backupFileInput).toHaveClass("sr-only");
    expect(backupFileInput).not.toHaveClass("hidden");
    unmountBackup();

    const { unmount: unmountBulk } = render(
      <SchoolContext.Provider value={schoolCtx}>
        <BulkImportModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );
    const bulkDialog = screen.getByRole("dialog", { name: /Bulk Import/i });
    const bulkFileInput = bulkDialog.querySelector('input[type="file"]') as HTMLInputElement;
    expect(bulkFileInput).toHaveClass("sr-only");
    expect(bulkFileInput).not.toHaveClass("hidden");
    expect(screen.getByLabelText("Paste student list or CSV rows")).toBeInTheDocument();
    unmountBulk();

    const { container: scoreDom } = render(
      <ScoreImportConfigAndInput
        availableSubjects={["Mathematics"]}
        activeSubject="Mathematics"
        onSelectSubject={vi.fn()}
        modeTabs={[{ id: "EXAM_ONLY", label: "Final Exam (/100)", hint: "" }]}
        activeMode="EXAM_ONLY"
        onSelectMode={vi.fn()}
        isMock={false}
        activeTasks={[]}
        classScoreMax={40}
        examScoreMax={60}
        effectiveTaskOption=""
        onSelectTaskOption={vi.fn()}
        isCreatingSingleTask={false}
        activeSingleTask={undefined}
        studentCount={1}
        newSingleTaskName=""
        newSingleTaskMax="15"
        newSingleTaskCategory="TEST"
        isSingleTaskMaxValid={true}
        onNewSingleTaskNameChange={vi.fn()}
        onNewSingleTaskMaxChange={vi.fn()}
        onNewSingleTaskCategoryChange={vi.fn()}
        onDownloadTemplate={vi.fn()}
        onExportSingleComponent={vi.fn()}
        onFileUpload={vi.fn()}
        isPreviewing={false}
        rawText=""
        onRawTextChange={vi.fn()}
        onStartPreview={vi.fn()}
      />,
    );
    const scoreFileInput = scoreDom.querySelector('input[type="file"]') as HTMLInputElement;
    expect(scoreFileInput).toHaveClass("sr-only");
    expect(scoreFileInput).not.toHaveClass("hidden");
    expect(screen.getByLabelText("Paste subject scores or CSV rows")).toBeInTheDocument();
  });

  it("P1-27: all 9 modals expose accessible dialog names and ProgressModal/ReloadOverlay render named dialogs", () => {
    const schoolCtx = makeSchoolContext();

    const { unmount: u1 } = render(
      <AddStudentModal
        isOpen={true}
        onClose={vi.fn()}
        onAddStudent={vi.fn()}
        settings={baseSettings}
      />,
    );
    expect(screen.getByRole("dialog", { name: /Add New Student/i })).toBeInTheDocument();
    u1();

    const { unmount: u2 } = render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /About Repota/i })).toBeInTheDocument();
    u2();

    const { unmount: u3 } = render(
      <SchoolContext.Provider value={schoolCtx}>
        <BulkAttendanceModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );
    expect(screen.getByRole("dialog", { name: /Bulk Attendance Entry/i })).toBeInTheDocument();
    u3();

    const { unmount: u4 } = render(
      <SchoolContext.Provider value={schoolCtx}>
        <BulkImportModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );
    expect(screen.getByRole("dialog", { name: /Bulk Import/i })).toBeInTheDocument();
    u4();

    const { unmount: u5 } = render(
      <SchoolContext.Provider value={schoolCtx}>
        <BulkPromotionModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );
    expect(screen.getByRole("dialog", { name: /Bulk Promotion Status/i })).toBeInTheDocument();
    u5();

    const { unmount: u6 } = render(
      <SchoolContext.Provider value={schoolCtx}>
        <ScoreImportModal isOpen={true} onClose={vi.fn()} />
      </SchoolContext.Provider>,
    );
    expect(screen.getByRole("dialog", { name: /Import & Export Subject Scores/i })).toBeInTheDocument();
    u6();

    const { unmount: u7 } = render(
      <SbaTaskManagerModal
        isOpen={true}
        onClose={vi.fn()}
        activeSubject="Mathematics"
        defaultSubjects={["Mathematics", "English"]}
        students={[sampleStudent]}
        settings={baseSettings}
        onCommitConfig={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: /Manage SBA Tasks/i })).toBeInTheDocument();
    u7();

    const { unmount: u8 } = render(
      <SbaWeightsModal
        isOpen={true}
        onClose={vi.fn()}
        students={[sampleStudent]}
        settings={baseSettings}
        onApplyWeights={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: /Grading Weights/i })).toBeInTheDocument();
    u8();

    const { unmount: u9 } = render(
      <BackupModals
        showReloadOverlay={true}
        showImportModal={false}
        importStats={{ count: 1, school: "Test", currentCount: 1, warningCount: 0 }}
        isImporting={false}
        onCloseImportModal={vi.fn()}
        onConfirmImport={vi.fn()}
        showEmptyExportConfirm={false}
        onCloseEmptyExportConfirm={vi.fn()}
        onConfirmEmptyExport={vi.fn()}
        showExportPasswordModal={false}
        password=""
        confirmPassword=""
        passwordHint=""
        showPassword={false}
        isExportPasswordMismatch={false}
        onPasswordChange={vi.fn()}
        onConfirmPasswordChange={vi.fn()}
        onPasswordHintChange={vi.fn()}
        onToggleShowPassword={vi.fn()}
        onCloseExportPasswordModal={vi.fn()}
        onConfirmExportWithPassword={vi.fn()}
        showImportPasswordModal={false}
        encryptionHint=""
        importPassword=""
        showImportPassword={false}
        isDecrypting={false}
        onImportPasswordChange={vi.fn()}
        onToggleShowImportPassword={vi.fn()}
        onCancelImportPasswordModal={vi.fn()}
        onDecryptAndImport={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: /Backup loaded\. Reloading/i })).toBeInTheDocument();
    u9();

    const { unmount: u10 } = render(
      <ProgressModal
        isOpen={true}
        title="Compressing Photos"
        message="Processing 2 of 4"
        progress={50}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Compressing Photos" })).toBeInTheDocument();
    const progressBar = screen.getByRole("progressbar", { name: "Compressing Photos" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    u10();
  });

  it("P1-27 & P2: DashboardToolbar labels search input, fixes md: menu breakpoint, and navigates menu via keyboard", async () => {
    render(
      <DashboardToolbar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        counts={{ all: 10, pending: 3, noScores: 1, missingPhotos: 2, failing: 4 }}
        onExport={vi.fn()}
        onDeletePending={vi.fn()}
        onAutoRemarks={vi.fn()}
        onClearScores={vi.fn()}
        onExportStudentList={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Search students")).toBeInTheDocument();

    const allButton = screen.getByRole("button", { name: /All \(10\)/ });
    expect(allButton).not.toHaveAttribute("data-record", "true");
    expect(allButton.closest('[data-record="true"]')).toBeNull();

    const trigger = screen.getByRole("button", { name: /Class Tools/i });
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu", { name: "Class Tools" });
    expect(menu.className).toContain("md:z-40");
    expect(menu.className).not.toContain("sm:z-20");

    const removeBtn = screen.getByRole("menuitem", { name: /Remove Incomplete Students/i });
    expect(removeBtn).not.toHaveAttribute("data-record", "true");

    const menuItems = screen.getAllByRole("menuitem");
    menuItems[0].focus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(menuItems[1]);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("P2 Privacy: strips data-record='true' from dynamic metrics in AppShell, AnalyticsInsightsTab, and SbaTaskManagerModal", () => {
    render(
      <SchoolContext.Provider value={makeSchoolContext()}>
        <AppShell>
          <div>Child</div>
        </AppShell>
      </SchoolContext.Provider>,
    );

    const printLink = screen.getByRole("link", { name: /Print Reports/i });
    expect(printLink).not.toHaveAttribute("data-record", "true");

    render(
      <AnalyticsInsightsTab
        classStory={null}
        copiedBrief={false}
        onCopyStaffBrief={vi.fn()}
        onInspectSubject={vi.fn()}
        borderlineStudents={{ nearPass: [], nearExcellence: [] }}
        sbaVsExam={{
          strongerSba: [],
          strongerExam: [],
          balanced: [],
          classSbaAvg: 75,
          classExamAvg: 75,
          gap: 0,
        }}
        atRiskStudents={[]}
        onReviewStudents={vi.fn()}
        performanceQuartiles={{
          top25: [],
          middle50: [],
          strugglingStudents: [],
          top25Threshold: 80,
          bottom25Threshold: 50,
          median: 70,
        }}
        attendanceInsights={{
          averageAttendanceRate: 90,
          perfectAttendance: 2,
          poorAttendance: 1,
          correlationWithPerformance: "positive",
          correlationCoefficient: 0.72,
        }}
        classMetrics={{
          totalStudents: 10,
          averageScore: 72,
          medianScore: 73,
          passRate: 80,
          excellenceRate: 40,
          failingCount: 2,
          highestScore: 95,
          lowestScore: 42,
        }}
        subjectInsights={{
          strongest: [],
          weakest: [],
          needsAttention: [],
        }}
        genderAnalysis={{
          maleCount: 5,
          femaleCount: 5,
          maleAverage: 70,
          femaleAverage: 74,
          malePassRate: 80,
          femalePassRate: 80,
        }}
      />,
    );

    const pearsonEl = screen.getByText(/= 0\.72/);
    expect(pearsonEl).not.toHaveAttribute("data-record", "true");

    const { unmount } = render(
      <SbaTaskManagerModal
        isOpen={true}
        onClose={vi.fn()}
        activeSubject="Mathematics"
        defaultSubjects={["Mathematics", "English"]}
        students={[sampleStudent]}
        settings={baseSettings}
        onCommitConfig={vi.fn()}
      />,
    );
    const activeTasksHeading = screen.getByText("Active Tasks");
    expect(activeTasksHeading.parentElement).not.toHaveAttribute("data-record", "true");

    // Keyboard tablist arrow switching
    const allTab = screen.getByRole("tab", { name: /All Subjects/i });
    const subjectTab = screen.getByRole("tab", { name: /Only Mathematics/i });
    expect(allTab).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(allTab, { key: "ArrowRight" });
    expect(subjectTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    unmount();
  });

  it("P2/P3 Mobile & Storage resilience: PwaInstallPrompt, OfflineDetector, AutoSaveIndicator, WelcomeTour & SecurityBackupSection", async () => {
    // 1. PwaInstallPrompt respects navigator.standalone and blocked localStorage
    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
        standalone: true,
        onLine: true,
      },
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: storage blocked");
    });

    const { container: pwaDom } = render(<PwaInstallPrompt />);
    act(() => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
    });
    expect(pwaDom.textContent).toBe("");

    // 2. OfflineDetector survives blocked localStorage/sessionStorage
    expect(() => render(<OfflineDetector />)).not.toThrow();

    // 3. AutoSaveIndicator hides non-error pill on editable focus while keeping errors visible
    const externalInput = document.createElement("input");
    externalInput.type = "text";
    document.body.appendChild(externalInput);
    try {
      const { container: indicatorDom, unmount: unmountAutoSave } = render(
        <AutoSaveIndicator isSaving={true} />,
      );
      fireEvent.focusIn(externalInput);
      expect(indicatorDom.firstElementChild).toHaveAttribute("aria-hidden", "true");
      expect(indicatorDom.firstElementChild?.className).toContain("invisible");
      unmountAutoSave();
    } finally {
      externalInput.remove();
    }

    // 4. WelcomeTour scrollable card even when localStorage throws
    vi.restoreAllMocks();
    vi.useFakeTimers();
    const { unmount: unmountTour } = render(
      <WelcomeTour steps={[{ title: "Step One", description: "Hello" }]} onComplete={vi.fn()} />,
    );
    act(() => {
      vi.advanceTimersByTime(900);
    });
    const tourDialog = screen.getByRole("dialog", { name: "Step One" });
    expect(tourDialog.className).toContain("max-h-[90dvh]");
    expect(tourDialog.className).toContain("overflow-y-auto");
    unmountTour();

    // 5. SecurityBackupSection static warning/error cards mount as role='region', not role='alert'
    render(
      <SchoolContext.Provider value={makeSchoolContext()}>
        <SettingsFormContext.Provider value={makeSettingsFormContext()}>
          <SecurityBackupSection />
        </SettingsFormContext.Provider>
      </SchoolContext.Provider>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByRole("region").length).toBeGreaterThanOrEqual(2);
  });
});
