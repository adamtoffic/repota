import { z } from "zod";
import { IDB_KEYS, type StorageLoadResult } from "./idbStorage";
import { studentRecordSchema, subjectSchema } from "../schemas/studentSchema";
import { schoolSettingsSchema } from "../schemas/settingsSchema";

const compatibleStudentSchema = studentRecordSchema.extend({
  id: z.string().min(1, "Invalid student ID"),
  subjects: z.array(subjectSchema.extend({ id: z.string().min(1, "Invalid subject ID") })),
});

export function validateBackup(data: unknown) {
  if (!data || typeof data !== "object") {
    throw new Error("Backup must be a JSON object.");
  }
  const backup = data as { students?: unknown; settings?: unknown };
  if (!Array.isArray(backup.students)) {
    throw new Error("Backup students must be an array.");
  }
  for (const [index, student] of backup.students.entries()) {
    const result = compatibleStudentSchema.safeParse(student);
    if (!result.success) {
      throw new Error(`Student at index ${index} is invalid: ${result.error.issues[0]?.message}`);
    }
  }
  if (!backup.settings || typeof backup.settings !== "object" || Array.isArray(backup.settings)) {
    throw new Error("Backup settings must be an object.");
  }
  const settings = { ...(backup.settings as Record<string, unknown>) };
  if (settings.logoUrl === "") delete settings.logoUrl;
  const settingsResult = schoolSettingsSchema.safeParse(settings);
  if (!settingsResult.success) {
    throw new Error(`Settings are invalid: ${settingsResult.error.issues[0]?.message}`);
  }
  return {
    students: backup.students,
    settings: backup.settings as Record<string, unknown>,
  };
}

export function createBackupPayload(students: unknown[], settings: Record<string, unknown>) {
  return {
    version: "1.0",
    exportDate: new Date().toISOString(),
    students,
    settings,
  };
}

export async function importBackupAtomically(
  backup: unknown,
  load: <T>(key: string) => Promise<StorageLoadResult<T>>,
  save: <T>(key: string, value: T) => Promise<boolean>,
  allowUnreadableCurrent = false,
) {
  const validated = validateBackup(backup);
  const previousStudents = await load<unknown[]>(IDB_KEYS.STUDENTS);
  const previousSettings = await load<Record<string, unknown>>(IDB_KEYS.SETTINGS);
  if (
    !allowUnreadableCurrent &&
    (previousStudents.status === "error" || previousSettings.status === "error")
  ) {
    throw new Error("Current data could not be read; nothing was changed.");
  }
  if (!(await save(IDB_KEYS.STUDENTS, validated.students))) {
    throw new Error("Students could not be saved; nothing was changed.");
  }
  if (await save(IDB_KEYS.SETTINGS, validated.settings)) return;

  const restoredStudents = await save(
    IDB_KEYS.STUDENTS,
    previousStudents.status === "found" ? previousStudents.value : [],
  );
  const restoredSettings = await save(
    IDB_KEYS.SETTINGS,
    previousSettings.status === "found" ? previousSettings.value : {},
  );
  throw new Error(
    restoredStudents && restoredSettings
      ? "Import failed; nothing was changed."
      : "Import failed and restoring the previous data also failed. Do not close the app; restore from backup.",
  );
}
