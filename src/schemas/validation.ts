// src/schemas/validation.ts
// Zod schemas for runtime validation and sanitization

import { z } from "zod";
import DOMPurify from "dompurify";

// ==================== SANITIZATION HELPERS ====================

/**
 * Sanitize string input to prevent XSS attacks
 * Uses DOMPurify to strip malicious HTML/scripts
 */
export const sanitizeString = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
  }).trim();
};

/**
 * Custom Zod transform for sanitized strings
 * @param options - Optional min/max length constraints
 * @returns Zod string schema with sanitization transform
 */
export const sanitizedString = (options?: { min?: number; max?: number }) =>
  z
    .string()
    .min(options?.min ?? 1, { message: "This field is required" })
    .max(options?.max ?? 200, { message: `Maximum ${options?.max ?? 200} characters` })
    .transform(sanitizeString);

// ==================== SUBJECT SCHEMA ====================

export const SubjectSchema = z.object({
  id: z.uuid({ error: "Invalid UUID format" }),
  name: sanitizedString({ max: 100 }),
  classScore: z
    .number()
    .min(0, { message: "Class score cannot be negative" })
    .max(100, { message: "Class score cannot exceed 100" }),
  examScore: z
    .number()
    .min(0, { message: "Exam score cannot be negative" })
    .max(100, { message: "Exam score cannot exceed 100" }),
});

export type ValidatedSubject = z.infer<typeof SubjectSchema>;

// ==================== STUDENT SCHEMA ====================

export const StudentSchema = z.object({
  id: z.string().min(1, { message: "Student ID is required" }),
  name: sanitizedString({ min: 1, max: 100 }),
  className: sanitizedString({ max: 50 }),
  dateOfBirth: z.string().optional(),
  attendancePresent: z.number().min(0, { message: "Attendance cannot be negative" }).optional(),
  teacherRemark: sanitizedString({ max: 500 }).optional(),
  conduct: sanitizedString({ max: 100 }).optional(),
  interest: sanitizedString({ max: 100 }).optional(),
  pictureUrl: z.union([z.url({ error: "Invalid URL format" }), z.literal("")]).optional(),
  promotionStatus: sanitizedString({ max: 50 }).optional(),
  subjects: z.array(SubjectSchema).min(1, { message: "At least one subject is required" }),
});

export type ValidatedStudent = z.infer<typeof StudentSchema>;

// ==================== SETTINGS SCHEMA ====================

export const SettingsSchema = z.object({
  schoolName: sanitizedString({ min: 1, max: 200 }),
  className: sanitizedString({ max: 50 }).optional(),
  schoolMotto: sanitizedString({ max: 200 }).optional(),
  phoneNumber: sanitizedString({ max: 20 }).optional(),
  address: sanitizedString({ max: 300 }).optional(),
  email: z.union([z.email({ error: "Invalid email format" }), z.literal("")]).optional(),
  logoUrl: z.union([z.url({ error: "Invalid URL format" }), z.literal("")]).optional(),

  academicYear: sanitizedString({ max: 20 }),
  term: z.enum(["First Term", "Second Term", "Third Term", "First Semester", "Second Semester"]),
  level: z.enum(["KG", "PRIMARY", "JHS", "SHS"]),
  schoolType: z.enum(["STANDARD", "ISLAMIC", "PRIVATE"]),

  nextTermStarts: sanitizedString({ max: 50 }).optional(),
  headTeacherName: sanitizedString({ max: 100 }).optional(),
  classTeacherName: sanitizedString({ max: 100 }).optional(),
  totalAttendanceDays: z
    .number()
    .min(0, { message: "Total attendance days cannot be negative" })
    .max(365, { message: "Total attendance days cannot exceed 365" })
    .optional(),
  classScoreMax: z
    .number()
    .min(10, { message: "Class score max must be at least 10" })
    .max(100, { message: "Class score max cannot exceed 100" }),
  examScoreMax: z
    .number()
    .min(10, { message: "Exam score max must be at least 10" })
    .max(100, { message: "Exam score max cannot exceed 100" }),

  headTeacherSignature: z.string().optional(),
  teacherSignature: z.string().optional(),

  defaultSubjects: z.array(z.string()).min(1, { message: "At least one subject is required" }),
});

export type ValidatedSettings = z.infer<typeof SettingsSchema>;

// ==================== VALIDATION HELPERS ====================

/**
 * Safely parse and validate data
 * Returns null if validation fails
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", "),
      };
    }
    return { success: false, error: "Unknown validation error" };
  }
}

/**
 * Validate array of students
 */
export function validateStudents(data: unknown): ValidatedStudent[] {
  const ArraySchema = z.array(StudentSchema);
  return ArraySchema.parse(data);
}

/**
 * Validate single student
 */
export function validateStudent(data: unknown): ValidatedStudent {
  return StudentSchema.parse(data);
}

/**
 * Validate settings
 */
export function validateSettings(data: unknown): ValidatedSettings {
  return SettingsSchema.parse(data);
}
