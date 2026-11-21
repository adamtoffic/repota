import posthog from "posthog-js";
import type { PrintMode, SchoolSettings, StudentRecord } from "../types";
import { hasNoScoresEntered, isStudentPending } from "./studentValidation";

export const REPORT_LEDGER_STORAGE_KEY = "repota_analytics_report_ledger_v1";
export const LEDGER_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const MAX_LEDGER_ENTRIES = 5000;

export type PrintChannel =
  | "native_print"
  | "keyboard_print"
  | "ios_pdf_share"
  | "ios_pdf_download";

export type PrintScope = "single" | "ready_filter" | "all";
export type ReportReadiness = "ready" | "partial";

export interface ReportLedgerEntry {
  firstPrintedAt: number;
  readyPrintedAt?: number;
}

interface StoredReportLedger {
  version: 1;
  entries: Record<string, ReportLedgerEntry>;
}

export type ReportAnalyticsSettings = Pick<
  SchoolSettings,
  "academicYear" | "term" | "examType" | "level" | "schoolType" | "templateId" | "defaultSubjects"
>;

export interface TrackReportPrintParams {
  students: readonly StudentRecord[];
  settings: ReportAnalyticsSettings;
  printMode: PrintMode;
  printScope: PrintScope;
  printChannel: PrintChannel;
  now?: number;
}

export interface ReportPrintSummary {
  studentsCount: number;
  realStudentsCount: number;
  readyStudentsCount: number;
  demoStudentsCount: number;
  unscoredStudentsCount: number;
  newUniqueReportsCount: number;
  newUniqueReadyReportsCount: number;
  isReprint: boolean;
  isDemo: boolean;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function encodeUtf8(input: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input);
  }
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let codePoint = input.charCodeAt(i);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
      const low = input.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * Synchronous FIPS 180-4 SHA-256 hex digest over UTF-8 input.
 * Synchronous execution keeps `beforeprint` and user-gesture print paths non-blocking.
 */
