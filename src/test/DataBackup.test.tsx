import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolContextType } from "../context/SchoolContextDefinition";
import { SchoolContext } from "../context/SchoolContextDefinition";
import { DataBackup } from "../components/DataBackup";
import { DataGate } from "../components/DataGate";
import {
  createBackupPayload,
  importBackupAtomically,
  validateBackup,
} from "../utils/backupValidation";
import { decryptBackupFile, isEncryptedFile } from "../utils/fileEncryption";

const storage = vi.hoisted(() => ({
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
}));
const recordBackup = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "students", SETTINGS: "settings" },
  loadFromStorageResult: storage.loadFromStorageResult,
  saveToStorage: storage.saveToStorage,
  saveEntriesToStorage: storage.saveEntriesToStorage,
  deleteFromStorage: vi.fn(),
}));
vi.mock("../utils/dataProtection", () => ({ recordBackup }));
vi.mock("../hooks/useToast", () => ({ useToast: () => ({ showToast }) }));
vi.mock("../utils/fileEncryption", () => ({
  encryptBackupFile: vi.fn(),
  decryptBackupFile: vi.fn(),
  isEncryptedFile: vi.fn(() => false),
}));

const settings = {
  schoolName: "Example School",
  academicYear: "2030/2031",
  term: "First Term",
  level: "PRIMARY",
  defaultSubjects: ["English"],
  classScoreMax: 50,
  examScoreMax: 50,
  schoolType: "STANDARD",
};
const students = [
  {
    id: "1700000000000-0",
    name: "Ada Lovelace",
    className: "Primary 1",
    gender: "Female",
    subjects: [],
  },
];

const suspendPersistenceMock = vi.fn();
const resumePersistenceMock = vi.fn();
const clearIncompleteRollbackMock = vi.fn();
const markIncompleteRollbackMock = vi.fn();
const setActiveRecoveryActionMock = vi.fn();
const waitForMigrationMock = vi.fn().mockResolvedValue(undefined);

const contextValue = {
  isDataLoaded: true,
  loadError: false,
  isRollbackIncomplete: false,
  isPersistenceSuspended: false,
  activeRecoveryAction: null,
  setActiveRecoveryAction: setActiveRecoveryActionMock,
  students,
  suspendPersistence: suspendPersistenceMock,
  resumePersistence: resumePersistenceMock,
  clearIncompleteRollback: clearIncompleteRollbackMock,
  markIncompleteRollback: markIncompleteRollbackMock,
  waitForMigration: waitForMigrationMock,
} as unknown as SchoolContextType;

function renderBackup() {
  return render(
    <SchoolContext.Provider value={contextValue}>
      <DataBackup />
    </SchoolContext.Provider>,
  );
}

