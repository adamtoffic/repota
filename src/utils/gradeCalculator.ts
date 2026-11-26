import type {
  Grade,
  SchoolLevel,
  SchoolSettings,
  SavedSubject,
  ProcessedSubject,
  StudentRecord,
  ProcessedStudent,
} from "../types";
import { isStudentPending } from "./studentValidation";

/**
 * Maps a weighted 0–100 subject total to the GES grade and remark for `level`.
 *
 * - `KG`: `GOLD` / `SILVER` / `BRONZE`
 * - `PRIMARY`: `1`–`5`
 * - `JHS`: `1`–`9`
 * - `SHS`: `A1`–`F9`
 *
 * Unknown levels fall back to `{ grade: "F9", remark: "Invalid Level" }`.
 */
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

type CoreSlot = "english" | "math" | "science" | "social";

const getCoreSubjectSlot = (name: string, level: SchoolLevel): CoreSlot | null => {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (level !== "PRIMARY" && level !== "JHS" && level !== "SHS") return null;

  if (n.includes("english") && !n.includes("literature")) {
    return "english";
  }

  if (level === "SHS") {
    if ((n.includes("math") && n.includes("core")) || n === "mathematics" || n === "maths") {
      return "math";
    }
    if (n.includes("science") && n.includes("integrated")) {
      return "science";
    }
    if (n.includes("social") && !n.includes("science")) {
      return "social";
    }
    return null;
  }

  if (
    n.includes("math") &&
    !n.includes("elective") &&
    !n.includes("additional") &&
    !n.includes("further") &&
    !n.includes("business")
  ) {
    return "math";
  }

  if (
    n.includes("science") &&
    !n.includes("computer") &&
    !n.includes("agricultural") &&
    !n.includes("agric") &&
    !n.includes("home") &&
    !n.includes("social")
  ) {
    return "science";
  }

  if (level === "JHS" && n.includes("social") && !n.includes("science")) {
    return "social";
  }

  return null;
};

/**
 * Identifies GES core subjects using level-specific rules while excluding elective lookalikes
 * such as `"Literature in English"`, `"Computer Science"`, `"Agricultural Science"`, and
 * `"Additional/Elective Mathematics"`.
 */
export const isCoreSubject = (name: string, level: SchoolLevel): boolean =>
  getCoreSubjectSlot(name, level) !== null;

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

/**
 * Computes the strict 6-subject GES aggregate score (lower is better) for a processed subject list:
 * - `KG`, fewer than 6 subjects, or missing required core/elective slots: `null`
 * - `PRIMARY`: 3 cores (English, Math, Science) + best 3 electives
 * - `JHS`: 4 cores (English, Math, Science, Social Studies) + best 2 electives
 * - `SHS`: English + Core Math + best 1 of (Integrated Science, Social Studies) + best 3 electives
 */
const calculateAggregate = (subjects: ProcessedSubject[], level: SchoolLevel): number | null => {
  if (level === "KG" || subjects.length < 6) return null;

  const byGrade = (a: ProcessedSubject, b: ProcessedSubject) =>
    gradeToNumber(a.grade) - gradeToNumber(b.grade);

  const coreBySlot = new Map<CoreSlot, ProcessedSubject>();
  const electives: ProcessedSubject[] = [];

  for (const sub of subjects) {
    const slot = getCoreSubjectSlot(sub.name, level);
    if (slot) {
      const existing = coreBySlot.get(slot);
      if (!existing || gradeToNumber(sub.grade) < gradeToNumber(existing.grade)) {
        coreBySlot.set(slot, sub);
      }
    } else {
      electives.push(sub);
    }
  }

  electives.sort(byGrade);

  if (level === "PRIMARY") {
    const requiredCores: CoreSlot[] = ["english", "math", "science"];
    if (requiredCores.some((slot) => !coreBySlot.has(slot)) || electives.length < 3) return null;
    const coreSum = requiredCores.reduce(
      (sum, slot) => sum + gradeToNumber(coreBySlot.get(slot)!.grade),
      0,
    );
    const electiveSum = electives.slice(0, 3).reduce((sum, s) => sum + gradeToNumber(s.grade), 0);
    return coreSum + electiveSum;
  }

  if (level === "JHS") {
    const requiredCores: CoreSlot[] = ["english", "math", "science", "social"];
    if (requiredCores.some((slot) => !coreBySlot.has(slot)) || electives.length < 2) return null;
    const coreSum = requiredCores.reduce(
      (sum, slot) => sum + gradeToNumber(coreBySlot.get(slot)!.grade),
      0,
    );
    const electiveSum = electives.slice(0, 2).reduce((sum, s) => sum + gradeToNumber(s.grade), 0);
    return coreSum + electiveSum;
  }

  if (level === "SHS") {
    const english = coreBySlot.get("english");
    const math = coreBySlot.get("math");
    const thirdCandidates = [coreBySlot.get("science"), coreBySlot.get("social")].filter(
      (s): s is ProcessedSubject => Boolean(s),
    );
    if (!english || !math || thirdCandidates.length === 0 || electives.length < 3) {
      return null;
    }
    thirdCandidates.sort(byGrade);
    const coreSum =
      gradeToNumber(english.grade) +
      gradeToNumber(math.grade) +
      gradeToNumber(thirdCandidates[0].grade);
    const electiveSum = electives.slice(0, 3).reduce((sum, s) => sum + gradeToNumber(s.grade), 0);
    return coreSum + electiveSum;
  }

  return null;
};

