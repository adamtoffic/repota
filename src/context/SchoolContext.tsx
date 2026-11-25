import { useCallback, useMemo, type ReactNode } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import { useToast } from "../hooks/useToast";
import type { ExamType, SchoolSettings, StudentRecord } from "../types";
import { captureEvent } from "../utils/analytics";
import { assignPositions, assignSubjectPositions, processStudent } from "../utils/gradeCalculator";
import { isDemoStudent } from "../utils/reportAnalytics";
import {
  reconcileStudentsWithSbaConfig,
  rescaleStudentsForWeightChange,
} from "../utils/sbaReconciliation";
import {
  SchoolActionsContext,
  SchoolContext,
  SchoolLifecycleContext,
  SchoolSettingsContext,
  SchoolStudentsContext,
  type SchoolActionsType,
  type SchoolContextType,
  type SchoolLifecycleType,
} from "./SchoolContextDefinition";
import {
  LOAD_TIMEOUT_MS,
  MIGRATION_WAIT_TIMEOUT_MS,
} from "./school/schoolStorageHelpers";
import {
  clearAllStudentScoresData,
  clearSingleStudentScoresData,
  detectStudentComponentMismatches,
  filterActiveNonPendingStudents,
  normalizeAssessmentWeightSettings,
  normalizeSbaConfigSettings,
  removeAllPhotosFromStudents,
  syncClassSubjectsAndSbaData,
  updateStudentsClassName,
} from "./school/schoolStudentMutations";
import { useSchoolStorageLifecycle } from "./school/useSchoolStorageLifecycle";

export { LOAD_TIMEOUT_MS, MIGRATION_WAIT_TIMEOUT_MS };

/**
 * Root school state provider that coordinates storage hydration/sync lifecycle, student and
 * settings actions, and publishes both split slice contexts and the combined `SchoolContext`.
 */
