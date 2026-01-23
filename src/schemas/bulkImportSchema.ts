// src/schemas/bulkImportSchema.ts
import { z } from "zod";
import { studentNameSchema } from "./studentSchema";

/**
 * 🛡️ BULK IMPORT SCHEMA
 * Sanitizes and validates bulk text input
 */

export const bulkImportTextSchema = z
  .string()
  .min(1, "Please paste student names")
  .max(10000, "Text input too large (max 10,000 characters)")
  .transform((text) => {
    // 1. Security: Remove potential script tags
    const sanitized = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

    // 2. Split by newlines and clean each line
    const names = sanitized
      .split(/\r?\n/)
      .map((line) => {
        // Remove numbering patterns (e.g., "1. John Doe" or "1) John Doe")
        const withoutNumber = line.replace(/^\s*\d+[.)]\s*/, "");

        // Remove bullet points
        const withoutBullet = withoutNumber.replace(/^\s*[-•*]\s*/, "");

        // Trim whitespace
        return withoutBullet.trim();
      })
      .filter((line) => line.length > 0);

    return names;
  });

/**
 * 🛡️ VALIDATE EACH NAME INDIVIDUALLY
 * Returns validated names and errors
 */
export function validateBulkNames(names: string[]): {
  valid: string[];
  errors: Array<{ name: string; error: string }>;
} {
  const valid: string[] = [];
  const errors: Array<{ name: string; error: string }> = [];

  names.forEach((name) => {
    const result = studentNameSchema.safeParse(name);

    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        name,
        error: result.error.issues[0]?.message || "Invalid name",
      });
    }
  });

  return { valid, errors };
}