/**
 * Computes exact birthday-adjusted age in whole years from an ISO/parseable `dateOfBirth`,
 * returning `undefined` when missing or unparseable.
 */
export function calculateAgeFromDob(
  dateOfBirth?: string,
  referenceDate: Date = new Date(),
): number | undefined {
  if (!dateOfBirth) return undefined;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return undefined;
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const m = referenceDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Enriches a raw `StudentRecord` with per-subject totals/grades, rounded 2-decimal `averageScore`,
 * computed `aggregate`, and `age` derived from `dateOfBirth` against today's date.
 * Initializes `classPosition` to `"pending..."` until `assignPositions` runs across the class.
 */
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
  const age = calculateAgeFromDob(student.dateOfBirth) ?? 0;
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

/**
 * Returns a new array preserving input roll order with `classPosition` ordinals populated
 * from descending `averageScore` using standard competition tie-breaking (`1st`, `1st`, `3rd`).
 * Incomplete/pending students (when `settings` is provided) or zero-scored students receive `"Pending..."`.
 * Does not mutate or reorder the input array.
 */
export const assignPositions = (
  students: ProcessedStudent[],
  settings?: Pick<SchoolSettings, "defaultSubjects" | "examType">,
): ProcessedStudent[] => {
  const isEligible = (student: ProcessedStudent): boolean =>
    settings ? !isStudentPending(student, settings) : student.subjects.length > 0 && student.totalScore > 0;

  const sortedScores = students
    .filter(isEligible)
    .map((s) => s.averageScore)
    .sort((a, b) => b - a);
  const ordinalByScore = new Map<number, string>();

  for (let index = 0; index < sortedScores.length; index++) {
    const score = sortedScores[index];
    if (!ordinalByScore.has(score)) {
      ordinalByScore.set(score, getOrdinalSuffix(index + 1));
    }
  }

  return students.map((student) => ({
    ...student,
    classPosition: isEligible(student)
      ? (ordinalByScore.get(student.averageScore) ?? "Pending...")
      : "Pending...",
  }));
};

const getOrdinalSuffix = (i: number): string => {
  const j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
};

// ✅ NEW: Helper to calculate Subject Positions
/**
 * Returns a new student array with `subjectPosition` ordinals populated per subject
 * from `totalScore` across scored students (`totalScore > 0`), using competition tie-breaking (`1st`, `1st`, `3rd`).
 * Unscored (`0`) subjects leave `subjectPosition` `undefined`.
 */
export const assignSubjectPositions = (students: ProcessedStudent[]): ProcessedStudent[] => {
  const scoresBySubject = new Map<string, number[]>();
  const subjectKey = (name: string) => name.trim().toLowerCase();

  for (const student of students) {
    for (const sub of student.subjects) {
      if (sub.totalScore <= 0) continue;
      const key = subjectKey(sub.name);
      let scores = scoresBySubject.get(key);
      if (!scores) {
        scores = [];
        scoresBySubject.set(key, scores);
      }
      scores.push(sub.totalScore);
    }
  }

  const ordinalsBySubject = new Map<string, Map<number, string>>();
  for (const [key, scores] of scoresBySubject) {
    scores.sort((a, b) => b - a);
    const rankMap = new Map<number, string>();
    for (let index = 0; index < scores.length; index++) {
      const score = scores[index];
      if (!rankMap.has(score)) {
        rankMap.set(score, getOrdinalSuffix(index + 1));
      }
    }
    ordinalsBySubject.set(key, rankMap);
  }

  return students.map((student) => ({
    ...student,
    subjects: student.subjects.map((sub) => ({
      ...sub,
      subjectPosition:
        sub.totalScore > 0 ? ordinalsBySubject.get(subjectKey(sub.name))?.get(sub.totalScore) : undefined,
    })),
  }));
};
