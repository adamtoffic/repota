import { createContext } from "react";
import type { ExamType, StudentRecord, SchoolSettings, ProcessedStudent } from "../types";

export type LoadKeyStatus = "ok" | "error";
export type LoadStatus = { students: LoadKeyStatus; settings: LoadKeyStatus };
export type RecoveryAction = "retry" | "fresh" | "import" | null;

export interface SchoolActionsType {
  setSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  /**
   * @param silent - When `true` (or when `student.name === "New Student"`), suppresses the success toast and `Added_Student` analytics event (used during bulk imports).
   */
  addStudent: (student: StudentRecord, silent?: boolean) => void;
  deleteStudent: (id: string) => void;
  /**
   * Removes only students with zero scores entered (`subjects.length === 0` or every score `0`, matching `hasNoScoresEntered`);
   * partially scored pending students are preserved.
   */
  deletePendingStudents: () => void;
  /** @param silent - Suppresses the save confirmation toast for inline/auto-save edits. */
  updateStudent: (updatedStudent: StudentRecord, silent?: boolean) => void;
  /** Atomically applies a multi-student state transition in a single render and persistence cycle. */
  batchUpdateStudents?: (
    updater: (prev: StudentRecord[]) => StudentRecord[],
    options?: { silent?: boolean },
  ) => void;
  clearAllScores: () => void;
  clearStudentScores: (id: string) => void;
  removeAllStudentPhotos: () => void;
  /** Removes every student record while keeping `SchoolSettings` intact. */
  clearAllStudents: () => void;
  /** Atomically wipes students, settings, media blobs, PIN/biometric locks, and device preferences back to a first-visit state. */
  resetAllAppData: () => Promise<boolean>;
  loadDemoData: () => Promise<void> | void;
  updateClassNameForAll: (newClassName: string) => void;
  /** Compares `settings.subjectComponentMap` against existing students' `classScoreComponents` to flag missing, extra, or outdated task definitions. */
  detectComponentMismatches: () => { hasOutdated: boolean; hasMissing: boolean };
  /** Reconciles every student's `classScoreComponents` (and weighted `classScore`) with `settings.subjectComponentMap`. */
  syncSubjectComponentsFromSettings: () => void;
  /** Atomically appends missing default subjects and reconciles SBA components in one state update. */
  syncClassSubjectsAndSba?: () => { subjectsAddedCount: number; sbaSyncedCount: number };
  /**
   * Atomically updates SBA settings (`subjectComponentMap` and derived `componentLibrary`) and immediately
   * reconciles all student records in one step without a manual Sync step.
   */
  applySbaConfig: (
    updater: (prev: SchoolSettings) => {
      settings: SchoolSettings;
      renamedTasks?: Record<string, string>;
      onClearTasks?: "preserve_class_score" | "zero";
    },
    options?: { silent?: boolean; toastMessage?: string },
  ) => SchoolSettings;
  /**
   * Atomically updates grading weights (`classScoreMax`, `examScoreMax`, optional `examType`) and updates
   * existing student scores (losslessly recomputing SBA-tracked subjects; rescaling or clamping direct/exam scores).
   */
  updateAssessmentWeights: (
    nextClassScoreMax: number,
    nextExamScoreMax: number,
    options?: { examType?: ExamType; scoreMode?: "rescale" | "clamp"; silent?: boolean },
  ) => SchoolSettings;
  checkDuplicateName: (name: string) => boolean;
  restoreDefaults: () => void;
  autoGenerateRemarks: (onProgress?: (current: number, total: number) => void) => Promise<void> | void;
  retryLoad: () => void;
  startFresh: () => void;
  /** Pauses debounced storage auto-writes (e.g., before backup import or recovery). */
  suspendPersistence: () => void;
  /** Resumes debounced storage auto-writes; no-op while `isRollbackIncomplete` protection is active. */
  resumePersistence: () => void;
  /** Persists `repota_incomplete_rollback` in `localStorage` so persistence stays locked across reloads until recovery succeeds. */
  markIncompleteRollback: () => void;
  /** Clears `repota_incomplete_rollback` after a full recovery restore or deliberate fresh reset. */
  clearIncompleteRollback: () => void;
  /** Serializes mutually exclusive recovery actions (`"retry" | "fresh" | "import"`). */
  setActiveRecoveryAction?: (action: RecoveryAction) => void;
  /** Waits for startup `localStorage` to IndexedDB migration to settle; rejects after `MIGRATION_WAIT_TIMEOUT_MS`. */
  waitForMigration?: () => Promise<void>;
  /** Immediately persists any debounced student/settings edits to storage. */
  flushPendingWrites?: () => Promise<boolean>;
}

export interface SchoolLifecycleType {
  /** `true` once startup storage hydration (or `LOAD_TIMEOUT_MS` expiry) settles; `DataGate` gates rendering on this. */
  isDataLoaded: boolean;
  /** `true` when IndexedDB/storage initialization succeeded on the current attempt. */
  isStorageReady: boolean;
  loadStatus: LoadStatus;
  loadError: boolean;
  /** `true` while debounced auto-writes to IndexedDB/`localStorage` are paused. */
  isPersistenceSuspended: boolean;
  /** `true` when a previous failed atomic import left `repota_incomplete_rollback` flagged in `localStorage`. */
  isRollbackIncomplete: boolean;
  /** `true` while local state differs from the 500ms debounced snapshot queued for storage persistence. */
  isSaving: boolean;
  /** Non-null when the most recent storage persistence attempt failed. */
  saveError?: string | null;
  lastSaved?: Date;
  activeRecoveryAction?: RecoveryAction;
}

export interface SchoolContextType extends SchoolActionsType, SchoolLifecycleType {
  students: ProcessedStudent[];
  settings: SchoolSettings;
}

// Split slice contexts prevent unrelated components from re-rendering when another slice changes;
// `SchoolContext` combines all slices for legacy consumers and isolated test wrappers.
export const SchoolStudentsContext = createContext<ProcessedStudent[] | undefined>(undefined);
export const SchoolSettingsContext = createContext<SchoolSettings | undefined>(undefined);
export const SchoolActionsContext = createContext<SchoolActionsType | undefined>(undefined);
export const SchoolLifecycleContext = createContext<SchoolLifecycleType | undefined>(undefined);
export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);
