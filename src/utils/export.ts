import type { ProcessedStudent, SchoolSettings } from "../types";
import { downloadCsvFile, escapeCsvCell, formatTemplateHeaderCell } from "./csv/tabularParser";
import { downloadBlob } from "./fileDownload";

function parsePositionRank(position: string | undefined): number {
  if (!position) return Number.POSITIVE_INFINITY;
  const match = /^\s*(\d+)/.exec(position);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function sortStudentsByClassPosition(students: ProcessedStudent[]): ProcessedStudent[] {
  return [...students].sort((a, b) => {
    const rankA = parsePositionRank(a.classPosition);
    const rankB = parsePositionRank(b.classPosition);
    if (rankA !== rankB) return rankA - rankB;
    return b.averageScore - a.averageScore;
  });
}

/**
 * Exports a summary broadsheet CSV spanning the union of all student subject names ordered by
 * class position (`1st` → last) without mutating `students`, and triggers a browser download.
 * Neutralizes spreadsheet formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) on string cells before quoting.
 *
 * @throws {Error} When `students` is empty or `fileName` is blank.
 */
export function exportToCSV(students: ProcessedStudent[], fileName: string): boolean {
  try {
    // Validate inputs
    if (!students || students.length === 0) {
      throw new Error("No students to export");
    }
    if (!fileName || fileName.trim() === "") {
      throw new Error("Invalid filename");
    }

    const rankedStudents = sortStudentsByClassPosition(students);

    // 1. Build dynamic subject columns across all students
    const subjectNames = Array.from(
      new Set(rankedStudents.flatMap((student) => student.subjects.map((subject) => subject.name))),
    );

    // 2. Define requested columns
    const headers = ["Name", ...subjectNames, "Total", "Position", "Aggregate"];

    const escapeCsv = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const rawString = String(value);
      // Neutralize spreadsheet formula prefixes (=, +, -, @, tab, CR) on text cells
      const safeString =
        typeof value === "string" && /^[=+\-@\t\r]/.test(rawString) ? `'${rawString}` : rawString;
      return `"${safeString.replace(/"/g, '""')}"`;
    };

    // 3. Map Data
    const rows = rankedStudents.map((student) => {
      const subjectScoreMap = new Map(
        student.subjects.map((subject) => [
          subject.name,
          typeof subject.totalScore === "number"
            ? subject.totalScore
            : subject.classScore + subject.examScore,
        ]),
      );

      const subjectScores = subjectNames.map((subjectName) => {
        const score = subjectScoreMap.get(subjectName);
        return score !== undefined ? escapeCsv(score) : "";
      });

      return [
        escapeCsv(student.name),
        ...subjectScores,
        escapeCsv(student.totalScore),
        escapeCsv(student.classPosition),
        escapeCsv(student.aggregate),
      ];
    });

    // 4. Construct CSV String
    const csvContent = [
      headers.map(formatTemplateHeaderCell).join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    // 5. Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${fileName}.csv`);

    return true;
  } catch (error) {
    console.error("CSV Export Error:", error);
    throw error; // Re-throw so caller can handle with toast
  }
}

/**
 * Exports a full broadsheet CSV via `escapeCsvCell` and `downloadCsvFile`, ordered by
 * class position (`1st` → last) without mutating `students`.
 * Collapses subject columns to `(Total)` when `settings.examType === "MOCK"` (otherwise Class/Exam/Total),
 * and appends admission/fee columns when `settings.schoolType === "PRIVATE"`.
 *
 * @throws {Error} When `students` is empty or `fileName` is blank.
 */
export function exportDetailedBroadsheetCSV(
  students: ProcessedStudent[],
  settings: Pick<SchoolSettings, "schoolType" | "totalAttendanceDays" | "examType">,
  fileName: string,
): boolean {
  if (!students || students.length === 0) {
    throw new Error("No students to export");
  }
  if (!fileName || fileName.trim() === "") {
    throw new Error("Invalid filename");
  }

  const rankedStudents = sortStudentsByClassPosition(students);
  const isPrivate = settings.schoolType === "PRIVATE";
  const isMock = settings.examType === "MOCK";
  const subjectNames = Array.from(
    new Set(rankedStudents.flatMap((student) => student.subjects.map((subject) => subject.name))),
  );

  const subjectHeaders = subjectNames.flatMap((name) =>
    isMock ? [`${name} (Total)`] : [`${name} (Class)`, `${name} (Exam)`, `${name} (Total)`],
  );

  const headers = [
    "Name",
    "Gender",
    "Attendance",
    ...subjectHeaders,
    "Total Score",
    "Average (%)",
    "Position",
    "Aggregate",
    "Promotion Status",
    "Teacher Remark",
    ...(isPrivate ? ["Admission No", "Fee Status", "Fee Arrears"] : []),
  ];

  const rows = rankedStudents.map((student) => {
    const subMap = new Map(student.subjects.map((sub) => [sub.name, sub]));
    const subjectCells = subjectNames.flatMap((name) => {
      const sub = subMap.get(name);
      if (!sub) return isMock ? [""] : ["", "", ""];
      const total =
        typeof sub.totalScore === "number" ? sub.totalScore : sub.classScore + sub.examScore;
      return isMock
        ? [escapeCsvCell(total)]
        : [escapeCsvCell(sub.classScore), escapeCsvCell(sub.examScore), escapeCsvCell(total)];
    });

    const attendanceLabel =
      settings.totalAttendanceDays && student.attendancePresent !== undefined
        ? `${student.attendancePresent}/${settings.totalAttendanceDays}`
        : (student.attendancePresent ?? "");

    return [
      escapeCsvCell(student.name),
      escapeCsvCell(student.gender || ""),
      escapeCsvCell(attendanceLabel),
      ...subjectCells,
      escapeCsvCell(student.totalScore),
      escapeCsvCell(student.averageScore),
      escapeCsvCell(student.classPosition),
      escapeCsvCell(student.aggregate),
      escapeCsvCell(student.promotionStatus || ""),
      escapeCsvCell(student.teacherRemark || ""),
      ...(isPrivate
        ? [
            escapeCsvCell(student.admissionNumber || ""),
            escapeCsvCell(student.feeStatus || ""),
            escapeCsvCell(student.feeArrears ?? ""),
          ]
        : []),
    ];
  });

  const csvContent = [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
  downloadCsvFile(csvContent, fileName);
  return true;
}
