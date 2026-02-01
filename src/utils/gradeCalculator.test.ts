// gradeCalculator.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateAverage,
  calculatePosition,
  calculateGrade,
  getRemarkForAverage,
} from "./gradeCalculator";

describe("calculateAverage", () => {
  it("should calculate average of valid scores", () => {
    const scores = { english: 85, math: 90, science: 78 };
    expect(calculateAverage(scores)).toBe(84.33);
  });

  it("should ignore zero scores", () => {
    const scores = { english: 80, math: 0, science: 90 };
    expect(calculateAverage(scores)).toBe(85);
  });

  it("should return 0 for all zero scores", () => {
    const scores = { english: 0, math: 0, science: 0 };
    expect(calculateAverage(scores)).toBe(0);
  });

  it("should return 0 for empty scores", () => {
    const scores = {};
    expect(calculateAverage(scores)).toBe(0);
  });

  it("should handle single subject", () => {
    const scores = { english: 75 };
    expect(calculateAverage(scores)).toBe(75);
  });

  it("should round to 2 decimal places", () => {
    const scores = { english: 85, math: 90, science: 77 };
    expect(calculateAverage(scores)).toBe(84);
  });
});

describe("calculateGrade", () => {
  it("should return A for scores 80-100", () => {
    expect(calculateGrade(100)).toBe("A");
    expect(calculateGrade(85)).toBe("A");
    expect(calculateGrade(80)).toBe("A");
  });

  it("should return B for scores 70-79", () => {
    expect(calculateGrade(79)).toBe("B");
    expect(calculateGrade(75)).toBe("B");
    expect(calculateGrade(70)).toBe("B");
  });

  it("should return C for scores 60-69", () => {
    expect(calculateGrade(69)).toBe("C");
    expect(calculateGrade(65)).toBe("C");
    expect(calculateGrade(60)).toBe("C");
  });

  it("should return D for scores 50-59", () => {
    expect(calculateGrade(59)).toBe("D");
    expect(calculateGrade(55)).toBe("D");
    expect(calculateGrade(50)).toBe("D");
  });

  it("should return E for scores 40-49", () => {
    expect(calculateGrade(49)).toBe("E");
    expect(calculateGrade(45)).toBe("E");
    expect(calculateGrade(40)).toBe("E");
  });

  it("should return F for scores below 40", () => {
    expect(calculateGrade(39)).toBe("F");
    expect(calculateGrade(20)).toBe("F");
    expect(calculateGrade(0)).toBe("F");
  });

  it("should handle edge cases", () => {
    expect(calculateGrade(-10)).toBe("F");
    expect(calculateGrade(101)).toBe("A");
  });
});

describe("getRemarkForAverage", () => {
  it("should return Excellent for 80-100", () => {
    expect(getRemarkForAverage(100)).toBe("Excellent");
    expect(getRemarkForAverage(85)).toBe("Excellent");
    expect(getRemarkForAverage(80)).toBe("Excellent");
  });

  it("should return Very Good for 70-79", () => {
    expect(getRemarkForAverage(79)).toBe("Very Good");
    expect(getRemarkForAverage(75)).toBe("Very Good");
    expect(getRemarkForAverage(70)).toBe("Very Good");
  });

  it("should return Good for 60-69", () => {
    expect(getRemarkForAverage(69)).toBe("Good");
    expect(getRemarkForAverage(65)).toBe("Good");
    expect(getRemarkForAverage(60)).toBe("Good");
  });

  it("should return Satisfactory for 50-59", () => {
    expect(getRemarkForAverage(59)).toBe("Satisfactory");
    expect(getRemarkForAverage(55)).toBe("Satisfactory");
    expect(getRemarkForAverage(50)).toBe("Satisfactory");
  });

  it("should return Weak for 40-49", () => {
    expect(getRemarkForAverage(49)).toBe("Weak");
    expect(getRemarkForAverage(45)).toBe("Weak");
    expect(getRemarkForAverage(40)).toBe("Weak");
  });

  it("should return Very Weak for below 40", () => {
    expect(getRemarkForAverage(39)).toBe("Very Weak");
    expect(getRemarkForAverage(20)).toBe("Very Weak");
    expect(getRemarkForAverage(0)).toBe("Very Weak");
  });
});

describe("calculatePosition", () => {
  it("should rank students by average correctly", () => {
    const students = [
      { id: "1", name: "Alice", scores: { math: 90, english: 85 }, average: 87.5 },
      { id: "2", name: "Bob", scores: { math: 80, english: 75 }, average: 77.5 },
      { id: "3", name: "Charlie", scores: { math: 95, english: 90 }, average: 92.5 },
    ];

    expect(calculatePosition("1", students as any)).toBe(2); // Alice is 2nd
    expect(calculatePosition("2", students as any)).toBe(3); // Bob is 3rd
    expect(calculatePosition("3", students as any)).toBe(1); // Charlie is 1st
  });

  it("should handle ties correctly (same rank)", () => {
    const students = [
      { id: "1", name: "Alice", scores: { math: 80 }, average: 80 },
      { id: "2", name: "Bob", scores: { math: 80 }, average: 80 },
      { id: "3", name: "Charlie", scores: { math: 90 }, average: 90 },
    ];

    expect(calculatePosition("1", students as any)).toBe(2);
    expect(calculatePosition("2", students as any)).toBe(2);
    expect(calculatePosition("3", students as any)).toBe(1);
  });

  it("should return 1 for single student", () => {
    const students = [{ id: "1", name: "Alice", scores: { math: 80 }, average: 80 }];
    expect(calculatePosition("1", students as any)).toBe(1);
  });

  it("should return 0 for student not found", () => {
    const students = [{ id: "1", name: "Alice", scores: { math: 80 }, average: 80 }];
    expect(calculatePosition("999", students as any)).toBe(0);
  });

  it("should handle students with 0 average", () => {
    const students = [
      { id: "1", name: "Alice", scores: {}, average: 0 },
      { id: "2", name: "Bob", scores: { math: 50 }, average: 50 },
    ];

    expect(calculatePosition("1", students as any)).toBe(2);
    expect(calculatePosition("2", students as any)).toBe(1);
  });
});
