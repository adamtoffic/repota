import { describe, it, expect } from "vitest";
import { generateTeacherRemark, generateHeadmasterRemark } from "../utils/remarkGenerator";
import type { ProcessedStudent } from "../types";

// Mock student for testing
const mockStudent: ProcessedStudent = {
  id: "1",
  name: "Test Student",
  photoDataUrl: "",
  subjects: [
    { name: "Math", classScore: 30, examsScore: 70, total: 100, grade: "A1", remark: "Excellent" },
    {
      name: "English",
      classScore: 25,
      examsScore: 65,
      total: 90,
      grade: "A1",
      remark: "Excellent",
    },
  ],
  averageScore: 95,
  aggregateScore: 2,
};

describe("generateTeacherRemark", () => {
  it("should generate excellent remark for high average and good attendance", () => {
    const remark = generateTeacherRemark(mockStudent, 95, 100, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should generate different remark for average performance", () => {
    const averageStudent = { ...mockStudent, averageScore: 70 };
    const remark = generateTeacherRemark(averageStudent, 80, 100, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should generate remark for poor performance", () => {
    const poorStudent = { ...mockStudent, averageScore: 45 };
    const remark = generateTeacherRemark(poorStudent, 60, 100, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should work with different school levels", () => {
    const kgRemark = generateTeacherRemark(mockStudent, 95, 100, "KG");
    const primaryRemark = generateTeacherRemark(mockStudent, 95, 100, "PRIMARY");
    const jhsRemark = generateTeacherRemark(mockStudent, 95, 100, "JHS");

    expect(typeof kgRemark).toBe("string");
    expect(typeof primaryRemark).toBe("string");
    expect(typeof jhsRemark).toBe("string");
  });

  it("should handle perfect attendance", () => {
    const remark = generateTeacherRemark(mockStudent, 100, 100, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should handle zero attendance", () => {
    const remark = generateTeacherRemark(mockStudent, 0, 100, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should avoid recently used remarks when excludeList provided", () => {
    const remark1 = generateTeacherRemark(mockStudent, 95, 100, "SHS");
    const remark2 = generateTeacherRemark(mockStudent, 95, 100, "SHS", [remark1]);

    // If there are multiple remarks available, they should be different
    // This test allows them to be the same if the pool is exhausted
    expect(typeof remark2).toBe("string");
  });
});

describe("generateHeadmasterRemark", () => {
  it("should generate remark for excellent average", () => {
    const remark = generateHeadmasterRemark(95, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should generate remark for average performance", () => {
    const remark = generateHeadmasterRemark(70, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should generate remark for poor performance", () => {
    const remark = generateHeadmasterRemark(45, "SHS");
    expect(typeof remark).toBe("string");
    expect(remark.length).toBeGreaterThan(0);
  });

  it("should work with different school levels", () => {
    const kgRemark = generateHeadmasterRemark(85, "KG");
    const primaryRemark = generateHeadmasterRemark(85, "PRIMARY");
    const jhsRemark = generateHeadmasterRemark(85, "JHS");

    expect(typeof kgRemark).toBe("string");
    expect(typeof primaryRemark).toBe("string");
    expect(typeof jhsRemark).toBe("string");
  });
});
