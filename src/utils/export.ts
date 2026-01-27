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

    // 1. Define Columns
    const headers = [
      "Name",
      "Class",
      "Subjects Count",
      "Total Score",
      "Average",
      "Position",
      "Pass/Fail",
    ];

    // 2. Map Data
    const rows = students.map((s) => [
      `"${s.name}"`, // Quote strings to handle commas in names
      `"${s.className}"`,
      s.subjects.length,
      s.totalScore,
      s.averageScore,
      `"${s.classPosition}"`,
      s.averageScore >= 50 ? "Pass" : "Fail",
    ]);

    // 3. Construct CSV String
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    // 4. Trigger Download
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
