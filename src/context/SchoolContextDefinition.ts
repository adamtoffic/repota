import { createContext } from "react";
import type { StudentRecord, SchoolSettings, ProcessedStudent } from "../types";

export type LoadKeyStatus = "ok" | "error";
export type LoadStatus = { students: LoadKeyStatus; settings: LoadKeyStatus };
export type RecoveryAction = "retry" | "fresh" | "import" | null;

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
  removeAllStudentPhotos: () => void;
  loadDemoData: () => void;
  updateClassNameForAll: (newClassName: string) => void;
  detectComponentMismatches: () => { hasOutdated: boolean; hasMissing: boolean };
  syncSubjectComponentsFromSettings: () => void;
  checkDuplicateName: (name: string) => boolean;
  restoreDefaults: () => void;
  autoGenerateRemarks: (onProgress?: (current: number, total: number) => void) => void;
  isDataLoaded: boolean;
  isStorageReady: boolean;
  loadStatus: LoadStatus;
  loadError: boolean;
  retryLoad: () => void;
  startFresh: () => void;
  suspendPersistence: () => void;
  resumePersistence: () => void;
  isPersistenceSuspended: boolean;
  isRollbackIncomplete: boolean;
  markIncompleteRollback: () => void;
  clearIncompleteRollback: () => void;
  isSaving: boolean;
  lastSaved?: Date;
  activeRecoveryAction?: RecoveryAction;
  setActiveRecoveryAction?: (action: RecoveryAction) => void;
}

export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);
