// remarkGenerator.test.ts
import { describe, it, expect } from "vitest";
import { generateRemark } from "./remarkGenerator";

describe("generateRemark", () => {
  it("should generate excellent remark for high average", () => {
    const remark = generateRemark(95, "A", "Excellent");
    expect(remark).toContain("Excellent");
    expect(remark.length).toBeGreaterThan(50);
    expect(remark.length).toBeLessThan(200);
  });

  it("should generate very good remark for B grade", () => {
    const remark = generateRemark(75, "B", "Very Good");
    expect(remark).toContain("Very Good");
    expect(remark.length).toBeGreaterThan(50);
  });

  it("should generate good remark for C grade", () => {
    const remark = generateRemark(65, "C", "Good");
    expect(remark).toContain("Good");
    expect(remark.length).toBeGreaterThan(50);
  });

  it("should generate satisfactory remark for D grade", () => {
    const remark = generateRemark(55, "D", "Satisfactory");
    expect(remark).toContain("Satisfactory");
    expect(remark.length).toBeGreaterThan(50);
  });

  it("should generate weak remark for E grade", () => {
    const remark = generateRemark(45, "E", "Weak");
    expect(remark).toContain("Weak");
    expect(remark.length).toBeGreaterThan(50);
  });

  it("should generate very weak remark for F grade", () => {
    const remark = generateRemark(25, "F", "Very Weak");
    expect(remark).toContain("Very Weak");
    expect(remark.length).toBeGreaterThan(50);
  });

  it("should include grade in remark", () => {
    const remark = generateRemark(85, "A", "Excellent");
    expect(remark).toContain("A");
  });

  it("should include average in remark", () => {
    const remark = generateRemark(85.5, "A", "Excellent");
    expect(remark).toContain("85.5");
  });

  it("should be contextually appropriate", () => {
    const excellentRemark = generateRemark(90, "A", "Excellent");
    const weakRemark = generateRemark(45, "E", "Weak");

    // Excellent should encourage continuation
    expect(excellentRemark.toLowerCase()).toMatch(/excellent|outstanding|commend/);

    // Weak should encourage improvement
    expect(weakRemark.toLowerCase()).toMatch(/improve|work harder|effort/);
  });

  it("should generate different remarks for same input (randomness)", () => {
    const remarks = new Set();
    for (let i = 0; i < 10; i++) {
      remarks.add(generateRemark(85, "A", "Excellent"));
    }
    // Should have some variety (at least 2 different remarks out of 10)
    expect(remarks.size).toBeGreaterThanOrEqual(2);
  });
});
