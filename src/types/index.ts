export type SchoolLevel = "KG" | "PRIMARY" | "JHS" | "SHS";

export type SHSGrade = "A1" | "B2" | "B3" | "C4" | "C5" | "C6" | "D7" | "E8" | "F9";
export type JHSGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type KGGrade = "GOLD" | "SILVER" | "BRONZE";
export type PRIMARYGrade = 1 | 2 | 3 | 4 | 5;

export type TermSystem = "First Term" | "Second Term" | "Third Term";
export type SemesterSystem = "First Semester" | "Second Semester";
export type AcademicPeriod = TermSystem | SemesterSystem;

export type Grade = KGGrade | PRIMARYGrade | JHSGrade | SHSGrade;

export interface SavedSubject {
  id: string;
  name: string;
  classScore: number;
  examScore: number;
}

export interface StudentRecord {
  id: string;
  name: string;
  className: string;
  dateOfBirth?: string;
  attendancePresent?: number;
  teacherRemark?: string;
  conduct?: string;
  interest?: string;
  pictureUrl?: string;
  promotionStatus?: string;

  subjects: SavedSubject[];
}

export interface SchoolSettings {
  schoolName: string;
  className?: string;
  schoolMotto?: string;
  phoneNumber?: string;
  address?: string;
  email?: string;
  logoUrl?: string;

  academicYear: string;
  term: AcademicPeriod;
  level: SchoolLevel;
  schoolType: "STANDARD" | "ISLAMIC";
  nextTermStarts?: string;
  headTeacherName?: string;
  classTeacherName?: string;
  totalAttendanceDays?: number;
  classScoreMax: number;
  examScoreMax: number;

  headTeacherSignature?: string;
  teacherSignature?: string;

  defaultSubjects: string[];
}

export interface ProcessedSubject extends SavedSubject {
  totalScore: number;
  grade: Grade;
  remark: string;
}

export interface ProcessedStudent extends Omit<StudentRecord, "subjects"> {
  age: number;
  subjects: ProcessedSubject[];

  averageScore: number;
  totalScore: number;
  classPosition: string;
  teacherRemark?: string;
  aggregate: number | null;
}

export interface ReportExtras {
  attendancePresent?: number;
  attendanceTotal?: number;
  conduct?: string;
  teacherRemark?: string;
}
