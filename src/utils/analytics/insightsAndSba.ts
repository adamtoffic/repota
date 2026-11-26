import type { SchoolSettings, StudentRecord } from "../../types";
import { isCoreSubject, processStudent } from "../gradeCalculator";
import { resolveExamRawScore } from "../scoreConversion";
import { toProcessedStudent } from "./coreMetrics";

// Calculate at-risk students (low attendance + low performance)
export function calculateAtRiskStudents(
  students: StudentRecord[],
  settings: SchoolSettings,
): Array<{
  id: string;
  name: string;
  averageScore: number;
  attendanceRate: number;
  attendanceRecorded: boolean;
  riskFactors: string[];
}> {
  const totalDays = settings.totalAttendanceDays || 70;

  return students
    .map((student) => {
      const processed = toProcessedStudent(student, settings.level);
      const attendanceRecorded =
        student.attendancePresent !== undefined &&
        student.attendancePresent !== null &&
        totalDays > 0;
      const attendanceRate = attendanceRecorded
        ? Math.round(((student.attendancePresent || 0) / totalDays) * 100)
        : 0;

      const riskFactors: string[] = [];

      if (processed.averageScore < 40) riskFactors.push("Failing");
      else if (processed.averageScore < 50) riskFactors.push("Below Pass");

      if (attendanceRecorded) {
        if (attendanceRate < 70) riskFactors.push("Poor Attendance");
        else if (attendanceRate < 80) riskFactors.push("Low Attendance");
      }

      // Check if failing multiple subjects
      const failedSubjects = student.subjects.filter((s) => s.classScore + s.examScore < 50).length;
      if (failedSubjects >= 3) riskFactors.push(`${failedSubjects} Failed Subjects`);

      return {
        id: student.id,
        name: student.name,
        averageScore: processed.averageScore,
        attendanceRate,
        attendanceRecorded,
        riskFactors,
      };
    })
    .filter((student) => student.riskFactors.length > 0)
    .sort((a, b) => b.riskFactors.length - a.riskFactors.length || a.averageScore - b.averageScore);
}

