import type { SchoolSettings, StudentRecord } from "../types";
import {
  calculateAtRiskStudents,
  calculateAttendanceInsights,
  calculateBorderlineStudents,
  calculateClassMetrics,
  calculateCoreVsElectiveStats,
  calculateGenderAnalysis,
  calculatePrivateFeeSummary,
  calculateSbaCategoryMastery,
  calculateSbaVsExamAnalysis,
  calculateSubjectGenderComparison,
  calculateSubjectInsights,
  calculateSubjectVariance,
  partitionGradedStudents,
} from "./analyticsCalculator";

export interface ActionPlanItem {
  priority: "HIGH" | "MEDIUM" | "INFO";
  title: string;
  detail: string;
  targetSubject?: string;
}

export interface ClassStory {
  headline: string;
  narrativeParagraphs: string[];
  strengths: string[];
  watchouts: string[];
  actionPlan: ActionPlanItem[];
  plainTextBrief: string;
  gradedCount: number;
  ungradedCount: number;
}

/**
 * Generates an offline, teacher-ready narrative story and prioritized action plan
 * from class scores, SBA components, attendance, and demographics.
 */
export function generateClassStory(
  students: StudentRecord[],
  settings: SchoolSettings,
): ClassStory {
  const { graded, ungraded } = partitionGradedStudents(students);
  const analysisPool = graded.length > 0 ? graded : students;
  const classLabel = settings.className || "This class";

  if (analysisPool.length === 0) {
    return {
      headline: `${classLabel} has no recorded scores yet.`,
      narrativeParagraphs: [
        "Enter class and exam scores for at least one student to unlock the full class performance story and intervention plan.",
      ],
      strengths: [],
      watchouts: [],
      actionPlan: [],
      plainTextBrief: `${classLabel}: No scores entered yet.`,
      gradedCount: 0,
      ungradedCount: ungraded.length,
    };
  }

  const metrics = calculateClassMetrics(analysisPool, settings);
  const subjectInsights = calculateSubjectInsights(analysisPool, settings);
  const variance = calculateSubjectVariance(analysisPool, settings);
  const genderStats = calculateGenderAnalysis(analysisPool, settings);
  const subjectGender = calculateSubjectGenderComparison(analysisPool, settings);
  const attendance = calculateAttendanceInsights(analysisPool, settings);
  const atRisk = calculateAtRiskStudents(analysisPool, settings);
  const borderline = calculateBorderlineStudents(analysisPool, settings);
  const sbaExam = calculateSbaVsExamAnalysis(analysisPool, settings);
  const sbaMastery = calculateSbaCategoryMastery(analysisPool);
  const coreElective = calculateCoreVsElectiveStats(analysisPool, settings);
  const feeSummary = calculatePrivateFeeSummary(students);

  // 1. Headline
  const healthLabel =
    metrics.passRate >= 80 && metrics.averageScore >= 70
      ? "is performing strongly"
      : metrics.passRate >= 60
        ? "shows steady overall progress"
        : "needs targeted academic intervention";

  const topWeakSubject = subjectInsights.needsAttention[0] ?? subjectInsights.weakest[0];
  const headline = `${classLabel} (${graded.length} graded student${graded.length === 1 ? "" : "s"}) ${healthLabel} with a ${metrics.averageScore}% class average and ${metrics.passRate}% pass rate${
    topWeakSubject && topWeakSubject.averageScore < 60
      ? `, led by challenges in ${topWeakSubject.subjectName} (${topWeakSubject.averageScore}% avg)`
      : ""
  }.`;

  // 2. Narrative Paragraphs
  const narrativeParagraphs: string[] = [];

  // Paragraph 1: Score spread & Core vs Elective
  const spread = Math.round((metrics.highestScore - metrics.lowestScore) * 10) / 10;
  let p1 = `Scores range from ${metrics.lowestScore}% to ${metrics.highestScore}% (median ${metrics.medianScore}%, spread ${spread} pts), with ${metrics.excellenceRate}% of students achieving 80%+ excellence.`;
  if (coreElective.coreAverage > 0 && coreElective.electiveAverage > 0) {
    const coreDiff = Math.round((coreElective.coreAverage - coreElective.electiveAverage) * 10) / 10;
    p1 +=
      Math.abs(coreDiff) >= 5
        ? ` Core subjects average ${coreElective.coreAverage}% (${coreElective.corePassRate}% pass) compared to ${coreElective.electiveAverage}% in electives.`
        : ` Core subjects (${coreElective.coreAverage}%) and electives (${coreElective.electiveAverage}%) are tracking closely together.`;
  }
  narrativeParagraphs.push(p1);

  // Paragraph 2: SBA vs Exam + Category Mastery
  if (sbaExam.available) {
    const gap = Math.round((sbaExam.classSbaAvgPercent - sbaExam.classExamAvgPercent) * 10) / 10;
    let p2 = `Across SBA and Exams, classwork averages ${sbaExam.classSbaAvgPercent}% while exams average ${sbaExam.classExamAvgPercent}%.`;
    if (gap >= 10) {
      p2 += ` Students are noticeably stronger on continuous assessment than final exams (+${gap} pts SBA lead), suggesting exam-technique coaching or SBA moderation may help.`;
    } else if (gap <= -10) {
      p2 += ` Students outperformed their continuous assessment during final exams (+${Math.abs(gap)} pts exam lead), pointing to missed or incomplete classwork tasks.`;
    } else {
      p2 += ` Classwork and examination performance are well aligned.`;
    }
    if (sbaMastery.length >= 2) {
      const bestCat = sbaMastery[0];
      const lowCat = sbaMastery[sbaMastery.length - 1];
      if (bestCat.averagePercent - lowCat.averagePercent >= 8) {
        p2 += ` Within SBA tasks, ${bestCat.label} is strongest (${bestCat.averagePercent}%) while ${lowCat.label} trails (${lowCat.averagePercent}%).`;
      }
    }
    narrativeParagraphs.push(p2);
  }

  // Paragraph 3: Attendance & Equity
  const p3Parts: string[] = [];
  if (settings.totalAttendanceDays && attendance.averageAttendance > 0) {
    const attPct = Math.round((attendance.averageAttendance / settings.totalAttendanceDays) * 100);
    p3Parts.push(
      `Average attendance is ${attendance.averageAttendance}/${settings.totalAttendanceDays} days (${attPct}%), with ${attendance.correlationWithPerformance} correlation to marks (r = ${attendance.correlationCoefficient}).`,
    );
  }
  if (genderStats.maleCount > 0 && genderStats.femaleCount > 0) {
    const gap = Math.round((genderStats.maleAverage - genderStats.femaleAverage) * 10) / 10;
    if (Math.abs(gap) >= 4) {
      const leader = gap > 0 ? "Male" : "Female";
      p3Parts.push(
        `${leader} students currently lead overall by ${Math.abs(gap)} percentage points.`,
      );
    } else {
      p3Parts.push(`Male and female averages are balanced within ${Math.abs(gap)} percentage points.`);
    }
  }
  if (p3Parts.length > 0) {
    narrativeParagraphs.push(p3Parts.join(" "));
  }

  // 3. Strengths & Watchouts
  const strengths: string[] = [];
  if (subjectInsights.strongest.length > 0) {
    const top = subjectInsights.strongest[0];
    strengths.push(
      `Top subject: ${top.subjectName} (${top.averageScore}% avg, ${top.passRate}% pass rate).`,
    );
  }
  const consistentSubject = [...variance].sort((a, b) => a.stdDev - b.stdDev)[0];
  if (consistentSubject && consistentSubject.consistency === "High") {
    strengths.push(
      `High consistency in ${consistentSubject.subject} (SD ${consistentSubject.stdDev}) shows steady class-wide mastery.`,
    );
  }
  if (metrics.excellenceRate >= 25) {
    strengths.push(`${metrics.excellenceRate}% of the class achieved Distinction/Excellence (80%+).`);
  }
  if (attendance.perfectAttendance > 0) {
    strengths.push(`${attendance.perfectAttendance} student(s) maintained 100% attendance.`);
  }
  if (strengths.length === 0) {
    strengths.push(`Pass rate sits at ${metrics.passRate}% across ${graded.length} graded students.`);
  }

  const watchouts: string[] = [];
  if (subjectInsights.needsAttention.length > 0) {
    watchouts.push(
      `Low pass rate (<60%) in ${subjectInsights.needsAttention
        .slice(0, 3)
        .map((s) => `${s.subjectName} (${s.passRate}%)`)
        .join(", ")}.`,
    );
  }
  if (sbaExam.examUnderperformers.length > 0) {
    watchouts.push(
      `${sbaExam.examUnderperformers.length} student(s) scored 65%+ in SBA classwork but dropped 18+ pts in Exams.`,
    );
  }
  if (borderline.length > 0) {
    watchouts.push(
      `${borderline.length} borderline student(s) sit between 42% and 55% — high-ROI targets for extra coaching.`,
    );
  }
  if (atRisk.length > 0) {
    watchouts.push(`${atRisk.length} student(s) flagged with multiple risk factors.`);
  }
  const bigGenderSubject = subjectGender.find((item) => Math.abs(item.gap) >= 10);
  if (bigGenderSubject) {
    watchouts.push(
      `Notable gender gap in ${bigGenderSubject.subject}: Male ${bigGenderSubject.maleAvg}% vs Female ${bigGenderSubject.femaleAvg}%.`,
    );
  }
  if (settings.schoolType === "PRIVATE" && feeSummary.totalArrears > 0) {
    watchouts.push(
      `Outstanding fee arrears total GH₵${feeSummary.totalArrears.toFixed(2)} across ${feeSummary.topOwingStudents.length} student(s).`,
    );
  }

  // 4. Prioritized Action Plan
  const actionPlan: ActionPlanItem[] = [];

  if (borderline.length > 0) {
    const names = borderline
      .slice(0, 3)
      .map((s) => s.name)
      .join(", ");
    actionPlan.push({
      priority: "HIGH",
      title: `Coach ${borderline.length} borderline student${borderline.length === 1 ? "" : "s"} (42%–54%)`,
      detail: `Focus quick revision on ${names}${borderline.length > 3 ? ` +${borderline.length - 3} more` : ""} to lift the class pass rate immediately.`,
    });
  }

  if (subjectInsights.needsAttention.length > 0) {
    const target = subjectInsights.needsAttention[0];
    actionPlan.push({
      priority: "HIGH",
      title: `Schedule remedial review for ${target.subjectName}`,
      detail: `${target.subjectName} has a ${target.passRate}% pass rate (${target.averageScore}% avg). Revisit core topics before next assessment.`,
      targetSubject: target.subjectName,
    });
  }

  if (sbaExam.examUnderperformers.length > 0) {
    actionPlan.push({
      priority: "MEDIUM",
      title: `Run timed exam practice for ${sbaExam.examUnderperformers.length} SBA-strong student(s)`,
      detail: `${sbaExam.examUnderperformers
        .slice(0, 3)
        .map((s) => s.name)
        .join(", ")} performed well in continuous assessment but underperformed in exams.`,
    });
  }

  if (attendance.poorAttendance > 0) {
    actionPlan.push({
      priority: "MEDIUM",
      title: `Follow up on ${attendance.poorAttendance} low-attendance learner(s)`,
      detail: `Students attending below 70% of term days risk falling behind; contact guardians early.`,
    });
  }

  if (ungraded.length > 0) {
    actionPlan.push({
      priority: "INFO",
      title: `Complete score entry for ${ungraded.length} ungraded student(s)`,
      detail: `${ungraded.length} student(s) currently have no recorded scores and were excluded from class averages.`,
    });
  }

  if (actionPlan.length === 0) {
    actionPlan.push({
      priority: "INFO",
      title: "Maintain momentum & stretch top performers",
      detail:
        "No urgent academic bottlenecks detected. Consider enrichment tasks for top-quartile students.",
    });
  }

  const plainTextBrief = [
    `${settings.schoolName} — ${classLabel} (${settings.term}, ${settings.academicYear})`,
    `HEADLINE: ${headline}`,
    "",
    ...narrativeParagraphs,
    "",
    "STRENGTHS:",
    ...strengths.map((s) => `• ${s}`),
    ...(watchouts.length > 0 ? ["", "WATCHOUTS:", ...watchouts.map((w) => `• ${w}`)] : []),
    "",
    "NEXT-WEEK ACTION PLAN:",
    ...actionPlan.map((a, idx) => `${idx + 1}. [${a.priority}] ${a.title} — ${a.detail}`),
  ].join("\n");

  return {
    headline,
    narrativeParagraphs,
    strengths,
    watchouts,
    actionPlan,
    plainTextBrief,
    gradedCount: graded.length,
    ungradedCount: ungraded.length,
  };
}
