import type {
  ProcessedStudent,
  SchoolLevel,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import { assignPositions, processStudent } from "../gradeCalculator";

export function isProcessedStudent(
  student: StudentRecord | ProcessedStudent,
): student is ProcessedStudent {
  return (
    "averageScore" in student &&
    typeof student.averageScore === "number" &&
    "totalScore" in student &&
    typeof student.totalScore === "number" &&
    "subjects" in student &&
    student.subjects.every((sub) => "totalScore" in sub && typeof sub.totalScore === "number")
  );
}

export function toProcessedStudent(
  student: StudentRecord | ProcessedStudent,
  level: SchoolLevel,
): ProcessedStudent {
  return isProcessedStudent(student) ? student : processStudent(student, level);
}

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

  const processed = assignPositions(students.map((s) => toProcessedStudent(s, settings.level)));
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

// Calculate score distribution using half-open intervals so decimals (e.g. 79.5) are never dropped
export function calculateScoreDistribution(
  students: StudentRecord[],
  settings: SchoolSettings,
): ScoreDistribution[] {
  if (students.length === 0) return [];

  const processed = students.map((s) => toProcessedStudent(s, settings.level));
  const ranges = [
    { range: "0-39 (Fail)", min: -Infinity, max: 40 },
    { range: "40-49 (Pass)", min: 40, max: 50 },
    { range: "50-59 (Credit)", min: 50, max: 60 },
    { range: "60-69 (Good)", min: 60, max: 70 },
    { range: "70-79 (Very Good)", min: 70, max: 80 },
    { range: "80-100 (Excellent)", min: 80, max: Infinity },
  ];

  return ranges.map(({ range, min, max }) => {
    const count = processed.filter((s) => s.averageScore >= min && s.averageScore < max).length;
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
    const processed = studentList.map((s) => toProcessedStudent(s, settings.level));
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

  const processed = assignPositions(students.map((s) => toProcessedStudent(s, settings.level)));

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
      const processed = list.map((s) => toProcessedStudent(s, settings.level));
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
