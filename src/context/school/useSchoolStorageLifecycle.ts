import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_FACTORY_SETTINGS, DEFAULT_SETTINGS } from "../../constants/defaultSettings";
import { useDebounce } from "../../hooks/useDebounce";
import type { ToastType } from "../../hooks/useToast";
import type { SchoolSettings, StudentRecord } from "../../types";
import { captureEvent } from "../../utils/analytics";
import {
  createBackupHeartbeat,
  detectDataLoss,
  requestPersistentStorage,
} from "../../utils/dataProtection";
import {
  IDB_KEYS,
  getStorageType,
  initStorage,
  loadFromStorageResult,
  migrateFromLocalStorage,
  saveEntriesToStorage,
  saveToStorage,
  subscribeToStorageSync,
} from "../../utils/idbStorage";
import {
  hasUnsavedChanges as hasGlobalUnsavedChanges,
  setUnsavedChanges,
} from "../../utils/preloadErrorHandler";
import { areSettingsEqual } from "../../utils/settingsEquality";
import { stripDerivedStudentFields } from "../../utils/studentSanitizer";
import type { RecoveryAction } from "../SchoolContextDefinition";
import {
  LOAD_TIMEOUT_MS,
  MIGRATION_WAIT_TIMEOUT_MS,
  type LoadKeyStatus,
  type LoadStatus,
  clearResetDevicePreferences,
  parseHydratedSettingsValue,
  parseHydratedStudentsValue,
  readIncompleteRollbackFlag,
  writeIncompleteRollbackFlag,
} from "./schoolStorageHelpers";

type ShowToastFn = (
  message: string,
  type?: ToastType,
  action?: { label: string; onClick: () => void },
) => void;

