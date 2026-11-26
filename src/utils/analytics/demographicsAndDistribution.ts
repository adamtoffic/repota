import type { Grade, SchoolLevel, SchoolSettings, StudentRecord } from "../../types";
import { calculateAgeFromDob, calculateGrade } from "../gradeCalculator";
import {
  calculateSubjectPerformance,
  toProcessedStudent,
  type DemographicBreakdown,
  type SubjectPerformance,
  type TopPerformer,
} from "./coreMetrics";

// Calculate age distribution
export function calculateAgeDistribution(students: StudentRecord[]): DemographicBreakdown[] {
  const ageMap = new Map<string, StudentRecord[]>();

  students.forEach((student) => {
    const age = calculateAgeFromDob(student.dateOfBirth);
    if (age === undefined) return;

    const ageRange = `${Math.floor(age / 2) * 2}-${Math.floor(age / 2) * 2 + 1} years`;
    if (!ageMap.has(ageRange)) {
      ageMap.set(ageRange, []);
    }
    ageMap.get(ageRange)!.push(student);
  });

  const breakdown: DemographicBreakdown[] = [];

  ageMap.forEach((ageStudents, ageRange) => {
    const males = ageStudents.filter((s) => s.gender === "Male");
    const females = ageStudents.filter((s) => s.gender === "Female");

    breakdown.push({
      category: ageRange,
      male: males.length,
      female: females.length,
      total: ageStudents.length,
      maleAvgScore: 0,
      femaleAvgScore: 0,
    });
  });

  return breakdown.sort((a, b) => {
    const aAge = parseInt(a.category.split("-")[0]);
    const bAge = parseInt(b.category.split("-")[0]);
    return aAge - bAge;
  });
}

// Calculate subject-by-subject comparison for gender performance
export function calculateSubjectGenderComparison(
  students: StudentRecord[],
  _settings: SchoolSettings, // eslint-disable-line @typescript-eslint/no-unused-vars
): Array<{ subject: string; maleAvg: number; femaleAvg: number; gap: number }> {
  const subjectMap = new Map<string, { maleScores: number[]; femaleScores: number[] }>();

  students.forEach((student) => {
    student.subjects.forEach((subject) => {
      if (!subjectMap.has(subject.name)) {
        subjectMap.set(subject.name, { maleScores: [], femaleScores: [] });
      }
      const totalScore = subject.classScore + subject.examScore;
      if (student.gender === "Male") {
        subjectMap.get(subject.name)!.maleScores.push(totalScore);
      } else if (student.gender === "Female") {
        subjectMap.get(subject.name)!.femaleScores.push(totalScore);
      }
    });
  });

  const comparison = Array.from(subjectMap.entries())
    .filter(([, scores]) => scores.maleScores.length > 0 && scores.femaleScores.length > 0)
    .map(([subject, scores]) => {
      const maleAvg =
        scores.maleScores.reduce((sum, s) => sum + s, 0) / scores.maleScores.length;
      const femaleAvg =
        scores.femaleScores.reduce((sum, s) => sum + s, 0) / scores.femaleScores.length;

      return {
        subject,
        maleAvg: Math.round(maleAvg * 10) / 10,
        femaleAvg: Math.round(femaleAvg * 10) / 10,
        gap: Math.round((maleAvg - femaleAvg) * 10) / 10,
      };
    });

  return comparison.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}

// Calculate weakest and strongest subjects for the class
export function calculateSubjectInsights(
  students: StudentRecord[],
  settings: SchoolSettings,
): {
  weakest: SubjectPerformance[];
  strongest: SubjectPerformance[];
  needsAttention: SubjectPerformance[];
} {
  const subjectPerformance = calculateSubjectPerformance(students, settings);

  return {
    weakest: subjectPerformance.slice(-3).reverse(),
    strongest: subjectPerformance.slice(0, 3),
    needsAttention: subjectPerformance.filter((s) => s.passRate < 60),
  };
}

