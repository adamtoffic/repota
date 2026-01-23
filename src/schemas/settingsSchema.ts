// src/schemas/settingsSchema.ts
import { z } from "zod";

/**
 * 🛡️ SCHOOL SETTINGS SCHEMA
 * Validates all school configuration data
 */

export const schoolLevelSchema = z.enum(["KG", "PRIMARY", "JHS", "SHS"]);
export const schoolTypeSchema = z.enum(["STANDARD", "ISLAMIC"]);
export const academicPeriodSchema = z.enum([
  "First Term",
  "Second Term",
  "Third Term",
  "First Semester",
  "Second Semester",
]);

export const schoolSettingsSchema = z
  .object({
    // School Identity
    schoolName: z
      .string()
      .min(3, "School name must be at least 3 characters")
      .max(150, "School name too long")
      .regex(/^[a-zA-Z0-9\s.,'-]+$/, "Invalid characters in school name")
      .transform((val) => val.trim()),

    className: z
      .string()
      .min(1, "Class name required")
      .max(50, "Class name too long")
      .transform((val) => val.trim())
      .optional(),

    schoolMotto: z
      .string()
      .max(200)
      .transform((val) => val.trim())
      .optional(),
    phoneNumber: z.string().max(20).optional(),
    address: z
      .string()
      .max(200)
      .transform((val) => val.trim())
      .optional(),
    email: z.email("Invalid email").optional().or(z.literal("")),
    logoUrl: z
      .string()
      .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/, "Invalid image format")
      .optional(),

    schoolType: schoolTypeSchema.default("STANDARD"),

    // Academic Configuration
    level: schoolLevelSchema.default("PRIMARY"),

    term: academicPeriodSchema.default("First Term"),

    academicYear: z
      .string()
      .regex(/^\d{4}\/\d{4}$/, "Academic year must be in format YYYY/YYYY")
      .refine(
        (val) => {
          const [start, end] = val.split("/").map(Number);
          return end === start + 1;
        },
        { message: "End year must be start year + 1" },
      ),

    nextTermStarts: z.string().optional(),
    headTeacherName: z.string().max(100).optional(),
    classTeacherName: z.string().max(100).optional(),

    // Grading System
    totalAttendanceDays: z.number().min(1).max(365).optional(),

    classScoreMax: z
      .number()
      .min(10, "Max class score too low")
      .max(100, "Max class score cannot exceed 100"),

    examScoreMax: z
      .number()
      .min(10, "Max exam score too low")
      .max(100, "Max exam score cannot exceed 100"),

    // Optional Metadata
    classSize: z.number().min(0).max(200, "Class size unrealistic").optional(),

    headTeacherSignature: z.string().optional(),
    teacherSignature: z.string().optional(),

    defaultSubjects: z
      .array(
        z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z\s&'-]+$/, "Invalid subject name"),
      )
      .max(25, "Too many subjects"),
  })
  .refine((data) => data.classScoreMax + data.examScoreMax === 100, {
    message: "Max class score + max exam score must equal 100",
    path: ["examScoreMax"],
  });

export type SchoolSettings = z.infer<typeof schoolSettingsSchema>;
export type SchoolLevel = z.infer<typeof schoolLevelSchema>;
export type SchoolType = z.infer<typeof schoolTypeSchema>;
export type AcademicPeriod = z.infer<typeof academicPeriodSchema>;