describe("DataBackup", () => {
  beforeEach(() => {
    storage.loadFromStorageResult.mockReset();
    storage.saveToStorage.mockReset();
    storage.saveEntriesToStorage.mockReset();
    recordBackup.mockReset();
    suspendPersistenceMock.mockReset();
    resumePersistenceMock.mockReset();
    waitForMigrationMock.mockClear();
    showToast.mockClear();
    setActiveRecoveryActionMock.mockClear();
    contextValue.loadError = false;
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("does not export or record a backup when either read fails", async () => {
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "error" })
      .mockResolvedValueOnce({ status: "found", value: settings });
    renderBackup();
    fireEvent.click(screen.getByRole("button", { name: "Save Class File" }));
    await vi.waitFor(() => expect(recordBackup).not.toHaveBeenCalled());
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(await screen.findByText(/could not be read/i)).toBeVisible();
  });

  it("does not export or record a backup when settings read fails", async () => {
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "found", value: students })
      .mockResolvedValueOnce({ status: "error" });
    renderBackup();
    fireEvent.click(screen.getByRole("button", { name: "Save Class File" }));
    await vi.waitFor(() => expect(recordBackup).not.toHaveBeenCalled());
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(await screen.findByText(/could not be read/i)).toBeVisible();
  });

  it("requires confirmation before exporting an empty student list", async () => {
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "empty" })
      .mockResolvedValueOnce({ status: "found", value: settings });
    window.confirm = vi.fn(() => false);
    renderBackup();
    fireEvent.click(screen.getByRole("button", { name: "Save Class File" }));
    await vi.waitFor(() => expect(window.confirm).toHaveBeenCalledWith(
      "No students found. This backup will contain no students.",
    ));
    expect(recordBackup).not.toHaveBeenCalled();
  });

  it("rejects malformed backups before storage writes and round-trips real export payloads", () => {
    expect(() => validateBackup({ students: {}, settings })).toThrow(/students must be an array/i);
    expect(() => validateBackup({ students: [{ name: "Missing ID" }], settings })).toThrow(
      /student at index 0/i,
    );
    expect(() => validateBackup({ students, settings: "bad" })).toThrow(
      /settings must be an object/i,
    );
    expect(validateBackup(createBackupPayload(students, settings))).toMatchObject({
      students,
      settings,
    });
    expect(storage.saveToStorage).not.toHaveBeenCalled();
  });

  it("restores the previous students when the settings write fails", async () => {
    const previous = createBackupPayload(students, settings);
    const incoming = createBackupPayload(
      [{ ...students[0], id: "1700000000001-0", name: "New Student" }],
      { ...settings, schoolName: "Incoming School" },
    );
    const load = vi.fn()
      .mockResolvedValueOnce({ status: "found", value: previous.students })
      .mockResolvedValueOnce({ status: "found", value: previous.settings });
    const save = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(importBackupAtomically(incoming, load, save)).rejects.toThrow(
      "Import failed; nothing was changed.",
    );
    expect(save).toHaveBeenNthCalledWith(3, "students", previous.students);
    expect(save).toHaveBeenNthCalledWith(4, "settings", previous.settings);
  });

  it("uses saveBatch for atomic import when provided", async () => {
    const incoming = createBackupPayload(students, settings);
    const load = vi.fn()
      .mockResolvedValueOnce({ status: "found", value: [] })
      .mockResolvedValueOnce({ status: "found", value: {} });
    const save = vi.fn();
    const saveBatch = vi.fn().mockResolvedValue(true);

    await importBackupAtomically(incoming, load, save, false, vi.fn(), saveBatch);
    expect(saveBatch).toHaveBeenCalledWith([
      { key: "students", value: incoming.students },
      { key: "settings", value: expect.objectContaining(incoming.settings) },
    ]);
    expect(save).not.toHaveBeenCalled();
  });

  it("throws when saveBatch fails during atomic import", async () => {
    const incoming = createBackupPayload(students, settings);
    const load = vi.fn()
      .mockResolvedValueOnce({ status: "found", value: [] })
      .mockResolvedValueOnce({ status: "found", value: {} });
    const save = vi.fn();
    const saveBatch = vi.fn().mockResolvedValue(false);

    await expect(
      importBackupAtomically(incoming, load, save, false, vi.fn(), saveBatch),
    ).rejects.toThrow("Import failed; nothing was changed.");
    expect(save).not.toHaveBeenCalled();
  });

  it("does not reject duplicate student ids", () => {
    expect(() =>
      validateBackup(
        createBackupPayload(
          [students[0], students[0]],
          settings,
        ),
      ),
    ).not.toThrow();
  });

  it("accepts values the UI can store and reports unusual content", () => {
    const uiPayload = createBackupPayload(
      [{
        ...students[0],
        id: "student-1",
        name: "Ɔ",
        className: "Basic Science 2",
        subjects: [{ id: "subject-1", name: "ɛ", classScore: 0, examScore: 0 }],
      }],
      {
        ...settings,
        schoolName: "X",
        academicYear: "2025-2026",
      },
    );

    expect(validateBackup(uiPayload)).toMatchObject({
      students: uiPayload.students,
      settings: uiPayload.settings,
    });
    expect(validateBackup(uiPayload).warningCount).toBeGreaterThan(0);
  });

  it("merges settings over defaults when optional settings are absent", () => {
    const payload = createBackupPayload(students, {
      schoolName: "Old School",
      academicYear: "2025/2026",
      term: "First Term",
      level: "PRIMARY",
      defaultSubjects: ["English"],
      classScoreMax: 50,
      examScoreMax: 50,
    });

    expect(validateBackup(payload).settings).toMatchObject({
      schoolName: "Old School",
      schoolType: "STANDARD",
    });
  });

  it("uses the same validator for decrypted backup payloads", () => {
    const encryptedPayload = createBackupPayload(students, settings);
    expect(validateBackup(encryptedPayload)).toMatchObject({
      students: encryptedPayload.students,
      settings: encryptedPayload.settings,
    });
    expect(() =>
      validateBackup({ ...encryptedPayload, students: { bad: true } }),
    ).toThrow(/students must be an array/i);
  });

  it("imports a valid backup from the load-error recovery screen and reloads", async () => {
    contextValue.loadError = true;
    const incoming = createBackupPayload(students, settings);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "found", value: students })
      .mockResolvedValueOnce({ status: "found", value: settings });
    storage.saveToStorage.mockResolvedValue(true);
    storage.saveEntriesToStorage.mockResolvedValue(true);
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
    const view = render(
      <SchoolContext.Provider value={contextValue}>
        <DataBackup recoveryOnly />
      </SchoolContext.Provider>,
    );

    const file = new File([JSON.stringify(incoming)], "backup.json", { type: "application/json" });
    fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Yes, Load File" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Yes, Load File" }));

    await vi.waitFor(() =>
      expect(storage.saveEntriesToStorage).toHaveBeenCalledWith([
        { key: "students", value: students },
        { key: "settings", value: expect.objectContaining(settings) },
      ]),
    );
    expect(waitForMigrationMock).toHaveBeenCalled();
    expect(suspendPersistenceMock).toHaveBeenCalled();
    expect(waitForMigrationMock.mock.invocationCallOrder[0]).toBeLessThan(
      suspendPersistenceMock.mock.invocationCallOrder[0],
    );
    expect(suspendPersistenceMock.mock.invocationCallOrder[0]).toBeLessThan(
      storage.saveEntriesToStorage.mock.invocationCallOrder[0],
    );
    expect(await screen.findByText("Backup loaded. Reloading...")).toBeVisible();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled(), { timeout: 2000 });
    reload.mockRestore();
  });

  it("resets recovery action and shows error toast when FileReader encounters an error or aborts", async () => {
    const originalFileReader = window.FileReader;
    class MockErrorFileReader {
      onerror: ((e: unknown) => void) | null = null;
      onabort: ((e: unknown) => void) | null = null;
      onload: ((e: unknown) => void) | null = null;
      readAsText() {
        setTimeout(() => {
          this.onerror?.(new Event("error"));
        }, 0);
      }
    }
    // @ts-expect-error Mocking FileReader
    window.FileReader = MockErrorFileReader;

    try {
      const view = render(
        <SchoolContext.Provider value={contextValue}>
          <DataBackup recoveryOnly />
        </SchoolContext.Provider>,
      );

      const file = new File(["dummy"], "backup.json", { type: "application/json" });
      fireEvent.change(view.container.querySelector('input[type="file"]')!, {
        target: { files: [file] },
      });

      await vi.waitFor(() => {
        expect(setActiveRecoveryActionMock).toHaveBeenCalledWith(null);
        expect(showToast).toHaveBeenCalledWith(
          "Failed to read the selected file. Please try again.",
          "error",
        );
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  it("releases pending import recovery action and aborts active reader on unmount before storage writes begin", async () => {
    let mockAbortCalled = false;
    const originalFileReader = window.FileReader;
    class MockPendingFileReader {
      onerror: ((e: unknown) => void) | null = null;
      onabort: ((e: unknown) => void) | null = null;
      onload: ((e: unknown) => void) | null = null;
      readAsText() {
        // Keep pending without resolving immediately
      }
      abort() {
        mockAbortCalled = true;
      }
    }
    // @ts-expect-error Mocking FileReader
    window.FileReader = MockPendingFileReader;

    try {
      const view = render(
        <SchoolContext.Provider value={contextValue}>
          <DataBackup recoveryOnly />
        </SchoolContext.Provider>,
      );

      const file = new File(["dummy"], "backup.json", { type: "application/json" });
      fireEvent.change(view.container.querySelector('input[type="file"]')!, {
        target: { files: [file] },
      });

      expect(setActiveRecoveryActionMock).toHaveBeenCalledWith("import");
      setActiveRecoveryActionMock.mockClear();

      view.unmount();

      expect(mockAbortCalled).toBe(true);
      expect(setActiveRecoveryActionMock).toHaveBeenCalledWith(null);
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  it("accepts unusual component categories with a warning", () => {
    const payload = createBackupPayload(
      [
        {
          ...students[0],
          subjects: [
            {
              id: "subject-1",
              name: "Math",
              classScore: 20,
              examScore: 50,
              classScoreComponents: [
                {
                  id: "comp-1",
                  name: "Midterm Quiz",
                  score: 20,
                  maxScore: 30,
                  category: "UNUSUAL_CATEGORY",
                },
              ],
            },
          ],
        },
      ],
      settings,
    );

    const validated = validateBackup(payload);
    expect(validated.students[0].subjects[0].classScoreComponents?.[0].category).toBe(
      "UNUSUAL_CATEGORY",
    );
    expect(validated.warningCount).toBeGreaterThan(0);
  });

  it("rejects non-numeric score in classScoreComponents", () => {
    const payload = createBackupPayload(
      [
        {
          ...students[0],
          subjects: [
            {
              id: "subject-1",
              name: "Math",
              classScore: 20,
              examScore: 50,
              classScoreComponents: [
                {
                  id: "comp-1",
                  name: "Quiz",
                  score: "twenty" as unknown as number,
                  maxScore: 30,
                },
              ],
            },
          ],
        },
      ],
      settings,
    );

    expect(() => validateBackup(payload)).toThrow(/invalid/i);
  });

  it("replaces stale decryptedBackupData when selecting a new plain JSON file and clears on completion", async () => {
    const encryptedPayload = createBackupPayload(students, {
      ...settings,
      schoolName: "Encrypted Old School",
    });
    const plainPayload = createBackupPayload(
      [{ ...students[0], id: "plain-1", name: "Plain Student" }],
      { ...settings, schoolName: "Plain New School" },
    );

    vi.mocked(isEncryptedFile)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    vi.mocked(decryptBackupFile).mockResolvedValueOnce(encryptedPayload);

    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "found", value: students })
      .mockResolvedValueOnce({ status: "found", value: settings });
    storage.saveToStorage.mockResolvedValue(true);
    storage.saveEntriesToStorage.mockResolvedValue(true);
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);

    const view = render(
      <SchoolContext.Provider value={contextValue}>
        <DataBackup />
      </SchoolContext.Provider>,
    );

    const input = view.container.querySelector('input[type="file"]')!;
    const encryptedFile = new File(
      [JSON.stringify({ encrypted: true, hint: "hint" })],
      "old.repota",
      { type: "application/json" },
    );
    fireEvent.change(input, { target: { files: [encryptedFile] } });

    const pwdInput = await screen.findByPlaceholderText("Enter password");
    fireEvent.change(pwdInput, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock File" }));

    await vi.waitFor(() =>
      expect(screen.getByText(/Encrypted Old School/i)).toBeInTheDocument(),
    );

    // Cancel encrypted confirmation, then pick a plain JSON file
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    const plainFile = new File([JSON.stringify(plainPayload)], "plain.json", {
      type: "application/json",
    });
    fireEvent.change(input, { target: { files: [plainFile] } });

    await vi.waitFor(() =>
      expect(screen.getByText(/Plain New School/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, Load File" }));

    await vi.waitFor(() =>
      expect(storage.saveEntriesToStorage).toHaveBeenCalledWith([
        { key: "students", value: plainPayload.students },
        { key: "settings", value: expect.objectContaining({ schoolName: "Plain New School" }) },
      ]),
    );
    reload.mockRestore();
  });

  it("aborts import before suspending persistence or writing when waitForMigration rejects", async () => {
    const incoming = createBackupPayload(students, settings);
    waitForMigrationMock.mockRejectedValueOnce(
      new Error("Storage migration is still in progress. Please try again shortly."),
    );

    const view = render(
      <SchoolContext.Provider value={contextValue}>
        <DataBackup />
      </SchoolContext.Provider>,
    );

    const file = new File([JSON.stringify(incoming)], "backup.json", { type: "application/json" });
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });

    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Yes, Load File" })).toBeVisible(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, Load File" }));

    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "Storage migration is still in progress. Please try again shortly.",
        "error",
      ),
    );
    expect(suspendPersistenceMock).not.toHaveBeenCalled();
    expect(storage.saveEntriesToStorage).not.toHaveBeenCalled();
    expect(storage.saveToStorage).not.toHaveBeenCalled();
    expect(setActiveRecoveryActionMock).toHaveBeenCalledWith(null);
  });

  it("ignores stale decryption resolution when the password modal is canceled while decrypting", async () => {
    const encryptedPayload = createBackupPayload(students, {
      ...settings,
      schoolName: "Delayed Decrypt School",
    });
    let resolveDecrypt!: (value: typeof encryptedPayload) => void;
    const pendingDecrypt = new Promise<typeof encryptedPayload>((resolve) => {
      resolveDecrypt = resolve;
    });

    vi.mocked(isEncryptedFile).mockReturnValueOnce(true);
    vi.mocked(decryptBackupFile).mockReturnValueOnce(pendingDecrypt);

    const view = render(
      <SchoolContext.Provider value={contextValue}>
        <DataBackup />
      </SchoolContext.Provider>,
    );

    const input = view.container.querySelector('input[type="file"]')!;
    const encryptedFile = new File(
      [JSON.stringify({ encrypted: true, hint: "hint" })],
      "delayed.repota",
      { type: "application/json" },
    );
    fireEvent.change(input, { target: { files: [encryptedFile] } });

    const pwdInput = await screen.findByPlaceholderText("Enter password");
    fireEvent.change(pwdInput, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock File" }));

    // Cancel while decryptBackupFile is still pending
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(setActiveRecoveryActionMock).toHaveBeenCalledWith(null);

    showToast.mockClear();

    // Resolve stale decryption after cancellation
    resolveDecrypt(encryptedPayload);
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByRole("button", { name: "Yes, Load File" })).not.toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalledWith("File decrypted successfully! 🔓", "success");
  });

  it("keeps DataGate recovery view and reload overlay mounted after incomplete rollback import when loadError is false", async () => {
    clearIncompleteRollbackMock.mockClear();
    localStorage.setItem("repota_incomplete_rollback", "true");
    const incoming = createBackupPayload(students, settings);
    storage.loadFromStorageResult
      .mockResolvedValueOnce({ status: "found", value: students })
      .mockResolvedValueOnce({ status: "found", value: settings });
    storage.saveEntriesToStorage.mockResolvedValue(true);
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);

    try {
      const view = render(
        <SchoolContext.Provider
          value={{
            ...contextValue,
            loadError: false,
            isRollbackIncomplete: true,
            retryLoad: vi.fn(),
            startFresh: vi.fn(),
          }}
        >
          <DataGate>
            <div>Main App Content</div>
          </DataGate>
        </SchoolContext.Provider>,
      );

      const file = new File([JSON.stringify(incoming)], "backup.json", {
        type: "application/json",
      });
      fireEvent.change(view.container.querySelector('input[type="file"]')!, {
        target: { files: [file] },
      });

      await vi.waitFor(() =>
        expect(screen.getByRole("button", { name: "Yes, Load File" })).toBeVisible(),
      );
      fireEvent.click(screen.getByRole("button", { name: "Yes, Load File" }));

      expect(await screen.findByText("Backup loaded. Reloading...")).toBeVisible();
      expect(screen.getByRole("button", { name: "Reload now" })).toBeVisible();
      expect(screen.queryByText("Main App Content")).not.toBeInTheDocument();
      expect(localStorage.getItem("repota_incomplete_rollback")).toBeNull();
      expect(clearIncompleteRollbackMock).not.toHaveBeenCalled();
    } finally {
      localStorage.removeItem("repota_incomplete_rollback");
      reload.mockRestore();
    }
  });
});