// Calculate student performance quartiles
export function calculatePerformanceQuartiles(
  students: StudentRecord[],
  settings: SchoolSettings,
): {
  q1: number;
  q2: number;
  q3: number;
  q4Count: number;
  strugglingStudents: TopPerformer[];
} {
  if (students.length === 0) {
    return { q1: 0, q2: 0, q3: 0, q4Count: 0, strugglingStudents: [] };
  }

  const processed = students
    .map((s) => toProcessedStudent(s, settings.level))
    .sort((a, b) => a.averageScore - b.averageScore);

  const q1Index = Math.floor(processed.length * 0.25);
  const q2Index = Math.floor(processed.length * 0.5);
  const q3Index = Math.floor(processed.length * 0.75);

  const strugglingSource =
    processed.length >= 4
      ? processed.slice(0, Math.max(1, q1Index))
      : processed.filter((student) => student.averageScore < 50);

  const strugglingStudents = strugglingSource.map((student) => ({
    id: student.id,
    name: student.name,
    averageScore: student.averageScore,
    totalScore: student.totalScore,
    gender: student.gender,
  }));

  return {
    q1: processed[q1Index]?.averageScore || 0,
    q2: processed[q2Index]?.averageScore || 0,
    q3: processed[q3Index]?.averageScore || 0,
    q4Count: processed.length - q3Index,
    strugglingStudents,
  };
}

// Calculate grade distribution
export function calculateGradeDistribution(
  students: StudentRecord[],
  settings: SchoolSettings,
): Array<{ grade: string; count: number; percentage: number }> {
  if (students.length === 0) return [];

  const gradeMap = new Map<string, number>();
  const processed = students.map((s) => toProcessedStudent(s, settings.level));

  // Define grade order based on school level
  const gradeOrder: Record<SchoolLevel, Grade[]> = {
    KG: ["GOLD", "SILVER", "BRONZE"],
    PRIMARY: [1, 2, 3, 4, 5],
    JHS: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    SHS: ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"],
  };

  // Group students by their actual grade based on average score
  processed.forEach((student) => {
    const gradeResult = calculateGrade(student.averageScore, settings.level);
    const grade = String(gradeResult.grade);
    gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
  });

  // Create distribution array in proper order
  const orderedGrades = gradeOrder[settings.level];
  const distribution = orderedGrades
    .map((grade) => {
      const gradeKey = String(grade);
      const count = gradeMap.get(gradeKey) || 0;
      return {
        grade: gradeKey,
        count,
        percentage: Math.round((count / students.length) * 100),
      };
    })
    .filter((item) => item.count > 0); // Only include grades that have students

  return distribution;
}

// Calculate attendance insights
export function calculateAttendanceInsights(
  students: StudentRecord[],
  settings: SchoolSettings,
): {
  averageAttendance: number;
  perfectAttendance: number;
  poorAttendance: number;
  correlationWithPerformance: "positive" | "negative" | "neutral";
  correlationCoefficient: number;
} {
  const studentsWithAttendance = students.filter((s) => s.attendancePresent !== undefined);

  if (studentsWithAttendance.length === 0 || !settings.totalAttendanceDays) {
    return {
      averageAttendance: 0,
      perfectAttendance: 0,
      poorAttendance: 0,
      correlationWithPerformance: "neutral",
      correlationCoefficient: 0,
    };
  }

  const totalDays = settings.totalAttendanceDays;
  const avgAttendance =
    studentsWithAttendance.reduce((sum, s) => sum + (s.attendancePresent || 0), 0) /
    studentsWithAttendance.length;

  const perfectCount = studentsWithAttendance.filter(
    (s) => s.attendancePresent === totalDays,
  ).length;
  const poorCount = studentsWithAttendance.filter(
    (s) => (s.attendancePresent || 0) < totalDays * 0.7,
  ).length;

  // Calculate Pearson correlation coefficient (r in [-1, 1])
  const processed = studentsWithAttendance.map((s) => ({
    attendance: (s.attendancePresent || 0) / totalDays,
    score: toProcessedStudent(s, settings.level).averageScore,
  }));

  const avgAttendanceRatio = avgAttendance / totalDays;
  const avgScore = processed.reduce((sum, s) => sum + s.score, 0) / processed.length;

  let numerator = 0;
  let sumSqAtt = 0;
  let sumSqScore = 0;
  for (const item of processed) {
    const dx = item.attendance - avgAttendanceRatio;
    const dy = item.score - avgScore;
    numerator += dx * dy;
    sumSqAtt += dx * dx;
    sumSqScore += dy * dy;
  }

  const denominator = Math.sqrt(sumSqAtt * sumSqScore);
  const r = denominator > 0 ? numerator / denominator : 0;
  const correlation = r >= 0.25 ? "positive" : r <= -0.25 ? "negative" : "neutral";

  return {
    averageAttendance: Math.round(avgAttendance * 10) / 10,
    perfectAttendance: perfectCount,
    poorAttendance: poorCount,
    correlationWithPerformance: correlation,
    correlationCoefficient: Math.round(r * 100) / 100,
  };
}

