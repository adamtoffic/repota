// src/utils/analyticsCalculator.ts
import type { StudentRecord, SchoolSettings, Grade, SchoolLevel } from "../types";
import { processStudent, assignPositions, calculateGrade } from "./gradeCalculator";

export interface SubjectPerformance {
  subjectName: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number; // percentage of students passing (>= 50%)
  studentCount: number;
}

export interface DemographicBreakdown {
  category: string;
  male: number;
  female: number;
  total: number;
  maleAvgScore: number;
  femaleAvgScore: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface ClassPerformanceMetrics {
  totalStudents: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  excellenceRate: number; // >= 80%
  averageAttendance: number;
}

export interface GenderAnalysis {
  maleCount: number;
  femaleCount: number;
  maleAverage: number;
  femaleAverage: number;
  totalCount: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  averageScore: number;
  totalScore: number;
  gender?: string;
}

// Calculate overall class performance metrics
export function calculateClassMetrics(
  students: StudentRecord[],
  settings: SchoolSettings,
): ClassPerformanceMetrics {
  if (students.length === 0) {
    return {
      totalStudents: 0,
      averageScore: 0,
      medianScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      excellenceRate: 0,
      averageAttendance: 0,
    };
  }

  const processed = assignPositions(students.map((s) => processStudent(s, settings.level)));
  const scores = processed.map((s) => s.averageScore).sort((a, b) => a - b);

  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = totalScore / scores.length;

  const medianScore =
    scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];

  const passCount = scores.filter((score) => score >= 50).length;
  const excellenceCount = scores.filter((score) => score >= 80).length;

  const attendanceData = students.filter((s) => s.attendancePresent !== undefined);
  const averageAttendance =
    attendanceData.length > 0
      ? attendanceData.reduce((sum, s) => sum + (s.attendancePresent || 0), 0) /
        attendanceData.length
      : 0;

  return {
    totalStudents: students.length,
    averageScore: Math.round(averageScore * 10) / 10,
    medianScore: Math.round(medianScore * 10) / 10,
    highestScore: scores[scores.length - 1] || 0,
    lowestScore: scores[0] || 0,
    passRate: Math.round((passCount / scores.length) * 100),
    excellenceRate: Math.round((excellenceCount / scores.length) * 100),
    averageAttendance: Math.round(averageAttendance * 10) / 10,
  };
}

// Calculate performance by subject
export function calculateSubjectPerformance(
  students: StudentRecord[],
  _settings: SchoolSettings, // eslint-disable-line @typescript-eslint/no-unused-vars
): SubjectPerformance[] {
  if (students.length === 0) return [];

  const subjectMap = new Map<string, number[]>();

  students.forEach((student) => {
    student.subjects.forEach((subject) => {
      const totalScore = subject.classScore + subject.examScore;
      if (!subjectMap.has(subject.name)) {
        subjectMap.set(subject.name, []);
      }
      subjectMap.get(subject.name)!.push(totalScore);
    });
  });

  const subjectPerformance: SubjectPerformance[] = [];

  subjectMap.forEach((scores, subjectName) => {
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passCount = scores.filter((score) => score >= 50).length;
    const passRate = (passCount / scores.length) * 100;

    subjectPerformance.push({
      subjectName,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore,
      lowestScore,
      passRate: Math.round(passRate),
      studentCount: scores.length,
    });
  });

  return subjectPerformance.sort((a, b) => b.averageScore - a.averageScore);
}

