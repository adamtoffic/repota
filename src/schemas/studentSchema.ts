// src/schemas/studentSchema.ts
import { z } from "zod";

/**
 * 🛡️ SUBJECT SCHEMA
 * Validates individual subject scores with strict bounds
 */
export const subjectSchema = z.object({
  id: z.string().uuid("Invalid subject ID"),
  name: z
    .string()
    .min(1, "Subject name required")
    .max(100, "Subject name too long")
    .regex(/^[a-zA-Z\s&'-]+$/, "Invalid characters in subject name")
    .transform((val) => val.trim()),
  classScore: z
    .number()
    .min(0, "Class score cannot be negative")
    .max(100, "Class score cannot exceed 100")
    .default(0),
  examScore: z
    .number()
    .min(0, "Exam score cannot be negative")
    .max(100, "Exam score cannot exceed 100")
    .default(0),
});

/**
 * 🛡️ STUDENT NAME SCHEMA
 * Strict validation for student names
 * - Prevents XSS attacks
 * - Removes excessive whitespace
 * - Blocks special characters that could break UI/print
 */
export const studentNameSchema = z
  .string()
  .min(2, "Student name must be at least 2 characters")
  .max(100, "Student name too long (max 100 characters)")
  .regex(/^[a-zA-Z\s.'-]+$/, "Only letters, spaces, periods, hyphens, and apostrophes allowed")
  .transform((val) => {
    // Normalize whitespace and trim
    return val.replace(/\s+/g, " ").trim();
  });

/**
 * 🛡️ STUDENT RECORD SCHEMA
 * Full validation for student data before localStorage
 */
export const studentRecordSchema = z.object({
  id: z.string().uuid("Invalid student ID"),
  name: studentNameSchema,
  className: z
    .string()
    .min(1, "Class name required")
    .max(50, "Class name too long")
    .transform((val) => val.trim()),
  subjects: z.array(subjectSchema).min(1, "At least one subject required"),
  remark: z.string().max(500, "Remark too long").optional(),
  conduct: z.string().max(100, "Conduct too long").optional(),
  interest: z.string().max(100, "Interest too long").optional(),
  attendancePresent: z.number().min(0).max(365).optional(),
  attendanceTotal: z.number().min(0).max(365).optional(),
  promotedTo: z.string().max(50).optional(),
  headmasterRemark: z.string().max(500).optional(),
});

/**
 * 🛡️ SCORE INPUT SCHEMA
 * For inline score editing with max bounds
 */
export const scoreInputSchema = (maxScore: number) =>
  z
    .string()
    .transform((val) => {
      // Allow empty string (treated as 0)
      if (val === "") return 0;

      // Parse and validate
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("Invalid number");

      return num;
    })
    .pipe(
      z
        .number()
        .min(0, "Score cannot be negative")
        .max(maxScore, `Score cannot exceed ${maxScore}`),
    );

export type StudentRecord = z.infer<typeof studentRecordSchema>;
export type SavedSubject = z.infer<typeof subjectSchema>;