// Calculate performance by age groups
export function calculatePerformanceByAge(
  students: StudentRecord[],
  settings: SchoolSettings,
): Array<{
  ageRange: string;
  avgScore: number;
  count: number;
  topScore: number;
  lowScore: number;
}> {
  const studentsWithAge = students.filter((s) => s.dateOfBirth);

  if (studentsWithAge.length === 0) return [];

  const ageGroups = new Map<string, number[]>();

  studentsWithAge.forEach((student) => {
    const age = calculateAgeFromDob(student.dateOfBirth);
    if (age === undefined) return;
    const processed = toProcessedStudent(student, settings.level);

    let ageRange: string;
    if (age <= 5) ageRange = "≤ 5 years";
    else if (age <= 8) ageRange = "6-8 years";
    else if (age <= 11) ageRange = "9-11 years";
    else if (age <= 14) ageRange = "12-14 years";
    else if (age <= 17) ageRange = "15-17 years";
    else ageRange = "18+ years";

    if (!ageGroups.has(ageRange)) {
      ageGroups.set(ageRange, []);
    }
    ageGroups.get(ageRange)!.push(processed.averageScore);
  });

  return Array.from(ageGroups.entries())
    .map(([ageRange, scores]) => ({
      ageRange,
      avgScore: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10,
      count: scores.length,
      topScore: Math.max(...scores),
      lowScore: Math.min(...scores),
    }))
    .sort((a, b) => {
      const order = [
        "≤ 5 years",
        "6-8 years",
        "9-11 years",
        "12-14 years",
        "15-17 years",
        "18+ years",
      ];
      return order.indexOf(a.ageRange) - order.indexOf(b.ageRange);
    });
}

// Calculate attendance rate breakdown for demographics
export function calculateAttendanceByGender(
  students: StudentRecord[],
  settings: SchoolSettings,
): {
  maleAttendanceRate: number;
  femaleAttendanceRate: number;
  attendanceRanges: Array<{
    range: string;
    maleCount: number;
    femaleCount: number;
    total: number;
  }>;
} {
  const totalDays = settings.totalAttendanceDays || 70;
  const studentsWithAttendance = students.filter((s) => s.attendancePresent !== undefined);

  if (studentsWithAttendance.length === 0) {
    return {
      maleAttendanceRate: 0,
      femaleAttendanceRate: 0,
      attendanceRanges: [],
    };
  }

  const maleStudents = studentsWithAttendance.filter((s) => s.gender === "Male");
  const femaleStudents = studentsWithAttendance.filter((s) => s.gender === "Female");

  const calcRate = (studentList: StudentRecord[]) => {
    if (studentList.length === 0) return 0;
    const avg =
      studentList.reduce((sum, s) => sum + (s.attendancePresent || 0), 0) / studentList.length;
    return Math.round((avg / totalDays) * 100 * 10) / 10;
  };

  const ranges = [
    { range: "90-100%", min: 0.9, max: Infinity },
    { range: "80-89%", min: 0.8, max: 0.9 },
    { range: "70-79%", min: 0.7, max: 0.8 },
    { range: "Below 70%", min: -Infinity, max: 0.7 },
  ];

  const attendanceRanges = ranges.map(({ range, min, max }) => {
    const maleCount = maleStudents.filter((s) => {
      const ratio = (s.attendancePresent || 0) / totalDays;
      return ratio >= min && ratio < max;
    }).length;
    const femaleCount = femaleStudents.filter((s) => {
      const ratio = (s.attendancePresent || 0) / totalDays;
      return ratio >= min && ratio < max;
    }).length;

    return {
      range,
      maleCount,
      femaleCount,
      total: maleCount + femaleCount,
    };
  });

  return {
    maleAttendanceRate: calcRate(maleStudents),
    femaleAttendanceRate: calcRate(femaleStudents),
    attendanceRanges,
  };
}