export function sha256Hex(input: string): string {
  const bytes = encodeUtf8(input);
  const byteLength = bytes.length;
  const paddedLength = Math.ceil((byteLength + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[byteLength] = 0x80;

  const view = new DataView(padded.buffer);
  const bitLenHi = Math.floor(byteLength / 0x20000000);
  const bitLenLo = (byteLength * 8) >>> 0;
  view.setUint32(paddedLength - 8, bitLenHi, false);
  view.setUint32(paddedLength - 4, bitLenLo, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

/**
 * Truncated 128-bit SHA-256 hex key used as a zero-PII unique report identifier.
 */
export function hashReportKey(rawKey: string): string {
  return sha256Hex(rawKey).slice(0, 32);
}

export function isDemoStudent(student: Pick<StudentRecord, "id">): boolean {
  return typeof student.id === "string" && student.id.startsWith("demo-");
}

function normalizeSegment(value: string | undefined): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildAcademicPeriodKey(
  settings: Pick<SchoolSettings, "academicYear" | "term" | "examType">,
): string {
  const academicYear = normalizeSegment(settings.academicYear);
  const term = normalizeSegment(settings.term);
  const examType = (settings.examType || "TERMLY").trim().toUpperCase();
  return `${academicYear}|${term}|${examType}`;
}

export function buildRawReportKey(
  studentId: string,
  settings: Pick<SchoolSettings, "academicYear" | "term" | "examType">,
): string {
  return `${buildAcademicPeriodKey(settings)}|${studentId.trim()}`;
}

let memoryFallbackEntries: Record<string, ReportLedgerEntry> = {};
let hasMemoryFallback = false;

function isValidLedgerEntry(entry: unknown): entry is ReportLedgerEntry {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<ReportLedgerEntry>;
  if (typeof candidate.firstPrintedAt !== "number" || !Number.isFinite(candidate.firstPrintedAt)) {
    return false;
  }
  if (
    candidate.readyPrintedAt !== undefined &&
    (typeof candidate.readyPrintedAt !== "number" || !Number.isFinite(candidate.readyPrintedAt))
  ) {
    return false;
  }
  return true;
}

function pruneLedger(
  entries: Record<string, ReportLedgerEntry>,
  now: number,
): Record<string, ReportLedgerEntry> {
  const validEntries: Array<[string, ReportLedgerEntry]> = [];
  for (const [key, entry] of Object.entries(entries)) {
    if (!isValidLedgerEntry(entry)) continue;
    if (now - entry.firstPrintedAt > LEDGER_TTL_MS) continue;
    validEntries.push([key, entry]);
  }

  if (validEntries.length <= MAX_LEDGER_ENTRIES) {
    return Object.fromEntries(validEntries);
  }

  validEntries.sort(([, a], [, b]) => a.firstPrintedAt - b.firstPrintedAt);
  return Object.fromEntries(validEntries.slice(validEntries.length - MAX_LEDGER_ENTRIES));
}

function readLedger(): Record<string, ReportLedgerEntry> {
  try {
    if (typeof localStorage === "undefined") {
      return { ...memoryFallbackEntries };
    }
    const raw = localStorage.getItem(REPORT_LEDGER_STORAGE_KEY);
    if (!raw) {
      return hasMemoryFallback ? { ...memoryFallbackEntries } : {};
    }
    const parsed = JSON.parse(raw) as Partial<StoredReportLedger> | null;
    if (!parsed || parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== "object") {
      return hasMemoryFallback ? { ...memoryFallbackEntries } : {};
    }
    return hasMemoryFallback ? { ...parsed.entries, ...memoryFallbackEntries } : parsed.entries;
  } catch {
    return { ...memoryFallbackEntries };
  }
}

function writeLedger(entries: Record<string, ReportLedgerEntry>, now: number): void {
  const pruned = pruneLedger(entries, now);
  const payload: StoredReportLedger = { version: 1, entries: pruned };
  try {
    if (typeof localStorage === "undefined") {
      memoryFallbackEntries = pruned;
      hasMemoryFallback = true;
      return;
    }
    localStorage.setItem(REPORT_LEDGER_STORAGE_KEY, JSON.stringify(payload));
    memoryFallbackEntries = {};
    hasMemoryFallback = false;
  } catch {
    memoryFallbackEntries = pruned;
    hasMemoryFallback = true;
  }
}

export function clearReportAnalyticsLedger(): void {
  memoryFallbackEntries = {};
  hasMemoryFallback = false;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(REPORT_LEDGER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access failures in private/locked environments
  }
}

/**
 * Tracks a confirmed print or PDF export action without double-counting repeated prints,
 * demo rosters, or completely unscored students.
 */
export function trackReportPrint(params: TrackReportPrintParams): ReportPrintSummary {
  const now = params.now ?? Date.now();
  const seenIds = new Set<string>();
  const uniqueStudents: StudentRecord[] = [];

  for (const student of params.students) {
    if (!student?.id || seenIds.has(student.id)) continue;
    seenIds.add(student.id);
    uniqueStudents.push(student);
  }

  const demoStudents: StudentRecord[] = [];
  const unscoredStudents: StudentRecord[] = [];
  const realScoredStudents: StudentRecord[] = [];

  for (const student of uniqueStudents) {
    if (isDemoStudent(student)) {
      demoStudents.push(student);
    } else if (hasNoScoresEntered(student)) {
      unscoredStudents.push(student);
    } else {
      realScoredStudents.push(student);
    }
  }

  const realStudentsCount = uniqueStudents.length - demoStudents.length;
  const isDemo = demoStudents.length > 0 && realStudentsCount === 0;

  const ledger = pruneLedger(readLedger(), now);
  let ledgerModified = false;
  let readyStudentsCount = 0;
  let newUniqueReportsCount = 0;
  let newUniqueReadyReportsCount = 0;

  const pendingReportEvents: Array<{
    report_key: string;
    readiness: ReportReadiness;
    is_readiness_upgrade: boolean;
  }> = [];

  for (const student of realScoredStudents) {
    const isReady = !isStudentPending(student, params.settings);
    if (isReady) {
      readyStudentsCount++;
    }
    const readiness: ReportReadiness = isReady ? "ready" : "partial";
    const reportKey = hashReportKey(buildRawReportKey(student.id, params.settings));
    const existing = ledger[reportKey];

    if (!existing) {
      ledger[reportKey] = isReady
        ? { firstPrintedAt: now, readyPrintedAt: now }
        : { firstPrintedAt: now };
      ledgerModified = true;
      newUniqueReportsCount++;
      if (isReady) {
        newUniqueReadyReportsCount++;
      }
      pendingReportEvents.push({
        report_key: reportKey,
        readiness,
        is_readiness_upgrade: false,
      });
    } else if (existing.readyPrintedAt === undefined && isReady) {
      ledger[reportKey] = {
        ...existing,
        readyPrintedAt: now,
      };
      ledgerModified = true;
      newUniqueReadyReportsCount++;
      pendingReportEvents.push({
        report_key: reportKey,
        readiness: "ready",
        is_readiness_upgrade: true,
      });
    }
  }

  if (ledgerModified) {
    writeLedger(ledger, now);
  }

  const isReprint =
    realScoredStudents.length > 0 &&
    newUniqueReportsCount === 0 &&
    newUniqueReadyReportsCount === 0;

  const templateId = params.settings.templateId || "original_v1";
  const schoolLevel = params.settings.level || "unknown";
  const schoolType = params.settings.schoolType || "unknown";
  const examType = (params.settings.examType || "TERMLY").trim().toUpperCase();
  const term = params.settings.term || "unknown";

  try {
    for (const item of pendingReportEvents) {
      posthog.capture("Report_Card_Generated", {
        report_key: item.report_key,
        readiness: item.readiness,
        is_readiness_upgrade: item.is_readiness_upgrade,
        template_id: templateId,
        print_mode: params.printMode,
        print_scope: params.printScope,
        print_channel: params.printChannel,
        school_level: schoolLevel,
        school_type: schoolType,
        exam_type: examType,
        term,
      });
    }

    posthog.capture("Printed_Reports", {
      students_count: uniqueStudents.length,
      template_id: templateId,
      print_mode: params.printMode,
      school_level: schoolLevel,
      school_type: schoolType,
      real_students_count: realStudentsCount,
      ready_students_count: readyStudentsCount,
      demo_students_count: demoStudents.length,
      unscored_students_count: unscoredStudents.length,
      new_unique_reports_count: newUniqueReportsCount,
      new_unique_ready_reports_count: newUniqueReadyReportsCount,
      is_reprint: isReprint,
      is_demo: isDemo,
      print_scope: params.printScope,
      print_channel: params.printChannel,
      exam_type: examType,
    });
  } catch {
    // Analytics must never block printing
  }

  return {
    studentsCount: uniqueStudents.length,
    realStudentsCount,
    readyStudentsCount,
    demoStudentsCount: demoStudents.length,
    unscoredStudentsCount: unscoredStudents.length,
    newUniqueReportsCount,
    newUniqueReadyReportsCount,
    isReprint,
    isDemo,
  };
}
