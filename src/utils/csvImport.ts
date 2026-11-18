import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import type {
  AssessmentCategory,
  ClassScoreComponent,
  ClassScoreComponentConfig,
  FeeStatus,
  SavedSubject,
  SchoolSettings,
  StudentRecord,
} from "../types";
import { calculateGrade } from "./gradeCalculator";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  formatExamWeightedAsRaw,
  updateComponentAndRecalculateClassScore,
} from "./scoreConversion";

/**
 * Neutralizes CSV formula prefixes on text values when generating downloadable CSV files.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Builds default subjects for a newly created student, attaching configured SBA tasks
 * from `settings.subjectComponentMap`.
 */
export function buildDefaultSubjectsForStudent(settings: SchoolSettings): SavedSubject[] {
  const subjectNames =
    settings.defaultSubjects && settings.defaultSubjects.length > 0
      ? settings.defaultSubjects
      : DEFAULT_SUBJECTS[settings.level] || [];

  return subjectNames.map((subName) => {
    const configuredTasks = settings.subjectComponentMap?.[subName];
    const classScoreComponents: ClassScoreComponent[] | undefined =
      settings.examType !== "MOCK" && configuredTasks && configuredTasks.length > 0
        ? configuredTasks.map((task) => ({
            id: crypto.randomUUID(),
            name: task.name,
            score: 0,
            maxScore: task.maxScore,
            category: task.category,
          }))
        : undefined;

    return {
      id: crypto.randomUUID(),
      name: subName,
      classScore: 0,
      examScore: 0,
      ...(classScoreComponents ? { classScoreComponents } : {}),
    };
  });
}

function detectDelimiter(lines: string[]): "\t" | "," | ";" {
  const sample = lines.slice(0, 5).join("\n");
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  if (tabCount >= commaCount && tabCount >= semiCount && tabCount > 0) return "\t";
  if (semiCount > commaCount) return ";";
  return ",";
}

/**
 * Parses CSV or tab-separated spreadsheet paste (RFC-4180 quoted cells supported).
 */
