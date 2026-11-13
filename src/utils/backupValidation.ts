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

const compatibleStudentSchema = z.object({
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
  remark: z.string().optional(),
  attendanceTotal: z.number().optional(),
  promotedTo: z.string().optional(),
  headmasterRemark: z.string().optional(),
}).passthrough();

const structuralSettingsSchema = z.object({
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
  templateId: z.string().optional(),
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

function mergeSettings(settings: Record<string, unknown>) {
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

export class IncompleteRollbackError extends Error {
  constructor() {
    super("Import failed and restoring the previous data was incomplete. Do not close the app; restore from backup.");
    this.name = "IncompleteRollbackError";
  }
}

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
    const saved = await saveBatch([
      { key: IDB_KEYS.STUDENTS, value: validated.students },
      { key: IDB_KEYS.SETTINGS, value: validated.settings },
    ]);
    if (saved) return;
    throw new Error("Import failed; nothing was changed.");
  }
  if (!(await save(IDB_KEYS.STUDENTS, validated.students))) {
    throw new Error("Students could not be saved; nothing was changed.");
  }
  if (await save(IDB_KEYS.SETTINGS, validated.settings)) return;

  if (previousStudents.status === "error" || previousSettings.status === "error") {
    throw new IncompleteRollbackError();
  }
  const restoredStudents =
    previousStudents.status === "found"
      ? await save(IDB_KEYS.STUDENTS, previousStudents.value)
      : await remove(IDB_KEYS.STUDENTS);
  const restoredSettings =
    previousSettings.status === "found"
      ? await save(IDB_KEYS.SETTINGS, previousSettings.value)
      : await remove(IDB_KEYS.SETTINGS);
  if (restoredStudents && restoredSettings) {
    throw new Error("Import failed; nothing was changed.");
  }
  throw new IncompleteRollbackError();
}