// Calculate score distribution
export function calculateScoreDistribution(
  students: StudentRecord[],
  settings: SchoolSettings,
): ScoreDistribution[] {
  if (students.length === 0) return [];

  const processed = students.map((s) => processStudent(s, settings.level));
  const ranges = [
    { range: "0-39 (Fail)", min: 0, max: 39 },
    { range: "40-49 (Pass)", min: 40, max: 49 },
    { range: "50-59 (Credit)", min: 50, max: 59 },
    { range: "60-69 (Good)", min: 60, max: 69 },
    { range: "70-79 (Very Good)", min: 70, max: 79 },
    { range: "80-100 (Excellent)", min: 80, max: 100 },
  ];

  return ranges.map(({ range, min, max }) => {
    const count = processed.filter((s) => s.averageScore >= min && s.averageScore <= max).length;
    return {
      range,
      count,
      percentage: Math.round((count / students.length) * 100),
    };
  });
}

// Calculate gender-based analysis
export function calculateGenderAnalysis(
  students: StudentRecord[],
  settings: SchoolSettings,
): GenderAnalysis {
  const maleStudents = students.filter((s) => s.gender === "Male");
  const femaleStudents = students.filter((s) => s.gender === "Female");

  const calculateAverage = (studentList: StudentRecord[]) => {
    if (studentList.length === 0) return 0;
    const processed = studentList.map((s) => processStudent(s, settings.level));
    const total = processed.reduce((sum, s) => sum + s.averageScore, 0);
    return Math.round((total / studentList.length) * 10) / 10;
  };

  return {
    maleCount: maleStudents.length,
    femaleCount: femaleStudents.length,
    maleAverage: calculateAverage(maleStudents),
    femaleAverage: calculateAverage(femaleStudents),
    totalCount: students.length,
  };
}

// Get top performers
export function getTopPerformers(
  students: StudentRecord[],
  settings: SchoolSettings,
  limit: number = 10,
): TopPerformer[] {
  if (students.length === 0) return [];

  const processed = assignPositions(students.map((s) => processStudent(s, settings.level)));

  return processed
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, limit)
    .map((student) => ({
      id: student.id,
      name: student.name,
      averageScore: student.averageScore,
      totalScore: student.totalScore,
      gender: student.gender,
    }));
}

// Calculate performance trend by class (if className is used for different classes)
export function calculateClassComparison(
  students: StudentRecord[],
  settings: SchoolSettings,
): DemographicBreakdown[] {
  const classMap = new Map<string, StudentRecord[]>();

  students.forEach((student) => {
    const className = student.className || "Unassigned";
    if (!classMap.has(className)) {
      classMap.set(className, []);
    }
    classMap.get(className)!.push(student);
  });

  const breakdown: DemographicBreakdown[] = [];

  classMap.forEach((classStudents, className) => {
    const males = classStudents.filter((s) => s.gender === "Male");
    const females = classStudents.filter((s) => s.gender === "Female");

    const calculateAvg = (list: StudentRecord[]) => {
      if (list.length === 0) return 0;
      const processed = list.map((s) => processStudent(s, settings.level));
      return (
        Math.round((processed.reduce((sum, s) => sum + s.averageScore, 0) / list.length) * 10) / 10
      );
    };

    breakdown.push({
      category: className,
      male: males.length,
      female: females.length,
      total: classStudents.length,
      maleAvgScore: calculateAvg(males),
      femaleAvgScore: calculateAvg(females),
    });
  });

  return breakdown.sort((a, b) => b.total - a.total);
}