// Calculate subject variance (consistency)
export function calculateSubjectVariance(
  students: StudentRecord[],
  _settings: SchoolSettings, // eslint-disable-line @typescript-eslint/no-unused-vars
): Array<{
  subject: string;
  variance: number;
  stdDev: number;
  consistency: "High" | "Medium" | "Low";
}> {
  if (students.length === 0) return [];

  const subjectScores = new Map<string, number[]>();

  students.forEach((student) => {
    student.subjects.forEach((subject) => {
      const totalScore = subject.classScore + subject.examScore;
      if (!subjectScores.has(subject.name)) {
        subjectScores.set(subject.name, []);
      }
      subjectScores.get(subject.name)!.push(totalScore);
    });
  });

  return Array.from(subjectScores.entries())
    .map(([subject, scores]) => {
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      let consistency: "High" | "Medium" | "Low";
      if (stdDev < 10) consistency = "High";
      else if (stdDev < 20) consistency = "Medium";
      else consistency = "Low";

      return {
        subject,
        variance: Math.round(variance * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        consistency,
      };
    })
    .sort((a, b) => b.stdDev - a.stdDev);
}

/**
 * Separates students with at least one recorded score from ungraded students so mid-term
 * analytics aren't skewed by 0-score placeholders.
 */
export function partitionGradedStudents<T extends StudentRecord>(students: T[]): {
  graded: T[];
  ungraded: T[];
} {
  const graded: T[] = [];
  const ungraded: T[] = [];
  for (const student of students) {
    const hasScore = student.subjects.some((s) => s.classScore > 0 || s.examScore > 0);
    if (hasScore) graded.push(student);
    else ungraded.push(student);
  }
  return { graded, ungraded };
}

export interface SbaVsExamDiscrepancy {
  id: string;
  name: string;
  sbaPercent: number;
  examPercent: number;
  gap: number; // sbaPercent - examPercent
  pattern: "EXAM_UNDERPERFORMER" | "LOW_CLASSWORK";
}

export interface SbaVsExamAnalysis {
  available: boolean;
  classSbaAvgPercent: number;
  classExamAvgPercent: number;
  examUnderperformers: SbaVsExamDiscrepancy[];
  lowClassworkStudents: SbaVsExamDiscrepancy[];
  subjectBreakdown: Array<{
    subject: string;
    sbaPercent: number;
    examPercent: number;
    gap: number;
  }>;
}

/**
 * Compares normalized SBA (classScore %) vs Exam (examScore %) per student and per subject.
 */
export function calculateSbaVsExamAnalysis(
  students: StudentRecord[],
  settings: SchoolSettings,
): SbaVsExamAnalysis {
  if (
    students.length === 0 ||
    settings.examType === "MOCK" ||
    settings.classScoreMax <= 0 ||
    settings.examScoreMax <= 0
  ) {
    return {
      available: false,
      classSbaAvgPercent: 0,
      classExamAvgPercent: 0,
      examUnderperformers: [],
      lowClassworkStudents: [],
      subjectBreakdown: [],
    };
  }

  const examUnderperformers: SbaVsExamDiscrepancy[] = [];
  const lowClassworkStudents: SbaVsExamDiscrepancy[] = [];
  const subjectTotals = new Map<string, { sbaSum: number; examSum: number; count: number }>();

  let totalSba = 0;
  let totalExam = 0;
  let studentWithScoresCount = 0;

  for (const student of students) {
    const scoredSubs = student.subjects.filter((s) => s.classScore > 0 && s.examScore > 0);
    if (scoredSubs.length === 0) continue;

    let stuSbaSum = 0;
    let stuExamSum = 0;
    for (const sub of scoredSubs) {
      const sbaPct = (sub.classScore / settings.classScoreMax) * 100;
      const examPct =
        resolveExamRawScore(sub, settings.examScoreMax) ??
        (sub.examScore / settings.examScoreMax) * 100;
      stuSbaSum += sbaPct;
      stuExamSum += examPct;

      const entry = subjectTotals.get(sub.name) ?? { sbaSum: 0, examSum: 0, count: 0 };
      entry.sbaSum += sbaPct;
      entry.examSum += examPct;
      entry.count += 1;
      subjectTotals.set(sub.name, entry);
    }

    const sbaPercent = Math.round((stuSbaSum / scoredSubs.length) * 10) / 10;
    const examPercent = Math.round((stuExamSum / scoredSubs.length) * 10) / 10;
    const gap = Math.round((sbaPercent - examPercent) * 10) / 10;

    totalSba += sbaPercent;
    totalExam += examPercent;
    studentWithScoresCount += 1;

    if (sbaPercent >= 65 && gap >= 18) {
      examUnderperformers.push({
        id: student.id,
        name: student.name,
        sbaPercent,
        examPercent,
        gap,
        pattern: "EXAM_UNDERPERFORMER",
      });
    } else if (examPercent >= 65 && -gap >= 18) {
      lowClassworkStudents.push({
        id: student.id,
        name: student.name,
        sbaPercent,
        examPercent,
        gap,
        pattern: "LOW_CLASSWORK",
      });
    }
  }

  const subjectBreakdown = Array.from(subjectTotals.entries())
    .map(([subject, data]) => {
      const sbaPercent = Math.round((data.sbaSum / data.count) * 10) / 10;
      const examPercent = Math.round((data.examSum / data.count) * 10) / 10;
      return {
        subject,
        sbaPercent,
        examPercent,
        gap: Math.round((sbaPercent - examPercent) * 10) / 10,
      };
    })
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  return {
    available: studentWithScoresCount > 0,
    classSbaAvgPercent:
      studentWithScoresCount > 0
        ? Math.round((totalSba / studentWithScoresCount) * 10) / 10
        : 0,
    classExamAvgPercent:
      studentWithScoresCount > 0
        ? Math.round((totalExam / studentWithScoresCount) * 10) / 10
        : 0,
    examUnderperformers: examUnderperformers.sort((a, b) => b.gap - a.gap),
    lowClassworkStudents: lowClassworkStudents.sort((a, b) => a.gap - b.gap),
    subjectBreakdown,
  };
}

export interface SbaCategoryMastery {
  category: string;
  label: string;
  averagePercent: number;
  entryCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  CAT: "Class Tests (CAT)",
  GROUP: "Group Work",
  PROJECT: "Projects",
  HOMEWORK: "Homework",
  OTHER: "Other SBA Tasks",
};

/**
 * Aggregates recorded (`score > 0`) SBA component scores by assessment category,
 * ignoring unentered/unstarted `0` tasks so mid-term progress doesn't drag averages down.
 */
export function calculateSbaCategoryMastery(students: StudentRecord[]): SbaCategoryMastery[] {
  const map = new Map<string, { pctSum: number; count: number }>();

  for (const student of students) {
    for (const sub of student.subjects) {
      for (const comp of sub.classScoreComponents ?? []) {
        if (comp.maxScore <= 0 || comp.score <= 0) continue;
        const cat = comp.category || "OTHER";
        const pct = (comp.score / comp.maxScore) * 100;
        const cur = map.get(cat) ?? { pctSum: 0, count: 0 };
        cur.pctSum += pct;
        cur.count += 1;
        map.set(cat, cur);
      }
    }
  }

  return Array.from(map.entries())
    .map(([category, data]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      averagePercent: Math.round((data.pctSum / data.count) * 10) / 10,
      entryCount: data.count,
    }))
    .sort((a, b) => b.averagePercent - a.averagePercent);
}

export interface BorderlineStudent {
  id: string;
  name: string;
  averageScore: number;
  distanceToPass: number; // positive means below 50, <= 0 means narrowly above 50
  weakestSubjects: Array<{ name: string; score: number }>;
}

