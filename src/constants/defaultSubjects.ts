// src/constants/defaultSubjects.ts
import type { SchoolLevel } from "../types";

export const DEFAULT_SUBJECTS: Record<SchoolLevel, string[]> = {
  KG: ["Numeracy", "Literacy", "Creative Arts", "Our World Our People"],
  PRIMARY: [
    "English Language",
    "Mathematics",
    "Science",
    "Our World Our People",
    "History",
    "RME",
    "Creative Arts",
    "Computing",
    "Ghanaian Language",
  ],
  JHS: [
    "English Language",
    "Mathematics",
    "Integrated Science",
    "Social Studies",
    "RME",
    "BDT",
    "ICT",
    "French",
    "Ghanaian Language",
  ],
  SHS: ["Core Mathematics", "Integrated Science", "English Language", "Social Studies"],
};
