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

const isCoreSubject = (name: string, level: SchoolLevel): boolean => {
  const n = name.toLowerCase();

  if (level === "PRIMARY") {
    return (
      n.includes("english") || n.includes("math") || n.includes("science") // Covers "Integrated Science" or just "Science"
    );
  }

  if (level === "JHS") {
    return (
      n.includes("english") || n.includes("math") || n.includes("science") || n.includes("social")
    );
  }

  if (level === "SHS") {
    // SHS Cores: Core Math, Int Science, English, Social
    return (
      (n.includes("math") && n.includes("core")) ||
      n.includes("english") ||
      (n.includes("science") && n.includes("integrated")) ||
      n.includes("social")
    );
  }

  return false; // Primary/KG don't use this logic
};

const gradeToNumber = (grade: Grade): number => {
  if (typeof grade === "number") return grade; // JHS/Primary (1-9)

  // SHS Conversion (WASSCE Standard)
  const map: Record<string, number> = {
    A1: 1,
    B2: 2,
    B3: 3,
    C4: 4,
    C5: 5,
    C6: 6,
    D7: 7,
    E8: 8,
    F9: 9,
  };
  return map[grade as string] || 9; // Default to 9 (Fail) if unknown
};

const calculateAggregate = (subjects: ProcessedSubject[], level: SchoolLevel): number | null => {
  // KG and Primary DO NOT use aggregate
  if (level === "KG") return null;

  // 1. Separate Cores and Electives
  const cores = subjects.filter((s) => isCoreSubject(s.name, level));
  const electives = subjects.filter((s) => !isCoreSubject(s.name, level));

  // Helper to sort by numeric grade (Ascending: 1 is best)
  const byGrade = (a: ProcessedSubject, b: ProcessedSubject) =>
    gradeToNumber(a.grade) - gradeToNumber(b.grade);

  let totalAggregate = 0;

  if (level === "PRIMARY") {
    // 1. Add specific Cores (English, Math, Science)
    // We filter to ensure we don't accidentally add "Social Studies" if it slipped into cores array
    const primaryCores = cores.filter((s) => {
      const n = s.name.toLowerCase();
      return n.includes("english") || n.includes("math") || n.includes("science");
    });

    primaryCores.forEach((sub) => (totalAggregate += gradeToNumber(sub.grade)));

    // 2. Add Best 3 Electives
    const bestElectives = electives.sort(byGrade).slice(0, 3);
    bestElectives.forEach((sub) => (totalAggregate += gradeToNumber(sub.grade)));

    // If student has absolutely no subjects, return null (hide aggregate)
    if (primaryCores.length === 0 && bestElectives.length === 0) return null;

    return totalAggregate;
  }

  // --- JHS ALGORITHM (Core 4 + Best 2) ---
  if (level === "JHS") {
    // We strictly need the 4 specific cores.
    // If they are missing, we can't calculate a valid aggregate (or we assume 9).
    // For v0.1, we'll just sum whatever cores exist + best electives.

    cores.forEach((sub) => (totalAggregate += gradeToNumber(sub.grade)));

    // Add Best 2 Electives
    const bestElectives = electives.sort(byGrade).slice(0, 2);
    bestElectives.forEach((sub) => (totalAggregate += gradeToNumber(sub.grade)));

    return totalAggregate;
  }

  // --- SHS ALGORITHM (Core 3 + Best 3) ---
  if (level === "SHS") {
    // 1. Mandatory: English + Math
    const english = cores.find((s) => s.name.toLowerCase().includes("english"));
    const math = cores.find((s) => s.name.toLowerCase().includes("math"));

    // 2. Best of Science vs Social
    const others = cores.filter((s) => s !== english && s !== math).sort(byGrade);
    const bestThirdCore = others[0];

    // Add Core Points
    if (english) totalAggregate += gradeToNumber(english.grade);
    if (math) totalAggregate += gradeToNumber(math.grade);
    if (bestThirdCore) totalAggregate += gradeToNumber(bestThirdCore.grade);

    // 3. Best 3 Electives
    const bestElectives = electives.sort(byGrade).slice(0, 3);
    bestElectives.forEach((sub) => (totalAggregate += gradeToNumber(sub.grade)));

    return totalAggregate;
  }

  return null;
};

export const processStudent = (student: StudentRecord, level: SchoolLevel): ProcessedStudent => {
  let totalScoreSum = 0;
  const subjectsSafe = student.subjects || [];
  const processedSubjects: ProcessedSubject[] = subjectsSafe.map((sub: SavedSubject) => {
    const total = (sub.classScore || 0) + (sub.examScore || 0);
    totalScoreSum += total;
    const result = calculateGrade(total, level);

    return {
      ...sub,
      totalScore: total,
      grade: result.grade as Grade,
      remark: result.remark,
    };
  });

  const averageScore =
    processedSubjects.length > 0
      ? parseFloat((totalScoreSum / processedSubjects.length).toFixed(2))
      : 0;

  const aggregate = calculateAggregate(processedSubjects, level);

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
    subjects: processedSubjects,
    totalScore: totalScoreSum,
    averageScore,
    aggregate,
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
