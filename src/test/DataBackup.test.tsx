import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolContextType } from "../context/SchoolContextDefinition";
import { SchoolContext } from "../context/SchoolContextDefinition";
import { DataBackup } from "../components/DataBackup";
import {
  createBackupPayload,
  importBackupAtomically,
  validateBackup,
} from "../utils/backupValidation";

const storage = vi.hoisted(() => ({
  loadFromStorageResult: vi.fn(),
  saveToStorage: vi.fn(),
  saveEntriesToStorage: vi.fn(),
}));
const recordBackup = vi.hoisted(() => vi.fn());

vi.mock("../utils/idbStorage", () => ({
  IDB_KEYS: { STUDENTS: "students", SETTINGS: "settings" },
  loadFromStorageResult: storage.loadFromStorageResult,
  saveToStorage: storage.saveToStorage,
  saveEntriesToStorage: storage.saveEntriesToStorage,
  deleteFromStorage: vi.fn(),
}));
vi.mock("../utils/dataProtection", () => ({ recordBackup }));
vi.mock("../hooks/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
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
    expect(suspendPersistenceMock).toHaveBeenCalled();
    expect(suspendPersistenceMock.mock.invocationCallOrder[0]).toBeLessThan(
      storage.saveEntriesToStorage.mock.invocationCallOrder[0],
    );
    expect(await screen.findByText("Backup loaded. Reloading...")).toBeVisible();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled(), { timeout: 2000 });
    reload.mockRestore();
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
});
