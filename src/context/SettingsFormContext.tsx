import { Suspense, useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import type { ReactNode, SetStateAction } from "react";
import { captureEvent } from "../utils/analytics";
import {
  useSchoolActions,
  useSchoolLifecycle,
  useSchoolSettings,
  useSchoolStudents,
} from "../hooks/useSchoolData";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const PinSetup = lazyWithRetry(() =>
  import("../components/PinSetup").then((module) => ({ default: module.PinSetup })),
);
const PinRecovery = lazyWithRetry(() =>
  import("../components/PinRecovery").then((module) => ({ default: module.PinRecovery })),
);
import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { CLASS_OPTIONS } from "../constants/classes";
import type {
  SchoolLevel,
  SchoolSettings,
  ClassScoreComponentConfig,
} from "../types";
import { disablePinLock } from "../utils/pinSecurity";
import {
  isBiometricAvailable,
  enrollBiometric,
  disableBiometric,
  getBiometricName,
} from "../utils/biometricAuth";
import { setUnsavedChanges } from "../utils/preloadErrorHandler";
import { unassignFromSubject } from "../utils/componentRegistry";
import { areSettingsEqual } from "../utils/settingsEquality";
import { SettingsFormContext, type SettingsFormContextType } from "./SettingsFormContextDefinition";

/**
 * Provides shared settings draft state, 500ms debounced auto-save, baseline tracking,
 * read-only suspension locks, and confirmation modals across Settings sections/routes.
 *
 * Mount order: must be mounted inside `DataGate` because inner state snapshots `SchoolContext.settings`
 * on initial mount. Nesting is idempotent: an inner provider reuses the outer provider without duplicating timers.
 */
export function SettingsFormProvider({ children }: { children: ReactNode }) {
  const existing = useContext(SettingsFormContext);
  if (existing !== undefined) {
    return <>{children}</>;
  }

  return <SettingsFormProviderInner>{children}</SettingsFormProviderInner>;
}

function SettingsFormProviderInner({ children }: { children: ReactNode }) {
  const settings = useSchoolSettings();
  const students = useSchoolStudents();
  const { isSaving, lastSaved, isPersistenceSuspended } = useSchoolLifecycle();
  const {
    setSettings,
    updateClassNameForAll,
    clearAllStudents,
    restoreDefaults,
    resetAllAppData,
  } = useSchoolActions();
  const { showToast } = useToast();

  const formGenerationRef = useRef(0);
  const immediateSaveGenRef = useRef(0);
  const baselineSeqRef = useRef(0);
  const [formPayload, setFormPayload] = useState<{ data: SchoolSettings; generation: number }>({
    data: settings,
    generation: 0,
  });
  const formData = formPayload.data;
  const setFormData = useCallback((action: SetStateAction<SchoolSettings>) => {
    formGenerationRef.current += 1;
    const nextGen = formGenerationRef.current;
    setFormPayload((prev) => {
      const nextData = typeof action === "function" ? action(prev.data) : action;
      return { data: nextData, generation: nextGen };
    });
  }, []);

  const [lastSavedSettings, setLastSavedSettings] = useState<SchoolSettings>(settings);
  const lastAutoSaveSettingsRef = useRef<SchoolSettings>(settings);

  // Form inputs
  const [newSubject, setNewSubject] = useState("");

  // Modal states
  const [showClassUpdateModal, setShowClassUpdateModal] = useState(false);
  const [showClearStudentsModal, setShowClearStudentsModal] = useState(false);
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);
  const [showFullAppResetModal, setShowFullAppResetModal] = useState(false);
  const [isResettingApp, setIsResettingApp] = useState(false);
  const [showDeleteSubjectModal, setShowDeleteSubjectModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<{ index: number; name: string } | null>(
    null,
  );
  const [showLevelChangeModal, setShowLevelChangeModal] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<SchoolLevel | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinRecovery, setShowPinRecovery] = useState(false);
  const [showDisablePinModal, setShowDisablePinModal] = useState(false);

  // Debounce form data for auto-save (500ms)
  const debouncedPayload = useDebounce(formPayload, 500);
  const debouncedFormData = debouncedPayload.data;

  // Biometric state (probed lazily when Security settings mounts)
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "other" | null>(null);
  const [enrollingBiometric, setEnrollingBiometric] = useState(false);
  const biometricCheckedRef = useRef(false);

  const checkBiometric = useCallback(async (force = false) => {
    if (!force && biometricCheckedRef.current) return;
    biometricCheckedRef.current = true;
    const { available, type } = await isBiometricAvailable();
    setBiometricAvailable((prev) => (prev === available ? prev : available));
    setBiometricType((prev) => (prev === type ? prev : type));
  }, []);

  const studentsCountRef = useRef(students.length);
  useEffect(() => {
    studentsCountRef.current = students.length;
  }, [students.length]);

  const latestFormDataRef = useRef(formData);
  const latestLastSavedClassNameRef = useRef(lastSavedSettings.className);
  const latestIsPersistenceSuspendedRef = useRef(isPersistenceSuspended);
  const setSettingsRef = useRef(setSettings);
  const lastCommittedByFormRef = useRef<SchoolSettings>(settings);

  useEffect(() => {
    latestFormDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    latestLastSavedClassNameRef.current = lastSavedSettings.className;
  }, [lastSavedSettings.className]);

  useEffect(() => {
    latestIsPersistenceSuspendedRef.current = isPersistenceSuspended;
  }, [isPersistenceSuspended]);

  useEffect(() => {
    setSettingsRef.current = setSettings;
  }, [setSettings]);

  const flushLatestDraftOnLeaveOrUnmount = useCallback(() => {
    if (latestIsPersistenceSuspendedRef.current) return;
    const latestForm = latestFormDataRef.current;
    const savedClassName = latestLastSavedClassNameRef.current;
    const classNameChanged = latestForm.className !== savedClassName;
    const isClassNameEmpty = !(latestForm.className ?? "").trim();
    const toSave =
      (classNameChanged && studentsCountRef.current > 0) || isClassNameEmpty
        ? { ...latestForm, className: savedClassName }
        : latestForm;

    if (areSettingsEqual(toSave, lastAutoSaveSettingsRef.current)) return;

    lastAutoSaveSettingsRef.current = toSave;
    lastCommittedByFormRef.current = toSave;
    setSettingsRef.current(toSave);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {
        flushLatestDraftOnLeaveOrUnmount();
      };
    }

    const handlePageHide = () => flushLatestDraftOnLeaveOrUnmount();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushLatestDraftOnLeaveOrUnmount();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flushLatestDraftOnLeaveOrUnmount();
    };
  }, [flushLatestDraftOnLeaveOrUnmount]);

  const hasUnsavedChanges = useMemo(
    () => !areSettingsEqual(formData, lastSavedSettings),
    [formData, lastSavedSettings],
  );

  useEffect(() => {
    setUnsavedChanges("settings-draft", hasUnsavedChanges);
    return () => setUnsavedChanges("settings-draft", false);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (debouncedPayload.generation < immediateSaveGenRef.current) return;
    if (areSettingsEqual(debouncedFormData, lastAutoSaveSettingsRef.current)) return;
    const classNameChanged = debouncedFormData.className !== lastSavedSettings.className;
    const isClassNameEmpty = !(debouncedFormData.className ?? "").trim();
    if ((classNameChanged && studentsCountRef.current > 0) || isClassNameEmpty) {
      const savedFormData = {
        ...debouncedFormData,
        className: lastSavedSettings.className,
      };
      if (areSettingsEqual(savedFormData, lastAutoSaveSettingsRef.current)) return;
      lastCommittedByFormRef.current = savedFormData;
      setSettings(savedFormData);
      lastAutoSaveSettingsRef.current = savedFormData;

      const seq = ++baselineSeqRef.current;
      requestAnimationFrame(() => {
        if (baselineSeqRef.current === seq) {
          setLastSavedSettings(savedFormData);
        }
      });
      return;
    }

    lastCommittedByFormRef.current = debouncedFormData;
    setSettings(debouncedFormData);
    lastAutoSaveSettingsRef.current = debouncedFormData;

    const seq = ++baselineSeqRef.current;
    requestAnimationFrame(() => {
      if (baselineSeqRef.current === seq) {
        setLastSavedSettings(debouncedFormData);
      }
    });
  }, [
    debouncedFormData,
    debouncedPayload.generation,
    lastSavedSettings.className,
    setSettings,
  ]);

  const handleClassNameBlur = useCallback(() => {
    const trimmed = (formData.className ?? "").trim();
    const oldName = (lastSavedSettings.className ?? "").trim();

    // 1. If empty, revert to old name and warn
    if (!trimmed) {
      setFormData((prev) => ({ ...prev, className: lastSavedSettings.className }));
      showToast("Class name cannot be empty", "error");
      return;
    }

    // 2. Normalize trimmed string in form state
    if (trimmed !== formData.className) {
      setFormData((prev) => ({ ...prev, className: trimmed }));
    }

    // 3. If no actual change from saved state, do nothing
    if (trimmed === oldName) return;

    // 4. If students exist, prompt confirmation; otherwise let 500ms auto-save persist
    if (studentsCountRef.current > 0) {
      setShowClassUpdateModal(true);
    }
  }, [formData.className, lastSavedSettings.className, setFormData, showToast]);

  const handleEnrollBiometric = useCallback(async () => {
    setEnrollingBiometric(true);
    const { success, error } = await enrollBiometric();
    setEnrollingBiometric(false);
    if (success) {
      showToast(`${getBiometricName(biometricType)} enabled successfully!`, "success");
      void checkBiometric(true);
    } else {
      showToast(error || "Failed to enable biometric", "error");
    }
  }, [biometricType, checkBiometric, showToast]);

  const handleDisableBiometric = useCallback(() => {
    disableBiometric();
    showToast("Biometric authentication disabled", "info");
    void checkBiometric(true);
  }, [checkBiometric, showToast]);

  const handleKeepOldClassName = useCallback(() => {
    setFormData((prev) => ({ ...prev, className: lastSavedSettings.className }));
    setShowClassUpdateModal(false);
  }, [lastSavedSettings.className, setFormData]);

  const applyLevelChange = useCallback(
    (newLevel: SchoolLevel) => {
      const previousLevel = formData.level || "unknown";
      const defaultSubs = DEFAULT_SUBJECTS[newLevel] || [];
      const defaultClass = CLASS_OPTIONS[newLevel]?.[0] || "";

      setFormData((prev) => {
        const validSubjects = new Set(defaultSubs);
        const prunedMap: Record<string, ClassScoreComponentConfig[]> = {};
        for (const [subject, comps] of Object.entries(prev.subjectComponentMap || {})) {
          if (validSubjects.has(subject)) {
            prunedMap[subject] = comps;
          }
        }

        return {
          ...prev,
          level: newLevel,
          defaultSubjects: defaultSubs,
          className: defaultClass,
          subjectComponentMap: prunedMap,
        };
      });
      showToast(`Loaded presets for ${newLevel}`, "info");
      captureEvent("School_Level_Changed", {
        previous_level: previousLevel,
        new_level: newLevel,
        students_count: studentsCountRef.current,
      });
      setShowLevelChangeModal(false);
      setPendingLevel(null);

      // If students exist and class name changed, prompt to update all students
      if (
        studentsCountRef.current > 0 &&
        defaultClass.trim() &&
        defaultClass.trim() !== (lastSavedSettings.className ?? "").trim()
      ) {
        setShowClassUpdateModal(true);
      }
    },
    [formData.level, lastSavedSettings.className, setFormData, showToast],
  );

  const handleLevelChange = useCallback(
    (newLevel: SchoolLevel) => {
      if (newLevel === formData.level) return;
      if (formData.defaultSubjects && formData.defaultSubjects.length > 0) {
        setPendingLevel(newLevel);
        setShowLevelChangeModal(true);
        return;
      }
      applyLevelChange(newLevel);
    },
    [applyLevelChange, formData.defaultSubjects, formData.level],
  );

  const addSubject = useCallback(() => {
    if (newSubject.trim() && !(formData.defaultSubjects || []).includes(newSubject.trim())) {
      const trimmed = newSubject.trim();
      setFormData((prev) => ({
        ...prev,
        defaultSubjects: [...(prev.defaultSubjects || []), trimmed],
      }));
      setNewSubject("");
    }
  }, [formData.defaultSubjects, newSubject, setFormData]);

  const removeSubject = useCallback(
    (index: number) => {
      const subjectName = formData.defaultSubjects?.[index] || "";
      setSubjectToDelete({ index, name: subjectName });
      setShowDeleteSubjectModal(true);
    },
    [formData.defaultSubjects],
  );

  const confirmDeleteSubject = useCallback(() => {
    if (subjectToDelete === null) return;
    setFormData((prev) => ({
      ...prev,
      defaultSubjects: prev.defaultSubjects?.filter((_, i) => i !== subjectToDelete.index),
      subjectComponentMap: unassignFromSubject(
        prev.subjectComponentMap || {},
        subjectToDelete.name,
      ),
    }));
    showToast(`Deleted ${subjectToDelete.name}`, "info");
    setShowDeleteSubjectModal(false);
    setSubjectToDelete(null);
  }, [setFormData, showToast, subjectToDelete]);

  const finalizeSave = useCallback(
    (shouldUpdateStudents = false) => {
      const trimmed = (formData.className ?? "").trim();
      const updated = { ...formData, className: trimmed };

      setFormData(updated);
      immediateSaveGenRef.current = formGenerationRef.current;
      latestFormDataRef.current = updated;
      latestLastSavedClassNameRef.current = trimmed;
      lastCommittedByFormRef.current = updated;
      setSettings(updated);
      ++baselineSeqRef.current;
      setLastSavedSettings(updated);
      lastAutoSaveSettingsRef.current = updated;

      if (shouldUpdateStudents) {
        updateClassNameForAll(trimmed);
        showToast(`Updated class name for ${studentsCountRef.current} students`, "success");
      }
      setShowClassUpdateModal(false);
    },
    [formData, setFormData, setSettings, showToast, updateClassNameForAll],
  );

  const flushPendingSave = useCallback((): SchoolSettings => {
    const classNameChanged = formData.className !== lastSavedSettings.className;
    const isClassNameEmpty = !(formData.className ?? "").trim();
    const toSave =
      (classNameChanged && studentsCountRef.current > 0) || isClassNameEmpty
        ? { ...formData, className: lastSavedSettings.className }
        : formData;

    if (areSettingsEqual(toSave, lastAutoSaveSettingsRef.current)) return toSave;

    immediateSaveGenRef.current = formGenerationRef.current;
    latestFormDataRef.current = toSave;
    latestLastSavedClassNameRef.current = toSave.className;
    lastCommittedByFormRef.current = toSave;
    setSettings(toSave);
    lastAutoSaveSettingsRef.current = toSave;
    ++baselineSeqRef.current;
    setLastSavedSettings(toSave);
    return toSave;
  }, [formData, lastSavedSettings.className, setSettings]);

  const syncCommittedSettings = useCallback((nextSettings: SchoolSettings) => {
    formGenerationRef.current += 1;
    const nextGen = formGenerationRef.current;
    immediateSaveGenRef.current = nextGen;
    latestFormDataRef.current = nextSettings;
    latestLastSavedClassNameRef.current = nextSettings.className;
    lastAutoSaveSettingsRef.current = nextSettings;
    lastCommittedByFormRef.current = nextSettings;
    ++baselineSeqRef.current;
    setFormPayload({ data: nextSettings, generation: nextGen });
    setLastSavedSettings(nextSettings);
  }, []);

  // Reconcile external/cross-tab/backup settings updates into the local Settings draft
  useEffect(() => {
    if (
      !Object.is(settings, lastCommittedByFormRef.current) &&
      !areSettingsEqual(settings, lastCommittedByFormRef.current)
    ) {
      syncCommittedSettings(settings);
    }
  }, [settings, syncCommittedSettings]);

  const contextValue = useMemo<SettingsFormContextType>(
    () => ({
      formData,
      setFormData,
      lastSavedSettings,
      hasUnsavedChanges,
      isSaving,
      lastSaved,
      isPersistenceSuspended,
      studentsCount: students.length,
      committedSchoolName: settings.schoolName,
      newSubject,
      setNewSubject,
      addSubject,
      removeSubject,
      confirmDeleteSubject,
      handleClassNameBlur,
      handleKeepOldClassName,
      finalizeSave,
      flushPendingSave,
      syncCommittedSettings,
      handleLevelChange,
      applyLevelChange,
      biometricAvailable,
      biometricType,
      enrollingBiometric,
      checkBiometric,
      handleEnrollBiometric,
      handleDisableBiometric,
      setShowPinSetup,
      setShowPinRecovery,
      setShowDisablePinModal,
      setShowClearStudentsModal,
      setShowFactoryResetModal,
      setShowFullAppResetModal,
    }),
    [
      addSubject,
      applyLevelChange,
      biometricAvailable,
      biometricType,
      checkBiometric,
      confirmDeleteSubject,
      enrollingBiometric,
      finalizeSave,
      flushPendingSave,
      formData,
      handleClassNameBlur,
      handleDisableBiometric,
      handleEnrollBiometric,
      handleKeepOldClassName,
      handleLevelChange,
      hasUnsavedChanges,
      isPersistenceSuspended,
      isSaving,
      lastSaved,
      lastSavedSettings,
      newSubject,
      removeSubject,
      setFormData,
      settings.schoolName,
      students.length,
      syncCommittedSettings,
    ],
  );

  return (
    <SettingsFormContext.Provider value={contextValue}>
      {children}

      {/* SHARED SETTINGS MODALS */}
      <ConfirmModal
        isOpen={showClassUpdateModal}
        title="Update Class Name Everywhere?"
        message={`You changed the class to "${(formData.className ?? "").trim()}". Do you want to update this for all ${students.length} existing students?`}
        confirmText="Yes, Update Everyone"
        cancelText="No, Keep Old Name"
        onClose={() => setShowClassUpdateModal(false)}
        onCancel={handleKeepOldClassName}
        onConfirm={() => {
          if (isPersistenceSuspended) return;
          finalizeSave(true);
        }}
      />

      <ConfirmModal
        isOpen={showClearStudentsModal}
        title="Remove All Students?"
        message={`This will permanently remove all ${students.length} student${students.length === 1 ? "" : "s"}, their scores, and student photos while keeping your school settings, subjects, SBA tasks, and report style intact. Save a .repota backup first if you may need this class later.`}
        confirmText="Yes, Remove All Students"
        isDangerous={true}
        onClose={() => setShowClearStudentsModal(false)}
        onConfirm={() => {
          if (isPersistenceSuspended) return;
          clearAllStudents();
          setShowClearStudentsModal(false);
        }}
      />

      <ConfirmModal
        isOpen={showFactoryResetModal}
        title="Restore Default Settings?"
        message="This will restore default school details, subjects, and report style. Your students and saved scores will remain untouched."
        confirmText="Yes, Restore Defaults"
        isDangerous={true}
        onClose={() => setShowFactoryResetModal(false)}
        onConfirm={() => {
          if (isPersistenceSuspended) return;
          restoreDefaults();
          syncCommittedSettings(DEFAULT_FACTORY_SETTINGS);
          setShowFactoryResetModal(false);
        }}
      />

      <ConfirmModal
        isOpen={showFullAppResetModal}
        title="Reset Entire App?"
        message="This permanently wipes all students, school settings, logo, signatures, SBA tasks, PIN/biometric locks, and device preferences back to a first-visit state. Save a .repota backup first — this cannot be undone."
        confirmText={isResettingApp ? "Resetting..." : "Yes, Wipe Everything"}
        confirmKeyword="RESET"
        isDangerous={true}
        isLoading={isResettingApp}
        keepOpenOnConfirm={true}
        onClose={() => {
          if (!isResettingApp) {
            setShowFullAppResetModal(false);
          }
        }}
        onConfirm={async () => {
          if (isPersistenceSuspended || isResettingApp) return;
          setIsResettingApp(true);
          try {
            const ok = await resetAllAppData();
            if (ok) {
              syncCommittedSettings(DEFAULT_FACTORY_SETTINGS);
              setShowFullAppResetModal(false);
              showToast("App reset to a fresh start.", "info");
              try {
                window.location.assign("/");
              } catch {
                // ignore navigation errors in test environments
              }
            }
          } finally {
            setIsResettingApp(false);
          }
        }}
      />

      {showPinSetup && (
        <Suspense fallback={null}>
          <PinSetup
            onComplete={() => setShowPinSetup(false)}
            onCancel={() => setShowPinSetup(false)}
          />
        </Suspense>
      )}

      {showPinRecovery && (
        <Suspense fallback={null}>
          <PinRecovery
            onComplete={() => setShowPinRecovery(false)}
            onCancel={() => setShowPinRecovery(false)}
          />
        </Suspense>
      )}

      <ConfirmModal
        isOpen={showDisablePinModal}
        title="Disable PIN Lock?"
        message="This will remove PIN protection from the app. Anyone with access to your device will be able to view student data."
        confirmText="Yes, Disable PIN"
        isDangerous={true}
        onClose={() => setShowDisablePinModal(false)}
        onConfirm={() => {
          disablePinLock();
          setShowDisablePinModal(false);
          showToast("PIN lock has been disabled", "success");
        }}
      />

      <ConfirmModal
        isOpen={showDeleteSubjectModal}
        title="Delete Subject?"
        message={`Are you sure you want to remove "${subjectToDelete?.name}"? This will affect report generation for students with this subject.`}
        confirmText="Yes, Delete Subject"
        isDangerous={true}
        onClose={() => {
          setShowDeleteSubjectModal(false);
          setSubjectToDelete(null);
        }}
        onConfirm={confirmDeleteSubject}
      />

      <ConfirmModal
        isOpen={showLevelChangeModal}
        title="Change School Level?"
        message={`Changing from ${formData.level} to ${pendingLevel} will reset all subjects and default configurations. This cannot be undone.`}
        confirmText="Yes, Change Level"
        isDangerous={true}
        onClose={() => {
          setShowLevelChangeModal(false);
          setPendingLevel(null);
        }}
        onConfirm={() => pendingLevel && applyLevelChange(pendingLevel)}
      />
    </SettingsFormContext.Provider>
  );
}
