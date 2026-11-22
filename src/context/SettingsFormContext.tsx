import { useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import type { MouseEvent, ReactNode, SetStateAction } from "react";
import { captureEvent } from "../utils/analytics";
import { useSchoolData } from "../hooks/useSchoolData";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { PinSetup } from "../components/PinSetup";
import { PinRecovery } from "../components/PinRecovery";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { CLASS_OPTIONS } from "../constants/classes";
import type {
  SchoolLevel,
  SchoolSettings,
  ClassScoreComponentConfig,
  AssessmentCategory,
} from "../types";
import { disablePinLock } from "../utils/pinSecurity";
import {
  isBiometricAvailable,
  enrollBiometric,
  disableBiometric,
  getBiometricName,
} from "../utils/biometricAuth";
import { setUnsavedChanges } from "../utils/preloadErrorHandler";
import { SettingsFormContext } from "./SettingsFormContextDefinition";

/**
 * Provides shared settings draft state, 500ms debounced auto-save, baseline tracking,
 * read-only suspension locks, and confirmation modals across Settings sections/routes.
 * Nesting is idempotent: an inner provider reuses the outer provider without duplicating timers.
 */
export function SettingsFormProvider({ children }: { children: ReactNode }) {
  const existing = useContext(SettingsFormContext);
  if (existing !== undefined) {
    return <>{children}</>;
  }

  return <SettingsFormProviderInner>{children}</SettingsFormProviderInner>;
}

function SettingsFormProviderInner({ children }: { children: ReactNode }) {
  const {
    settings,
    setSettings,
    updateClassNameForAll,
    students,
    restoreDefaults,
    isSaving,
    lastSaved,
    isPersistenceSuspended,
  } = useSchoolData();
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
  const lastAutoSaveRef = useRef<string | null>(null);
  const lastAutoSaveSettingsRef = useRef<SchoolSettings>(settings);
  const getLastAutoSaveString = useCallback(() => {
    if (lastAutoSaveRef.current === null) {
      lastAutoSaveRef.current = JSON.stringify(lastAutoSaveSettingsRef.current);
    }
    return lastAutoSaveRef.current;
  }, []);
  const suppressClassBlurRef = useRef(false);
  const resetModalOpenRef = useRef(false);
  const resetBaselineRef = useRef<SchoolSettings | null>(null);
  const pendingSavedBaselineRef = useRef<SchoolSettings | null>(null);

  // Form inputs
  const [newSubject, setNewSubject] = useState("");
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentMax, setNewComponentMax] = useState("");
  const [newComponentCategory, setNewComponentCategory] = useState<AssessmentCategory>("CAT");

  // Modal states
  const [showClassUpdateModal, setShowClassUpdateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);
  const [showDeleteSubjectModal, setShowDeleteSubjectModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<{ index: number; name: string } | null>(
    null,
  );
  const [showDeleteComponentModal, setShowDeleteComponentModal] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<string | null>(null);
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

  const hasUnsavedChanges = useMemo(() => {
    if (Object.is(formData, lastSavedSettings)) return false;
    return JSON.stringify(formData) !== JSON.stringify(lastSavedSettings);
  }, [formData, lastSavedSettings]);

  useEffect(() => {
    setUnsavedChanges("settings-draft", hasUnsavedChanges);
    return () => setUnsavedChanges("settings-draft", false);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (showResetModal || resetModalOpenRef.current) return;
    if (debouncedPayload.generation < immediateSaveGenRef.current) return;
    if (Object.is(debouncedFormData, lastAutoSaveSettingsRef.current)) return;
    const debouncedString = JSON.stringify(debouncedFormData);
    if (debouncedString === getLastAutoSaveString()) return;
    const classNameChanged = debouncedFormData.className !== lastSavedSettings.className;
    const isClassNameEmpty = !(debouncedFormData.className ?? "").trim();
    if ((classNameChanged && studentsCountRef.current > 0) || isClassNameEmpty) {
      const savedFormData = {
        ...debouncedFormData,
        className: lastSavedSettings.className,
      };
      const savedString = JSON.stringify(savedFormData);
      if (savedString === getLastAutoSaveString()) return;
      setSettings(savedFormData);
      lastAutoSaveSettingsRef.current = savedFormData;
      lastAutoSaveRef.current = savedString;

      pendingSavedBaselineRef.current = savedFormData;
      const seq = ++baselineSeqRef.current;
      requestAnimationFrame(() => {
        if (baselineSeqRef.current === seq && !resetModalOpenRef.current) {
          pendingSavedBaselineRef.current = null;
          setLastSavedSettings(savedFormData);
        }
      });
      return;
    }

    setSettings(debouncedFormData);
    lastAutoSaveSettingsRef.current = debouncedFormData;
    lastAutoSaveRef.current = debouncedString;

    pendingSavedBaselineRef.current = debouncedFormData;
    const seq = ++baselineSeqRef.current;
    requestAnimationFrame(() => {
      if (baselineSeqRef.current === seq && !resetModalOpenRef.current) {
        pendingSavedBaselineRef.current = null;
        setLastSavedSettings(debouncedFormData);
      }
    });
  }, [
    debouncedFormData,
    debouncedPayload.generation,
    getLastAutoSaveString,
    lastSavedSettings.className,
    showResetModal,
    setSettings,
  ]);

  const handleClassNameBlur = () => {
    if (suppressClassBlurRef.current) return;
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
    if (students.length > 0) {
      setShowClassUpdateModal(true);
    }
  };

  const handleEnrollBiometric = async () => {
    setEnrollingBiometric(true);
    const { success, error } = await enrollBiometric();
    setEnrollingBiometric(false);
    if (success) {
      showToast(`${getBiometricName(biometricType)} enabled successfully!`, "success");
      void checkBiometric(true);
    } else {
      showToast(error || "Failed to enable biometric", "error");
    }
  };

  const handleDisableBiometric = () => {
    disableBiometric();
    showToast("Biometric authentication disabled", "info");
    void checkBiometric(true);
  };

  const handleKeepOldClassName = () => {
    setFormData((prev) => ({ ...prev, className: lastSavedSettings.className }));
    setShowClassUpdateModal(false);
  };

  const handleLevelChange = (newLevel: SchoolLevel) => {
    if (newLevel === formData.level) return;
    if (
      formData.defaultSubjects &&
      formData.defaultSubjects.length > 0
    ) {
      setPendingLevel(newLevel);
      setShowLevelChangeModal(true);
      return;
    }
    applyLevelChange(newLevel);
  };

  const applyLevelChange = (newLevel: SchoolLevel) => {
    const previousLevel = formData.level || "unknown";
    const defaultSubs = DEFAULT_SUBJECTS[newLevel] || [];
    const defaultClass = CLASS_OPTIONS[newLevel]?.[0] || "";

    setFormData((prev) => ({
      ...prev,
      level: newLevel,
      defaultSubjects: defaultSubs,
      className: defaultClass,
    }));
    showToast(`Loaded presets for ${newLevel}`, "info");
    captureEvent("School_Level_Changed", {
      previous_level: previousLevel,
      new_level: newLevel,
      students_count: students.length,
    });
    setShowLevelChangeModal(false);
    setPendingLevel(null);

    // If students exist and class name changed, prompt to update all students
    if (
      students.length > 0 &&
      defaultClass.trim() &&
      defaultClass.trim() !== (lastSavedSettings.className ?? "").trim()
    ) {
      setShowClassUpdateModal(true);
    }
  };

  const addSubject = () => {
    if (newSubject.trim() && !(formData.defaultSubjects || []).includes(newSubject.trim())) {
      setFormData((prev) => ({
        ...prev,
        defaultSubjects: [...(prev.defaultSubjects || []), newSubject.trim()],
      }));
      setNewSubject("");
    }
  };

  const removeSubject = (index: number) => {
    const subjectName = formData.defaultSubjects?.[index] || "";
    setSubjectToDelete({ index, name: subjectName });
    setShowDeleteSubjectModal(true);
  };

  const confirmDeleteSubject = () => {
    if (subjectToDelete === null) return;
    setFormData((prev) => ({
      ...prev,
      defaultSubjects: prev.defaultSubjects?.filter((_, i) => i !== subjectToDelete.index),
    }));
    showToast(`Deleted ${subjectToDelete.name}`, "info");
    setShowDeleteSubjectModal(false);
    setSubjectToDelete(null);
  };

  const addComponent = () => {
    const trimmed = newComponentName.trim();
    const maxScore = parseInt(newComponentMax);

    if (!trimmed) {
      showToast("Please enter a task name!", "error");
      return;
    }

    if (!maxScore || maxScore <= 0 || maxScore > 100) {
      showToast("Please enter a valid max score (1-100)!", "error");
      return;
    }

    const current = formData.componentLibrary || [];
    if (current.some((c) => c.name === trimmed)) {
      showToast("This task already exists!", "error");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      componentLibrary: [
        ...current,
        {
          name: trimmed,
          maxScore,
          category: newComponentCategory,
        },
      ],
    }));

    setNewComponentName("");
    setNewComponentMax("");
    setNewComponentCategory("CAT");
    showToast("SBA task added to library!", "success");
  };

  const removeComponent = (componentName: string) => {
    setComponentToDelete(componentName);
    setShowDeleteComponentModal(true);
  };

  const confirmDeleteComponent = () => {
    if (!componentToDelete) return;
    setFormData((prev) => ({
      ...prev,
      componentLibrary: (prev.componentLibrary || []).filter(
        (config) => config.name !== componentToDelete,
      ),
    }));
    showToast(`Deleted task: ${componentToDelete}`, "info");
    setShowDeleteComponentModal(false);
    setComponentToDelete(null);
  };

  const addComponentToSubject = (subjectName: string, component: ClassScoreComponentConfig) => {
    setFormData((prev) => ({
      ...prev,
      subjectComponentMap: {
        ...(prev.subjectComponentMap || {}),
        [subjectName]: [...(prev.subjectComponentMap?.[subjectName] || []), component],
      },
    }));
  };

  const removeComponentFromSubject = (subjectName: string, componentName: string) => {
    setFormData((prev) => {
      const currentComponents = prev.subjectComponentMap?.[subjectName] || [];
      const updatedComponents = currentComponents.filter((c) => c.name !== componentName);
      return {
        ...prev,
        subjectComponentMap: {
          ...(prev.subjectComponentMap || {}),
          [subjectName]: updatedComponents,
        },
      };
    });
  };

  const assignAllComponentsToAllSubjects = () => {
    const library = formData.componentLibrary || [];
    const subjects = formData.defaultSubjects || [];
    if (library.length === 0 || subjects.length === 0) return;

    setFormData((prev) => {
      const nextLibrary = prev.componentLibrary || [];
      const nextSubjects = prev.defaultSubjects || [];
      const nextMap: Record<string, ClassScoreComponentConfig[]> = {
        ...(prev.subjectComponentMap || {}),
      };

      for (const subject of nextSubjects) {
        nextMap[subject] = nextLibrary.map((comp) => ({ ...comp }));
      }

      return {
        ...prev,
        subjectComponentMap: nextMap,
      };
    });
    showToast(`Assigned ${library.length} tasks to all ${subjects.length} subjects!`, "success");
  };

  const finalizeSave = (shouldUpdateStudents = false) => {
    const trimmed = (formData.className ?? "").trim();
    const updated = { ...formData, className: trimmed };

    setFormData(updated);
    immediateSaveGenRef.current = formGenerationRef.current;
    setSettings(updated);
    ++baselineSeqRef.current;
    pendingSavedBaselineRef.current = null;
    setLastSavedSettings(updated);
    lastAutoSaveSettingsRef.current = updated;
    lastAutoSaveRef.current = JSON.stringify(updated);

    if (shouldUpdateStudents) {
      updateClassNameForAll(trimmed);
      showToast(`Updated class name for ${students.length} students`, "success");
    }
    setShowClassUpdateModal(false);
  };

  const flushPendingSave = useCallback(() => {
    const classNameChanged = formData.className !== lastSavedSettings.className;
    const isClassNameEmpty = !(formData.className ?? "").trim();
    const toSave =
      (classNameChanged && studentsCountRef.current > 0) || isClassNameEmpty
        ? { ...formData, className: lastSavedSettings.className }
        : formData;

    if (Object.is(toSave, lastAutoSaveSettingsRef.current)) return;
    const toSaveString = JSON.stringify(toSave);
    if (toSaveString === getLastAutoSaveString()) return;

    immediateSaveGenRef.current = formGenerationRef.current;
    setSettings(toSave);
    lastAutoSaveSettingsRef.current = toSave;
    lastAutoSaveRef.current = toSaveString;
    ++baselineSeqRef.current;
    pendingSavedBaselineRef.current = null;
    setLastSavedSettings(toSave);
  }, [formData, getLastAutoSaveString, lastSavedSettings.className, setSettings]);

  const syncCommittedSettings = useCallback((nextSettings: SchoolSettings) => {
    formGenerationRef.current += 1;
    const nextGen = formGenerationRef.current;
    immediateSaveGenRef.current = nextGen;
    lastAutoSaveSettingsRef.current = nextSettings;
    lastAutoSaveRef.current = JSON.stringify(nextSettings);
    ++baselineSeqRef.current;
    pendingSavedBaselineRef.current = null;
    setFormPayload({ data: nextSettings, generation: nextGen });
    setLastSavedSettings(nextSettings);
  }, []);

  const openResetModal = useCallback(() => {
    resetBaselineRef.current = pendingSavedBaselineRef.current ?? lastSavedSettings;
    ++baselineSeqRef.current;
    suppressClassBlurRef.current = true;
    resetModalOpenRef.current = true;
    setShowResetModal(true);
  }, [lastSavedSettings]);

  const handleResetMouseDown = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    suppressClassBlurRef.current = true;
    const handleRelease = () => {
      window.removeEventListener("pointerup", handleRelease);
      window.removeEventListener("mouseup", handleRelease);
      setTimeout(() => {
        if (!resetModalOpenRef.current) {
          suppressClassBlurRef.current = false;
        }
      }, 0);
    };
    window.addEventListener("pointerup", handleRelease, { once: true });
    window.addEventListener("mouseup", handleRelease, { once: true });
  }, []);

  const closeResetModal = useCallback(() => {
    if (pendingSavedBaselineRef.current) {
      setLastSavedSettings(pendingSavedBaselineRef.current);
      pendingSavedBaselineRef.current = null;
    }
    resetBaselineRef.current = null;
    suppressClassBlurRef.current = false;
    resetModalOpenRef.current = false;
    setShowResetModal(false);
  }, []);

  const handleReset = () => {
    const baseline = resetBaselineRef.current ?? lastSavedSettings;
    setFormData(baseline);
    immediateSaveGenRef.current = formGenerationRef.current;
    setSettings(baseline);
    ++baselineSeqRef.current;
    pendingSavedBaselineRef.current = null;
    setLastSavedSettings(baseline);
    lastAutoSaveSettingsRef.current = baseline;
    lastAutoSaveRef.current = JSON.stringify(baseline);
    resetBaselineRef.current = null;
    suppressClassBlurRef.current = false;
    resetModalOpenRef.current = false;
    setShowResetModal(false);
    showToast("Changes discarded", "info");
  };

  return (
    <SettingsFormContext.Provider
      value={{
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
        newComponentName,
        setNewComponentName,
        newComponentMax,
        setNewComponentMax,
        newComponentCategory,
        setNewComponentCategory,
        addComponent,
        removeComponent,
        confirmDeleteComponent,
        addComponentToSubject,
        removeComponentFromSubject,
        assignAllComponentsToAllSubjects,
        handleClassNameBlur,
        handleKeepOldClassName,
        finalizeSave,
        flushPendingSave,
        syncCommittedSettings,
        handleLevelChange,
        applyLevelChange,
        openResetModal,
        handleResetMouseDown,
        closeResetModal,
        handleReset,
        biometricAvailable,
        biometricType,
        enrollingBiometric,
        checkBiometric,
        handleEnrollBiometric,
        handleDisableBiometric,
        setShowPinSetup,
        setShowPinRecovery,
        setShowDisablePinModal,
        setShowFactoryResetModal,
      }}
    >
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
        isOpen={showFactoryResetModal}
        title="Restore Default Settings?"
        message="Are you sure? This will overwrite your School Name, Logo, and Default Subjects."
        confirmText="Yes, Restore Defaults"
        isDangerous={true}
        onClose={() => setShowFactoryResetModal(false)}
        onConfirm={() => {
          if (isPersistenceSuspended) return;
          restoreDefaults();
          setShowFactoryResetModal(false);
          setTimeout(() => window.location.reload(), 1000);
        }}
      />

      {showPinSetup && (
        <PinSetup
          onComplete={() => setShowPinSetup(false)}
          onCancel={() => setShowPinSetup(false)}
        />
      )}

      {showPinRecovery && (
        <PinRecovery
          onComplete={() => setShowPinRecovery(false)}
          onCancel={() => setShowPinRecovery(false)}
        />
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
        isOpen={showResetModal}
        title="Discard Changes?"
        message="This will reset all fields to their last saved state. Any unsaved changes will be lost."
        confirmText="Yes, Discard Changes"
        isDangerous={true}
        onClose={closeResetModal}
        onConfirm={handleReset}
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
        isOpen={showDeleteComponentModal}
        title="Delete Task?"
        message={`Are you sure you want to remove the "${componentToDelete}" task? Any subjects using this will lose their score configuration.`}
        confirmText="Yes, Delete Task"
        isDangerous={true}
        onClose={() => {
          setShowDeleteComponentModal(false);
          setComponentToDelete(null);
        }}
        onConfirm={confirmDeleteComponent}
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
