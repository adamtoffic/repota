// src/constants/defaultSubjects.ts
import type { SchoolLevel } from "../types";

export const DEFAULT_SUBJECTS: Record<SchoolLevel, string[]> = {
  KG: ["Numeracy", "Literacy", "Creative Arts", "Our World Our People"],
  PRIMARY: [
    "English Language",
    "Mathematics",
    "Science",
    "History",
    "RME",
    "Creative Arts",
    "Computing",
    "Ghanaian Language",
  ],
  JHS: [
    "English Language",
    "Mathematics",
    "Science",
    "Social Studies",
    "RME",
    "Computing",
    "Career Technology",
    "Creative Arts and Design",
    "Ghanaian Language",
  ],
  SHS: ["Core Mathematics", "Integrated Science", "English Language", "Social Studies"],
};
