import type { FeeStatus, SchoolSettings, StudentRecord } from "../../types";
import {
  escapeCsvCell,
  formatTemplateHeaderCell,
  normalizeHeader,
  normalizeStudentNameKey,
  parseFeeStatusValue,
  parseGenderValue,
  parseOptionalNumber,
  parseTabularText,
} from "./tabularParser";

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

  return [headers.map(formatTemplateHeaderCell).join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
}
