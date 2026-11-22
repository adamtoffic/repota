import { z } from "zod";
import { IDB_KEYS, type StorageLoadResult } from "./idbStorage";
import { studentRecordSchema } from "../schemas/studentSchema";
import { schoolSettingsSchema } from "../schemas/settingsSchema";
import { DEFAULT_SETTINGS as BASE_DEFAULT_SETTINGS } from "../constants/defaultSettings";

const compatibleSubjectSchema = z.object({
  id: z.string().min(1, "Invalid subject ID"),
  name: z.string().min(1, "Subject name required"),
  classScore: z.number(),
  examScore: z.number(),
  classScoreComponents: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    score: z.number(),
    maxScore: z.number(),
    category: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

/**
 * Permissive `.passthrough()` schema used to accept older or forward-compatible student backups
 * without stripping unknown fields. Strict current-schema anomalies are counted separately for warnings.
 */
export const compatibleStudentSchema = z.object({
  id: z.string().min(1, "Invalid student ID"),
  name: z.string().min(1, "Student name required"),
  className: z.string().min(1, "Class name required"),
  subjects: z.array(compatibleSubjectSchema),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  attendancePresent: z.number().optional(),
  teacherRemark: z.string().optional(),
  conduct: z.string().optional(),
  interest: z.string().optional(),
  pictureUrl: z.string().optional(),
  promotionStatus: z.string().optional(),
  admissionNumber: z.string().optional(),
  feeStatus: z.enum(["PAID", "PART_PAID", "OWING", "SCHOLARSHIP"]).optional(),
  feeArrears: z.number().optional(),
  guardianPhone: z.string().optional(),
  remark: z.string().optional(),
  attendanceTotal: z.number().optional(),
  promotedTo: z.string().optional(),
  headmasterRemark: z.string().optional(),
}).passthrough();

/**
 * Permissive `.passthrough()` schema used after `DEFAULT_SETTINGS` backfilling to preserve
 * unknown/legacy keys while validating structural settings fields required by the app.
 */
export const structuralSettingsSchema = z.object({
  schoolName: z.string(),
  className: z.string().optional(),
  schoolMotto: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  logoUrl: z.string().optional(),
  schoolType: z.enum(["STANDARD", "ISLAMIC", "PRIVATE"]),
  level: z.enum(["KG", "PRIMARY", "JHS", "SHS"]),
  term: z.enum([
    "First Term",
    "Second Term",
    "Third Term",
    "First Semester",
    "Second Semester",
  ]),
  academicYear: z.string(),
  nextTermStarts: z.string().optional(),
  headTeacherName: z.string().optional(),
  classTeacherName: z.string().optional(),
  totalAttendanceDays: z.number().optional(),
  classScoreMax: z.number(),
  examScoreMax: z.number(),
  classSize: z.number().optional(),
  headTeacherSignature: z.string().optional(),
  teacherSignature: z.string().optional(),
  defaultSubjects: z.array(z.string()),
  componentLibrary: z.array(z.object({
    name: z.string(),
    maxScore: z.number(),
    category: z.enum(["CAT", "GROUP", "PROJECT", "HOMEWORK"]).optional(),
  }).passthrough()).optional(),
  subjectComponentMap: z.record(z.string(), z.array(z.object({
    name: z.string(),
    maxScore: z.number(),
    category: z.enum(["CAT", "GROUP", "PROJECT", "HOMEWORK"]).optional(),
  }).passthrough())).optional(),
  schoolGift: z.number().optional(),
  canteenFees: z.number().optional(),
  firstAidFees: z.number().optional(),
  privateFeeItems: z.array(z.object({
    id: z.string(),
    label: z.string(),
    amount: z.number(),
    cycle: z.string(),
    enabled: z.boolean(),
  }).passthrough()).optional(),
  showFeeSchedule: z.boolean().optional(),
  feePaymentNote: z.string().optional(),
  showStudentFeeArrearsOnReport: z.boolean().optional(),
  templateId: z.string().optional(),
  showClassPosition: z.boolean().optional(),
  showSubjectPosition: z.boolean().optional(),
  useCustomTemplateColor: z.boolean().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  examType: z.enum(["TERMLY", "MOCK"]),
  autoLockTimeout: z.number().optional(),
}).passthrough();

function countUnusualValues(students: unknown[], settings: Record<string, unknown>) {
  let count = 0;
  for (const student of students) {
    const result = studentRecordSchema.safeParse(student);
    if (!result.success) count += result.error.issues.length;
  }
  const settingsResult = schoolSettingsSchema.safeParse(settings);
  if (!settingsResult.success) count += settingsResult.error.issues.length;
  return count;
}

function getDefaultSettings() {
  return {
    ...BASE_DEFAULT_SETTINGS,
    examType: "TERMLY" as const,
    componentLibrary: [],
    subjectComponentMap: {},
  };
}

function structuralError(
  result: { error: { issues: Array<{ message?: string }> } },
  prefix: string,
) {
  return new Error(`${prefix}: ${result.error.issues[0]?.message}`);
}

/**
 * Merges incoming settings over `DEFAULT_SETTINGS` and validates against `structuralSettingsSchema`.
 *
 * @throws {Error} When required structural settings fields are missing or invalid.
 */
export function mergeSettings(settings: Record<string, unknown>) {
  const merged = { ...getDefaultSettings(), ...settings };
  const result = structuralSettingsSchema.safeParse(merged);
  if (!result.success) throw structuralError(result, "Settings are invalid");
  return result.data as Record<string, unknown>;
}

export type ValidatedBackup = {
  students: unknown[];
  settings: Record<string, unknown>;
  warningCount: number;
};

/**
 * Thrown by `importBackupAtomically` when an import write fails mid-way and restoring the
 * previous snapshot could not be guaranteed. Callers must keep persistence suspended and
 * surface recovery UI (`markIncompleteRollback`).
 */
export class IncompleteRollbackError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      "Import failed and restoring the previous data was incomplete. Do not close the app; restore from backup.",
      options,
    );
    this.name = "IncompleteRollbackError";
  }
}

