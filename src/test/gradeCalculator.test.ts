import { describe, it, expect } from "vitest";
import { calculateGrade, processStudent } from "../utils/gradeCalculator";
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
  });
});
