import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import posthog from "posthog-js";
import { DEFAULT_SETTINGS } from "../constants/defaultSettings";
import { processStudent, assignPositions, assignSubjectPositions } from "../utils/gradeCalculator";
import type { StudentRecord, SchoolSettings, SavedSubject } from "../types";
import { useToast } from "../hooks/useToast";
import { useDebounce } from "../hooks/useDebounce";
// ✅ Import definition
import { SchoolContext } from "./SchoolContextDefinition";
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
import type { RecoveryAction } from "./SchoolContextDefinition";
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
import { setUnsavedChanges } from "../utils/preloadErrorHandler";

export const LOAD_TIMEOUT_MS = 10_000;
export const MIGRATION_WAIT_TIMEOUT_MS = 10_000;
type LoadKeyStatus = "ok" | "error";
type LoadStatus = { students: LoadKeyStatus; settings: LoadKeyStatus };

const DEFAULT_FACTORY_SETTINGS: SchoolSettings = {
  ...DEFAULT_SETTINGS,
  examType: "TERMLY",
  componentLibrary: [],
  subjectComponentMap: {},
};

export function SchoolProvider({
  children,
  isLocked = false,
}: {
  children: ReactNode;
  isLocked?: boolean;
}) {
  // State with empty initialization (will load from IndexedDB)
  const [students, setStudents] = useState<StudentRecord[]>([]);
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
      setStudents(value);
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

  const restoreDefaults = () => {
    handleSetSettings(DEFAULT_FACTORY_SETTINGS);
    showToast("Settings restored to factory defaults.", "success");
  };

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

  const retryLoad = () => {
    if (freshWritesStartedRef.current) return;
    ++freshOpTokenRef.current;
    setActiveRecoveryAction("retry");
    setIsDataLoaded(false);
    setIsStorageReady(false);
    storageReadyRef.current = false;
    setLoadStatus({ students: "ok", settings: "ok" });
    setLoadAttempt((current) => current + 1);
  };

  const startFresh = async () => {
    if (isLockedRef.current || freshWritesStartedRef.current) {
      return;
    }
    if (!isStorageReady || !storageReadyRef.current) {
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
  };
  const suspendPersistence = () => {
    persistenceSuspendedRef.current = true;
    setIsPersistenceSuspended(true);
  };
  const resumePersistence = () => {
    if (suspendedUntilHydratedRef.current) return;
    persistenceSuspendedRef.current = false;
    setIsPersistenceSuspended(false);
    setResumeGeneration((current) => current + 1);
  };
  const markIncompleteRollback = () => {
    try {
      localStorage.setItem("repota_incomplete_rollback", "true");
    } catch {
      // ignore
    }
    suspendedUntilHydratedRef.current = true;
    persistenceSuspendedRef.current = true;
    setIsPersistenceSuspended(true);
    setIsRollbackIncomplete(true);
  };
  const clearIncompleteRollback = () => {
    try {
      localStorage.removeItem("repota_incomplete_rollback");
    } catch {
      // ignore
    }
    setIsRollbackIncomplete(false);
    suspendedUntilHydratedRef.current = false;
  };
  const waitForMigration = async (): Promise<void> => {
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
  };

  // Request persistent storage on mount (Android protection)
  useEffect(() => {
    requestPersistentStorage();

    // Check for data loss (cleared by cleaner apps)
    // Only check once per session to avoid false positives on unlock/remount
    const dataLossChecked = sessionStorage.getItem("data_loss_checked");
    if (!dataLossChecked && detectDataLoss()) {
      showToast("⚠️ Data may have been cleared. Please restore from backup if needed.", "error");
      sessionStorage.setItem("data_loss_checked", "true");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // --- ACTIONS ---

  // 1. ADD
  const addStudent = (student: StudentRecord, silent = false) => {
    handleSetStudents((prev) => [...prev, student]);
    if (!silent && student.name !== "New Student") {
      showToast(`Student "${student.name}" added successfully!`, "success");
      posthog.capture("Added_Student", {
        school_level: settings.level || "unknown",
        school_type: settings.schoolType || "unknown",
      });
    }
  };

  // 2. DELETE (Single)
  const deleteStudent = (id: string) => {
    const studentToDelete = students.find((s) => s.id === id);
    if (!studentToDelete) return;

    handleSetStudents((prev) => prev.filter((s) => s.id !== id));

    showToast("Student moved to trash.", "info", {
      label: "UNDO",
      onClick: () => {
        handleSetStudents((prev) => [...prev, studentToDelete]);
        showToast("Student restored.", "success");
      },
    });
  };

  // 3. 🛑 FIXED: DELETE PENDING (No side effects in setter)
  const deletePendingStudents = () => {
    // A. Calculate what to keep based on CURRENT state
    const active = students.filter(
      (s) =>
        s.subjects.length > 0 && s.subjects.some((sub) => sub.classScore > 0 || sub.examScore > 0),
    );

    const removedCount = students.length - active.length;

    // B. Trigger Side Effect (Toast)
    if (removedCount > 0) {
      showToast(`Cleaned up ${removedCount} incomplete records.`, "success");
      // C. Update State
      handleSetStudents(active);
    } else {
      showToast("No pending students found.", "info");
    }
  };

  // 4. UPDATE
  const updateStudent = (updatedStudent: StudentRecord, silent = false) => {
    handleSetStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    if (!silent) {
      showToast(`Changes saved successfully!`, "success");
    }
  };

  // 4B. CLEAR ALL SCORES (keeps students, zeros their scores)
  const clearAllScores = () => {
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
    showToast(`All scores cleared for ${students.length} students!`, "success");
  };

  // 4C. CLEAR SINGLE STUDENT SCORES
  const clearStudentScores = (id: string) => {
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
  };

  // 4D. REMOVE ALL STUDENT PHOTOS (Storage cleanup helper)
  const removeAllStudentPhotos = () => {
    let removedCount = 0;
    handleSetStudents((prev) =>
      prev.map((student) => {
        if (student.pictureUrl) {
          removedCount++;
          return { ...student, pictureUrl: undefined };
        }
        return student;
      }),
    );

    if (removedCount > 0) {
      showToast(`Removed ${removedCount} student photos to free up storage.`, "success");
    } else {
      showToast("No student photos found.", "info");
    }
  };

  // 5. MASS UPDATE
  const updateClassNameForAll = (newClassName: string) => {
    handleSetStudents((prev) => prev.map((s) => ({ ...s, className: newClassName })));
  };

  // 5B. DETECT COMPONENT MISMATCHES
  // Check if any students have outdated/missing components compared to settings
  const detectComponentMismatches = () => {
    const { subjectComponentMap } = settings;

    if (!subjectComponentMap || Object.keys(subjectComponentMap).length === 0) {
      return { hasOutdated: false, hasMissing: false };
    }

    let hasOutdated = false;
    let hasMissing = false;

    for (const student of students) {
      for (const subject of student.subjects) {
        const settingsComponents = subjectComponentMap[subject.name] || [];
        const currentComponents = subject.classScoreComponents || [];

        // Check if settings has components but student doesn't
        if (settingsComponents.length > 0 && currentComponents.length === 0) {
          hasMissing = true;
        }

        // Check for missing or outdated components
        for (const config of settingsComponents) {
          const existing = currentComponents.find((c) => c.name === config.name);
          if (!existing) {
            hasMissing = true;
          } else if (existing.maxScore !== config.maxScore) {
            hasOutdated = true;
          }
        }

        // Check for components that should be removed
        for (const current of currentComponents) {
          if (!settingsComponents.some((config) => config.name === current.name)) {
            hasOutdated = true;
          }
        }

        if (hasOutdated && hasMissing) {
          return { hasOutdated, hasMissing }; // Early exit
        }
      }
    }

    return { hasOutdated, hasMissing };
  };

  // 5C. SYNC SUBJECT COMPONENTS FROM SETTINGS (MANUAL)
  // This ensures all students' subjects have the components assigned in settings
  const syncSubjectComponentsFromSettings = () => {
    const { subjectComponentMap } = settings;

    if (!subjectComponentMap || Object.keys(subjectComponentMap).length === 0) {
      showToast("No components configured in Settings", "info");
      return;
    }

    let syncedCount = 0;

    handleSetStudents((prev) =>
      prev.map((student) => {
        let studentModified = false;

        const updatedSubjects = student.subjects.map((subject) => {
          const settingsComponents = subjectComponentMap[subject.name];

          // If this subject has no components in settings, remove them from student
          if (!settingsComponents || settingsComponents.length === 0) {
            if (subject.classScoreComponents && subject.classScoreComponents.length > 0) {
              studentModified = true;
              return {
                ...subject,
                classScoreComponents: undefined,
                classScore: 0, // Reset to manual entry
              };
            }
            return subject;
          }

          // Subject has components in settings - sync them
          const currentComponents = subject.classScoreComponents || [];

          // Create component instances from settings configs, preserving existing scores
          const syncedComponents = settingsComponents.map((config) => {
            // Find existing component with same name to preserve score
            const existing = currentComponents.find((c) => c.name === config.name);

            if (existing) {
              // Update maxScore if it changed, preserve score
              if (existing.maxScore !== config.maxScore) {
                studentModified = true;
                return {
                  ...existing,
                  maxScore: config.maxScore,
                  score: Math.min(existing.score, config.maxScore), // Cap score to new max
                };
              }
              return existing;
            }

            // New component - create with score 0
            studentModified = true;
            return {
              id: crypto.randomUUID(),
              name: config.name,
              score: 0,
              maxScore: config.maxScore,
              category: config.category, // Preserve category from settings
            };
          });

          // Remove components that are no longer in settings
          const removedComponents = currentComponents.filter(
            (current) => !settingsComponents.some((config) => config.name === current.name),
          );

          if (removedComponents.length > 0) {
            studentModified = true;
          }

          // Recalculate class score if components changed
          if (studentModified) {
            const totalScore = syncedComponents.reduce((sum, c) => sum + c.score, 0);
            const totalMax = syncedComponents.reduce((sum, c) => sum + c.maxScore, 0);
            const percentage = totalMax > 0 ? totalScore / totalMax : 0;
            const convertedClassScore = Math.round(percentage * settings.classScoreMax);

            return {
              ...subject,
              classScoreComponents: syncedComponents,
              classScore: convertedClassScore,
            };
          }

          return {
            ...subject,
            classScoreComponents: syncedComponents,
          };
        });

        if (studentModified) syncedCount++;

        return {
          ...student,
          subjects: updatedSubjects,
        };
      }),
    );

    if (syncedCount > 0) {
      showToast(
        `Synced components for ${syncedCount} student${syncedCount > 1 ? "s" : ""}`,
        "success",
      );
    } else {
      showToast("All students already up to date", "info");
    }
  };

  // 6. DEMO DATA
  const loadDemoData = () => {
    const hasComponents =
      settings.subjectComponentMap && Object.keys(settings.subjectComponentMap).length > 0;

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

      // Check if this subject has components assigned in settings
      const subjectComponents = settings.subjectComponentMap?.[subName];
      if (hasComponents && subjectComponents && subjectComponents.length > 0) {
        // Create realistic component scores that sum to approximate the target class score
        const targetClassScore =
          Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
          classScoreRange[0];
        const targetPercentage = targetClassScore / settings.classScoreMax;
        const totalMaxScore = subjectComponents.reduce((sum, c) => sum + c.maxScore, 0);
        const targetTotalScore = targetPercentage * totalMaxScore;

        // Distribute the target score across components with some variance
        subject.classScoreComponents = subjectComponents.map((config) => {
          const proportion = config.maxScore / totalMaxScore;
          const baseScore = targetTotalScore * proportion;
          // Add small variance ±15%
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
          };
        });

        // Calculate actual class score from components
        const totalActualScore = subject.classScoreComponents!.reduce((sum, c) => sum + c.score, 0);
        subject.classScore = Math.round(
          (totalActualScore / totalMaxScore) * settings.classScoreMax,
        );
      } else {
        // No components - use direct class score
        subject.classScore =
          Math.floor(Math.random() * (classScoreRange[1] - classScoreRange[0] + 1)) +
          classScoreRange[0];
      }

      return subject;
    };

    // Calculate score ranges based on actual max scores
    const classMax = settings.classScoreMax;
    const examMax = settings.examScoreMax;

    const demoStudents: StudentRecord[] = [
      {
        id: "demo-1",
        name: "Kwame Mensah",
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Male",
        subjects: settings.defaultSubjects.map((subName) =>
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
        className: settings.className || "Primary 5A",
        gender: "Female",
        subjects: settings.defaultSubjects.map((subName) =>
          createDemoSubject(
            subName,
            [Math.floor(classMax * 0.76), Math.floor(classMax * 0.96)],
            [Math.floor(examMax * 0.78), Math.floor(examMax * 0.98)],
          ),
        ),
        attendancePresent: 66,
      },
    ];

    if (demoStudents.length > 0) {
      handleSetStudents((prev) => [...prev, ...demoStudents]);
      showToast(`${demoStudents.length} demo students loaded!`, "success");
      posthog.capture("Loaded_Demo_Data", {
        school_level: settings.level || "unknown",
      });
    }
  };

  const checkDuplicateName = (name: string): boolean => {
    return students.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  };

  // 7. COMPUTED DATA
  const processedStudents = useMemo(() => {
    const processed = students.map((student) => processStudent(student, settings.level));
    const withSubjectPositions = assignSubjectPositions(processed);
    return assignPositions(withSubjectPositions);
  }, [students, settings.level]);

  // 8. AUTO-GENERATE REMARKS (Smart Batching with Progress)
  const autoGenerateRemarks = (onProgress?: (current: number, total: number) => void) => {
    // A. Temporary memory for this operation only
    // This ensures we know what was used by Student 1 when we get to Student 2
    const usedHeadmasterRemarks: string[] = [];
    const usedTeacherRemarks: string[] = [];

    const total = students.length;

    // B. Loop through all students with progress tracking
    const updatedStudents = students.map((student, index) => {
      // Need processed stats (average, etc.) for accurate remarks
      const processed = processStudent(student, settings.level);

      // 1. Generate Unique Headmaster Remark
      const hRemark = generateHeadmasterRemark(
        processed.averageScore,
        settings.term,
        usedHeadmasterRemarks, // "Don't use these!"
      );
      usedHeadmasterRemarks.push(hRemark); // Add to used pile

      // 2. Generate Unique Teacher Remark
      const tRemark = generateTeacherRemark(
        processed,
        student.attendancePresent ?? 0,
        settings.totalAttendanceDays ?? 0,
        settings.level,
        usedTeacherRemarks, // "Don't use these!"
      );
      usedTeacherRemarks.push(tRemark); // Add to used pile

      // 3. Generate Attendance Rating (Standard logic)
      const attendancePercent =
        (settings.totalAttendanceDays ?? 0 > 0)
          ? ((student.attendancePresent ?? 0) / (settings.totalAttendanceDays ?? 0)) * 100
          : 100;
      const attRating = generateAttendanceRating(attendancePercent);

      // 4. Fill Conduct/Interest ONLY if empty (Optional - remove checks to overwrite all)
      const conduct = student.conduct || getRandomConductTrait();
      const interest = student.interest || getRandomInterest();

      // Report progress
      if (onProgress) {
        queueMicrotask(() => onProgress(index + 1, total));
      }

      return {
        ...student,
        headMasterRemark: hRemark,
        teacherRemark: tRemark,
        attendanceRemark: attRating,
        conduct: conduct,
        interest: interest,
      };
    });

    // C. Save everyone at once
    handleSetStudents(updatedStudents);
    showToast("Remarks auto-generated and distributed uniquely!", "success");
    posthog.capture("Auto_Remarks_Generated", {
      students_count: students.length,
    });
  };

  return (
    <SchoolContext.Provider
      value={{
        students: processedStudents,
        settings,
        setSettings: handleSetSettings,
        addStudent,
        deleteStudent,
        deletePendingStudents,
        updateStudent,
        clearAllScores,
        clearStudentScores,
        removeAllStudentPhotos,
        loadDemoData,
        updateClassNameForAll,
        detectComponentMismatches,
        syncSubjectComponentsFromSettings,
        checkDuplicateName,
        restoreDefaults,
        autoGenerateRemarks,
        isDataLoaded,
        isStorageReady,
        loadStatus,
        loadError: hasLoadError,
        retryLoad,
        startFresh: () => {
          if (isLockedRef.current || freshWritesStartedRef.current) return;
          setActiveRecoveryAction("fresh");
          setShowFreshConfirm(true);
        },
        suspendPersistence,
        resumePersistence,
        isPersistenceSuspended,
        isRollbackIncomplete,
        markIncompleteRollback,
        clearIncompleteRollback,
        isSaving,
        lastSaved,
        activeRecoveryAction,
        setActiveRecoveryAction: handleSetActiveRecoveryAction,
        waitForMigration,
      }}
    >
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
  );
}