// Calculate age distribution
export function calculateAgeDistribution(students: StudentRecord[]): DemographicBreakdown[] {
  const ageMap = new Map<string, StudentRecord[]>();

  students.forEach((student) => {
    if (!student.dateOfBirth) return;

    const birthDate = new Date(student.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

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

  const comparison = Array.from(subjectMap.entries()).map(([subject, scores]) => {
    const maleAvg =
      scores.maleScores.length > 0
        ? scores.maleScores.reduce((sum, s) => sum + s, 0) / scores.maleScores.length
        : 0;
    const femaleAvg =
      scores.femaleScores.length > 0
        ? scores.femaleScores.reduce((sum, s) => sum + s, 0) / scores.femaleScores.length
        : 0;

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
    .map((s) => processStudent(s, settings.level))
    .sort((a, b) => a.averageScore - b.averageScore);

  const q1Index = Math.floor(processed.length * 0.25);
  const q2Index = Math.floor(processed.length * 0.5);
  const q3Index = Math.floor(processed.length * 0.75);

  const strugglingStudents = processed
    .slice(0, Math.min(5, q1Index || processed.length))
    .map((student) => ({
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
  const processed = students.map((s) => processStudent(s, settings.level));

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
} {
  const studentsWithAttendance = students.filter((s) => s.attendancePresent !== undefined);

  if (studentsWithAttendance.length === 0 || !settings.totalAttendanceDays) {
    return {
      averageAttendance: 0,
      perfectAttendance: 0,
      poorAttendance: 0,
      correlationWithPerformance: "neutral",
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

  // Calculate correlation
  const processed = studentsWithAttendance.map((s) => ({
    attendance: (s.attendancePresent || 0) / totalDays,
    score: processStudent(s, settings.level).averageScore,
  }));

  const avgScore = processed.reduce((sum, s) => sum + s.score, 0) / processed.length;
  const covariance =
    processed.reduce(
      (sum, s) => sum + (s.attendance - avgAttendance / totalDays) * (s.score - avgScore),
      0,
    ) / processed.length;

  const correlation = covariance > 5 ? "positive" : covariance < -5 ? "negative" : "neutral";

  return {
    averageAttendance: Math.round(avgAttendance * 10) / 10,
    perfectAttendance: perfectCount,
    poorAttendance: poorCount,
    correlationWithPerformance: correlation,
  };
}

// Calculate at-risk students (low attendance + low performance)
export function calculateAtRiskStudents(
  students: StudentRecord[],
  settings: SchoolSettings,
): Array<{
  id: string;
  name: string;
  averageScore: number;
  attendanceRate: number;
  riskFactors: string[];
}> {
  const totalDays = settings.totalAttendanceDays || 70;

  return students
    .map((student) => {
      const processed = processStudent(student, settings.level);
      const attendanceRate = student.attendancePresent
        ? Math.round((student.attendancePresent / totalDays) * 100)
        : 0;

      const riskFactors: string[] = [];

      if (processed.averageScore < 40) riskFactors.push("Failing");
      else if (processed.averageScore < 50) riskFactors.push("Below Pass");

      if (attendanceRate < 70) riskFactors.push("Poor Attendance");
      else if (attendanceRate < 80) riskFactors.push("Low Attendance");

      // Check if failing multiple subjects
      const failedSubjects = student.subjects.filter((s) => s.classScore + s.examScore < 50).length;
      if (failedSubjects >= 3) riskFactors.push(`${failedSubjects} Failed Subjects`);

      return {
        id: student.id,
        name: student.name,
        averageScore: processed.averageScore,
        attendanceRate,
        riskFactors,
      };
    })
    .filter((student) => student.riskFactors.length > 0)
    .sort((a, b) => b.riskFactors.length - a.riskFactors.length || a.averageScore - b.averageScore);
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
    const age = new Date().getFullYear() - new Date(student.dateOfBirth!).getFullYear();
    const processed = processStudent(student, settings.level);

    let ageRange = "";
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
    { range: "90-100%", min: 0.9, max: 1.0 },
    { range: "80-89%", min: 0.8, max: 0.89 },
    { range: "70-79%", min: 0.7, max: 0.79 },
    { range: "Below 70%", min: 0, max: 0.69 },
  ];

  const attendanceRanges = ranges.map(({ range, min, max }) => {
    const maleCount = maleStudents.filter(
      (s) =>
        (s.attendancePresent || 0) / totalDays >= min &&
        (s.attendancePresent || 0) / totalDays <= max,
    ).length;
    const femaleCount = femaleStudents.filter(
      (s) =>
        (s.attendancePresent || 0) / totalDays >= min &&
        (s.attendancePresent || 0) / totalDays <= max,
    ).length;

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
