// src/constants/classes.ts
import type { SchoolLevel } from "../types";

export const CLASS_OPTIONS: Record<SchoolLevel, string[]> = {
  KG: ["Creche", "Nursery 1", "Nursery 2", "KG 1", "KG 2"],
  PRIMARY: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"],
  JHS: ["JHS 1", "JHS 2", "JHS 3"],
  SHS: ["SHS 1", "SHS 2", "SHS 3"],
};
