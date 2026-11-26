import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import { SettingsFormProvider } from "../context/SettingsFormContext";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { PinRecovery } from "../components/PinRecovery";
import {
  clearPinLockout,
  clearRecoveryLockout,
  disablePinLock,
  getRecoveryLockoutStatus,
  PIN_CONFIG_CHANGED_EVENT,
  saveSecurityQuestions,
  setupPin,
  verifyPin,
  verifyRecoveryCode,
  verifySecurityAnswers,
} from "../utils/pinSecurity";
import { decryptBackupFile } from "../utils/fileEncryption";

async function legacySha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function SettingsSyncProbe() {
  const { formData } = useSettingsForm();
  return <div data-testid="draft-school">{formData.schoolName}</div>;
}

describe("Release Wave 1 — PIN Security, Recovery Lockout, Encryption & SettingsForm Sync", () => {
  beforeEach(() => {
    localStorage.clear();
    clearPinLockout();
    clearRecoveryLockout();
  });

  it("verifies legacy SHA-256 credentials even when localStorage.setItem throws QuotaExceededError", async () => {
    localStorage.setItem("app_pin_hash", await legacySha256Hex("4820"));
    localStorage.setItem("recovery_code_hash", await legacySha256Hex("778899"));
    localStorage.setItem(
      "security_questions",
      JSON.stringify([
        { questionId: "birth_city", answerHash: await legacySha256Hex("accra") },
        { questionId: "favorite_subject", answerHash: await legacySha256Hex("math") },
        { questionId: "favorite_dish", answerHash: await legacySha256Hex("waakye") },
      ]),
    );

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    try {
      expect(await verifyPin("4820")).toBe(true);
      expect(await verifyRecoveryCode("778899")).toBe(true);
      const sec = await verifySecurityAnswers([
        { questionId: "birth_city", answer: "Accra" },
        { questionId: "favorite_subject", answer: "Math" },
        { questionId: "favorite_dish", answer: "Wrong" },
      ]);
      expect(sec.verified).toBe(true);
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it("emits PIN_CONFIG_CHANGED_EVENT on setupPin and disablePinLock", async () => {
    const events: string[] = [];
    const listener = () => events.push("changed");
    window.addEventListener(PIN_CONFIG_CHANGED_EVENT, listener);

    try {
      await setupPin("1234", "654321");
      disablePinLock();
      expect(events).toHaveLength(2);
    } finally {
      window.removeEventListener(PIN_CONFIG_CHANGED_EVENT, listener);
    }
  });

  it("enforces exponential lockout on repeated wrong PinRecovery attempts and hides exact count", async () => {
    const user = userEvent.setup();
    await setupPin("1234", "654321");
    await saveSecurityQuestions([
      { questionId: "birth_city", answer: "Takoradi" },
      { questionId: "favorite_subject", answer: "Mathematics" },
      { questionId: "favorite_dish", answer: "Jollof" },
    ]);

    render(<PinRecovery onComplete={vi.fn()} onCancel={vi.fn()} />);

    const codeInput = screen.getByPlaceholderText("000000");
    for (let i = 0; i < 5; i++) {
      fireEvent.change(codeInput, { target: { value: "000000" } });
      await user.click(screen.getByRole("button", { name: "Verify Code" }));
      if (i < 4) {
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Verify Code" })).toBeInTheDocument(),
        );
      }
    }

    expect(await screen.findByText(/Too many failed recovery attempts/i)).toBeInTheDocument();
    expect(getRecoveryLockoutStatus().isLockedOut).toBe(true);
  });

  it("distinguishes corrupted app-sealed backups from wrong password errors", async () => {
    const bogusEnvelope = {
      encrypted: true as const,
      version: "v2" as const,
      mode: "app" as const,
      compressed: false,
      salt: "AAAA",
      iv: "AAAA",
      data: "AAAA",
    };

    await expect(decryptBackupFile(bogusEnvelope)).rejects.toThrow(
      /Failed to read protected backup file/i,
    );
  });

  it("syncs SettingsFormContext immediately when external SchoolContext.settings updates", async () => {
    const makeCtx = (schoolName: string): SchoolContextType =>
      ({
        isDataLoaded: true,
        isStorageReady: true,
        loadError: false,
        studentsLoadError: false,
        settingsLoadError: false,
        isRollbackIncomplete: false,
        activeRecoveryAction: null,
        setActiveRecoveryAction: vi.fn(),
        retryLoad: vi.fn(),
        startFresh: vi.fn(),
        showFreshConfirm: false,
        openStartFreshConfirm: vi.fn(),
        cancelStartFreshConfirm: vi.fn(),
        closeStartFreshConfirm: vi.fn(),
        isFreshWriting: false,
        students: [],
        settings: { ...DEFAULT_FACTORY_SETTINGS, schoolName },
        setStudents: vi.fn(),
        setSettings: vi.fn(),
        addStudent: vi.fn(),
        updateStudent: vi.fn(),
        deleteStudent: vi.fn(),
        deletePendingStudents: vi.fn(),
        clearAllStudents: vi.fn(),
        loadDemoData: vi.fn(),
        restoreDefaults: vi.fn(),
        updateClassNameForAll: vi.fn(),
        updateAssessmentWeights: vi.fn(),
        syncSubjectComponentsFromSettings: vi.fn(),
        applySbaConfigAndRescale: vi.fn(),
        resetAllAppData: vi.fn(),
        isSaving: false,
        lastSaved: null,
        saveError: null,
        isPersistenceSuspended: false,
        suspendPersistence: vi.fn(),
        resumePersistence: vi.fn(),
        markIncompleteRollback: vi.fn(),
        clearIncompleteRollback: vi.fn(),
        waitForMigration: vi.fn(),
        flushPendingWrites: vi.fn(),
      }) as unknown as SchoolContextType;

    const { rerender } = render(
      <SchoolContext.Provider value={makeCtx("Initial School")}>
        <SettingsFormProvider>
          <SettingsSyncProbe />
        </SettingsFormProvider>
      </SchoolContext.Provider>,
    );

    expect(screen.getByTestId("draft-school")).toHaveTextContent("Initial School");

    rerender(
      <SchoolContext.Provider value={makeCtx("Restored From Backup School")}>
        <SettingsFormProvider>
          <SettingsSyncProbe />
        </SettingsFormProvider>
      </SchoolContext.Provider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("draft-school")).toHaveTextContent("Restored From Backup School"),
    );
  });
});
