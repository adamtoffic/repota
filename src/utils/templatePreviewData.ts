import type { ProcessedStudent, SchoolSettings } from "../types";

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
 * level, exam type, and position toggles stay live while blank fields show clean sample metadata.
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
    showFeeSchedule: false,
  };
}
