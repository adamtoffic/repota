import type {
  Grade,
  SchoolLevel,
  SavedSubject,
  ProcessedSubject,
  StudentRecord,
  ProcessedStudent,
} from "../types";

export const calculateGrade = (
  total: number,
  level: SchoolLevel,
): { grade: Grade; remark: string } => {
  switch (level) {
    case "KG":
      return calculateKGGrade(total);
    case "PRIMARY":
      return calculatePrimaryGrade(total);
    case "JHS":
      return calculateJHSGrade(total);
    case "SHS":
      return calculateSHSGrade(total);
    default:
      return { grade: "F9" as Grade, remark: "Invalid Level" };
  }
};

const calculateKGGrade = (total: number): { grade: Grade; remark: string } => {
  if (total >= 80) return { grade: "GOLD", remark: "Independent Application" };
  if (total >= 60) return { grade: "SILVER", remark: "With Minimal Prompting" };
  return { grade: "BRONZE", remark: "With Guidance" };
};

const calculatePrimaryGrade = (total: number): { grade: Grade; remark: string } => {
  if (total >= 80) return { grade: 1, remark: "Advance" };
  if (total >= 75) return { grade: 2, remark: "Proficient" };
  if (total >= 70) return { grade: 3, remark: "Approaching Proficiency" };
  if (total >= 65) return { grade: 4, remark: "Developing" };
  return { grade: 5, remark: "Beginning" };
};

const calculateJHSGrade = (total: number): { grade: Grade; remark: string } => {
  if (total >= 90) return { grade: 1, remark: "Highest" };
  if (total >= 80) return { grade: 2, remark: "Higher" };
  if (total >= 70) return { grade: 3, remark: "High" };
  if (total >= 60) return { grade: 4, remark: "High Average" };
  if (total >= 55) return { grade: 5, remark: "Average" };
  if (total >= 50) return { grade: 6, remark: "Low Average" };
  if (total >= 40) return { grade: 7, remark: "Low" };
  if (total >= 35) return { grade: 8, remark: "Lower" };
  return { grade: 9, remark: "Lowest" };
};

const calculateSHSGrade = (total: number): { grade: Grade; remark: string } => {
  if (total >= 80) return { grade: "A1", remark: "Excellent" };
  if (total >= 75) return { grade: "B2", remark: "Very Good" };
  if (total >= 70) return { grade: "B3", remark: "Good" };
  if (total >= 65) return { grade: "C4", remark: "Credit" };
  if (total >= 60) return { grade: "C5", remark: "Credit" };
  if (total >= 55) return { grade: "C6", remark: "Credit" };
  if (total >= 50) return { grade: "D7", remark: "Pass" };
  if (total >= 45) return { grade: "E8", remark: "Pass" };
  return { grade: "F9", remark: "Fail" };
};

export const processStudent = (student: StudentRecord, level: SchoolLevel): ProcessedStudent => {
  let totalScore = 0;
  const ProcessedSubjects: ProcessedSubject[] = student.subjects.map((sub: SavedSubject) => {
    const total = sub.classScore + sub.examScore;
    totalScore += total;

    const { grade, remark } = calculateGrade(total, level);

    return {
      ...sub,
      totalScore: total,
      grade: grade as Grade,
      remark,
    };
  });

  const averageScore =
    ProcessedSubjects.length > 0
      ? parseFloat((totalScore / ProcessedSubjects.length).toFixed(2))
      : 0;

  let age = 0;
  if (student.dateOfBirth) {
    const birthDate = new Date(student.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }
  return {
    ...student,
    age,
    subjects: ProcessedSubjects,
    totalScore,
    averageScore,
    classPosition: "pending...",
  };
};

export const assignPositions = (students: ProcessedStudent[]): ProcessedStudent[] => {
  const sorted = [...students].sort((a, b) => b.averageScore - a.averageScore);

  return sorted.map((student, index) => {
    let rank = index + 1;
    if (index > 0 && student.averageScore === sorted[index - 1].averageScore) {
      rank = parseInt(sorted[index - 1].classPosition);
    }

    const position = getOrdinalSuffix(rank);
    return {
      ...student,
      classPosition: position,
    };
  });
};

const getOrdinalSuffix = (i: number): string => {
  const j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
};
