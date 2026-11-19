// src/schemas/settingsSchema.ts
import { z } from "zod";

/**
 * 🛡️ SCHOOL SETTINGS SCHEMA
 * Validates all school configuration data
 */

export const schoolLevelSchema = z.enum(["KG", "PRIMARY", "JHS", "SHS"]);
export const schoolTypeSchema = z.enum(["STANDARD", "ISLAMIC", "PRIVATE"]);
export const examTypeSchema = z.enum(["TERMLY", "MOCK"]);
export const academicPeriodSchema = z.enum([
  "First Term",
  "Second Term",
  "Third Term",
  "First Semester",
  "Second Semester",
]);

export const assessmentCategorySchema = z.enum(["CAT", "GROUP", "PROJECT", "HOMEWORK"]);

/**
 * Reusable schema for a single assessment component config (used in both
 * componentLibrary and subjectComponentMap values).
 */
export const classScoreComponentConfigSchema = z.object({
  name: z.string().min(1, "Component name required").max(100, "Component name too long"),
  maxScore: z
    .number()
    .min(1, "Max score must be at least 1")
    .max(100, "Max score cannot exceed 100"),
  category: assessmentCategorySchema.optional(),
});

export const privateFeeItemSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().max(40),
  amount: z.number().min(0).max(100000),
  cycle: z.string().max(30),
  enabled: z.boolean(),
});

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");

export const schoolSettingsSchema = z
  .object({
    // School Identity
    schoolName: z
      .string()
      .min(3, "School name must be at least 3 characters")
      .max(150, "School name too long")
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
      .min(0, "Max class score cannot be negative")
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

    // Component library - available assessment components that can be added to subjects
    componentLibrary: z
      .array(classScoreComponentConfigSchema)
      .max(15, "Too many components in library")
      .optional(),

    // Subject-component mapping - which library components each subject uses
    subjectComponentMap: z.record(z.string(), z.array(classScoreComponentConfigSchema)).optional(),

    // Private School Fees
    schoolGift: z.number().min(0).max(100000).optional(), // Termly school fees
    canteenFees: z.number().min(0).max(100000).optional(), // Daily canteen fees
    firstAidFees: z.number().min(0).max(100000).optional(), // Termly first aid
    privateFeeItems: z.array(privateFeeItemSchema).max(3, "Maximum 3 fee slots allowed").optional(),
    showFeeSchedule: z.boolean().optional(),
    feePaymentNote: z.string().max(240).optional(),
    showStudentFeeArrearsOnReport: z.boolean().optional(),

    templateId: z.string().default("original_v1").optional(),
    showClassPosition: z.boolean().optional(),
    showSubjectPosition: z.boolean().optional(),
    useCustomTemplateColor: z.boolean().optional(),
    primaryColor: hexColorSchema.optional(),
    accentColor: hexColorSchema.optional(),

    examType: examTypeSchema.default("TERMLY"),

    // Security
    autoLockTimeout: z.number().min(1, "Min 1 minute").max(60, "Max 60 minutes").optional(),
  })
  .refine(
    (data) => {
      if (data.examType === "MOCK") {
        return data.classScoreMax === 0 && data.examScoreMax === 100;
      }
      return data.classScoreMax + data.examScoreMax === 100;
    },
    {
      message: "Max class score + max exam score must equal 100",
      path: ["examScoreMax"],
    },
  );

export type SchoolSettings = z.infer<typeof schoolSettingsSchema>;
export type SchoolLevel = z.infer<typeof schoolLevelSchema>;
export type SchoolType = z.infer<typeof schoolTypeSchema>;
export type AcademicPeriod = z.infer<typeof academicPeriodSchema>;
export type ExamType = z.infer<typeof examTypeSchema>;
