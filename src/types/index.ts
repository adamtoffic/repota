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
  /** Raw component score on `0..maxScore`; proportionally scaled into `SavedSubject.classScore` by `updateComponentAndRecalculateClassScore`. */
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
  /** Weighted class score on `0..SchoolSettings.classScoreMax` (recomputed from `classScoreComponents` when present). */
  classScore: number;
  /**
   * Stored weighted on `0..SchoolSettings.examScoreMax` (not raw `0..100`).
   * Convert UI/CSV inputs via `convertExamRawToWeighted` and `formatExamWeightedAsRaw`.
   */
  examScore: number;
  /** Optional subject-specific SBA breakdown; when present, drives `classScore` proportionally. */
  classScoreComponents?: ClassScoreComponent[];
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
  /** UUID for real student records; sample records created by `loadDemoData` use a `demo-` prefix. */
  id: string;
  name: string;
  className: string;
  dateOfBirth?: string;
  gender: "Male" | "Female";
  attendancePresent?: number;
  teacherRemark?: string;
  conduct?: string;
  interest?: string;
  /** Inline data URL in memory and backups; persisted to IndexedDB as an `idb-blob://` reference by `idbStorage.ts`. */
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
  /** Inline data URL in memory and backups; offloaded to IndexedDB media-blob storage (`idb-blob://`) on save. */
  logoUrl?: string;

  academicYear: string;
  term: AcademicPeriod;
  level: SchoolLevel;
  schoolType: "STANDARD" | "ISLAMIC" | "PRIVATE";
  nextTermStarts?: string;
  headTeacherName?: string;
  classTeacherName?: string;
  totalAttendanceDays?: number;
  /** GES class-score weighting cap (e.g., 30, 40, or 50); paired with `examScoreMax` to form the 100-point report scale. */
  classScoreMax: number;
  /** GES exam-score weighting cap (e.g., 70, 60, or 50); paired with `classScoreMax` to form the 100-point report scale. */
  examScoreMax: number;
  classSize?: number;

  /** Inline data URL in memory and backups; offloaded to IndexedDB media-blob storage (`idb-blob://`) on save. */
  headTeacherSignature?: string;
  /** Inline data URL in memory and backups; offloaded to IndexedDB media-blob storage (`idb-blob://`) on save. */
  teacherSignature?: string;

  defaultSubjects: string[];

  /** Reusable SBA component templates available for assignment across subjects. */
  componentLibrary?: ClassScoreComponentConfig[];

  /** Active SBA components keyed by subject name; propagated to existing students via `syncSubjectComponentsFromSettings`. */
  subjectComponentMap?: Record<string, ClassScoreComponentConfig[]>;

  /** @deprecated Legacy private-school fee field retained for backup compatibility. Use `privateFeeItems`. */
  schoolGift?: number;
  /** @deprecated Legacy private-school fee field retained for backup compatibility. Use `privateFeeItems`. */
  canteenFees?: number;
  /** @deprecated Legacy private-school fee field retained for backup compatibility. Use `privateFeeItems`. */
  firstAidFees?: number;

  // Customizable 3-slot private school items & toggles
  privateFeeItems?: PrivateFeeItem[];
  showFeeSchedule?: boolean;
  feePaymentNote?: string;
  showStudentFeeArrearsOnReport?: boolean;

  // Report Card Display & Brand Customization
  templateId?: string; // ID of the selected report template
  /** Toggles overall class rank on report cards (defaults to `true` when omitted). */
  showClassPosition?: boolean;
  /** Toggles per-subject rank column on report cards (defaults to `true` when omitted). */
  showSubjectPosition?: boolean;
  useCustomTemplateColor?: boolean; // Apply school's custom colors to templates
  primaryColor?: string; // Hex color e.g. #1e3a8a
  accentColor?: string; // Hex accent color e.g. #fcd34d

  examType?: ExamType; // Whether this is a standard termly exam or a mock exam

  /** Inactivity timeout in minutes before PIN lock engages (default: `5`). */
  autoLockTimeout?: number;
}

export interface ProcessedSubject extends SavedSubject {
  /** Weighted sum `classScore + examScore` on the 0–100 report scale. */
  totalScore: number;
  grade: Grade;
  remark: string;
  /** Ordinal rank (e.g., `"1st"`); populated only after `assignSubjectPositions` runs. */
  subjectPosition?: string;
}

export interface ProcessedStudent extends Omit<StudentRecord, "subjects"> {
  age: number;
  subjects: ProcessedSubject[];

  averageScore: number;
  totalScore: number;
  /** Ordinal rank populated by `assignPositions`; initialized to `"pending..."` by `processStudent`. */
  classPosition: string;
  teacherRemark?: string;
  /** GES aggregate score (lower is better); `null` for `KG` or students with no subjects. */
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
