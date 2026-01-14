import { createContext } from "react";
import type { StudentRecord, SchoolSettings, ProcessedStudent } from "../types";

export interface SchoolContextType {
  students: ProcessedStudent[];
  settings: SchoolSettings;
  setSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  addStudent: (student: StudentRecord) => void;
  deleteStudent: (id: string) => void;
  deletePendingStudents: () => void;
  updateStudent: (updatedStudent: StudentRecord) => void;
  loadDemoData: () => void;
  updateClassNameForAll: (newClassName: string) => void;
  checkDuplicateName: (name: string) => boolean;
}

export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);
