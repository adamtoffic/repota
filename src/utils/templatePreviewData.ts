import type { ProcessedStudent, ProcessedSubject, SchoolSettings } from "../types";
import { calculateGrade } from "./gradeCalculator";

const SAMPLE_SUBJECTS: Array<{ id: string; name: string; rawClassPct: number; rawExamPct: number; pos: string }> = [
  { id: "prev-math", name: "Mathematics", rawClassPct: 90, rawExamPct: 90, pos: "1st" },
  { id: "prev-eng", name: "English Language", rawClassPct: 86, rawExamPct: 84, pos: "2nd" },
  { id: "prev-sci", name: "Integrated Science", rawClassPct: 88, rawExamPct: 86, pos: "2nd" },
  { id: "prev-soc", name: "Social Studies", rawClassPct: 82, rawExamPct: 80, pos: "3rd" },
  { id: "prev-comp", name: "Computing", rawClassPct: 90, rawExamPct: 87, pos: "1st" },
  { id: "prev-arts", name: "Creative Arts", rawClassPct: 84, rawExamPct: 82, pos: "4th" },
];

/**
 * Builds a synthetic, PII-free `ProcessedStudent` tailored to `settings.level`, `settings.examType`,
 * `settings.classScoreMax`, `settings.examScoreMax`, and `settings.className` for Settings previews.
 */
export function buildTemplatePreviewStudent(settings: SchoolSettings): ProcessedStudent {
  const isMock = settings.examType === "MOCK";
  const classMax = isMock ? 0 : settings.classScoreMax;
  const examMax = isMock ? 100 : settings.examScoreMax;

  const subjects: ProcessedSubject[] = SAMPLE_SUBJECTS.map((item) => {
    const classScore = isMock ? 0 : Math.round((item.rawClassPct * classMax) / 100);
    const examScore = Math.round((item.rawExamPct * examMax) / 100);
    const totalScore = classScore + examScore;
    const { grade, remark } = calculateGrade(totalScore, settings.level);

    return {
      id: item.id,
      name: item.name,
      classScore,
      examScore,
      totalScore,
      grade,
      remark,
      subjectPosition: item.pos,
    };
  });

  const totalScore = subjects.reduce((sum, s) => sum + s.totalScore, 0);
  const averageScore =
    subjects.length > 0 ? Math.round((totalScore / subjects.length) * 10) / 10 : 0;

  return {
    id: "template-preview-student",
    name: "Ama Mensah",
    className: settings.className?.trim() || "Basic 6",
    gender: "Female",
    age: 11,
    attendancePresent: 59,
    conduct: "Respectful & Attentive",
    interest: "Mathematics & Reading",
    teacherRemark: "Shows steady focus and participates well in class discussions.",
    promotionStatus: "Promoted to JHS 1",
    totalScore,
    averageScore,
    classPosition: "2nd",
    aggregate: settings.level === "KG" ? null : 7,
    subjects,
  };
}

/** Synthetic, PII-free sample student used solely to render scaled A4 template previews in Settings. */
export const TEMPLATE_PREVIEW_STUDENT: ProcessedStudent = {
  id: "template-preview-student",
  name: "Ama Mensah",
  className: "Basic 6",
  gender: "Female",
  age: 11,
  attendancePresent: 59,
  conduct: "Respectful & Attentive",
  interest: "Mathematics & Reading",
  teacherRemark: "Shows steady focus and participates well in class discussions.",
  promotionStatus: "Promoted to JHS 1",
  totalScore: 514,
  averageScore: 85.7,
  classPosition: "2nd",
  aggregate: 7,
  subjects: [
    {
      id: "prev-math",
      name: "Mathematics",
      classScore: 27,
      examScore: 63,
      totalScore: 90,
      grade: 1,
      remark: "Highest",
      subjectPosition: "1st",
    },
    {
      id: "prev-eng",
      name: "English Language",
      classScore: 26,
      examScore: 59,
      totalScore: 85,
      grade: 1,
      remark: "Highest",
      subjectPosition: "2nd",
    },
    {
      id: "prev-sci",
      name: "Integrated Science",
      classScore: 26,
      examScore: 61,
      totalScore: 87,
      grade: 1,
      remark: "Highest",
      subjectPosition: "2nd",
    },
    {
      id: "prev-soc",
      name: "Social Studies",
      classScore: 25,
      examScore: 56,
      totalScore: 81,
      grade: 2,
      remark: "Higher",
      subjectPosition: "3rd",
    },
    {
      id: "prev-comp",
      name: "Computing",
      classScore: 27,
      examScore: 61,
      totalScore: 88,
      grade: 1,
      remark: "Highest",
      subjectPosition: "1st",
    },
    {
      id: "prev-arts",
      name: "Creative Arts",
      classScore: 25,
      examScore: 58,
      totalScore: 83,
      grade: 2,
      remark: "Higher",
      subjectPosition: "4th",
    },
  ],
};

/**
 * Normalizes live `SchoolSettings` for miniature Settings previews so brand colors,
 * level, exam type, fees, and position toggles stay live while blank fields show clean metadata.
 */
export function buildTemplatePreviewSettings(settings: SchoolSettings): SchoolSettings {
  return {
    ...settings,
    schoolName: settings.schoolName?.trim() || "Repota Model School",
    schoolMotto: settings.schoolMotto?.trim() || "Excellence & Integrity",
    address: settings.address?.trim() || "P.O. Box 142, Accra",
    academicYear: settings.academicYear?.trim() || "2025/2026",
    term: settings.term || "Second Term",
    className: settings.className?.trim() || "Basic 6",
    classSize: settings.classSize || 34,
    totalAttendanceDays: settings.totalAttendanceDays || 62,
    showFeeSchedule: settings.schoolType === "PRIVATE" ? settings.showFeeSchedule : false,
  };
}
