import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { DEFAULT_FACTORY_SETTINGS, DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { captureEvent } from "../utils/analytics";
import { isDemoStudent, REPORT_LEDGER_STORAGE_KEY } from "../utils/reportAnalytics";
import { processStudent, assignPositions, assignSubjectPositions } from "../utils/gradeCalculator";
import {
  deriveLibraryFromSubjectMap,
  normalizeTaskKey,
  reconcileStudentsWithSbaConfig,
  rescaleStudentsForWeightChange,
} from "../utils/sbaReconciliation";
import type { ExamType, StudentRecord, SchoolSettings, SavedSubject } from "../types";
import { useToast } from "../hooks/useToast";
import { useDebounce } from "../hooks/useDebounce";
// ✅ Import definition
import {
  SchoolActionsContext,
  SchoolContext,
  SchoolLifecycleContext,
  SchoolSettingsContext,
  SchoolStudentsContext,
  type RecoveryAction,
  type SchoolActionsType,
  type SchoolContextType,
  type SchoolLifecycleType,
} from "./SchoolContextDefinition";
import {
  generateHeadmasterRemark,
  generateTeacherRemark,
  generateAttendanceRating,
  getRandomConductTrait,
  getRandomInterest,
} from "../utils/remarkGenerator";
import {
  createBackupHeartbeat,
  requestPersistentStorage,
  detectDataLoss,
} from "../utils/dataProtection";
import { z } from "zod";
import { compatibleStudentSchema, mergeSettings } from "../utils/backupValidation";
// IndexedDB storage
import {
  initStorage,
  loadFromStorageResult,
  saveToStorage,
  IDB_KEYS,
  migrateFromLocalStorage,
  getStorageType,
} from "../utils/idbStorage";
import { ConfirmModal } from "../components/ConfirmModal";
import { CHUNK_RELOAD_KEY, setUnsavedChanges } from "../utils/preloadErrorHandler";
import { disablePinLock } from "../utils/pinSecurity";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  resolveTheme,
} from "../utils/theme";

/** Maximum wait before startup storage hydration fails over to recovery UI. */
export const LOAD_TIMEOUT_MS = 10_000;
/** Maximum wait before `waitForMigration` rejects during backup import or fresh recovery. */
export const MIGRATION_WAIT_TIMEOUT_MS = 10_000;
type LoadKeyStatus = "ok" | "error";
type LoadStatus = { students: LoadKeyStatus; settings: LoadKeyStatus };

/**
 * Root school state provider that hydrates students and settings from IndexedDB (running
 * startup `localStorage` migration when needed), persists updates via a 500ms debounce,
 * cancels unstarted `"fresh"` recovery flows when `isLocked` activates, and publishes both
 * split slice contexts and the combined `SchoolContext` to limit consumer re-renders.
 */