export function useSchoolStorageLifecycle({
  isLocked,
  showToast,
}: {
  isLocked: boolean;
  showToast: ShowToastFn;
}) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const studentsRef = useRef<StudentRecord[]>([]);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<SchoolSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ students: "ok", settings: "ok" });
  const [showFreshConfirm, setShowFreshConfirm] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const loadAttemptRef = useRef(0);

  const initialRollbackIncomplete = readIncompleteRollbackFlag();
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

  const debouncedStudents = useDebounce(students, 500);
  const debouncedSettings = useDebounce(settings, 500);

  const [lastSaved, setLastSaved] = useState<Date>();
  const [studentsSaveError, setStudentsSaveError] = useState<string | null>(null);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const saveError = studentsSaveError ?? settingsSaveError;

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

  // Initialize IndexedDB, run localStorage migration, and hydrate initial state
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
        await initStorage();
        if (loadAttemptRef.current !== attempt || timedOut) return;
        storageReadyRef.current = true;
        setIsStorageReady(true);

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

        let studentsLoadStatus: LoadKeyStatus = "ok";
        const studentsResult = await loadFromStorageResult<StudentRecord[]>(IDB_KEYS.STUDENTS);
        if (loadAttemptRef.current !== attempt || timedOut) return;
        if (studentsResult.status === "found") {
          const hydratedStudents = parseHydratedStudentsValue(studentsResult.value);
          if (hydratedStudents) {
            lastPersistedStudentsRef.current = hydratedStudents;
            studentsRef.current = hydratedStudents;
            setStudents(hydratedStudents);
            setStudentsSaveError(null);
          } else {
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

        let settingsLoadStatus: LoadKeyStatus = "ok";
        const settingsResult = await loadFromStorageResult<SchoolSettings>(IDB_KEYS.SETTINGS);
        if (loadAttemptRef.current !== attempt || timedOut) return;
        if (settingsResult.status === "found") {
          const hydratedSettings = parseHydratedSettingsValue(settingsResult.value);
          if (hydratedSettings) {
            lastPersistedSettingsRef.current = hydratedSettings;
            settingsRef.current = hydratedSettings;
            setSettings(hydratedSettings);
            setSettingsSaveError(null);
          } else {
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
        setLoadStatus({ students: studentsLoadStatus, settings: settingsLoadStatus });

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

          if (!readIncompleteRollbackFlag()) {
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
  }, [loadAttempt]);

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
            const nextStudents = parseHydratedStudentsValue(studentsResult.value, true);
            if (nextStudents) {
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
          if (settingsResult.status === "found") {
            const nextSettings = parseHydratedSettingsValue(
              settingsResult.value,
              "another tab sync",
            );
            if (nextSettings) {
              ++settingsWriteSeqRef.current;
              lastPersistedSettingsRef.current = nextSettings;
              settingsRef.current = nextSettings;
              setSettings(nextSettings);
              setSettingsSaveError(null);
              setUnsavedChanges("school-context-settings-write", false);
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
    if (!isDataLoaded || persistenceSuspendedRef.current || loadStatus.students === "error") return;
    if (debouncedStudents !== students) return;
    if (Object.is(debouncedStudents, lastPersistedStudentsRef.current)) return;

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
    if (!isDataLoaded || persistenceSuspendedRef.current || loadStatus.settings === "error") return;
    if (debouncedSettings !== settings) return;
    if (Object.is(debouncedSettings, lastPersistedSettingsRef.current)) return;

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
    writeIncompleteRollbackFlag(true);
    suspendedUntilHydratedRef.current = true;
    persistenceSuspendedRef.current = true;
    setIsPersistenceSuspended(true);
    setIsRollbackIncomplete(true);
  }, []);

  const clearIncompleteRollback = useCallback(() => {
    writeIncompleteRollbackFlag(false);
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
      showToastRef.current("Storage is not ready. Try again after recovery finishes.", "error");
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
        showToastRef.current("Could not save fresh data. Recovery remains active.", "error");
        return;
      }
      lastPersistedStudentsRef.current = emptyStudents;
      lastPersistedSettingsRef.current = defaultSettings;
      setStudentsSaveError(null);
      setSettingsSaveError(null);
      writeIncompleteRollbackFlag(false);
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
        showToastRef.current(
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
  }, [markIncompleteRollback, waitForMigration]);

  const openStartFreshConfirm = useCallback(() => {
    if (isLockedRef.current || freshWritesStartedRef.current) return;
    setActiveRecoveryAction("fresh");
    setShowFreshConfirm(true);
  }, []);

  const cancelStartFreshConfirm = useCallback(() => {
    if (!freshWritesStartedRef.current) {
      ++freshOpTokenRef.current;
      setActiveRecoveryAction(null);
    }
  }, []);

  const closeStartFreshConfirm = useCallback(() => {
    setShowFreshConfirm(false);
  }, []);

  const resetAllAppData = useCallback(async (): Promise<boolean> => {
    if (isLockedRef.current || freshWritesStartedRef.current) {
      return false;
    }
    if (!storageReadyRef.current) {
      showToastRef.current("Storage is not ready. Try again shortly.", "error");
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
        showToastRef.current("Could not reset app data. Please try again.", "error");
        return false;
      }

      clearResetDevicePreferences();

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
      showToastRef.current(
        error instanceof Error ? error.message : "Could not reset app data. Please try again.",
        "error",
      );
      return false;
    } finally {
      if (startedWrites) {
        freshWritesStartedRef.current = false;
      }
    }
  }, [waitForMigration]);

  // Request persistent storage on mount (Android protection)
  useEffect(() => {
    requestPersistentStorage();
  }, []);

  return {
    students,
    studentsRef,
    settings,
    settingsRef,
    handleSetStudents,
    handleSetSettings,
    isDataLoaded,
    isStorageReady,
    loadStatus,
    hasLoadError,
    isPersistenceSuspended,
    isRollbackIncomplete,
    isSaving,
    saveError,
    lastSaved,
    activeRecoveryAction,
    showFreshConfirm,
    startFresh,
    openStartFreshConfirm,
    cancelStartFreshConfirm,
    closeStartFreshConfirm,
    retryLoad,
    suspendPersistence,
    resumePersistence,
    markIncompleteRollback,
    clearIncompleteRollback,
    handleSetActiveRecoveryAction,
    waitForMigration,
    flushPendingWrites,
    resetAllAppData,
  };
}
