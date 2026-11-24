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
import type { ExamType, SavedSubject, SchoolSettings, StudentRecord } from "../types";
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
import { createDemoStudents } from "../utils/demoData";
import { applyAutoRemarksToStudents } from "../utils/remarksBatch";
import { areSettingsEqual } from "../utils/settingsEquality";
import { stripDerivedStudentFields } from "../utils/studentSanitizer";
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
  saveEntriesToStorage,
  IDB_KEYS,
  migrateFromLocalStorage,
  getStorageType,
  subscribeToStorageSync,
} from "../utils/idbStorage";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  CHUNK_RELOAD_KEY,
  hasUnsavedChanges as hasGlobalUnsavedChanges,
  setUnsavedChanges,
} from "../utils/preloadErrorHandler";
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
  const lastPersistedStudentsRef = useRef<StudentRecord[] | null>(null);
  const lastPersistedSettingsRef = useRef<SchoolSettings | null>(null);
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
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // ✅ PERFORMANCE: Debounce storage writes to prevent UI blocking
  const debouncedStudents = useDebounce(students, 500);
  const debouncedSettings = useDebounce(settings, 500);

  // ✅ AUTO-SAVE STATE TRACKING
  const [lastSaved, setLastSaved] = useState<Date>();
  const [studentsSaveError, setStudentsSaveError] = useState<string | null>(null);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const saveError = studentsSaveError ?? settingsSaveError;

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
      if (areSettingsEqual(next, prev)) {
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
      const prev = studentsRef.current;
      const rawNext = typeof value === "function" ? value(prev) : value;
      const next = rawNext.map(stripDerivedStudentFields);
      studentsRef.current = next;
      setUnsavedChanges("school-context-debounce", true);
      setStudents(next);
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
            const hydratedStudents = parsed.data as StudentRecord[];
            lastPersistedStudentsRef.current = hydratedStudents;
            studentsRef.current = hydratedStudents;
            setStudents(hydratedStudents);
            setStudentsSaveError(null);
          } else {
            console.error("Corrupted student records in storage:", parsed.error);
            studentsLoadStatus = "error";
          }
        } else if (studentsResult.status === "empty") {
          const emptyStudents: StudentRecord[] = [];
          lastPersistedStudentsRef.current = emptyStudents;
          studentsRef.current = emptyStudents;
          setStudents(emptyStudents);
          setStudentsSaveError(null);
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
              const hydratedSettings = validated as unknown as SchoolSettings;
              lastPersistedSettingsRef.current = hydratedSettings;
              settingsRef.current = hydratedSettings;
              setSettings(hydratedSettings);
              setSettingsSaveError(null);
            } catch (err) {
              console.error("Corrupted settings in storage:", err);
              settingsLoadStatus = "error";
            }
          } else {
            console.error("Corrupted settings in storage (not an object):", settingsResult.value);
            settingsLoadStatus = "error";
          }
        } else if (settingsResult.status === "empty") {
          lastPersistedSettingsRef.current = DEFAULT_FACTORY_SETTINGS;
          settingsRef.current = DEFAULT_FACTORY_SETTINGS;
          setSettings(DEFAULT_FACTORY_SETTINGS);
          setSettingsSaveError(null);
        } else {
          settingsLoadStatus = "error";
        }
        const hasNoErrors = studentsLoadStatus === "ok" && settingsLoadStatus === "ok";

        setLoadStatus({
          students: studentsLoadStatus,
          settings: settingsLoadStatus,
        });

        if (hasNoErrors) {
          const dataLossChecked = sessionStorage.getItem("data_loss_checked");
          if (
            !dataLossChecked &&
            detectDataLoss({
              studentsEmpty: studentsResult.status === "empty",
              settingsEmpty: settingsResult.status === "empty",
            })
          ) {
            showToastRef.current(
              "⚠️ Data may have been cleared. Please restore from backup if needed.",
              "error",
            );
            sessionStorage.setItem("data_loss_checked", "true");
            captureEvent("Data_Loss_Detected", { storage_type: getStorageType() });
          }

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

  // Cross-tab BroadcastChannel sync after initial hydration settles
  useEffect(() => {
    if (!isDataLoaded) return;
    let isCancelled = false;

    const unsubscribe = subscribeToStorageSync((keys) => {
      if (persistenceSuspendedRef.current) return;
      const syncStudents = keys.includes(IDB_KEYS.STUDENTS);
      const syncSettings = keys.includes(IDB_KEYS.SETTINGS);
      if (!syncStudents && !syncSettings) return;

      void (async () => {
        if (syncStudents) {
          const studentsResult = await loadFromStorageResult<StudentRecord[]>(IDB_KEYS.STUDENTS);
          if (isCancelled || persistenceSuspendedRef.current) return;
          if (studentsResult.status === "found") {
            const parsed = z.array(compatibleStudentSchema).safeParse(studentsResult.value);
            if (parsed.success) {
              const nextStudents = (parsed.data as StudentRecord[]).map(stripDerivedStudentFields);
              ++studentsWriteSeqRef.current;
              lastPersistedStudentsRef.current = nextStudents;
              studentsRef.current = nextStudents;
              setStudents(nextStudents);
              setStudentsSaveError(null);
              setUnsavedChanges("school-context-students-write", false);
            }
          } else if (studentsResult.status === "empty") {
            const emptyStudents: StudentRecord[] = [];
            ++studentsWriteSeqRef.current;
            lastPersistedStudentsRef.current = emptyStudents;
            studentsRef.current = emptyStudents;
            setStudents(emptyStudents);
            setStudentsSaveError(null);
            setUnsavedChanges("school-context-students-write", false);
          }
        }

        if (syncSettings) {
          const settingsResult = await loadFromStorageResult<SchoolSettings>(IDB_KEYS.SETTINGS);
          if (isCancelled || persistenceSuspendedRef.current) return;
          if (
            settingsResult.status === "found" &&
            settingsResult.value &&
            typeof settingsResult.value === "object" &&
            !Array.isArray(settingsResult.value)
          ) {
            try {
              const validated = mergeSettings(
                settingsResult.value as unknown as Record<string, unknown>,
              );
              const nextSettings = validated as unknown as SchoolSettings;
              ++settingsWriteSeqRef.current;
              lastPersistedSettingsRef.current = nextSettings;
              settingsRef.current = nextSettings;
              setSettings(nextSettings);
              setSettingsSaveError(null);
              setUnsavedChanges("school-context-settings-write", false);
            } catch (err) {
              console.error("Failed to sync settings from another tab:", err);
            }
          } else if (settingsResult.status === "empty") {
            ++settingsWriteSeqRef.current;
            lastPersistedSettingsRef.current = DEFAULT_FACTORY_SETTINGS;
            settingsRef.current = DEFAULT_FACTORY_SETTINGS;
            setSettings(DEFAULT_FACTORY_SETTINGS);
            setSettingsSaveError(null);
            setUnsavedChanges("school-context-settings-write", false);
          }
        }
      })();
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isDataLoaded]);

  const hasLoadError = loadStatus.students === "error" || loadStatus.settings === "error";

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until initial load complete
    if (persistenceSuspendedRef.current) return;
    if (loadStatus.students === "error") return;
    if (debouncedStudents !== students) return; // Wait for the hydrated snapshot to settle
    if (Object.is(debouncedStudents, lastPersistedStudentsRef.current)) return; // Skip redundant cold-boot rewrites

    const seq = ++studentsWriteSeqRef.current;
    const snapshot = debouncedStudents;
    setUnsavedChanges("school-context-students-write", true);
    Promise.resolve(saveToStorage(IDB_KEYS.STUDENTS, snapshot))
      .then((saved) => {
        if (studentsWriteSeqRef.current !== seq) return;
        if (saved !== false) {
          lastPersistedStudentsRef.current = snapshot;
          setUnsavedChanges("school-context-students-write", false);
          setStudentsSaveError(null);
          if (!hasLoadError) createBackupHeartbeat();
          setLastSaved(new Date());
        } else {
          setStudentsSaveError("Changes couldn't be saved. Check device storage.");
        }
      })
      .catch(() => {
        if (studentsWriteSeqRef.current === seq) {
          setStudentsSaveError("Changes couldn't be saved. Check device storage.");
        }
      });
  }, [debouncedStudents, hasLoadError, isDataLoaded, loadStatus.students, resumeGeneration, students]);

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until initial load complete
    if (persistenceSuspendedRef.current) return;
    if (loadStatus.settings === "error") return;
    if (debouncedSettings !== settings) return; // Wait for the hydrated snapshot to settle
    if (Object.is(debouncedSettings, lastPersistedSettingsRef.current)) return; // Skip redundant cold-boot rewrites

    const seq = ++settingsWriteSeqRef.current;
    const snapshot = debouncedSettings;
    setUnsavedChanges("school-context-settings-write", true);
    Promise.resolve(saveToStorage(IDB_KEYS.SETTINGS, snapshot))
      .then((saved) => {
        if (settingsWriteSeqRef.current !== seq) return;
        if (saved !== false) {
          lastPersistedSettingsRef.current = snapshot;
          setUnsavedChanges("school-context-settings-write", false);
          setSettingsSaveError(null);
          if (!hasLoadError) createBackupHeartbeat();
          setLastSaved(new Date());
        } else {
          setSettingsSaveError("Changes couldn't be saved. Check device storage.");
        }
      })
      .catch(() => {
        if (settingsWriteSeqRef.current === seq) {
          setSettingsSaveError("Changes couldn't be saved. Check device storage.");
        }
      });
  }, [debouncedSettings, hasLoadError, isDataLoaded, loadStatus.settings, resumeGeneration, settings]);

  const flushPendingWrites = useCallback(async (): Promise<boolean> => {
    if (!isDataLoaded || persistenceSuspendedRef.current) {
      return false;
    }

    const studentsSnapshot = studentsRef.current;
    const settingsSnapshot = settingsRef.current;
    const flushStudents =
      loadStatus.students !== "error" &&
      !Object.is(studentsSnapshot, lastPersistedStudentsRef.current);
    const flushSettings =
      loadStatus.settings !== "error" &&
      !Object.is(settingsSnapshot, lastPersistedSettingsRef.current);

    if (!flushStudents && !flushSettings) {
      return true;
    }

    const entries: Array<{ key: string; value: unknown }> = [];
    const sSeq = flushStudents ? ++studentsWriteSeqRef.current : studentsWriteSeqRef.current;
    const cfgSeq = flushSettings ? ++settingsWriteSeqRef.current : settingsWriteSeqRef.current;

    if (flushStudents) {
      setUnsavedChanges("school-context-students-write", true);
      entries.push({ key: IDB_KEYS.STUDENTS, value: studentsSnapshot });
    }
    if (flushSettings) {
      setUnsavedChanges("school-context-settings-write", true);
      entries.push({ key: IDB_KEYS.SETTINGS, value: settingsSnapshot });
    }

    try {
      const saved =
        entries.length === 1
          ? await saveToStorage(entries[0].key, entries[0].value)
          : await saveEntriesToStorage(entries);

      if (saved !== false) {
        if (flushStudents && studentsWriteSeqRef.current === sSeq) {
          lastPersistedStudentsRef.current = studentsSnapshot;
          setUnsavedChanges("school-context-students-write", false);
          setStudentsSaveError(null);
        }
        if (flushSettings && settingsWriteSeqRef.current === cfgSeq) {
          lastPersistedSettingsRef.current = settingsSnapshot;
          setUnsavedChanges("school-context-settings-write", false);
          setSettingsSaveError(null);
        }
        if (!hasLoadError) createBackupHeartbeat();
        setLastSaved(new Date());
        return true;
      }

      if (flushStudents && studentsWriteSeqRef.current === sSeq) {
        setStudentsSaveError("Changes couldn't be saved. Check device storage.");
      }
      if (flushSettings && settingsWriteSeqRef.current === cfgSeq) {
        setSettingsSaveError("Changes couldn't be saved. Check device storage.");
      }
      return false;
    } catch {
      if (flushStudents && studentsWriteSeqRef.current === sSeq) {
        setStudentsSaveError("Changes couldn't be saved. Check device storage.");
      }
      if (flushSettings && settingsWriteSeqRef.current === cfgSeq) {
        setSettingsSaveError("Changes couldn't be saved. Check device storage.");
      }
      return false;
    }
  }, [hasLoadError, isDataLoaded, loadStatus.settings, loadStatus.students]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasDirtyState = () =>
      (lastPersistedStudentsRef.current !== null &&
        !Object.is(studentsRef.current, lastPersistedStudentsRef.current)) ||
      (lastPersistedSettingsRef.current !== null &&
        !Object.is(settingsRef.current, lastPersistedSettingsRef.current));

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasGlobalUnsavedChanges() || hasDirtyState()) {
        void flushPendingWrites();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const handlePageHide = () => {
      if (hasDirtyState()) {
        void flushPendingWrites();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && hasDirtyState()) {
        void flushPendingWrites();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushPendingWrites]);

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
      const emptyStudents: StudentRecord[] = [];
      persistenceSuspendedRef.current = true;
      setIsPersistenceSuspended(true);
      studentsRef.current = emptyStudents;
      settingsRef.current = defaultSettings;
      setStudents(emptyStudents);
      setSettings(defaultSettings);
      const saved = await saveEntriesToStorage([
        { key: IDB_KEYS.STUDENTS, value: [] },
        { key: IDB_KEYS.SETTINGS, value: defaultSettings },
      ]);
      if (!saved) {
        markIncompleteRollback();
        showToast("Could not save fresh data. Recovery remains active.", "error");
        return;
      }
      lastPersistedStudentsRef.current = emptyStudents;
      lastPersistedSettingsRef.current = defaultSettings;
      setStudentsSaveError(null);
      setSettingsSaveError(null);
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

      const saved = await saveEntriesToStorage([
        { key: IDB_KEYS.STUDENTS, value: [] },
        { key: IDB_KEYS.SETTINGS, value: DEFAULT_FACTORY_SETTINGS },
      ]);

      if (!saved) {
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
        "repota_idb_migrated",
        "welcome_tour_completed",
        "repota_welcome_tour_v2",
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
        sessionStorage.removeItem("repota_dismiss_photo_warning");
        sessionStorage.removeItem("data_loss_checked");
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

      const emptyStudents: StudentRecord[] = [];
      ++studentsWriteSeqRef.current;
      ++settingsWriteSeqRef.current;
      lastPersistedStudentsRef.current = emptyStudents;
      lastPersistedSettingsRef.current = DEFAULT_FACTORY_SETTINGS;
      studentsRef.current = emptyStudents;
      settingsRef.current = DEFAULT_FACTORY_SETTINGS;
      isSavingRef.current = false;
      setStudentsSaveError(null);
      setSettingsSaveError(null);
      setStudents(emptyStudents);
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

  const batchUpdateStudents = useCallback(
    (updater: (prev: StudentRecord[]) => StudentRecord[], options?: { silent?: boolean }) => {
      handleSetStudents(updater);
      if (!options?.silent) {
        showToast("Changes saved successfully!", "success");
      }
    },
    [handleSetStudents, showToast],
  );

  const syncClassSubjectsAndSba = useCallback(() => {
    const currentSettings = settingsRef.current;
    const masterList = currentSettings.defaultSubjects || [];
    const currentStudents = studentsRef.current;
    let subjectsAddedCount = 0;

    const withAddedSubjects = currentStudents.map((student) => {
      const missing = masterList.filter(
        (name) => !student.subjects.some((sub) => sub.name === name),
      );
      if (missing.length === 0) return student;
      subjectsAddedCount += missing.length;
      const additions: SavedSubject[] = missing.map((name) => ({
        id: crypto.randomUUID(),
        name,
        classScore: 0,
        examScore: 0,
        ...(currentSettings.examType !== "MOCK" &&
        currentSettings.subjectComponentMap?.[name]?.length
          ? {
              classScoreComponents: currentSettings.subjectComponentMap[name].map((task) => ({
                id: crypto.randomUUID(),
                name: task.name,
                score: 0,
                maxScore: task.maxScore,
                category: task.category,
              })),
            }
          : {}),
      }));
      return { ...student, subjects: [...student.subjects, ...additions] };
    });

    const { students: reconciled, modifiedStudentCount } = reconcileStudentsWithSbaConfig(
      withAddedSubjects,
      currentSettings,
      { onClearTasks: "preserve_class_score" },
    );

    if (subjectsAddedCount > 0 || modifiedStudentCount > 0) {
      handleSetStudents(reconciled);
    }

    if (subjectsAddedCount > 0 && modifiedStudentCount > 0) {
      showToast(
        `Added ${subjectsAddedCount} missing subject entries and synced SBA components!`,
        "success",
      );
    } else if (subjectsAddedCount > 0) {
      showToast(
        `Added ${subjectsAddedCount} missing subject entries across the class.`,
        "success",
      );
    } else if (modifiedStudentCount > 0) {
      showToast(
        `Synced components for ${modifiedStudentCount} student${modifiedStudentCount > 1 ? "s" : ""}`,
        "success",
      );
    } else {
      const map = currentSettings.subjectComponentMap ?? {};
      const hasConfigured = Object.values(map).some((list) => list.length > 0);
      const hasStudentComponents = withAddedSubjects.some((student) =>
        student.subjects.some((sub) => Boolean(sub.classScoreComponents?.length)),
      );
      if (!hasConfigured && !hasStudentComponents) {
        showToast("No components configured in Settings", "info");
      } else {
        showToast("All students already up to date", "info");
      }
    }

    return { subjectsAddedCount, sbaSyncedCount: modifiedStudentCount };
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

      if (weightsChanged || prevSettings.examType !== nextExamType) {
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
    const demoStudents = createDemoStudents(currentSettings);
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
      const total = currentStudents.length;

      const updatedStudents = applyAutoRemarksToStudents(
        currentStudents,
        currentSettings,
        onProgress,
      );

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
      batchUpdateStudents,
      clearAllScores,
      clearAllStudents,
      clearStudentScores,
      removeAllStudentPhotos,
      resetAllAppData,
      loadDemoData,
      updateClassNameForAll,
      detectComponentMismatches,
      syncSubjectComponentsFromSettings,
      syncClassSubjectsAndSba,
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
      flushPendingWrites,
    }),
    [
      addStudent,
      applySbaConfig,
      autoGenerateRemarks,
      batchUpdateStudents,
      checkDuplicateName,
      clearAllScores,
      clearAllStudents,
      clearIncompleteRollback,
      clearStudentScores,
      deletePendingStudents,
      deleteStudent,
      detectComponentMismatches,
      flushPendingWrites,
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
      syncClassSubjectsAndSba,
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
      saveError,
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
      saveError,
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
