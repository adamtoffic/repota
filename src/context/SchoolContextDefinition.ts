import { createContext } from "react";
import type { StudentRecord, SchoolSettings, ProcessedStudent } from "../types";

export interface SchoolContextType {
  students: ProcessedStudent[];
  settings: SchoolSettings;
  setSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  addStudent: (student: StudentRecord, silent?: boolean) => void;
  deleteStudent: (id: string) => void;
  deletePendingStudents: () => void;
  updateStudent: (updatedStudent: StudentRecord, silent?: boolean) => void;
  clearAllScores: () => void;
  clearStudentScores: (id: string) => void;
  loadDemoData: () => void;
  updateClassNameForAll: (newClassName: string) => void;
  checkDuplicateName: (name: string) => boolean;
  restoreDefaults: () => void;
  autoGenerateRemarks: () => void;
  isSaving: boolean;
  lastSaved?: Date;
}

export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);
