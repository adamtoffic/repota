export type SchoolLevel = "KG" | "PRIMARY" | "JHS" | "SHS";
export type ExamType = "TERMLY" | "MOCK";

export type SHSGrade = "A1" | "B2" | "B3" | "C4" | "C5" | "C6" | "D7" | "E8" | "F9";
export type JHSGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type KGGrade = "GOLD" | "SILVER" | "BRONZE";
export type PRIMARYGrade = 1 | 2 | 3 | 4 | 5;

export type TermSystem = "First Term" | "Second Term" | "Third Term";
export type SemesterSystem = "First Semester" | "Second Semester";
export type AcademicPeriod = TermSystem | SemesterSystem;

export type Grade = KGGrade | PRIMARYGrade | JHSGrade | SHSGrade;

export type PrintMode = "color" | "bw";

export interface ClassScoreComponent {
  id: string;
  name: string;
  score: number;
  maxScore: number; // Maximum possible score for this component
  category?: AssessmentCategory;
}

export type AssessmentCategory = "CAT" | "GROUP" | "PROJECT" | "HOMEWORK";

export interface ClassScoreComponentConfig {
  name: string;
  maxScore: number;
  category?: AssessmentCategory;
}

export interface SavedSubject {
  id: string;
  name: string;
  classScore: number;
  examScore: number;
  classScoreComponents?: ClassScoreComponent[]; // Optional breakdown of class score - subject-specific!
}

export type FeeStatus = "PAID" | "PART_PAID" | "OWING" | "SCHOLARSHIP";

export interface PrivateFeeItem {
  id: string;
  label: string;
  amount: number;
  cycle: string; // e.g. "Per Term", "Daily", "Per Month"
  enabled: boolean;
}

export interface StudentRecord {
  id: string;
  name: string;
  className: string;
  dateOfBirth?: string;
  gender: "Male" | "Female"; // Required field
  attendancePresent?: number;
  teacherRemark?: string;
  conduct?: string;
  interest?: string;
  pictureUrl?: string;
  promotionStatus?: string;

  // Optional Private School / Admin Tracking Fields
  admissionNumber?: string;
  feeStatus?: FeeStatus;
  feeArrears?: number;
  guardianPhone?: string;

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
  schoolType: "STANDARD" | "ISLAMIC" | "PRIVATE";
  nextTermStarts?: string;
  headTeacherName?: string;
  classTeacherName?: string;
  totalAttendanceDays?: number;
  classScoreMax: number;
  examScoreMax: number;
  classSize?: number;

  headTeacherSignature?: string;
  teacherSignature?: string;

  defaultSubjects: string[];

  // Component library - templates that can be added to individual subjects
  componentLibrary?: ClassScoreComponentConfig[];

  // Subject-component mapping - which components each subject uses
  subjectComponentMap?: Record<string, ClassScoreComponentConfig[]>;

  // Private school fees (legacy fields kept for backward compatibility)
  schoolGift?: number; // Termly school fees
  canteenFees?: number; // Daily canteen fees
  firstAidFees?: number; // Termly first aid fees

  // Customizable 3-slot private school items & toggles
  privateFeeItems?: PrivateFeeItem[];
  showFeeSchedule?: boolean;
  feePaymentNote?: string;
  showStudentFeeArrearsOnReport?: boolean;

  // Report Card Display & Brand Customization
  templateId?: string; // ID of the selected report template
  showClassPosition?: boolean; // Toggle overall class rank on report cards (default: true)
  showSubjectPosition?: boolean; // Toggle per-subject rank column on report cards (default: true)
  useCustomTemplateColor?: boolean; // Apply school's custom colors to templates
  primaryColor?: string; // Hex color e.g. #1e3a8a
  accentColor?: string; // Hex accent color e.g. #fcd34d

  examType?: ExamType; // Whether this is a standard termly exam or a mock exam

  // Security settings
  autoLockTimeout?: number; // Minutes of inactivity before auto-lock (default: 5)
}

export interface ProcessedSubject extends SavedSubject {
  totalScore: number;
  grade: Grade;
  remark: string;
  subjectPosition?: string;
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

export interface ReportTemplateProps {
  student: ProcessedStudent;
  settings: SchoolSettings;
  printMode?: PrintMode;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  component: React.FC<ReportTemplateProps>;
}
