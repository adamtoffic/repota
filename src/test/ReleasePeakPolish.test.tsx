import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmModal } from "../components/ConfirmModal";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { Footer } from "../components/Footer";
import { SecurityBackupSection } from "../components/settings/SecurityBackupSection";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import {
  SettingsFormContext,
  type SettingsFormContextType,
} from "../context/SettingsFormContextDefinition";
import { PIN_CONFIG_CHANGED_EVENT } from "../utils/pinSecurity";

function makeSchoolCtx(): SchoolContextType {
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

function makeSettingsFormCtx(): SettingsFormContextType {
  return {
    formData: DEFAULT_SETTINGS,
    setFormData: vi.fn(),
    lastSavedSettings: DEFAULT_SETTINGS,
    hasUnsavedChanges: false,
    isSaving: false,
    lastSaved: undefined,
    isPersistenceSuspended: false,
    studentsCount: 0,
    committedSchoolName: DEFAULT_SETTINGS.schoolName,
    newSubject: "",
    setNewSubject: vi.fn(),
    addSubject: vi.fn(),
    removeSubject: vi.fn(),
    confirmDeleteSubject: vi.fn(),
    handleClassNameBlur: vi.fn(),
    handleKeepOldClassName: vi.fn(),
    finalizeSave: vi.fn(),
    flushPendingSave: vi.fn(() => DEFAULT_SETTINGS),
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

describe("Release Peak Polish — ConfirmModal privacy, DashboardToolbar mobile trap & PIN reactivity", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.mobileSheetOpen;
    document.body.style.overflow = "";
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    delete document.documentElement.dataset.mobileSheetOpen;
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  it("masks ConfirmModal titles by default in session replay unless recordTitle is opted in", () => {
    const { rerender } = render(
      <ConfirmModal
        isOpen={true}
        title="Delete Kwame Mensah?"
        message="This will permanently remove this student."
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Delete Kwame Mensah?" });
    expect(heading).not.toHaveAttribute("data-record", "true");
    expect(heading.closest('[data-record="true"]')).toBeNull();

    rerender(
      <ConfirmModal
        isOpen={true}
        title="Reset Class Session?"
        message="Confirm static reset."
        recordTitle={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const staticHeading = screen.getByRole("heading", { name: "Reset Class Session?" });
    expect(staticHeading).toHaveAttribute("data-record", "true");
  });

  it("traps focus, locks scroll, sets mobileSheetOpen, and cleans up on Escape for mobile Class Tools sheet", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 767px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    render(
      <DashboardToolbar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        onExport={vi.fn()}
        onDeletePending={vi.fn()}
        onAutoRemarks={vi.fn()}
        onClearScores={vi.fn()}
        onExportStudentList={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Class Tools/i });
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu", { name: "Class Tools" });
    expect(menu).toHaveAttribute("aria-modal", "true");
    expect(document.documentElement.dataset.mobileSheetOpen).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    const focusableButtons = Array.from(menu.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    expect(focusableButtons.length).toBeGreaterThan(1);

    const first = focusableButtons[0];
    const last = focusableButtons[focusableButtons.length - 1];
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(document.documentElement.dataset.mobileSheetOpen).toBeUndefined();
    expect(document.body.style.overflow).toBe("");
  });

  it("updates SecurityBackupSection immediately on PIN_CONFIG_CHANGED_EVENT without remounting", () => {
    render(
      <SchoolContext.Provider value={makeSchoolCtx()}>
        <SettingsFormContext.Provider value={makeSettingsFormCtx()}>
          <SecurityBackupSection />
        </SettingsFormContext.Provider>
      </SchoolContext.Provider>,
    );

    expect(screen.getByRole("button", { name: "Enable PIN Lock" })).toBeInTheDocument();

    act(() => {
      localStorage.setItem("app_pin_hash", "v2:pbkdf2$100000$aa$bb");
      window.dispatchEvent(new Event(PIN_CONFIG_CHANGED_EVENT));
    });

    expect(screen.getByRole("button", { name: "Change PIN" })).toBeInTheDocument();
    expect(screen.getByText("PIN Lock Active")).toBeInTheDocument();
  });
});

describe("Footer version sync", () => {
  it("renders the package.json version injected via __APP_VERSION__", () => {
    render(<Footer />);
    expect(screen.getByText("v2.0.0")).toBeInTheDocument();
  });
});
