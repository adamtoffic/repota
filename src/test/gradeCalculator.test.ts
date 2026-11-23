import { describe, it, expect } from "vitest";
import {
  assignPositions,
  assignSubjectPositions,
  calculateGrade,
  processStudent,
} from "../utils/gradeCalculator";
import type { StudentRecord } from "../types";

describe("calculateGrade", () => {
  describe("KG Level", () => {
    it("should return GOLD for scores 80+", () => {
      const result = calculateGrade(85, "KG");
      expect(result.grade).toBe("GOLD");
      expect(result.remark).toBe("Independent Application");
    });

    it("should return SILVER for scores 60-79", () => {
      const result = calculateGrade(70, "KG");
      expect(result.grade).toBe("SILVER");
      expect(result.remark).toBe("With Minimal Prompting");
    });

    it("should return BRONZE for scores below 60", () => {
      const result = calculateGrade(50, "KG");
      expect(result.grade).toBe("BRONZE");
      expect(result.remark).toBe("With Guidance");
    });
  });

  describe("PRIMARY Level", () => {
    it("should return 1 (Advance) for scores 80+", () => {
      const result = calculateGrade(85, "PRIMARY");
      expect(result.grade).toBe(1);
      expect(result.remark).toBe("Advance");
    });

    it("should return 2 (Proficient) for scores 75-79", () => {
      const result = calculateGrade(77, "PRIMARY");
      expect(result.grade).toBe(2);
      expect(result.remark).toBe("Proficient");
    });

    it("should return 3 (Approaching Proficiency) for scores 70-74", () => {
      const result = calculateGrade(72, "PRIMARY");
      expect(result.grade).toBe(3);
      expect(result.remark).toBe("Approaching Proficiency");
    });

    it("should return 4 (Developing) for scores 65-69", () => {
      const result = calculateGrade(67, "PRIMARY");
      expect(result.grade).toBe(4);
      expect(result.remark).toBe("Developing");
    });

    it("should return 5 (Beginning) for scores below 65", () => {
      const result = calculateGrade(50, "PRIMARY");
      expect(result.grade).toBe(5);
      expect(result.remark).toBe("Beginning");
    });
  });

  describe("JHS Level", () => {
    it("should return 1 (Highest) for scores 90+", () => {
      const result = calculateGrade(95, "JHS");
      expect(result.grade).toBe(1);
      expect(result.remark).toBe("Highest");
    });

    it("should return 2 (Higher) for scores 80-89", () => {
      const result = calculateGrade(85, "JHS");
      expect(result.grade).toBe(2);
      expect(result.remark).toBe("Higher");
    });

    it("should return 9 (Lowest) for scores below 35", () => {
      const result = calculateGrade(30, "JHS");
      expect(result.grade).toBe(9);
      expect(result.remark).toBe("Lowest");
    });
  });

  describe("SHS Level", () => {
    it("should return A1 (Excellent) for scores 80+", () => {
      const result = calculateGrade(85, "SHS");
      expect(result.grade).toBe("A1");
      expect(result.remark).toBe("Excellent");
    });

    it("should return B2 (Very Good) for scores 75-79", () => {
      const result = calculateGrade(77, "SHS");
      expect(result.grade).toBe("B2");
      expect(result.remark).toBe("Very Good");
    });

    it("should return B3 (Good) for scores 70-74", () => {
      const result = calculateGrade(72, "SHS");
      expect(result.grade).toBe("B3");
      expect(result.remark).toBe("Good");
    });

    it("should return F9 (Fail) for scores below 45", () => {
      const result = calculateGrade(40, "SHS");
      expect(result.grade).toBe("F9");
      expect(result.remark).toBe("Fail");
    });
  });

  describe("Edge cases", () => {
    it("should handle invalid level", () => {
      const result = calculateGrade(85, "INVALID" as unknown as SchoolLevel);
      expect(result.grade).toBe("F9");
      expect(result.remark).toBe("Invalid Level");
    });

    it("should handle very high scores", () => {
      const result = calculateGrade(150, "SHS");
      expect(result.grade).toBe("A1");
      expect(result.remark).toBe("Excellent");
    });

    it("should handle zero score", () => {
      const result = calculateGrade(0, "PRIMARY");
      expect(result.grade).toBe(5);
      expect(result.remark).toBe("Beginning");
    });
  });
});