export function SchoolProvider({
  children,
  isLocked = false,
}: {
  children: ReactNode;
  isLocked?: boolean;
}) {
  // State with empty initialization (will load from IndexedDB)
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const studentsRef = useRef<StudentRecord[]>([]);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ students: "ok", settings: "ok" });
  const [showFreshConfirm, setShowFreshConfirm] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const loadAttemptRef = useRef(0);
  const initialRollbackIncomplete = (() => {
    try {
      return localStorage.getItem("repota_incomplete_rollback") === "true";
    } catch {
      return false;
    }
  })();
  const persistenceSuspendedRef = useRef(initialRollbackIncomplete);
  const suspendedUntilHydratedRef = useRef(initialRollbackIncomplete);
  const [isPersistenceSuspended, setIsPersistenceSuspended] = useState(initialRollbackIncomplete);
  const [isRollbackIncomplete, setIsRollbackIncomplete] = useState(initialRollbackIncomplete);
  const storageReadyRef = useRef(false);
  const migrationPromiseRef = useRef<Promise<unknown> | null>(null);
  const [activeRecoveryAction, setActiveRecoveryAction] = useState<RecoveryAction>(null);
  const [isFreshWriting, setIsFreshWriting] = useState(false);
  const freshOpTokenRef = useRef(0);
  const freshWritesStartedRef = useRef(false);
  const studentsWriteSeqRef = useRef(0);
  const settingsWriteSeqRef = useRef(0);
  const [resumeGeneration, setResumeGeneration] = useState(0);

  const [prevIsLocked, setPrevIsLocked] = useState(isLocked);
  if (isLocked !== prevIsLocked) {
    setPrevIsLocked(isLocked);
    if (isLocked) {
      if (showFreshConfirm) {
        setShowFreshConfirm(false);
      }
      if (activeRecoveryAction === "fresh" && !isFreshWriting) {
        setActiveRecoveryAction(null);
      }
    }
  }

  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
    if (isLocked && !freshWritesStartedRef.current) {
      ++freshOpTokenRef.current;
    }
  }, [isLocked]);

  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<SchoolSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const { showToast } = useToast();

  // ✅ PERFORMANCE: Debounce storage writes to prevent UI blocking
  const debouncedStudents = useDebounce(students, 500);
  const debouncedSettings = useDebounce(settings, 500);

  // ✅ AUTO-SAVE STATE TRACKING
  const [lastSaved, setLastSaved] = useState<Date>();

  // Track if we're in the debounce period (data changed but not yet saved)
  const isSaving = students !== debouncedStudents || settings !== debouncedSettings;
  const isSavingRef = useRef(false);

  useEffect(() => {
    isSavingRef.current = isSaving;
    setUnsavedChanges("school-context-debounce", isSaving);
  }, [isSaving]);

  useEffect(() => {
    return () => {
      setUnsavedChanges("school-context-debounce", false);
      setUnsavedChanges("school-context-students-write", false);
      setUnsavedChanges("school-context-settings-write", false);
    };
  }, []);

  const handleSetSettings: React.Dispatch<React.SetStateAction<SchoolSettings>> = useCallback(
    (value) => {
      const prev = settingsRef.current;
      const next = typeof value === "function" ? value(prev) : value;
      if (Object.is(next, prev) || JSON.stringify(next) === JSON.stringify(prev)) {
        setUnsavedChanges("school-context-debounce", isSavingRef.current);
        return;
      }
      settingsRef.current = next;
      isSavingRef.current = true;
      setUnsavedChanges("school-context-debounce", true);
      setSettings(next);
    },
    [],
  );

  const handleSetStudents: React.Dispatch<React.SetStateAction<StudentRecord[]>> = useCallback(
    (value) => {
      setUnsavedChanges("school-context-debounce", true);
      setStudents((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        studentsRef.current = next;
        return next;
      });
    },
    [],
  );

  const handleSetActiveRecoveryAction = useCallback((action: RecoveryAction) => {
    if (freshWritesStartedRef.current && action !== "fresh") {
      return;
    }
    if (action !== "fresh") {
      ++freshOpTokenRef.current;
    }
    setActiveRecoveryAction(action);
  }, []);

  const restoreDefaults = useCallback(() => {
    handleSetSettings(DEFAULT_FACTORY_SETTINGS);
    showToast("Settings restored to factory defaults.", "success");
  }, [handleSetSettings, showToast]);

  // ✅ INITIALIZE INDEXEDDB AND LOAD DATA
  useEffect(() => {
    storageReadyRef.current = false;
    const attempt = ++loadAttemptRef.current;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      if (loadAttemptRef.current !== attempt) return;
      timedOut = true;
      setActiveRecoveryAction(null);
      setLoadStatus({ students: "error", settings: "error" });
      setIsDataLoaded(true);
    }, LOAD_TIMEOUT_MS);

    const initializeStorage = async () => {
      try {
        // 1. Initialize IndexedDB
        await initStorage();
        if (loadAttemptRef.current !== attempt || timedOut) return;
        storageReadyRef.current = true;
        setIsStorageReady(true);

        // 2. Migrate from localStorage if needed
        const migrationPromise = migrateFromLocalStorage();
        migrationPromiseRef.current = migrationPromise;
        migrationPromise.finally(() => {
          if (migrationPromiseRef.current === migrationPromise) {
            migrationPromiseRef.current = null;
          }
        });
        const migration = await migrationPromise;
        if (loadAttemptRef.current !== attempt || timedOut) return;
        if (getStorageType() === "indexeddb" && !migration.success) {
          setLoadStatus({ students: "error", settings: "error" });
          setIsDataLoaded(true);
          return;
        }
        if (
          migration.success &&
          migration.studentsCount !== undefined &&
          migration.studentsCount > 0 &&
          !migration.error?.includes("already")
        ) {
          console.log(`✅ Migrated ${migration.studentsCount} students to IndexedDB`);
          // Only show toast on actual migration, not on every reload
        }

        // 3. Load students
        let studentsLoadStatus: LoadKeyStatus = "ok";
        const studentsResult = await loadFromStorageResult<StudentRecord[]>(IDB_KEYS.STUDENTS);
        if (loadAttemptRef.current !== attempt || timedOut) return;
        if (studentsResult.status === "found") {
          const parsed = z.array(compatibleStudentSchema).safeParse(studentsResult.value);
          if (parsed.success) {
            setStudents(parsed.data as StudentRecord[]);
          } else {
            console.error("Corrupted student records in storage:", parsed.error);
            studentsLoadStatus = "error";
          }
        } else if (studentsResult.status === "empty") {
          setStudents([]);
        } else {
          studentsLoadStatus = "error";
        }

        // 4. Load settings
        let settingsLoadStatus: LoadKeyStatus = "ok";
        const settingsResult = await loadFromStorageResult<SchoolSettings>(IDB_KEYS.SETTINGS);
        if (loadAttemptRef.current !== attempt || timedOut) return;
        if (settingsResult.status === "found") {
          if (
            settingsResult.value &&
            typeof settingsResult.value === "object" &&
            !Array.isArray(settingsResult.value)
          ) {
            try {
              const validated = mergeSettings(settingsResult.value as unknown as Record<string, unknown>);
              setSettings(validated as unknown as SchoolSettings);
            } catch (err) {
              console.error("Corrupted settings in storage:", err);
              settingsLoadStatus = "error";
            }
          } else {
            console.error("Corrupted settings in storage (not an object):", settingsResult.value);
            settingsLoadStatus = "error";
          }
        } else if (settingsResult.status === "empty") {
          setSettings(DEFAULT_FACTORY_SETTINGS);
        } else {
          settingsLoadStatus = "error";
        }
        const hasNoErrors = studentsLoadStatus === "ok" && settingsLoadStatus === "ok";

        setLoadStatus({
          students: studentsLoadStatus,
          settings: settingsLoadStatus,
        });

        if (hasNoErrors) {
          const hasIncompleteRollback = (() => {
            try {
              return localStorage.getItem("repota_incomplete_rollback") === "true";
            } catch {
              return false;
            }
          })();
          if (!hasIncompleteRollback) {
            suspendedUntilHydratedRef.current = false;
            persistenceSuspendedRef.current = false;
            setIsPersistenceSuspended(false);
            setResumeGeneration((current) => current + 1);
          }
        }
      } catch (error) {
        console.error("Failed to load school data:", error);
        if (loadAttemptRef.current === attempt && !timedOut) {
          storageReadyRef.current = false;
          setIsStorageReady(false);
          setLoadStatus({ students: "error", settings: "error" });
          setIsDataLoaded(true);
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (loadAttemptRef.current === attempt && !timedOut) {
          setIsDataLoaded(true);
          setActiveRecoveryAction(null);
        }
      }
    };

    initializeStorage();
    return () => window.clearTimeout(timeoutId);
  }, [loadAttempt]); // Run on mount and explicit retry

  const hasLoadError = loadStatus.students === "error" || loadStatus.settings === "error";

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until initial load complete
    if (persistenceSuspendedRef.current) return;
    if (loadStatus.students === "error") return;
    if (debouncedStudents !== students) return; // Wait for the hydrated snapshot to settle

    const seq = ++studentsWriteSeqRef.current;
    setUnsavedChanges("school-context-students-write", true);
    Promise.resolve(saveToStorage(IDB_KEYS.STUDENTS, debouncedStudents))
      .then((saved) => {
        if (studentsWriteSeqRef.current === seq && saved !== false) {
          setUnsavedChanges("school-context-students-write", false);
        }
      })
      .catch(() => {});
    if (!hasLoadError) createBackupHeartbeat();
    queueMicrotask(() => setLastSaved(new Date()));
  }, [debouncedStudents, hasLoadError, isDataLoaded, loadStatus.students, resumeGeneration, students]);

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until initial load complete
    if (persistenceSuspendedRef.current) return;
    if (loadStatus.settings === "error") return;
    if (debouncedSettings !== settings) return; // Wait for the hydrated snapshot to settle

    const seq = ++settingsWriteSeqRef.current;
    setUnsavedChanges("school-context-settings-write", true);
    Promise.resolve(saveToStorage(IDB_KEYS.SETTINGS, debouncedSettings))
      .then((saved) => {
        if (settingsWriteSeqRef.current === seq && saved !== false) {
          setUnsavedChanges("school-context-settings-write", false);
        }
      })
      .catch(() => {});
    if (!hasLoadError) createBackupHeartbeat();
    queueMicrotask(() => setLastSaved(new Date()));
  }, [debouncedSettings, hasLoadError, isDataLoaded, loadStatus.settings, resumeGeneration, settings]);

  const retryLoad = useCallback(() => {
    if (freshWritesStartedRef.current) return;
    ++freshOpTokenRef.current;
    setActiveRecoveryAction("retry");
    setIsDataLoaded(false);
    setIsStorageReady(false);
    storageReadyRef.current = false;
    setLoadStatus({ students: "ok", settings: "ok" });
    setLoadAttempt((current) => current + 1);
  }, []);

  const suspendPersistence = useCallback(() => {
    persistenceSuspendedRef.current = true;
    setIsPersistenceSuspended(true);
  }, []);

  const resumePersistence = useCallback(() => {
    if (suspendedUntilHydratedRef.current) return;
    persistenceSuspendedRef.current = false;
    setIsPersistenceSuspended(false);
    setResumeGeneration((current) => current + 1);
  }, []);

  const markIncompleteRollback = useCallback(() => {
    try {
      localStorage.setItem("repota_incomplete_rollback", "true");
    } catch {
      // ignore
    }
    suspendedUntilHydratedRef.current = true;
    persistenceSuspendedRef.current = true;
    setIsPersistenceSuspended(true);
    setIsRollbackIncomplete(true);
  }, []);

  const clearIncompleteRollback = useCallback(() => {
    try {
      localStorage.removeItem("repota_incomplete_rollback");
    } catch {
      // ignore
    }
    setIsRollbackIncomplete(false);
    suspendedUntilHydratedRef.current = false;
  }, []);

  const waitForMigration = useCallback(async (): Promise<void> => {
    const pending = migrationPromiseRef.current;
    if (!pending) return;
    let timeoutId: number | null = null;
    try {
      await Promise.race([
        pending.then(
          () => undefined,
          () => undefined,
        ),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(
              new Error("Storage migration is still in progress. Please try again shortly."),
            );
          }, MIGRATION_WAIT_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    }
  }, []);

  const startFresh = useCallback(async () => {
    if (isLockedRef.current || freshWritesStartedRef.current) {
      return;
    }
    if (!storageReadyRef.current) {
      ++freshOpTokenRef.current;
      setActiveRecoveryAction(null);
      showToast("Storage is not ready. Try again after recovery finishes.", "error");
      return;
    }
    const token = ++freshOpTokenRef.current;
    ++loadAttemptRef.current;
    setActiveRecoveryAction("fresh");
    let startedWrites = false;
    try {
      await waitForMigration();
      if (freshOpTokenRef.current !== token || isLockedRef.current) {
        return;
      }
      startedWrites = true;
      freshWritesStartedRef.current = true;
      setIsFreshWriting(true);
      const defaultSettings = DEFAULT_FACTORY_SETTINGS;
      persistenceSuspendedRef.current = true;
      setIsPersistenceSuspended(true);
      setStudents([]);
      setSettings(defaultSettings);
      const [studentsSaved, settingsSaved] = await Promise.all([
        saveToStorage(IDB_KEYS.STUDENTS, []),
        saveToStorage(IDB_KEYS.SETTINGS, defaultSettings),
      ]);
      if (!studentsSaved || !settingsSaved) {
        markIncompleteRollback();
        showToast("Could not save fresh data. Recovery remains active.", "error");
        return;
      }
      try {
        localStorage.removeItem("repota_incomplete_rollback");
      } catch {
        // ignore
      }
      setLoadStatus({ students: "ok", settings: "ok" });
      setIsDataLoaded(true);
      setShowFreshConfirm(false);
      suspendedUntilHydratedRef.current = false;
      persistenceSuspendedRef.current = false;
      setIsPersistenceSuspended(false);
      setIsRollbackIncomplete(false);
      setResumeGeneration((current) => current + 1);
    } catch (error) {
      if (freshOpTokenRef.current === token) {
        showToast(
          error instanceof Error ? error.message : "Could not start fresh. Please try again.",
          "error",
        );
      }
    } finally {
      if (startedWrites) {
        freshWritesStartedRef.current = false;
        setIsFreshWriting(false);
      }
      if (freshOpTokenRef.current === token || startedWrites) {
        setActiveRecoveryAction((prev) => (prev === "fresh" ? null : prev));
      }
    }
  }, [markIncompleteRollback, showToast, waitForMigration]);

  // Request persistent storage on mount (Android protection)
  useEffect(() => {
    requestPersistentStorage();

    // Check for data loss (cleared by cleaner apps)
    // Only check once per session to avoid false positives on unlock/remount
    const dataLossChecked = sessionStorage.getItem("data_loss_checked");
    if (!dataLossChecked && detectDataLoss()) {
      showToast("⚠️ Data may have been cleared. Please restore from backup if needed.", "error");
      sessionStorage.setItem("data_loss_checked", "true");
      captureEvent("Data_Loss_Detected", { storage_type: getStorageType() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // --- ACTIONS ---

  // 1. ADD
  const addStudent = useCallback(
    (student: StudentRecord, silent = false) => {
      const prevRealCount = studentsRef.current.filter((s) => !isDemoStudent(s)).length;
      handleSetStudents((prev) => [...prev, student]);
      if (!silent && student.name !== "New Student") {
        showToast(`Student "${student.name}" added successfully!`, "success");
        if (!isDemoStudent(student)) {
          captureEvent("Added_Student", {
            school_level: settingsRef.current.level || "unknown",
            school_type: settingsRef.current.schoolType || "unknown",
            exam_type: (settingsRef.current.examType || "TERMLY").trim().toUpperCase(),
            is_first_student: prevRealCount === 0,
            total_students_count: prevRealCount + 1,
          });
        }
      }
    },
    [handleSetStudents, showToast],
  );

  // 2. DELETE (Single)
  const deleteStudent = useCallback(
    (id: string) => {
      const studentToDelete = studentsRef.current.find((s) => s.id === id);
      if (!studentToDelete) return;

      handleSetStudents((prev) => prev.filter((s) => s.id !== id));

      showToast("Student moved to trash.", "info", {
        label: "UNDO",
        onClick: () => {
          handleSetStudents((prev) => [...prev, studentToDelete]);
          showToast("Student restored.", "success");
        },
      });
    },
    [handleSetStudents, showToast],
  );

  // 3. 🛑 FIXED: DELETE PENDING (No side effects in setter)
  const deletePendingStudents = useCallback(() => {
    const currentStudents = studentsRef.current;
    const active = currentStudents.filter(
      (s) =>
        s.subjects.length > 0 && s.subjects.some((sub) => sub.classScore > 0 || sub.examScore > 0),
    );

    const removedCount = currentStudents.length - active.length;

    if (removedCount > 0) {
      showToast(`Cleaned up ${removedCount} incomplete records.`, "success");
      handleSetStudents(active);
    } else {
      showToast("No pending students found.", "info");
    }
  }, [handleSetStudents, showToast]);

  // 4. UPDATE
  const updateStudent = useCallback(
    (updatedStudent: StudentRecord, silent = false) => {
      handleSetStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
      if (!silent) {
        showToast(`Changes saved successfully!`, "success");
      }
    },
    [handleSetStudents, showToast],
  );

  // 4B. CLEAR ALL SCORES (keeps students, zeros their scores)
  const clearAllScores = useCallback(() => {
    const count = studentsRef.current.length;
    handleSetStudents((prev) =>
      prev.map((student) => ({
        ...student,
        subjects: student.subjects.map((sub) => ({
          ...sub,
          classScore: 0,
          examScore: 0,
          classScoreComponents: sub.classScoreComponents
            ? sub.classScoreComponents.map((comp) => ({
                ...comp,
                score: 0,
              }))
            : undefined,
        })),
      })),
    );
    showToast(`All scores cleared for ${count} students!`, "success");
  }, [handleSetStudents, showToast]);

  // 4C. CLEAR SINGLE STUDENT SCORES
  const clearStudentScores = useCallback(
    (id: string) => {
      handleSetStudents((prev) =>
        prev.map((student) =>
          student.id === id
            ? {
                ...student,
                subjects: student.subjects.map((sub) => ({
                  ...sub,
                  classScore: 0,
                  examScore: 0,
                  classScoreComponents: sub.classScoreComponents
                    ? sub.classScoreComponents.map((comp) => ({
                        ...comp,
                        score: 0,
                      }))
                    : undefined,
                })),
              }
            : student,
        ),
      );
    },
    [handleSetStudents],
  );

  // 4D. REMOVE ALL STUDENT PHOTOS (Storage cleanup helper)
  const removeAllStudentPhotos = useCallback(() => {
    const removedCount = studentsRef.current.reduce(
      (count, student) => (student.pictureUrl ? count + 1 : count),
      0,
    );
    handleSetStudents((prev) =>
      prev.map((student) =>
        student.pictureUrl ? { ...student, pictureUrl: undefined } : student,
      ),
    );

    if (removedCount > 0) {
      showToast(`Removed ${removedCount} student photos to free up storage.`, "success");
    } else {
      showToast("No student photos found.", "info");
    }
  }, [handleSetStudents, showToast]);

  // 4E. CLEAR ALL STUDENTS (keeps SchoolSettings for a new class in the same school)
  const clearAllStudents = useCallback(() => {
    const count = studentsRef.current.length;
    if (count === 0) {
      showToast("No students to remove.", "info");
      return;
    }
    handleSetStudents([]);
    showToast(
      `Removed all ${count} student${count === 1 ? "" : "s"}. School settings were kept.`,
      "success",
    );
  }, [handleSetStudents, showToast]);

  // 4F. FULL APP RESET (wipes students, settings, media blobs, locks, and device prefs)
  const resetAllAppData = useCallback(async (): Promise<boolean> => {
    if (isLockedRef.current || freshWritesStartedRef.current) {
      return false;
    }
    if (!storageReadyRef.current) {
      showToast("Storage is not ready. Try again shortly.", "error");
      return false;
    }

    let startedWrites = false;
    try {
      await waitForMigration();
      if (isLockedRef.current || freshWritesStartedRef.current) {
        return false;
      }

      startedWrites = true;
      freshWritesStartedRef.current = true;
      persistenceSuspendedRef.current = true;
      setIsPersistenceSuspended(true);

      const [studentsSaved, settingsSaved] = await Promise.all([
        saveToStorage(IDB_KEYS.STUDENTS, []),
        saveToStorage(IDB_KEYS.SETTINGS, DEFAULT_FACTORY_SETTINGS),
      ]);

      if (!studentsSaved || !settingsSaved) {
        persistenceSuspendedRef.current = false;
        setIsPersistenceSuspended(false);
        showToast("Could not reset app data. Please try again.", "error");
        return false;
      }

      try {
        disablePinLock();
      } catch {
        // ignore storage access errors
      }

      const keysToRemove = [
        "app_pin_lockout",
        "repota_backup_check",
        "repota_last_backup",
        "repota_had_data",
        "repota_incomplete_rollback",
        "welcome_tour_completed",
        "pwa-install-dismissed",
        THEME_STORAGE_KEY,
        REPORT_LEDGER_STORAGE_KEY,
        ...(getStorageType() === "indexeddb" ? [IDB_KEYS.STUDENTS, IDB_KEYS.SETTINGS] : []),
      ];
      try {
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      } catch {
        // ignore storage access errors
      }

      try {
        sessionStorage.removeItem("repota_backup_reminder_shown");
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch {
        // ignore storage access errors
      }

      const resolvedTheme = resolveTheme("system");
      applyThemeToDocument(resolvedTheme);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(THEME_CHANGE_EVENT, {
            detail: { preference: "system", resolved: resolvedTheme },
          }),
        );
      }

      ++studentsWriteSeqRef.current;
      ++settingsWriteSeqRef.current;
      studentsRef.current = [];
      settingsRef.current = DEFAULT_FACTORY_SETTINGS;
      isSavingRef.current = false;
      setStudents([]);
      setSettings(DEFAULT_FACTORY_SETTINGS);
      setLoadStatus({ students: "ok", settings: "ok" });
      setIsRollbackIncomplete(false);
      suspendedUntilHydratedRef.current = false;
      setUnsavedChanges("school-context-debounce", false);
      setUnsavedChanges("school-context-students-write", false);
      setUnsavedChanges("school-context-settings-write", false);

      persistenceSuspendedRef.current = false;
      setIsPersistenceSuspended(false);
      return true;
    } catch (error) {
      persistenceSuspendedRef.current = false;
      setIsPersistenceSuspended(false);
      showToast(
        error instanceof Error ? error.message : "Could not reset app data. Please try again.",
        "error",
      );
      return false;
    } finally {
      if (startedWrites) {
        freshWritesStartedRef.current = false;
      }
    }
  }, [showToast, waitForMigration]);

  // 5. MASS UPDATE
  const updateClassNameForAll = useCallback(
    (newClassName: string) => {
      handleSetStudents((prev) => prev.map((s) => ({ ...s, className: newClassName })));
    },
    [handleSetStudents],
  );

  // 5B. DETECT COMPONENT MISMATCHES
  const detectComponentMismatches = useCallback(() => {
    const { subjectComponentMap, examType } = settingsRef.current;

    if (examType === "MOCK") {
      return { hasOutdated: false, hasMissing: false };
    }

    const map = subjectComponentMap ?? {};
    let hasOutdated = false;
    let hasMissing = false;

    for (const student of studentsRef.current) {
      for (const subject of student.subjects) {
        const settingsComponents = map[subject.name] || [];
        const currentComponents = subject.classScoreComponents || [];

        if (settingsComponents.length > 0 && currentComponents.length === 0) {
          hasMissing = true;
        }

        for (const config of settingsComponents) {
          const existing = currentComponents.find(
            (c) => normalizeTaskKey(c.name) === normalizeTaskKey(config.name),
          );
          if (!existing) {
            hasMissing = true;
          } else if (
            existing.maxScore !== config.maxScore ||
            (config.category !== undefined && existing.category !== config.category)
          ) {
            hasOutdated = true;
          }
        }

        for (const current of currentComponents) {
          if (
            !settingsComponents.some(
              (config) => normalizeTaskKey(config.name) === normalizeTaskKey(current.name),
            )
          ) {
            hasOutdated = true;
          }
        }

        if (hasOutdated && hasMissing) {
          return { hasOutdated, hasMissing };
        }
      }
    }

    return { hasOutdated, hasMissing };
  }, []);

  // 5C. SYNC SUBJECT COMPONENTS FROM SETTINGS (MANUAL)
  const syncSubjectComponentsFromSettings = useCallback(() => {
    const currentSettings = settingsRef.current;
    const map = currentSettings.subjectComponentMap ?? {};
    const hasConfigured = Object.values(map).some((list) => list.length > 0);
    const hasStudentComponents = studentsRef.current.some((student) =>
      student.subjects.some((sub) => Boolean(sub.classScoreComponents?.length)),
    );

    if (!hasConfigured && !hasStudentComponents) {
      showToast("No components configured in Settings", "info");
      return;
    }

    const { students: nextStudents, modifiedStudentCount } = reconcileStudentsWithSbaConfig(
      studentsRef.current,
      currentSettings,
      { onClearTasks: "preserve_class_score" },
    );

    if (modifiedStudentCount > 0) {
      handleSetStudents(nextStudents);
      showToast(
        `Synced components for ${modifiedStudentCount} student${modifiedStudentCount > 1 ? "s" : ""}`,
        "success",
      );
    } else {
      showToast("All students already up to date", "info");
    }
  }, [handleSetStudents, showToast]);

  // 5D. ATOMIC SBA CONFIGURATION + STUDENT RECONCILIATION
  const applySbaConfig = useCallback(
    (
      updater: (prev: SchoolSettings) => {
        settings: SchoolSettings;
        renamedTasks?: Record<string, string>;
        onClearTasks?: "preserve_class_score" | "zero";
      },
      options?: { silent?: boolean; toastMessage?: string },
    ): SchoolSettings => {
      const currentSettings = settingsRef.current;
      const { settings: rawNext, renamedTasks, onClearTasks } = updater(currentSettings);
      const nextMap = rawNext.subjectComponentMap ?? {};
      const nextSettings: SchoolSettings = {
        ...rawNext,
        subjectComponentMap: nextMap,
        componentLibrary: deriveLibraryFromSubjectMap(nextMap, rawNext.componentLibrary),
      };

      handleSetSettings(nextSettings);
      handleSetStudents(
        (prev) =>
          reconcileStudentsWithSbaConfig(prev, nextSettings, {
            renamedTasks,
            onClearTasks,
          }).students,
      );

      if (!options?.silent && options?.toastMessage) {
        showToast(options.toastMessage, "success");
      }

      return nextSettings;
    },
    [handleSetSettings, handleSetStudents, showToast],
  );

  // 5E. ATOMIC ASSESSMENT WEIGHT / EXAM MODE UPDATE + SCORE RESCALING
  const updateAssessmentWeights = useCallback(
    (
      nextClassScoreMax: number,
      nextExamScoreMax: number,
      options?: { examType?: ExamType; scoreMode?: "rescale" | "clamp"; silent?: boolean },
    ): SchoolSettings => {
      const prevSettings = settingsRef.current;
      const nextExamType = options?.examType ?? prevSettings.examType ?? "TERMLY";

      const clampedClass =
        nextExamType === "MOCK"
          ? 0
          : Math.min(100, Math.max(0, Math.round(nextClassScoreMax)));
      const clampedExam =
        nextExamType === "MOCK"
          ? 100
          : Math.min(100, Math.max(0, Math.round(nextExamScoreMax)));

      const nextSettings: SchoolSettings = {
        ...prevSettings,
        examType: nextExamType,
        classScoreMax: clampedClass,
        examScoreMax: clampedExam,
      };

      handleSetSettings(nextSettings);

      const weightsChanged =
        prevSettings.classScoreMax !== clampedClass ||
        prevSettings.examScoreMax !== clampedExam;

      if (
        (nextExamType !== "MOCK" && (weightsChanged || prevSettings.examType === "MOCK")) ||
        (options?.scoreMode !== undefined && weightsChanged)
      ) {
        handleSetStudents((prev) =>
          rescaleStudentsForWeightChange(
            prev,
            prevSettings.classScoreMax,
            prevSettings.examScoreMax,
            clampedClass,
            clampedExam,
            options?.scoreMode ?? "rescale",
          ),
        );
      }

      if (!options?.silent) {
        showToast(
          nextExamType === "MOCK"
            ? "Switched to Mock Exam mode (0/100)"
            : `Updated grading weights to ${clampedClass}/${clampedExam}`,
          "success",
        );
      }

      return nextSettings;
    },
    [handleSetSettings, handleSetStudents, showToast],
  );

  // 6. DEMO DATA
  const loadDemoData = useCallback(() => {
    const currentSettings = settingsRef.current;
    const hasComponents =
      currentSettings.subjectComponentMap &&
      Object.keys(currentSettings.subjectComponentMap).length > 0;

    // Helper function to create subject with components from settings map
    const createDemoSubject = (
      subName: string,
      classScoreRange: [number, number],
      examScoreRange: [number, number],
    ): SavedSubject => {
      const subject: SavedSubject = {
        id: crypto.randomUUID(),
        name: subName,
        classScore: 0,
        examScore:
          Math.floor(Math.random() * (examScoreRange[1] - examScoreRange[0] + 1)) +
          examScoreRange[0],
      };

      const subjectComponents = currentSettings.subjectComponentMap?.[subName];
      if (hasComponents && subjectComponents && subjectComponents.length > 0) {
        const targetClassScore =
          Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
          classScoreRange[0];
        const targetPercentage = targetClassScore / currentSettings.classScoreMax;
        const totalMaxScore = subjectComponents.reduce((sum, c) => sum + c.maxScore, 0);
        const targetTotalScore = targetPercentage * totalMaxScore;

        subject.classScoreComponents = subjectComponents.map((config) => {
          const proportion = config.maxScore / totalMaxScore;
          const baseScore = targetTotalScore * proportion;
          const variance = baseScore * 0.15;
          const score = Math.min(
            config.maxScore,
            Math.max(0, Math.floor(baseScore + (Math.random() * variance * 2 - variance))),
          );

          return {
            id: crypto.randomUUID(),
            name: config.name,
            score,
            maxScore: config.maxScore,
            ...(config.category !== undefined ? { category: config.category } : {}),
          };
        });

        const totalActualScore = subject.classScoreComponents!.reduce((sum, c) => sum + c.score, 0);
        subject.classScore = Math.round(
          (totalActualScore / totalMaxScore) * currentSettings.classScoreMax,
        );
      } else {
        subject.classScore =
          Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
          classScoreRange[0];
      }

      return subject;
    };

    const classMax = currentSettings.classScoreMax;
    const examMax = currentSettings.examScoreMax;

    const demoStudents: StudentRecord[] = [
      {
        id: "demo-1",
        name: "Kwame Mensah",
        className: currentSettings.className || "Primary 5A",
        gender: "Male",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.7), Math.floor(classMax * 0.9)],
            [Math.floor(examMax * 0.7), Math.floor(examMax * 0.9)],
          ),
        ),
        attendancePresent: 65,
      },
      {
        id: "demo-2",
        name: "Ama Asante",
        className: currentSettings.className || "Primary 5A",
        gender: "Female",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.76), Math.floor(classMax * 0.96)],
            [Math.floor(examMax * 0.8), examMax],
          ),
        ),
        attendancePresent: 68,
      },
      {
        id: "demo-3",
        name: "Kofi Owusu",
        className: currentSettings.className || "Primary 5A",
        gender: "Male",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.56), Math.floor(classMax * 0.76)],
            [Math.floor(examMax * 0.6), Math.floor(examMax * 0.8)],
          ),
        ),
        attendancePresent: 60,
      },
      {
        id: "demo-4",
        name: "Abena Boateng",
        className: currentSettings.className || "Primary 5A",
        gender: "Female",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.8), classMax],
            [Math.floor(examMax * 0.84), examMax],
          ),
        ),
        attendancePresent: 70,
      },
      {
        id: "demo-5",
        name: "Yaw Adomako",
        className: currentSettings.className || "Primary 5A",
        gender: "Male",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.5), Math.floor(classMax * 0.74)],
            [Math.floor(examMax * 0.56), Math.floor(examMax * 0.8)],
          ),
        ),
        attendancePresent: 55,
      },
      {
        id: "demo-6",
        name: "Efua Appiah",
        className: currentSettings.className || "Primary 5A",
        gender: "Female",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.8), classMax],
            [Math.floor(examMax * 0.76), examMax],
          ),
        ),
        attendancePresent: 67,
      },
      {
        id: "demo-7",
        name: "Kwabena Darko",
        className: currentSettings.className || "Primary 5A",
        gender: "Male",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.6), Math.floor(classMax * 0.8)],
            [Math.floor(examMax * 0.64), Math.floor(examMax * 0.84)],
          ),
        ),
        attendancePresent: 69,
      },
      {
        id: "demo-8",
        name: "Akosua Frimpong",
        className: currentSettings.className || "Primary 5A",
        gender: "Female",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.9), classMax],
            [Math.floor(examMax * 0.86), examMax],
          ),
        ),
        attendancePresent: 70,
      },
      {
        id: "demo-9",
        name: "Kwesi Osei",
        className: currentSettings.className || "Primary 5A",
        gender: "Male",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.64), Math.floor(classMax * 0.94)],
            [Math.floor(examMax * 0.7), examMax],
          ),
        ),
        attendancePresent: 63,
      },
      {
        id: "demo-10",
        name: "Adwoa Agyeman",
        className: currentSettings.className || "Primary 5A",
        gender: "Female",
        subjects: currentSettings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.76), Math.floor(classMax * 0.96)],
            [Math.floor(examMax * 0.78), Math.floor(examMax * 0.98)],
          ),
        ),
        attendancePresent: 66,
      },
    ];

    const existingCount = studentsRef.current.length;
    if (demoStudents.length > 0) {
      handleSetStudents((prev) => [...prev, ...demoStudents]);
      showToast(`${demoStudents.length} demo students loaded!`, "success");
      captureEvent("Loaded_Demo_Data", {
        school_level: currentSettings.level || "unknown",
        school_type: currentSettings.schoolType || "unknown",
        demo_students_count: demoStudents.length,
        existing_students_count: existingCount,
        is_empty_workspace: existingCount === 0,
      });
    }
  }, [handleSetStudents, showToast]);

  const checkDuplicateName = useCallback((name: string): boolean => {
    const normalized = name.trim().toLowerCase();
    return studentsRef.current.some((s) => s.name.trim().toLowerCase() === normalized);
  }, []);

  // 7. COMPUTED DATA
  const processedStudents = useMemo(() => {
    const processed = students.map((student) => processStudent(student, settings.level));
    const withSubjectPositions = assignSubjectPositions(processed);
    return assignPositions(withSubjectPositions);
  }, [students, settings.level]);

  // 8. AUTO-GENERATE REMARKS (Smart Batching with Progress)
  const autoGenerateRemarks = useCallback(
    (onProgress?: (current: number, total: number) => void) => {
      const currentStudents = studentsRef.current;
      const currentSettings = settingsRef.current;
      const usedHeadmasterRemarks: string[] = [];
      const usedTeacherRemarks: string[] = [];

      const total = currentStudents.length;

      const updatedStudents = currentStudents.map((student, index) => {
        const processed = processStudent(student, currentSettings.level);

        const hRemark = generateHeadmasterRemark(
          processed.averageScore,
          currentSettings.term,
          usedHeadmasterRemarks,
        );
        usedHeadmasterRemarks.push(hRemark);

        const tRemark = generateTeacherRemark(
          processed,
          student.attendancePresent ?? 0,
          currentSettings.totalAttendanceDays ?? 0,
          currentSettings.level,
          usedTeacherRemarks,
        );
        usedTeacherRemarks.push(tRemark);

        const attendancePercent =
          (currentSettings.totalAttendanceDays ?? 0) > 0
            ? ((student.attendancePresent ?? 0) / (currentSettings.totalAttendanceDays ?? 0)) * 100
            : 100;
        const attRating = generateAttendanceRating(attendancePercent);

        const conduct = student.conduct || getRandomConductTrait();
        const interest = student.interest || getRandomInterest();

        if (onProgress) {
          queueMicrotask(() => onProgress(index + 1, total));
        }

        return {
          ...student,
          headMasterRemark: hRemark,
          teacherRemark: tRemark,
          attendanceRemark: attRating,
          conduct,
          interest,
        };
      });

      handleSetStudents(updatedStudents);
      showToast("Remarks auto-generated and distributed uniquely!", "success");
      if (total > 0) {
        const demoCount = currentStudents.filter((s) => isDemoStudent(s)).length;
        const realCount = total - demoCount;
        captureEvent("Auto_Remarks_Generated", {
          students_count: total,
          real_students_count: realCount,
          demo_students_count: demoCount,
          is_demo: demoCount > 0 && realCount === 0,
          school_level: currentSettings.level || "unknown",
          term: currentSettings.term || "unknown",
        });
      }
    },
    [handleSetStudents, showToast],
  );

  const openStartFreshConfirm = useCallback(() => {
    if (isLockedRef.current || freshWritesStartedRef.current) return;
    setActiveRecoveryAction("fresh");
    setShowFreshConfirm(true);
  }, []);

  const actionsValue = useMemo<SchoolActionsType>(
    () => ({
      setSettings: handleSetSettings,
      addStudent,
      deleteStudent,
      deletePendingStudents,
      updateStudent,
      clearAllScores,
      clearAllStudents,
      clearStudentScores,
      removeAllStudentPhotos,
      resetAllAppData,
      loadDemoData,
      updateClassNameForAll,
      detectComponentMismatches,
      syncSubjectComponentsFromSettings,
      applySbaConfig,
      updateAssessmentWeights,
      checkDuplicateName,
      restoreDefaults,
      autoGenerateRemarks,
      retryLoad,
      startFresh: openStartFreshConfirm,
      suspendPersistence,
      resumePersistence,
      markIncompleteRollback,
      clearIncompleteRollback,
      setActiveRecoveryAction: handleSetActiveRecoveryAction,
      waitForMigration,
    }),
    [
      addStudent,
      applySbaConfig,
      autoGenerateRemarks,
      checkDuplicateName,
      clearAllScores,
      clearAllStudents,
      clearIncompleteRollback,
      clearStudentScores,
      deletePendingStudents,
      deleteStudent,
      detectComponentMismatches,
      handleSetActiveRecoveryAction,
      handleSetSettings,
      loadDemoData,
      markIncompleteRollback,
      openStartFreshConfirm,
      removeAllStudentPhotos,
      resetAllAppData,
      restoreDefaults,
      resumePersistence,
      retryLoad,
      suspendPersistence,
      syncSubjectComponentsFromSettings,
      updateAssessmentWeights,
      updateClassNameForAll,
      updateStudent,
      waitForMigration,
    ],
  );

  const lifecycleValue = useMemo<SchoolLifecycleType>(
    () => ({
      isDataLoaded,
      isStorageReady,
      loadStatus,
      loadError: hasLoadError,
      isPersistenceSuspended,
      isRollbackIncomplete,
      isSaving,
      lastSaved,
      activeRecoveryAction,
    }),
    [
      activeRecoveryAction,
      hasLoadError,
      isDataLoaded,
      isPersistenceSuspended,
      isRollbackIncomplete,
      isSaving,
      isStorageReady,
      lastSaved,
      loadStatus,
    ],
  );

  const combinedContextValue = useMemo<SchoolContextType>(
    () => ({
      students: processedStudents,
      settings,
      ...actionsValue,
      ...lifecycleValue,
    }),
    [actionsValue, lifecycleValue, processedStudents, settings],
  );

  return (
    <SchoolActionsContext.Provider value={actionsValue}>
      <SchoolSettingsContext.Provider value={settings}>
        <SchoolStudentsContext.Provider value={processedStudents}>
          <SchoolLifecycleContext.Provider value={lifecycleValue}>
            <SchoolContext.Provider value={combinedContextValue}>
              {children}
              <ConfirmModal
                isOpen={showFreshConfirm}
                title="Start fresh?"
                message="This replaces any saved data on this device. Restore a backup first if you need it."
                confirmText="Start fresh"
                cancelText="Cancel"
                isDangerous
                onConfirm={startFresh}
                onCancel={() => {
                  if (!freshWritesStartedRef.current) {
                    ++freshOpTokenRef.current;
                    setActiveRecoveryAction(null);
                  }
                }}
                onClose={() => {
                  setShowFreshConfirm(false);
                }}
              />
            </SchoolContext.Provider>
          </SchoolLifecycleContext.Provider>
        </SchoolStudentsContext.Provider>
      </SchoolSettingsContext.Provider>
    </SchoolActionsContext.Provider>
  );
}
