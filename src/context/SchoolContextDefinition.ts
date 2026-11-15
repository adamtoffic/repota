import { createContext } from "react";
import type { StudentRecord, SchoolSettings, ProcessedStudent } from "../types";

export type LoadKeyStatus = "ok" | "error";
export type LoadStatus = { students: LoadKeyStatus; settings: LoadKeyStatus };
export type RecoveryAction = "retry" | "fresh" | "import" | null;

export interface SchoolActionsType {
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
  retryLoad: () => void;
  startFresh: () => void;
  suspendPersistence: () => void;
  resumePersistence: () => void;
  markIncompleteRollback: () => void;
  clearIncompleteRollback: () => void;
  setActiveRecoveryAction?: (action: RecoveryAction) => void;
  waitForMigration?: () => Promise<void>;
}

export interface SchoolLifecycleType {
  isDataLoaded: boolean;
  isStorageReady: boolean;
  loadStatus: LoadStatus;
  loadError: boolean;
  isPersistenceSuspended: boolean;
  isRollbackIncomplete: boolean;
  isSaving: boolean;
  lastSaved?: Date;
  activeRecoveryAction?: RecoveryAction;
}

export interface SchoolContextType extends SchoolActionsType, SchoolLifecycleType {
  students: ProcessedStudent[];
  settings: SchoolSettings;
}

export const SchoolStudentsContext = createContext<ProcessedStudent[] | undefined>(undefined);
export const SchoolSettingsContext = createContext<SchoolSettings | undefined>(undefined);
export const SchoolActionsContext = createContext<SchoolActionsType | undefined>(undefined);
export const SchoolLifecycleContext = createContext<SchoolLifecycleType | undefined>(undefined);
export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);