export function SchoolProvider({
  children,
  isLocked = false,
}: {
  children: ReactNode;
  isLocked?: boolean;
}) {
  const { showToast } = useToast();
  const {
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
  } = useSchoolStorageLifecycle({ isLocked, showToast });

  const restoreDefaults = useCallback(() => {
    handleSetSettings(DEFAULT_FACTORY_SETTINGS);
    showToast("Settings restored to factory defaults.", "success");
  }, [handleSetSettings, showToast]);

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
    [handleSetStudents, settingsRef, showToast, studentsRef],
  );

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
    [handleSetStudents, showToast, studentsRef],
  );

  const deletePendingStudents = useCallback(() => {
    const { activeStudents, removedCount } = filterActiveNonPendingStudents(studentsRef.current);
    if (removedCount > 0) {
      showToast(`Cleaned up ${removedCount} incomplete records.`, "success");
      handleSetStudents(activeStudents);
    } else {
      showToast("No pending students found.", "info");
    }
  }, [handleSetStudents, showToast, studentsRef]);

  const updateStudent = useCallback(
    (updatedStudent: StudentRecord, silent = false) => {
      handleSetStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
      if (!silent) {
        showToast("Changes saved successfully!", "success");
      }
    },
    [handleSetStudents, showToast],
  );

  const clearAllScores = useCallback(() => {
    const count = studentsRef.current.length;
    handleSetStudents(clearAllStudentScoresData);
    showToast(`All scores cleared for ${count} students!`, "success");
  }, [handleSetStudents, showToast, studentsRef]);

  const clearStudentScores = useCallback(
    (id: string) => {
      handleSetStudents((prev) => clearSingleStudentScoresData(prev, id));
    },
    [handleSetStudents],
  );

  const removeAllStudentPhotos = useCallback(() => {
    const { nextStudents, removedCount } = removeAllPhotosFromStudents(studentsRef.current);
    handleSetStudents(nextStudents);

    if (removedCount > 0) {
      showToast(`Removed ${removedCount} student photos to free up storage.`, "success");
    } else {
      showToast("No student photos found.", "info");
    }
  }, [handleSetStudents, showToast, studentsRef]);

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
  }, [handleSetStudents, showToast, studentsRef]);

  const updateClassNameForAll = useCallback(
    (newClassName: string) => {
      handleSetStudents((prev) => updateStudentsClassName(prev, newClassName));
    },
    [handleSetStudents],
  );

  const detectComponentMismatches = useCallback(
    () => detectStudentComponentMismatches(studentsRef.current, settingsRef.current),
    [settingsRef, studentsRef],
  );

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
  }, [handleSetStudents, settingsRef, showToast, studentsRef]);

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
    const { nextStudents, subjectsAddedCount, modifiedStudentCount } = syncClassSubjectsAndSbaData(
      studentsRef.current,
      currentSettings,
    );

    if (subjectsAddedCount > 0 || modifiedStudentCount > 0) {
      handleSetStudents(nextStudents);
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
      const hasStudentComponents = nextStudents.some((student) =>
        student.subjects.some((sub) => Boolean(sub.classScoreComponents?.length)),
      );
      showToast(
        !hasConfigured && !hasStudentComponents
          ? "No components configured in Settings"
          : "All students already up to date",
        "info",
      );
    }

    return { subjectsAddedCount, sbaSyncedCount: modifiedStudentCount };
  }, [handleSetStudents, settingsRef, showToast, studentsRef]);

  const applySbaConfig = useCallback(
    (
      updater: (prev: SchoolSettings) => {
        settings: SchoolSettings;
        renamedTasks?: Record<string, string>;
        onClearTasks?: "preserve_class_score" | "zero";
      },
      options?: { silent?: boolean; toastMessage?: string },
    ): SchoolSettings => {
      const { settings: rawNext, renamedTasks, onClearTasks } = updater(settingsRef.current);
      const nextSettings = normalizeSbaConfigSettings(rawNext);

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
    [handleSetSettings, handleSetStudents, settingsRef, showToast],
  );

  const updateAssessmentWeights = useCallback(
    (
      nextClassScoreMax: number,
      nextExamScoreMax: number,
      options?: { examType?: ExamType; scoreMode?: "rescale" | "clamp"; silent?: boolean },
    ): SchoolSettings => {
      const prevSettings = settingsRef.current;
      const { nextSettings, clampedClass, clampedExam, nextExamType, shouldRescale } =
        normalizeAssessmentWeightSettings(
          prevSettings,
          nextClassScoreMax,
          nextExamScoreMax,
          options?.examType,
        );

      handleSetSettings(nextSettings);

      if (shouldRescale) {
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
    [handleSetSettings, handleSetStudents, settingsRef, showToast],
  );

  const loadDemoData = useCallback(async () => {
    const currentSettings = settingsRef.current;
    const { createDemoStudents } = await import("../utils/demoData");
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
  }, [handleSetStudents, settingsRef, showToast, studentsRef]);

  const checkDuplicateName = useCallback(
    (name: string): boolean => {
      const normalized = name.trim().toLowerCase();
      return studentsRef.current.some((s) => s.name.trim().toLowerCase() === normalized);
    },
    [studentsRef],
  );

  const processedStudents = useMemo(() => {
    const processed = students.map((student) => processStudent(student, settings.level));
    const withSubjectPositions = assignSubjectPositions(processed);
    return assignPositions(withSubjectPositions);
  }, [students, settings.level]);

  const autoGenerateRemarks = useCallback(
    async (onProgress?: (current: number, total: number) => void) => {
      const currentStudents = studentsRef.current;
      const currentSettings = settingsRef.current;
      const total = currentStudents.length;

      const { applyAutoRemarksToStudents } = await import("../utils/remarksBatch");
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
    [handleSetStudents, settingsRef, showToast, studentsRef],
  );

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
                onCancel={cancelStartFreshConfirm}
                onClose={closeStartFreshConfirm}
              />
            </SchoolContext.Provider>
          </SchoolLifecycleContext.Provider>
        </SchoolStudentsContext.Provider>
      </SchoolSettingsContext.Provider>
    </SchoolActionsContext.Provider>
  );
}
