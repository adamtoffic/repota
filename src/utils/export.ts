import type { ProcessedStudent } from "../types";

export function exportToCSV(students: ProcessedStudent[], fileName: string): boolean {
  try {
    // Validate inputs
    if (!students || students.length === 0) {
      throw new Error("No students to export");
    }
    if (!fileName || fileName.trim() === "") {
      throw new Error("Invalid filename");
    }

    // 1. Build dynamic subject columns across all students
    const subjectNames = Array.from(
      new Set(students.flatMap((student) => student.subjects.map((subject) => subject.name))),
    );

    // 2. Define requested columns
    const headers = ["Name", ...subjectNames, "Total", "Position", "Aggregate"];

    const escapeCsv = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    // 3. Map Data
    const rows = students.map((student) => {
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
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    // 5. Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("CSV Export Error:", error);
    throw error; // Re-throw so caller can handle with toast
  }
}