/**
 * Identifies students sitting right around the 50% pass threshold (42% - 54.9%)
 * where targeted coaching gives the highest pass-rate improvement.
 */
export function calculateBorderlineStudents(
  students: StudentRecord[],
  settings: SchoolSettings,
): BorderlineStudent[] {
  return students
    .map((student) => {
      const processed = toProcessedStudent(student, settings.level);
      const weakestSubjects = [...processed.subjects]
        .sort((a, b) => a.totalScore - b.totalScore)
        .slice(0, 2)
        .map((s) => ({ name: s.name, score: s.totalScore }));
      return {
        id: student.id,
        name: student.name,
        averageScore: processed.averageScore,
        distanceToPass: Math.round((50 - processed.averageScore) * 10) / 10,
        weakestSubjects,
      };
    })
    .filter((s) => s.averageScore >= 42 && s.averageScore < 55)
    .sort((a, b) => Math.abs(a.distanceToPass) - Math.abs(b.distanceToPass));
}

export interface CoreVsElectiveStats {
  coreAverage: number;
  corePassRate: number;
  electiveAverage: number;
  electivePassRate: number;
  aggregateBands: Array<{ band: string; count: number; percentage: number }>;
}

export function calculateCoreVsElectiveStats(
  students: StudentRecord[],
  settings: SchoolSettings,
): CoreVsElectiveStats {
  const coreScores: number[] = [];
  const electiveScores: number[] = [];
  const aggregates: number[] = [];

  for (const student of students) {
    const processed = processStudent(student, settings.level);
    if (processed.aggregate !== null) aggregates.push(processed.aggregate);
    for (const sub of processed.subjects) {
      if (isCoreSubject(sub.name, settings.level)) coreScores.push(sub.totalScore);
      else electiveScores.push(sub.totalScore);
    }
  }

  const summarize = (scores: number[]) => {
    if (scores.length === 0) return { avg: 0, pass: 0 };
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const pass = Math.round((scores.filter((s) => s >= 50).length / scores.length) * 100);
    return { avg, pass };
  };

  const core = summarize(coreScores);
  const elective = summarize(electiveScores);

  const bands = [
    { band: "6–12 (Distinction)", min: 6, max: 12 },
    { band: "13–20 (Strong)", min: 13, max: 20 },
    { band: "21–28 (Borderline)", min: 21, max: 28 },
    { band: "29+ (Needs Support)", min: 29, max: 999 },
  ];

  const aggregateBands =
    aggregates.length > 0
      ? bands.map((b) => {
          const count = aggregates.filter((a) => a >= b.min && a <= b.max).length;
          return {
            band: b.band,
            count,
            percentage: Math.round((count / aggregates.length) * 100),
          };
        })
      : [];

  return {
    coreAverage: core.avg,
    corePassRate: core.pass,
    electiveAverage: elective.avg,
    electivePassRate: elective.pass,
    aggregateBands,
  };
}

export interface PrivateFeeSummary {
  trackedCount: number;
  paidCount: number;
  partPaidCount: number;
  owingCount: number;
  scholarshipCount: number;
  totalArrears: number;
  topOwingStudents: Array<{
    id: string;
    name: string;
    feeStatus?: string;
    feeArrears: number;
    guardianPhone?: string;
  }>;
}

export function calculatePrivateFeeSummary(students: StudentRecord[]): PrivateFeeSummary {
  let paidCount = 0;
  let partPaidCount = 0;
  let owingCount = 0;
  let scholarshipCount = 0;
  let totalArrears = 0;
  const owingList: PrivateFeeSummary["topOwingStudents"] = [];

  for (const s of students) {
    if (s.feeStatus === "PAID") paidCount++;
    else if (s.feeStatus === "PART_PAID") partPaidCount++;
    else if (s.feeStatus === "OWING") owingCount++;
    else if (s.feeStatus === "SCHOLARSHIP") scholarshipCount++;

    const arrears = s.feeArrears ?? 0;
    if (arrears > 0) {
      totalArrears += arrears;
      owingList.push({
        id: s.id,
        name: s.name,
        feeStatus: s.feeStatus,
        feeArrears: arrears,
        guardianPhone: s.guardianPhone,
      });
    } else if (s.feeStatus === "OWING" || s.feeStatus === "PART_PAID") {
      owingList.push({
        id: s.id,
        name: s.name,
        feeStatus: s.feeStatus,
        feeArrears: 0,
        guardianPhone: s.guardianPhone,
      });
    }
  }

  return {
    trackedCount: paidCount + partPaidCount + owingCount + scholarshipCount,
    paidCount,
    partPaidCount,
    owingCount,
    scholarshipCount,
    totalArrears: Math.round(totalArrears * 100) / 100,
    topOwingStudents: owingList.sort((a, b) => b.feeArrears - a.feeArrears),
  };
}
