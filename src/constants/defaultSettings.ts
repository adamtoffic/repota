import { DEFAULT_SUBJECTS } from "./defaultSubjects";
import type { SchoolSettings } from "../types";

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: "My School Name",
  academicYear: "2025/2026",
  term: "First Term",
  level: "PRIMARY",
  defaultSubjects: DEFAULT_SUBJECTS["PRIMARY"],
  totalAttendanceDays: 70,
  classScoreMax: 50,
  examScoreMax: 50,
  classSize: 30,
  nextTermStarts: "",
  headTeacherName: "",
  classTeacherName: "",
  className: "",
  phoneNumber: "",
  address: "",
  email: "",
  schoolMotto: "",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
};