/**
 * Validates a parsed `.repota` or JSON backup in two tiers:
 * 1. Structural compatibility (`compatibleStudentSchema`, `structuralSettingsSchema`) — throws if broken.
 * 2. Strict current-schema check (`studentRecordSchema`, `schoolSettingsSchema`) — counts anomalies in
 *    `warningCount` without blocking legacy imports.
 *
 * Missing settings keys are backfilled from `DEFAULT_SETTINGS` via `mergeSettings`.
 *
 * @throws {Error} When the root payload, any student record, or merged settings fail structural validation.
 */
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
      throw structuralError(result, `Student at index ${index} is invalid`);
    }
  }
  if (!backup.settings || typeof backup.settings !== "object" || Array.isArray(backup.settings)) {
    throw new Error("Backup settings must be an object.");
  }
  const settings = mergeSettings(backup.settings as Record<string, unknown>);
  return {
    students: backup.students,
    settings,
    warningCount: countUnusualValues(backup.students, settings),
  } satisfies ValidatedBackup;
}

export function createBackupPayload(students: unknown[], settings: Record<string, unknown>) {
  return {
    version: "1.0",
    exportDate: new Date().toISOString(),
    students,
    settings,
  };
}

/**
 * Replaces persisted students and settings in storage, rolling back if a two-step write fails mid-way.
 *
 * Callers must suspend debounced auto-persistence (`suspendPersistence`) and wait for startup
 * migration (`waitForMigration`) before invoking this.
 *
 * @param allowUnreadableCurrent - Set `true` only during corruption recovery when existing storage cannot be read.
 * @param saveBatch - Preferred single-transaction multi-key writer; falls back to sequential `save` + rollback when omitted.
 * @throws {IncompleteRollbackError} When writing fails and restoring the prior snapshot could not be verified.
 * @throws {Error} When backup validation fails, existing storage is unreadable (`allowUnreadableCurrent` is `false`), or an initial write fails cleanly with nothing changed.
 */
export async function importBackupAtomically(
  backup: unknown,
  load: <T>(key: string) => Promise<StorageLoadResult<T>>,
  save: <T>(key: string, value: T) => Promise<boolean>,
  allowUnreadableCurrent = false,
  remove: (key: string) => Promise<boolean> = async () => false,
  saveBatch?: (entries: Array<{ key: string; value: unknown }>) => Promise<boolean>,
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
  if (saveBatch) {
    let saved = false;
    try {
      saved = await saveBatch([
        { key: IDB_KEYS.STUDENTS, value: validated.students },
        { key: IDB_KEYS.SETTINGS, value: validated.settings },
      ]);
    } catch (error) {
      throw new IncompleteRollbackError({ cause: error });
    }
    if (saved) return;
    throw new Error("Import failed; nothing was changed.");
  }
  if (!(await save(IDB_KEYS.STUDENTS, validated.students))) {
    throw new Error("Students could not be saved; nothing was changed.");
  }
  let settingsSaved = false;
  try {
    settingsSaved = await save(IDB_KEYS.SETTINGS, validated.settings);
  } catch {
    settingsSaved = false;
  }
  if (settingsSaved) return;

  if (previousStudents.status === "error" || previousSettings.status === "error") {
    throw new IncompleteRollbackError();
  }
  let restoredStudents = false;
  try {
    restoredStudents =
      previousStudents.status === "found"
        ? await save(IDB_KEYS.STUDENTS, previousStudents.value)
        : await remove(IDB_KEYS.STUDENTS);
  } catch {
    restoredStudents = false;
  }
  let restoredSettings = false;
  try {
    restoredSettings =
      previousSettings.status === "found"
        ? await save(IDB_KEYS.SETTINGS, previousSettings.value)
        : await remove(IDB_KEYS.SETTINGS);
  } catch {
    restoredSettings = false;
  }
  if (restoredStudents && restoredSettings) {
    throw new Error("Import failed; nothing was changed.");
  }
  throw new IncompleteRollbackError();
}
