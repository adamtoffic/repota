import { DEFAULT_SUBJECTS } from "../../constants/defaultSubjects";
import type {
  AssessmentCategory,
  ClassScoreComponent,
  FeeStatus,
  SavedSubject,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import { downloadBlob } from "../fileDownload";

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

    if (char === '"' && currentCell.trim().length === 0) {
      currentCell = "";
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

export function stripNameListPrefix(name: string): string {
  return name
    .replace(/^\s*(?:\d+\s*[.):-]\s*|[-•*]\s+)/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildStudentLookup(existingStudents: StudentRecord[]): Map<string, StudentRecord> {
  const byKey = new Map<string, StudentRecord>();
  const reversedCandidates = new Map<string, StudentRecord[]>();

  existingStudents.forEach((student) => {
    const exactKey = normalizeStudentNameKey(student.name);
    if (!byKey.has(exactKey)) {
      byKey.set(exactKey, student);
    }

    const stripped = normalizeStudentNameKey(stripNameListPrefix(student.name));
    if (stripped && !byKey.has(stripped)) {
      byKey.set(stripped, student);
    }

    const parts = exactKey.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      const reversed = `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`;
      const list = reversedCandidates.get(reversed) ?? [];
      list.push(student);
      reversedCandidates.set(reversed, list);
    }
  });

  reversedCandidates.forEach((matches, reversedKey) => {
    if (matches.length === 1 && !byKey.has(reversedKey)) {
      byKey.set(reversedKey, matches[0]);
    }
  });

  return byKey;
}

export function findMatchingStudent(
  rawName: string,
  lookup: Map<string, StudentRecord>,
): StudentRecord | undefined {
  const exact = normalizeStudentNameKey(rawName);
  if (lookup.has(exact)) return lookup.get(exact);

  const stripped = normalizeStudentNameKey(stripNameListPrefix(rawName));
  if (stripped && lookup.has(stripped)) return lookup.get(stripped);

  if (rawName.includes(",")) {
    const commaParts = rawName
      .split(",")
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (commaParts.length === 2) {
      const reordered = `${commaParts[1]} ${commaParts[0]}`.toLowerCase();
      if (lookup.has(reordered)) return lookup.get(reordered);
    }
  }

  return undefined;
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
  if (
    lower.includes("homework") ||
    lower.includes("home work") ||
    lower.includes("assignment") ||
    /\bhw\b/.test(lower)
  ) {
    return "HOMEWORK";
  }
  return "CAT";
}

export function normalizeComponentNameKey(name: string): string {
  return cleanTaskNameFromHeader(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeHeader(header: string): string {
  return normalizeComponentNameKey(header);
}

export const DERIVED_EXPORT_HEADERS = new Set([
  "taskscore",
  "rawtotal",
  "sbapace",
  "subjectclassscore",
  "weightedexam",
  "total",
  "totalscore",
  "grade",
  "position",
  "remark",
  "average",
  "aggregate",
]);

export function formatTemplateHeaderCell(header: string): string {
  return /[,"\n\r]/.test(header) || /^[=+\-@\t\r]/.test(header) ? escapeCsvCell(header) : header;
}

export function parseGenderValue(raw: string | undefined): {
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

export function parseFeeStatusValue(raw: string | undefined): FeeStatus | undefined {
  if (!raw) return undefined;
  const norm = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (norm === "PAID" || norm === "FULL") return "PAID";
  if (norm === "PART_PAID" || norm === "PART" || norm === "PARTIAL") return "PART_PAID";
  if (norm === "OWING" || norm === "UNPAID") return "OWING";
  if (norm === "SCHOLARSHIP" || norm === "EXEMPT") return "SCHOLARSHIP";
  return undefined;
}

export function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(
    /^(?:(?:GH₵|GHS|₵)\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|[+-]?\.\d+)\s*%?$/i,
  );
  if (!match) return undefined;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Triggers a browser CSV download cleanly.
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}