describe("processStudent", () => {
  it("should calculate total scores and grades for each subject", () => {
    const student: StudentRecord = {
      id: "1",
      name: "Test Student",
      subjects: [
        {
          name: "Mathematics",
          classScore: 30,
          examScore: 70,
        },
        {
          name: "English",
          classScore: 25,
          examScore: 65,
        },
      ],
    };

    const result = processStudent(student, "SHS");

    expect(result.subjects[0].totalScore).toBe(100);
    expect(result.subjects[0].grade).toBe("A1");
    expect(result.subjects[0].remark).toBe("Excellent");

    expect(result.subjects[1].totalScore).toBe(90);
    expect(result.subjects[1].grade).toBe("A1");
    expect(result.subjects[1].remark).toBe("Excellent");
  });

  it("should calculate average score", () => {
    const student: StudentRecord = {
      id: "1",
      name: "Test Student",
      subjects: [
        { name: "Math", classScore: 30, examScore: 50 },
        { name: "English", classScore: 20, examScore: 60 },
      ],
    };

    const result = processStudent(student, "PRIMARY");
    expect(result.averageScore).toBe(80);
  });

  it("should handle student with no subjects", () => {
    const student: StudentRecord = {
      id: "1",
      name: "Test Student",
      subjects: [],
    };

    const result = processStudent(student, "SHS");
    expect(result.subjects).toHaveLength(0);
    expect(result.averageScore).toBe(0);
    expect(result.aggregate).toBeNull();
  });

  describe("Aggregates across school levels", () => {
    it("returns null aggregate for KG and for PRIMARY with no subjects", () => {
      const kgStudent: StudentRecord = {
        id: "kg-1",
        name: "KG Learner",
        className: "KG 2",
        subjects: [{ id: "1", name: "Numeracy", classScore: 45, examScore: 45 }],
      };
      expect(processStudent(kgStudent, "KG").aggregate).toBeNull();

      const emptyPrimary: StudentRecord = {
        id: "pri-0",
        name: "Primary Empty",
        className: "Basic 4",
        subjects: [],
      };
      expect(processStudent(emptyPrimary, "PRIMARY").aggregate).toBeNull();
    });

    it("computes JHS aggregate as 4 Core subjects plus Best 2 Electives", () => {
      const jhsStudent: StudentRecord = {
        id: "jhs-1",
        name: "JHS Candidate",
        className: "JHS 3",
        subjects: [
          { id: "1", name: "English Language", classScore: 45, examScore: 45 }, // 90 -> 1
          { id: "2", name: "Mathematics", classScore: 40, examScore: 42 }, // 82 -> 2
          { id: "3", name: "Integrated Science", classScore: 40, examScore: 40 }, // 80 -> 2
          { id: "4", name: "Social Studies", classScore: 35, examScore: 38 }, // 73 -> 3
          { id: "5", name: "Computing", classScore: 46, examScore: 46 }, // 92 -> 1 (Best elective)
          { id: "6", name: "RME", classScore: 40, examScore: 40 }, // 80 -> 2 (2nd best elective)
          { id: "7", name: "French", classScore: 25, examScore: 25 }, // 50 -> 6 (Ignored)
        ],
      };

      const result = processStudent(jhsStudent, "JHS");
      expect(result.aggregate).toBe(1 + 2 + 2 + 3 + 1 + 2); // 11
    });

    it("computes SHS aggregate as English + Core Math + best 3rd core + Best 3 Electives", () => {
      const shsStudent: StudentRecord = {
        id: "shs-1",
        name: "SHS Candidate",
        className: "SHS 2",
        subjects: [
          { id: "1", name: "English Language", classScore: 40, examScore: 42 }, // 82 -> A1 (1)
          { id: "2", name: "Core Mathematics", classScore: 38, examScore: 38 }, // 76 -> B2 (2)
          { id: "3", name: "Integrated Science", classScore: 36, examScore: 36 }, // 72 -> B3 (3)
          { id: "4", name: "Social Studies", classScore: 25, examScore: 25 }, // 50 -> D7 (7, weaker than Science)
          { id: "5", name: "Physics", classScore: 42, examScore: 42 }, // 84 -> A1 (1)
          { id: "6", name: "Chemistry", classScore: 38, examScore: 38 }, // 76 -> B2 (2)
          { id: "7", name: "Biology", classScore: 35, examScore: 35 }, // 70 -> B3 (3)
          { id: "8", name: "Elective Math", classScore: 20, examScore: 25 }, // 45 -> E8 (8, ignored)
        ],
      };

      const result = processStudent(shsStudent, "SHS");
      expect(result.aggregate).toBe(1 + 2 + 3 + 1 + 2 + 3); // 12
    });
  });

  describe("Class & Subject Ranking with Tie-Breaking", () => {
    it("assigns class positions descending with competition ties and ordinal suffixes", () => {
      const makeRaw = (id: string, avgTotal: number): StudentRecord => ({
        id,
        name: `Student ${id}`,
        className: "JHS 2",
        subjects: [
          {
            id: `sub-${id}`,
            name: "Mathematics",
            classScore: Math.floor(avgTotal / 2),
            examScore: avgTotal - Math.floor(avgTotal / 2),
          },
        ],
      });

      const records = [
        makeRaw("low", 50),
        makeRaw("tieA", 90),
        makeRaw("tieB", 90),
        makeRaw("fourth", 75),
      ];

      // Add extra students so we test 11th/12th/13th/21st ordinals cleanly too
      const many = [
        ...records,
        ...Array.from({ length: 18 }, (_, i) => makeRaw(`pad-${i}`, 40 - i)),
      ];
      const ranked = assignPositions(many.map((s) => processStudent(s, "JHS")));
      const byId = new Map(ranked.map((s) => [s.id, s]));

      expect(ranked.slice(0, 4).map((s) => s.id)).toEqual(["low", "tieA", "tieB", "fourth"]);
      expect(many.map((s) => s.id)).toEqual(ranked.map((s) => s.id));
      expect(byId.get("tieA")?.classPosition).toBe("1st");
      expect(byId.get("tieB")?.classPosition).toBe("1st");
      expect(byId.get("fourth")?.classPosition).toBe("3rd");
      expect(byId.get("low")?.classPosition).toBe("4th");
      expect(ranked[10].classPosition).toBe("11th");
      expect(ranked[11].classPosition).toBe("12th");
      expect(ranked[12].classPosition).toBe("13th");
      expect(ranked[20].classPosition).toBe("21st");
    });

    it("assigns per-subject positions with tie-breaking across uneven student subject lists", () => {
      const s1 = processStudent(
        {
          id: "s1",
          name: "Ama",
          className: "JHS 1",
          subjects: [
            { id: "m1", name: "Mathematics", classScore: 40, examScore: 40 }, // 80 (tie 1st)
            { id: "e1", name: "English", classScore: 30, examScore: 30 }, // 60 (2nd)
          ],
        },
        "JHS",
      );
      const s2 = processStudent(
        {
          id: "s2",
          name: "Kofi",
          className: "JHS 1",
          subjects: [
            { id: "m2", name: "Mathematics", classScore: 40, examScore: 40 }, // 80 (tie 1st)
            { id: "e2", name: "English", classScore: 45, examScore: 45 }, // 90 (1st)
          ],
        },
        "JHS",
      );
      const s3 = processStudent(
        {
          id: "s3",
          name: "Yaa",
          className: "JHS 1",
          subjects: [
            { id: "m3", name: "Mathematics", classScore: 35, examScore: 35 }, // 70 (3rd)
          ],
        },
        "JHS",
      );

      const withSubjectRanks = assignSubjectPositions([s1, s2, s3]);
      const getSubjectPos = (stuId: string, subName: string) =>
        withSubjectRanks
          .find((s) => s.id === stuId)
          ?.subjects.find((sub) => sub.name === subName)?.subjectPosition;

      expect(getSubjectPos("s1", "Mathematics")).toBe("1st");
      expect(getSubjectPos("s2", "Mathematics")).toBe("1st");
      expect(getSubjectPos("s3", "Mathematics")).toBe("3rd");
      expect(getSubjectPos("s2", "English")).toBe("1st");
      expect(getSubjectPos("s1", "English")).toBe("2nd");
    });
  });
});
