import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import type { SchoolSettings, StudentRecord } from "../types";
import {
  calculateAtRiskStudents,
  calculateAttendanceInsights,
  calculateBorderlineStudents,
  calculateClassMetrics,
  calculateCoreVsElectiveStats,
  calculateGenderAnalysis,
  calculatePerformanceQuartiles,
  calculatePrivateFeeSummary,
  calculateSbaCategoryMastery,
  calculateSbaVsExamAnalysis,
  calculateScoreDistribution,
  calculateSubjectPerformance,
  calculateSubjectVariance,
  partitionGradedStudents,
} from "../utils/analyticsCalculator";

const settings: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  level: "JHS",
  totalAttendanceDays: 80,
};

function makeStudent(
  id: string,
  name: string,
  scores: Array<[string, number, number]>,
  opts?: { gender?: "Male" | "Female"; attendancePresent?: number },
): StudentRecord {
  return {
    id,
    name,
    className: "JHS 2",
    gender: opts?.gender,
    attendancePresent: opts?.attendancePresent,
    subjects: scores.map(([subName, cls, exam], idx) => ({
      id: `${id}-${idx}`,
      name: subName,
      classScore: cls,
      examScore: exam,
    })),
  };
}

describe("analyticsCalculator", () => {
  it("handles empty classes gracefully without NaN values", () => {
    expect(calculateClassMetrics([], settings)).toEqual({
      totalStudents: 0,
      averageScore: 0,
      medianScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      excellenceRate: 0,
      averageAttendance: 0,
    });
    expect(calculateSubjectPerformance([], settings)).toEqual([]);
    expect(calculateScoreDistribution([], settings)).toEqual([]);
    expect(calculateAtRiskStudents([], settings)).toEqual([]);
    expect(calculateSubjectVariance([], settings)).toEqual([]);
    expect(calculatePerformanceQuartiles([], settings)).toEqual({
      q1: 0,
      q2: 0,
      q3: 0,
      q4Count: 0,
      strugglingStudents: [],
    });
  });

  it("computes accurate class metrics including even-count medians and attendance averages", () => {
    const classStudents: StudentRecord[] = [
      makeStudent(
        "s1",
        "Ama",
        [
          ["Math", 45, 45], // 90
          ["English", 40, 40], // 80 -> avg 85
        ],
        { gender: "Female", attendancePresent: 78 },
      ),
      makeStudent(
        "s2",
        "Kofi",
        [
          ["Math", 30, 30], // 60
          ["English", 35, 35], // 70 -> avg 65
        ],
        { gender: "Male", attendancePresent: 70 },
      ),
      makeStudent(
        "s3",
        "Yaa",
        [
          ["Math", 25, 25], // 50
          ["English", 30, 30], // 60 -> avg 55
        ],
        { gender: "Female" }, // undefined attendance should not skew denominator
      ),
      makeStudent(
        "s4",
        "Kwame",
        [
          ["Math", 15, 20], // 35
          ["English", 20, 20], // 40 -> avg 37.5
        ],
        { gender: "Male", attendancePresent: 40 },
      ),
    ];

    const metrics = calculateClassMetrics(classStudents, settings);
    expect(metrics.totalStudents).toBe(4);
    // Averages sorted: [37.5, 55, 65, 85] -> median = (55 + 65) / 2 = 60, mean = 60.625 -> 60.6
    expect(metrics.medianScore).toBe(60);
    expect(metrics.averageScore).toBe(60.6);
    expect(metrics.highestScore).toBe(85);
    expect(metrics.lowestScore).toBe(37.5);
    expect(metrics.passRate).toBe(75); // 3/4 >= 50
    expect(metrics.excellenceRate).toBe(25); // 1/4 >= 80
    // Attendance average across the 3 defined records: (78 + 70 + 40) / 3 = 62.7
    expect(metrics.averageAttendance).toBe(62.7);

    const genderStats = calculateGenderAnalysis(classStudents, settings);
    expect(genderStats).toEqual({
      maleCount: 2,
      femaleCount: 2,
      maleAverage: 51.3, // (65 + 37.5) / 2 = 51.25 -> 51.3
      femaleAverage: 70, // (85 + 55) / 2
      totalCount: 4,
    });
  });

  it("ranks at-risk students by factor count and detects subject variance consistency", () => {
    const students: StudentRecord[] = [
      makeStudent(
        "high-risk",
        "At Risk Student",
        [
          ["Math", 10, 20], // 30
          ["English", 15, 15], // 30
          ["Science", 18, 18], // 36
        ],
        { attendancePresent: 40 }, // 50% attendance (< 70%)
      ),
      makeStudent(
        "safe",
        "Top Student",
        [
          ["Math", 45, 45], // 90
          ["English", 42, 42], // 84
          ["Science", 40, 40], // 80
        ],
        { attendancePresent: 78 },
      ),
    ];

    const atRisk = calculateAtRiskStudents(students, settings);
    expect(atRisk).toHaveLength(1);
    expect(atRisk[0]).toMatchObject({
      id: "high-risk",
      name: "At Risk Student",
      riskFactors: ["Failing", "Poor Attendance", "3 Failed Subjects"],
    });

    const subjectPerf = calculateSubjectPerformance(students, settings);
    expect(subjectPerf.map((s) => s.subjectName)).toEqual(["Math", "Science", "English"]);

    const variance = calculateSubjectVariance(students, settings);
    expect(variance).toHaveLength(3);
    expect(variance[0].consistency).toBe("Low"); // Math spread 30 vs 90 -> stdDev 30
  });

  it("does not flag unrecorded attendance as Poor Attendance and computes Pearson r", () => {
    const students: StudentRecord[] = [
      makeStudent("s1", "No Att Pass", [["Math", 40, 40]]),
      makeStudent("s2", "Att High", [["Math", 45, 45]], { attendancePresent: 78 }),
      makeStudent("s3", "Att Low", [["Math", 20, 20]], { attendancePresent: 35 }),
    ];

    const atRisk = calculateAtRiskStudents(students, settings);
    const noAtt = atRisk.find((s) => s.id === "s1");
    expect(noAtt).toBeUndefined();

    const attInsights = calculateAttendanceInsights(students, settings);
    expect(attInsights.correlationWithPerformance).toBe("positive");
    expect(attInsights.correlationCoefficient).toBe(1);
  });

  it("partitions graded vs ungraded students and detects SBA-vs-Exam & borderline cohorts", () => {
    const classList: StudentRecord[] = [
      {
        id: "u1",
        name: "Ungraded",
        className: "JHS 2",
        gender: "Male",
        subjects: [{ id: "su1", name: "Mathematics", classScore: 0, examScore: 0 }],
      },
      {
        id: "b1",
        name: "Borderline",
        className: "JHS 2",
        gender: "Female",
        subjects: [
          { id: "sb1", name: "Mathematics", classScore: 22, examScore: 25 }, // 47
          { id: "sb2", name: "English Language", classScore: 24, examScore: 26 }, // 50 -> avg 48.5
        ],
      },
      {
        id: "e1",
        name: "Exam Anxious",
        className: "JHS 2",
        gender: "Male",
        subjects: [
          {
            id: "se1",
            name: "Mathematics",
            classScore: 45, // 90% SBA
            examScore: 20, // 40% Exam -> gap 50%
            classScoreComponents: [
              { id: "c1", name: "CAT 1", score: 18, maxScore: 20, category: "CAT" },
              { id: "c2", name: "Project", score: 27, maxScore: 30, category: "PROJECT" },
            ],
          },
        ],
      },
    ];

    const { graded, ungraded } = partitionGradedStudents(classList);
    expect(graded).toHaveLength(2);
    expect(ungraded).toHaveLength(1);

    const sbaExam = calculateSbaVsExamAnalysis(graded, settings);
    expect(sbaExam.available).toBe(true);
    expect(sbaExam.examUnderperformers.map((s) => s.name)).toEqual(["Exam Anxious"]);

    const mastery = calculateSbaCategoryMastery(graded);
    expect(mastery.map((m) => m.category)).toEqual(["CAT", "PROJECT"]);
    expect(mastery[0].averagePercent).toBe(90);

    const borderline = calculateBorderlineStudents(graded, settings);
    expect(borderline.map((s) => s.name)).toEqual(["Borderline"]);

    const coreElective = calculateCoreVsElectiveStats(graded, settings);
    expect(coreElective.coreAverage).toBeGreaterThan(0);
    expect(coreElective.aggregateBands.length).toBeGreaterThan(0);
  });

  it("skips ungraded (score === 0) SBA components in calculateSbaCategoryMastery", () => {
    const midTermStudent: StudentRecord = {
      id: "mid-1",
      name: "Kojo Antwi",
      className: "JHS 2",
      gender: "Male",
      subjects: [
        {
          id: "sub-math",
          name: "Mathematics",
          classScore: 10,
          examScore: 0,
          classScoreComponents: [
            { id: "c1", name: "CAT 1", score: 12, maxScore: 15, category: "CAT" },
            { id: "c2", name: "CAT 2", score: 0, maxScore: 15, category: "CAT" },
            { id: "p1", name: "Project", score: 0, maxScore: 15, category: "PROJECT" },
          ],
        },
      ],
    };

    const { graded } = partitionGradedStudents([midTermStudent]);
    const mastery = calculateSbaCategoryMastery(graded);
    // Only CAT 1 (12/15 = 80%) is graded; ungraded CAT 2 (0) and Project (0) must be skipped
    expect(mastery.map((m) => m.category)).toEqual(["CAT"]);
    expect(mastery[0].averagePercent).toBe(80);
  });

  it("summarizes private school fee statuses and arrears", () => {
    const privateStudents: StudentRecord[] = [
      { ...makeStudent("p1", "Paid Stu", [["Math", 40, 40]]), feeStatus: "PAID" },
      {
        ...makeStudent("p2", "Owing Stu", [["Math", 30, 30]]),
        feeStatus: "OWING",
        feeArrears: 320,
        guardianPhone: "0240000000",
      },
    ];
    const summary = calculatePrivateFeeSummary(privateStudents);
    expect(summary.paidCount).toBe(1);
    expect(summary.owingCount).toBe(1);
    expect(summary.totalArrears).toBe(320);
    expect(summary.topOwingStudents[0].name).toBe("Owing Stu");
  });
});