export function parseTabularText(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const nonEmptyLines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return [];

  const delimiter = detectDelimiter(nonEmptyLines);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\r" && nextChar === "\n") {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      i++;
    } else if (char === "\n" || char === "\r") {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((c) => c.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function normalizeStudentNameKey(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // strip (/15), (/100)
    .replace(/[^a-z0-9]/g, "");
}

function parseGenderValue(raw: string | undefined): {
  gender: "Male" | "Female";
  explicit: boolean;
} {
  if (!raw) return { gender: "Male", explicit: false };
  const normalized = raw.trim().toLowerCase();
  if (["f", "female", "girl", "woman"].includes(normalized)) {
    return { gender: "Female", explicit: true };
  }
  if (["m", "male", "boy", "man"].includes(normalized)) {
    return { gender: "Male", explicit: true };
  }
  return { gender: "Male", explicit: false };
}

function parseFeeStatusValue(raw: string | undefined): FeeStatus | undefined {
  if (!raw) return undefined;
  const norm = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (norm === "PAID" || norm === "FULL") return "PAID";
  if (norm === "PART_PAID" || norm === "PART" || norm === "PARTIAL") return "PART_PAID";
  if (norm === "OWING" || norm === "UNPAID") return "OWING";
  if (norm === "SCHOLARSHIP" || norm === "EXEMPT") return "SCHOLARSHIP";
  return undefined;
}

function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return undefined;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export interface ParsedRosterRow {
  name: string;
  gender: "Male" | "Female";
  genderExplicit: boolean;
  dateOfBirth?: string;
  attendancePresent?: number;
  conduct?: string;
  interest?: string;
  admissionNumber?: string;
  feeStatus?: FeeStatus;
  feeArrears?: number;
  guardianPhone?: string;
  matchedExistingId?: string;
}

export function parseRosterImport(
  rawText: string,
  existingStudents: Pick<StudentRecord, "id" | "name">[] = [],
): {
  rows: ParsedRosterRow[];
  hasMissingGender: boolean;
  detectedHeaders: boolean;
} {
  const table = parseTabularText(rawText);
  if (table.length === 0) {
    return { rows: [], hasMissingGender: false, detectedHeaders: false };
  }

  const existingByName = new Map<string, string>();
  existingStudents.forEach((s) => {
    const key = normalizeStudentNameKey(s.name);
    if (!existingByName.has(key)) existingByName.set(key, s.id);
  });

  const firstRowNormalized = table[0].map(normalizeHeader);
  const headerKeywords = new Set([
    "name",
    "studentname",
    "fullname",
    "gender",
    "sex",
    "dob",
    "dateofbirth",
    "attendance",
    "attendancepresent",
    "dayspresent",
    "conduct",
    "interest",
    "admissionnumber",
    "admissionno",
    "studentid",
    "feestatus",
    "feearrears",
    "arrears",
    "guardianphone",
    "parentphone",
    "phone",
  ]);
  const detectedHeaders = firstRowNormalized.some((h) => headerKeywords.has(h));

  const colIndex = (candidates: string[]): number => {
    if (!detectedHeaders) return -1;
    return firstRowNormalized.findIndex((h) => candidates.includes(h));
  };

  const nameIdx = detectedHeaders
    ? Math.max(0, colIndex(["name", "studentname", "fullname"]))
    : 0;
  const genderIdx = detectedHeaders ? colIndex(["gender", "sex"]) : 1;
  const dobIdx = detectedHeaders ? colIndex(["dob", "dateofbirth", "birthdate"]) : 2;
  const attIdx = detectedHeaders
    ? colIndex(["attendance", "attendancepresent", "dayspresent"])
    : 3;
  const conductIdx = detectedHeaders ? colIndex(["conduct", "character"]) : -1;
  const interestIdx = detectedHeaders ? colIndex(["interest", "talent"]) : -1;
  const admIdx = detectedHeaders
    ? colIndex(["admissionnumber", "admissionno", "studentid", "id"])
    : -1;
  const feeStatusIdx = detectedHeaders ? colIndex(["feestatus", "feesstatus"]) : -1;
  const feeArrearsIdx = detectedHeaders ? colIndex(["feearrears", "arrears", "balance"]) : -1;
  const phoneIdx = detectedHeaders ? colIndex(["guardianphone", "parentphone", "phone"]) : -1;

  const dataRows = detectedHeaders ? table.slice(1) : table;
  const rows: ParsedRosterRow[] = [];

  for (const cells of dataRows) {
    const rawName = (cells[nameIdx] ?? "").replace(/\s+/g, " ").trim();
    if (!rawName) continue;

    const { gender, explicit } = parseGenderValue(genderIdx >= 0 ? cells[genderIdx] : undefined);
    const dob = dobIdx >= 0 && cells[dobIdx] ? cells[dobIdx].trim() : undefined;
    const attendancePresent =
      attIdx >= 0 ? parseOptionalNumber(cells[attIdx]) : undefined;
    const conduct =
      conductIdx >= 0 && cells[conductIdx] ? cells[conductIdx].trim() : undefined;
    const interest =
      interestIdx >= 0 && cells[interestIdx] ? cells[interestIdx].trim() : undefined;
    const admissionNumber =
      admIdx >= 0 && cells[admIdx] ? cells[admIdx].trim() : undefined;
    const feeStatus =
      feeStatusIdx >= 0 ? parseFeeStatusValue(cells[feeStatusIdx]) : undefined;
    const feeArrears =
      feeArrearsIdx >= 0 ? parseOptionalNumber(cells[feeArrearsIdx]) : undefined;
    const guardianPhone =
      phoneIdx >= 0 && cells[phoneIdx] ? cells[phoneIdx].trim() : undefined;

    rows.push({
      name: rawName,
      gender,
      genderExplicit: explicit,
      dateOfBirth: dob,
      attendancePresent:
        attendancePresent !== undefined ? Math.round(attendancePresent) : undefined,
      conduct,
      interest,
      admissionNumber,
      feeStatus,
      feeArrears,
      guardianPhone,
      matchedExistingId: existingByName.get(normalizeStudentNameKey(rawName)),
    });
  }

  return {
    rows,
    hasMissingGender: rows.some((r) => !r.genderExplicit),
    detectedHeaders,
  };
}

export function buildRosterTemplateCsv(
  students: Pick<
    StudentRecord,
    | "name"
    | "gender"
    | "dateOfBirth"
    | "attendancePresent"
    | "conduct"
    | "interest"
    | "admissionNumber"
    | "feeStatus"
    | "feeArrears"
    | "guardianPhone"
  >[],
  settings: Pick<SchoolSettings, "schoolType">,
): string {
  const isPrivate = settings.schoolType === "PRIVATE";
  const headers = [
    "Name",
    "Gender",
    "DateOfBirth",
    "AttendancePresent",
    "Conduct",
    "Interest",
    ...(isPrivate
      ? ["AdmissionNumber", "FeeStatus", "FeeArrears", "GuardianPhone"]
      : []),
  ];

  const rows =
    students.length > 0
      ? students.map((s) => [
          escapeCsvCell(s.name),
          escapeCsvCell(s.gender || "Male"),
          escapeCsvCell(s.dateOfBirth || ""),
          escapeCsvCell(s.attendancePresent ?? ""),
          escapeCsvCell(s.conduct || ""),
          escapeCsvCell(s.interest || ""),
          ...(isPrivate
            ? [
                escapeCsvCell(s.admissionNumber || ""),
                escapeCsvCell(s.feeStatus || ""),
                escapeCsvCell(s.feeArrears ?? ""),
                escapeCsvCell(s.guardianPhone || ""),
              ]
            : []),
        ])
      : [
          [
            escapeCsvCell("Kwame Mensah"),
            escapeCsvCell("Male"),
            escapeCsvCell("2015-03-14"),
            escapeCsvCell(65),
            escapeCsvCell("Respectful"),
            escapeCsvCell("Football"),
            ...(isPrivate
              ? [
                  escapeCsvCell("ADM-001"),
                  escapeCsvCell("PAID"),
                  escapeCsvCell(0),
                  escapeCsvCell("0240000000"),
                ]
              : []),
          ],
          [
            escapeCsvCell("Ama Serwaa"),
            escapeCsvCell("Female"),
            escapeCsvCell("2015-07-22"),
            escapeCsvCell(68),
            escapeCsvCell("Hardworking"),
            escapeCsvCell("Reading"),
            ...(isPrivate
              ? [
                  escapeCsvCell("ADM-002"),
                  escapeCsvCell("PART_PAID"),
                  escapeCsvCell(150),
                  escapeCsvCell("0200000000"),
                ]
              : []),
          ],
        ];

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generates a clean 2-column CSV template for a single SBA component (e.g. "English Summary Group Work").
 */
export function buildSingleComponentTemplateCsv(
  subjectName: string,
  task: Pick<ClassScoreComponentConfig, "name" | "maxScore">,
  students: Pick<StudentRecord, "name" | "subjects">[],
): string {
  const headers = ["Name", `${task.name} (/${task.maxScore})`];
  const rows =
    students.length > 0
      ? students.map((student) => {
          const subject = student.subjects.find((s) => s.name === subjectName);
          const comp = subject?.classScoreComponents?.find(
            (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
          );
          return [
            escapeCsvCell(student.name),
            escapeCsvCell(comp && comp.score > 0 ? comp.score : ""),
          ];
        })
      : [
          [
            escapeCsvCell("Kwame Mensah"),
            escapeCsvCell(Math.round(task.maxScore * 0.8)),
          ],
        ];

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Exports recorded scores for a single SBA component (Excel-ready with % and Class Score total).
 */
export function buildSingleComponentExportCsv(
  subjectName: string,
  task: Pick<ClassScoreComponentConfig, "name" | "maxScore">,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<SchoolSettings, "classScoreMax">,
): string {
  const headers = [
    "Name",
    `${task.name} (/${task.maxScore})`,
    "Task Score (%)",
    `Subject Class Score (/${settings.classScoreMax})`,
  ];

  const rows = students.map((student) => {
    const subject = student.subjects.find((s) => s.name === subjectName);
    const comp = subject?.classScoreComponents?.find(
      (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
    );
    const score = comp?.score ?? 0;
    const pct = task.maxScore > 0 ? Math.round((score / task.maxScore) * 100) : 0;
    return [
      escapeCsvCell(student.name),
      escapeCsvCell(comp ? score : ""),
      escapeCsvCell(comp ? `${pct}%` : ""),
      escapeCsvCell(subject ? subject.classScore : ""),
    ];
  });

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generates a clean 2-column CSV template for end-of-term Final Exam scores (/100) only.
 */
export function buildExamOnlyTemplateCsv(
  subjectName: string,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<SchoolSettings, "examType" | "examScoreMax">,
): string {
  const isMock = settings.examType === "MOCK";
  const headers = ["Name", isMock ? "Score (/100)" : "Exam (/100)"];
  const rows =
    students.length > 0
      ? students.map((student) => {
          const subject = student.subjects.find((s) => s.name === subjectName);
          return [
            escapeCsvCell(student.name),
            escapeCsvCell(
              subject ? formatExamWeightedAsRaw(subject.examScore, settings.examScoreMax) : "",
            ),
          ];
        })
      : [[escapeCsvCell("Kwame Mensah"), escapeCsvCell(78)]];

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Exports a subject's Class & Exam view from Quick Gradebook to CSV.
 */
export function buildSubjectQuickExportCsv(
  subjectName: string,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<SchoolSettings, "level" | "examType" | "classScoreMax" | "examScoreMax">,
): string {
  const isMock = settings.examType === "MOCK";
  const headers = isMock
    ? ["Name", "Score (/100)", "Grade"]
    : [
        "Name",
        `Class (/${settings.classScoreMax})`,
        "Exam (/100)",
        `Weighted Exam (/${settings.examScoreMax})`,
        "Total (/100)",
        "Grade",
      ];

  const rows = students.map((student) => {
    const subject = student.subjects.find((s) => s.name === subjectName);
    if (!subject) {
      return [escapeCsvCell(student.name), ...headers.slice(1).map(() => "")];
    }
    const total = (subject.classScore || 0) + (subject.examScore || 0);
    const { grade } = calculateGrade(total, settings.level);
    if (isMock) {
      return [escapeCsvCell(student.name), escapeCsvCell(total), escapeCsvCell(grade)];
    }
    return [
      escapeCsvCell(student.name),
      escapeCsvCell(subject.classScore),
      escapeCsvCell(formatExamWeightedAsRaw(subject.examScore, settings.examScoreMax)),
      escapeCsvCell(subject.examScore),
      escapeCsvCell(total),
      escapeCsvCell(grade),
    ];
  });

  return [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Resolves the active SBA component definitions for a subject from Settings or existing students.
 */
export function resolveSubjectSbaTasks(
  subjectName: string,
  students: Pick<StudentRecord, "subjects">[],
  settings: Pick<SchoolSettings, "examType" | "subjectComponentMap">,
): ClassScoreComponentConfig[] {
  if (settings.examType === "MOCK") return [];

  const configured = settings.subjectComponentMap?.[subjectName];
  if (configured && configured.length > 0) return configured;

  const discovered = new Map<string, ClassScoreComponentConfig>();
  students.forEach((student) => {
    const sub = student.subjects.find((s) => s.name === subjectName);
    sub?.classScoreComponents?.forEach((comp) => {
      if (!discovered.has(comp.name)) {
        discovered.set(comp.name, {
          name: comp.name,
          maxScore: comp.maxScore,
          category: comp.category,
        });
      }
    });
  });

  return Array.from(discovered.values());
}

/**
 * Generates a pre-filled downloadable CSV template for entering SBA components & Exam scores
 * for a specific subject.
 */
export function buildSbaScoreTemplateCsv(
  subjectName: string,
  students: Pick<StudentRecord, "name" | "subjects">[],
  settings: Pick<
    SchoolSettings,
    "examType" | "classScoreMax" | "examScoreMax" | "subjectComponentMap"
  >,
): string {
  const isMock = settings.examType === "MOCK";
  const tasks = resolveSubjectSbaTasks(subjectName, students, settings);

  const headers = ["Name"];
  if (!isMock) {
    if (tasks.length > 0) {
      tasks.forEach((t) => headers.push(`${t.name} (/${t.maxScore})`));
    } else {
      headers.push(`Class Score (/${settings.classScoreMax})`);
    }
  }
  headers.push(isMock ? "Score (/100)" : "Exam (/100)");

  const rows =
    students.length > 0
      ? students.map((student) => {
          const subject = student.subjects.find((s) => s.name === subjectName);
          const cells = [escapeCsvCell(student.name)];
          if (!isMock) {
            if (tasks.length > 0) {
              tasks.forEach((task) => {
                const comp = subject?.classScoreComponents?.find((c) => c.name === task.name);
                cells.push(escapeCsvCell(comp && comp.score > 0 ? comp.score : ""));
              });
            } else {
              cells.push(escapeCsvCell(subject && subject.classScore > 0 ? subject.classScore : ""));
            }
          }
          cells.push(
            escapeCsvCell(
              subject ? formatExamWeightedAsRaw(subject.examScore, settings.examScoreMax) : "",
            ),
          );
          return cells;
        })
      : [
          [
            escapeCsvCell("Kwame Mensah"),
            ...(!isMock
              ? tasks.length > 0
                ? tasks.map((t) => escapeCsvCell(Math.round(t.maxScore * 0.8)))
                : [escapeCsvCell(Math.round(settings.classScoreMax * 0.8))]
              : []),
            escapeCsvCell(78),
          ],
        ];

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export interface DetectedNewSbaColumn {
  colIndex: number;
  rawHeader: string;
  suggestedName: string;
  suggestedMaxScore: number;
  suggestedCategory: AssessmentCategory;
}

export interface NewSbaColumnOverride {
  enabled: boolean;
  name: string;
  maxScore: number;
  category: AssessmentCategory;
}

export type SbaConflictPolicy = "OVERWRITE" | "KEEP_EXISTING";

export interface ParsedSbaComponentPatch {
  name: string;
  score: number;
  existingScore?: number;
  maxScore: number;
  clamped: boolean;
  isConflict: boolean;
  isNewTask: boolean;
  category?: AssessmentCategory;
}

export interface ParsedSbaScoreRow {
  studentName: string;
  matchedStudentId?: string;
  isNewStudent: boolean;
  isDuplicateInImport: boolean;
  componentScores: ParsedSbaComponentPatch[];
  directClassScore?: { score: number; existingScore?: number; clamped: boolean; isConflict: boolean };
  examRawScore?: {
    raw: number;
    existingRaw?: number;
    weighted: number;
    clamped: boolean;
    isConflict: boolean;
  };
  computedClassScore: number;
  hasWarnings: boolean;
  hasConflicts: boolean;
}

export interface SbaImportParseResult {
  rows: ParsedSbaScoreRow[];
  matchedColumns: string[];
  unmatchedHeaders: string[];
  detectedNewColumns: DetectedNewSbaColumn[];
  tasks: ClassScoreComponentConfig[];
  conflictCount: number;
  duplicateRowCount: number;
}

export function extractHeaderMaxScore(header: string): number | undefined {
  const match =
    header.match(/\(\s*(?:\/\s*|max\s*)?(\d{1,3})\s*\)/i) ??
    header.match(/\[\s*(?:\/\s*)?(\d{1,3})\s*\]/i) ??
    header.match(/\/\s*(\d{1,3})\s*$/);
  if (!match) return undefined;
  const num = Number(match[1]);
  return Number.isFinite(num) && num >= 1 && num <= 100 ? num : undefined;
}

export function cleanTaskNameFromHeader(header: string): string {
  return header
    .replace(/\(\s*(?:\/\s*|max\s*)?\d{1,3}\s*\)/gi, "")
    .replace(/\[\s*(?:\/\s*)?\d{1,3}\s*\]/gi, "")
    .replace(/\/\s*\d{1,3}\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferAssessmentCategory(name: string): AssessmentCategory {
  const lower = name.toLowerCase();
  if (lower.includes("project")) return "PROJECT";
  if (lower.includes("group")) return "GROUP";
  if (lower.includes("homework") || lower.includes("home work") || lower.includes("assignment") || /\bhw\b/.test(lower)) {
    return "HOMEWORK";
  }
  return "CAT";
}

export type SbaImportMode = "FULL_SUBJECT" | "SINGLE_COMPONENT" | "EXAM_ONLY";

export function parseSbaScoreImport({
  rawText,
  subjectName,
  existingStudents,
  settings,
  customNewTasks,
  conflictPolicy = "OVERWRITE",
  importMode = "FULL_SUBJECT",
  targetTask,
}: {
  rawText: string;
  subjectName: string;
  existingStudents: StudentRecord[];
  settings: SchoolSettings;
  customNewTasks?: Record<number, NewSbaColumnOverride>;
  conflictPolicy?: SbaConflictPolicy;
  importMode?: SbaImportMode;
  targetTask?: ClassScoreComponentConfig;
}): SbaImportParseResult {
  const table = parseTabularText(rawText);
  const existingTasks = resolveSubjectSbaTasks(subjectName, existingStudents, settings);
  if (table.length < 2) {
    return {
      rows: [],
      matchedColumns: [],
      unmatchedHeaders: [],
      detectedNewColumns: [],
      tasks: existingTasks,
      conflictCount: 0,
      duplicateRowCount: 0,
    };
  }

  const isMock = settings.examType === "MOCK";
  const rawHeaders = table[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const studentByName = new Map<string, StudentRecord>();
  existingStudents.forEach((s) => {
    const key = normalizeStudentNameKey(s.name);
    if (!studentByName.has(key)) studentByName.set(key, s);
  });

  const nameColIdx = normalizedHeaders.findIndex((h) =>
    ["name", "studentname", "fullname", "student"].includes(h),
  );
  const effectiveNameCol = nameColIdx >= 0 ? nameColIdx : 0;

  const taskColMap = new Map<number, ClassScoreComponentConfig & { isNewTask: boolean }>();
  let directClassCol = -1;
  let examCol = -1;
  const matchedColumns: string[] = [`Name -> col ${effectiveNameCol + 1}`];
  const unmatchedHeaders: string[] = [];
  const detectedNewColumns: DetectedNewSbaColumn[] = [];
  const dataRows = table.slice(1);

  if (importMode === "EXAM_ONLY") {
    rawHeaders.forEach((rawHeader, idx) => {
      if (idx === effectiveNameCol) return;
      const norm = normalizedHeaders[idx];
      if (!norm) return;
      if (
        examCol === -1 &&
        ["exam", "examscore", "exams", "score", "marks", "terminalexam", "finalexam"].includes(norm)
      ) {
        examCol = idx;
        matchedColumns.push(`${rawHeader} -> Exam (/100)`);
        return;
      }
      unmatchedHeaders.push(rawHeader);
    });
    // Fallback for 2-column exam sheets with custom header
    if (examCol === -1 && rawHeaders.length === 2) {
      const otherIdx = effectiveNameCol === 0 ? 1 : 0;
      examCol = otherIdx;
      matchedColumns.push(`${rawHeaders[otherIdx]} -> Exam (/100)`);
    }
  } else if (importMode === "SINGLE_COMPONENT" && targetTask && !isMock) {
    const targetNorm = normalizeHeader(targetTask.name);
    const alreadyExists = existingTasks.some((t) => normalizeHeader(t.name) === targetNorm);
    let mappedIdx = rawHeaders.findIndex(
      (_, idx) => idx !== effectiveNameCol && normalizedHeaders[idx] === targetNorm,
    );
    if (mappedIdx === -1) {
      mappedIdx = rawHeaders.findIndex(
        (_, idx) =>
          idx !== effectiveNameCol &&
          ["score", "marks", "mark", "sba", "points"].includes(normalizedHeaders[idx]),
      );
    }
    if (mappedIdx === -1 && rawHeaders.length === 2) {
      mappedIdx = effectiveNameCol === 0 ? 1 : 0;
    }

    if (mappedIdx >= 0) {
      taskColMap.set(mappedIdx, { ...targetTask, isNewTask: !alreadyExists });
      matchedColumns.push(
        `${rawHeaders[mappedIdx]} -> ${alreadyExists ? "SBA" : "New SBA"}: ${targetTask.name} (/${targetTask.maxScore})`,
      );
    }
    rawHeaders.forEach((h, idx) => {
      if (idx !== effectiveNameCol && idx !== mappedIdx) unmatchedHeaders.push(h);
    });
  } else {
    rawHeaders.forEach((rawHeader, idx) => {
      if (idx === effectiveNameCol) return;
      const norm = normalizedHeaders[idx];
      if (!norm) return;

      const matchingTask = existingTasks.find((t) => normalizeHeader(t.name) === norm);
      if (matchingTask && !isMock) {
        taskColMap.set(idx, { ...matchingTask, isNewTask: false });
        matchedColumns.push(`${rawHeader} -> SBA: ${matchingTask.name}`);
        return;
      }

      if (
        !isMock &&
        ["classscore", "class", "sba", "sbatotal", "continuousassessment"].includes(norm)
      ) {
        directClassCol = idx;
        matchedColumns.push(`${rawHeader} -> Class Score`);
        return;
      }

      if (["exam", "examscore", "exams", "score", "terminalexam", "finalexam"].includes(norm)) {
        examCol = idx;
        matchedColumns.push(`${rawHeader} -> Exam (/100)`);
        return;
      }

      // Check if unmatched column contains numeric scores (potential new SBA component)
      const numericSamples = dataRows
        .map((r) => parseOptionalNumber(r[idx]))
        .filter((v): v is number => v !== undefined);

      if (!isMock && numericSamples.length > 0) {
        const cleanedName = cleanTaskNameFromHeader(rawHeader) || rawHeader.trim();
        const headerMax = extractHeaderMaxScore(rawHeader);
        const maxObserved = Math.max(...numericSamples);
        const suggestedMaxScore =
          headerMax ??
          (maxObserved > 20
            ? Math.min(100, Math.ceil(maxObserved / 5) * 5)
            : maxObserved > 15
              ? 20
              : 15);
        const suggestedCategory = inferAssessmentCategory(cleanedName);

        detectedNewColumns.push({
          colIndex: idx,
          rawHeader,
          suggestedName: cleanedName,
          suggestedMaxScore,
          suggestedCategory,
        });

        const override = customNewTasks?.[idx];
        const isEnabled = override ? override.enabled : true;
        if (isEnabled) {
          const effectiveName = (override?.name ?? cleanedName).trim() || cleanedName;
          const effectiveMax = Math.min(
            100,
            Math.max(1, override?.maxScore ?? suggestedMaxScore),
          );
          const effectiveCat = override?.category ?? suggestedCategory;
          taskColMap.set(idx, {
            name: effectiveName,
            maxScore: effectiveMax,
            category: effectiveCat,
            isNewTask: true,
          });
          matchedColumns.push(`${rawHeader} -> New SBA: ${effectiveName} (/${effectiveMax})`);
          return;
        }
      }

      unmatchedHeaders.push(rawHeader);
    });
  }

  // Merge existing tasks with any enabled new tasks so classScore recalculation sees full denominator
  const combinedTasks: ClassScoreComponentConfig[] = [...existingTasks];
  taskColMap.forEach((task) => {
    if (task.isNewTask && !combinedTasks.some((t) => normalizeHeader(t.name) === normalizeHeader(task.name))) {
      combinedTasks.push({
        name: task.name,
        maxScore: task.maxScore,
        category: task.category,
      });
    }
  });

  const rows: ParsedSbaScoreRow[] = [];
  const seenNames = new Set<string>();
  let conflictCount = 0;
  let duplicateRowCount = 0;

  for (const cells of dataRows) {
    const rawName = (cells[effectiveNameCol] ?? "").replace(/\s+/g, " ").trim();
    if (!rawName) continue;

    const nameKey = normalizeStudentNameKey(rawName);
    const isDuplicateInImport = seenNames.has(nameKey);
    if (isDuplicateInImport) duplicateRowCount++;
    seenNames.add(nameKey);

    const matchedStudent = studentByName.get(nameKey);
    const existingSubject = matchedStudent?.subjects.find((s) => s.name === subjectName);

    let hasWarnings = false;
    let hasConflicts = false;
    const componentScores: ParsedSbaComponentPatch[] = [];

    // Seed baseline components from existing subject or combined tasks
    let workingComponents: ClassScoreComponent[] = combinedTasks.map((t) => {
      const existingComp = existingSubject?.classScoreComponents?.find((c) => c.name === t.name);
      return {
        id: existingComp?.id || crypto.randomUUID(),
        name: t.name,
        maxScore: existingComp?.maxScore ?? t.maxScore,
        score: existingComp?.score ?? 0,
        category: t.category ?? existingComp?.category,
      };
    });

    let computedClassScore = existingSubject?.classScore ?? 0;

    if (!isMock && taskColMap.size > 0) {
      taskColMap.forEach((task, colIdx) => {
        const val = parseOptionalNumber(cells[colIdx]);
        if (val === undefined) return;
        const clamped = val > task.maxScore;
        if (clamped) hasWarnings = true;
        const clampedVal = Math.min(Math.max(val, 0), task.maxScore);

        const existingComp = existingSubject?.classScoreComponents?.find(
          (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
        );
        const existingScore = existingComp && existingComp.score > 0 ? existingComp.score : undefined;
        const isConflict = existingScore !== undefined && existingScore !== clampedVal;
        if (isConflict) {
          hasConflicts = true;
          conflictCount++;
        }

        const effectiveVal =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingScore !== undefined
            ? existingScore
            : clampedVal;

        componentScores.push({
          name: task.name,
          score: clampedVal,
          existingScore,
          maxScore: task.maxScore,
          clamped,
          isConflict,
          isNewTask: task.isNewTask,
          category: task.category,
        });

        const targetComp = workingComponents.find(
          (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
        );
        if (targetComp) {
          const res = updateComponentAndRecalculateClassScore(
            workingComponents,
            targetComp.id,
            effectiveVal,
            settings.classScoreMax,
          );
          workingComponents = res.updatedComponents;
          computedClassScore = res.classScore;
        }
      });
    }

    let directClassScore: ParsedSbaScoreRow["directClassScore"];
    if (!isMock && directClassCol >= 0 && taskColMap.size === 0) {
      const val = parseOptionalNumber(cells[directClassCol]);
      if (val !== undefined) {
        const res = clampDirectClassScore(val, settings.classScoreMax);
        if (res.wasClamped) hasWarnings = true;
        const existingCls =
          existingSubject && existingSubject.classScore > 0 ? existingSubject.classScore : undefined;
        const isConflict = existingCls !== undefined && existingCls !== res.score;
        if (isConflict) {
          hasConflicts = true;
          conflictCount++;
        }
        const effectiveCls =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingCls !== undefined
            ? existingCls
            : res.score;
        directClassScore = {
          score: res.score,
          existingScore: existingCls,
          clamped: res.wasClamped,
          isConflict,
        };
        computedClassScore = effectiveCls;
      }
    }

    let examRawScore: ParsedSbaScoreRow["examRawScore"];
    if (examCol >= 0) {
      const val = parseOptionalNumber(cells[examCol]);
      if (val !== undefined) {
        const res = convertExamRawToWeighted(val, settings.examScoreMax);
        if (res.wasClamped) hasWarnings = true;
        const existingRawStr = existingSubject
          ? formatExamWeightedAsRaw(existingSubject.examScore, settings.examScoreMax)
          : "";
        const existingRaw = existingRawStr ? Number(existingRawStr) : undefined;
        const isConflict =
          existingSubject !== undefined &&
          existingSubject.examScore > 0 &&
          existingSubject.examScore !== res.weightedScore;
        if (isConflict) {
          hasConflicts = true;
          conflictCount++;
        }
        const effectiveWeighted =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingSubject
            ? existingSubject.examScore
            : res.weightedScore;
        const effectiveRaw =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingRaw !== undefined
            ? existingRaw
            : res.clampedRaw;

        examRawScore = {
          raw: effectiveRaw,
          existingRaw,
          weighted: effectiveWeighted,
          clamped: res.wasClamped,
          isConflict,
        };
      }
    }

    rows.push({
      studentName: rawName,
      matchedStudentId: matchedStudent?.id,
      isNewStudent: !matchedStudent,
      isDuplicateInImport,
      componentScores,
      directClassScore,
      examRawScore,
      computedClassScore,
      hasWarnings,
      hasConflicts,
    });
  }

  return {
    rows,
    matchedColumns,
    unmatchedHeaders,
    detectedNewColumns,
    tasks: combinedTasks,
    conflictCount,
    duplicateRowCount,
  };
}

/**
 * Triggers a browser CSV download cleanly.
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
