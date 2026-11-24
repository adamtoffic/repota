import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProcessedStudent } from "../types";
import { exportToCSV } from "../utils/export";

describe("exportToCSV", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws descriptive errors when students array or filename is empty", () => {
    expect(() => exportToCSV([], "Broadsheet")).toThrow("No students to export");
    const student = {
      id: "1",
      name: "Ama",
      className: "JHS 1",
      subjects: [],
      totalScore: 0,
      averageScore: 0,
      classPosition: "Pending...",
    } as ProcessedStudent;
    expect(() => exportToCSV([student], "   ")).toThrow("Invalid filename");
  });

  it("aligns dynamic subject columns, escapes CSV quotes/commas, and neutralizes formula prefixes", async () => {
    vi.useFakeTimers();
    try {
      let capturedBlob: Blob | null = null;
      vi.spyOn(URL, "createObjectURL").mockImplementation((obj) => {
        capturedBlob = obj as Blob;
        return "blob:mock-csv";
      });
      const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      const students: ProcessedStudent[] = [
        {
          id: "1",
          name: 'Mensah, Kofi "Jr"',
          className: "JHS 2",
          subjects: [
            {
              id: "s1",
              name: "Mathematics",
              classScore: 30,
              examScore: 40,
              totalScore: 70,
              grade: 3,
              remark: "High",
            },
          ],
          totalScore: 70,
          averageScore: 70,
          classPosition: "1st",
          aggregate: 10,
        },
        {
          id: "2",
          name: "=CMD|calc",
          className: "JHS 2",
          subjects: [
            {
              id: "s2",
              name: "Science",
              classScore: 25,
              examScore: 35,
              totalScore: 60,
              grade: 4,
              remark: "High Average",
            },
          ],
          totalScore: 60,
          averageScore: 60,
          classPosition: "2nd",
          aggregate: 14,
        },
      ];

      expect(exportToCSV(students, "JHS2_Broadsheet")).toBe(true);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(revokeSpy).toHaveBeenCalledWith("blob:mock-csv");
      expect(capturedBlob).not.toBeNull();

      const csvText = await capturedBlob!.text();
      const lines = csvText.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("Name,Mathematics,Science,Total,Position,Aggregate");
      expect(lines[1]).toBe('"Mensah, Kofi ""Jr""","70",,"70","1st","10"');
      expect(lines[2]).toBe('"\'=CMD|calc",,"60","60","2nd","14"');
    } finally {
      vi.useRealTimers();
    }
  });

  it("sorts exported broadsheet rows by classPosition (1st to last) without mutating input", async () => {
    let capturedBlob: Blob | null = null;
    vi.spyOn(URL, "createObjectURL").mockImplementation((obj) => {
      capturedBlob = obj as Blob;
      return "blob:mock-ranked-csv";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const makeRankedStudent = (
      id: string,
      name: string,
      total: number,
      classPosition: string,
    ): ProcessedStudent => ({
      id,
      name,
      className: "JHS 2",
      subjects: [
        {
          id: `sub-${id}`,
          name: "Mathematics",
          classScore: Math.floor(total / 2),
          examScore: total - Math.floor(total / 2),
          totalScore: total,
          grade: 1,
          remark: "Highest",
        },
      ],
      totalScore: total,
      averageScore: total,
      classPosition,
      aggregate: 6,
    });

    const rollOrderedStudents: ProcessedStudent[] = [
      makeRankedStudent("s1", "Student Third", 60, "4th"),
      makeRankedStudent("s2", "Student Tie A", 90, "1st"),
      makeRankedStudent("s3", "Student Next", 75, "3rd"),
      makeRankedStudent("s4", "Student Tie B", 90, "1st"),
    ];

    expect(exportToCSV(rollOrderedStudents, "Ranked_Broadsheet")).toBe(true);
    expect(rollOrderedStudents.map((s) => s.id)).toEqual(["s1", "s2", "s3", "s4"]);

    const csvText = await capturedBlob!.text();
    const lines = csvText.split("\n");
    expect(lines[1]).toContain('"Student Tie A"');
    expect(lines[2]).toContain('"Student Tie B"');
    expect(lines[3]).toContain('"Student Next"');
    expect(lines[4]).toContain('"Student Third"');
  });
});
