import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  School,
  BookOpen,
  Users,
  Briefcase,
  X,
  RotateCcw,
  Calculator,
  Lock,
  Key,
  Fingerprint,
} from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { ImageUploader } from "../components/ImageUploader";
import { DataBackup } from "../components/DataBackup";
import { StorageMonitor } from "../components/StorageMonitor";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { CLASS_OPTIONS } from "../constants/classes";
import type {
  SchoolLevel,
  SchoolSettings,
  AcademicPeriod,
  ClassScoreComponentConfig,
  AssessmentCategory,
} from "../types";
import { ScrollButton } from "../components/ScrollButton";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { PinSetup } from "../components/PinSetup";
import { PinRecovery } from "../components/PinRecovery";
import { isPinConfigured, disablePinLock } from "../utils/pinSecurity";
import {
  isBiometricEnrolled,
  isBiometricAvailable,
  enrollBiometric,
  disableBiometric,
  getBiometricName,
} from "../utils/biometricAuth";
import { Button, Alert, Badge, IconButton, Input } from "../components/ui";
import { PageHeader } from "../components/ui/PageHeader";

export function Settings() {
  const {
    settings,
    setSettings,
    updateClassNameForAll,
    students,
    restoreDefaults,
    isSaving,
    lastSaved,
  } = useSchoolData();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<SchoolSettings>(settings);
  const [lastSavedSettings, setLastSavedSettings] = useState<SchoolSettings>(settings);
  const lastAutoSaveRef = useRef<string>(JSON.stringify(settings));

  // Form States
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
  const debouncedFormData = useDebounce(formData, 500);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "other" | null>(null);
  const [enrollingBiometric, setEnrollingBiometric] = useState(false);

  const checkBiometric = async () => {
    const { available, type } = await isBiometricAvailable();
    setBiometricAvailable(available);
    setBiometricType(type);
  };

  useEffect(() => {
    (async () => {
      const { available, type } = await isBiometricAvailable();
      setBiometricAvailable(available);
      setBiometricType(type);
    })();
  }, []);

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(lastSavedSettings);

  useEffect(() => {
    const debouncedString = JSON.stringify(debouncedFormData);
    if (debouncedString === lastAutoSaveRef.current) return;

    const classNameChanged = debouncedFormData.className !== lastSavedSettings.className;
    if (classNameChanged && students.length > 0) {
      return;
    }

    setSettings(debouncedFormData);
    lastAutoSaveRef.current = debouncedString;

    requestAnimationFrame(() => {
      setLastSavedSettings(debouncedFormData);
    });
  }, [debouncedFormData, lastSavedSettings.className, students.length, setSettings]);

  useEffect(() => {
    const classNameChanged = formData.className !== lastSavedSettings.className;
    if (classNameChanged && students.length > 0 && !showClassUpdateModal) {
      const timer = setTimeout(() => {
        if (formData.className !== lastSavedSettings.className) {
          setShowClassUpdateModal(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.className, lastSavedSettings.className, students.length, showClassUpdateModal]);

  const handleEnrollBiometric = async () => {
    setEnrollingBiometric(true);
    const { success, error } = await enrollBiometric();
    setEnrollingBiometric(false);
    if (success) {
      showToast(`${getBiometricName(biometricType)} enabled successfully!`, "success");
      checkBiometric();
    } else {
      showToast(error || "Failed to enable biometric", "error");
    }
  };

  const handleDisableBiometric = () => {
    disableBiometric();
    showToast("Biometric authentication disabled", "info");
    checkBiometric();
  };

  const handleLevelChange = (newLevel: SchoolLevel) => {
    if (
      newLevel !== formData.level &&
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
    const defaultSubs = DEFAULT_SUBJECTS[newLevel] || [];
    const defaultClass = CLASS_OPTIONS[newLevel]?.[0] || "";

    setFormData((prev) => ({
      ...prev,
      level: newLevel,
      defaultSubjects: defaultSubs,
      className: defaultClass,
    }));
    showToast(`Loaded presets for ${newLevel}`, "info");
    setShowLevelChangeModal(false);
    setPendingLevel(null);
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

  const finalizeSave = (shouldUpdateStudents = false) => {
    setSettings(formData);
    setLastSavedSettings(formData);
    if (shouldUpdateStudents) {
      updateClassNameForAll(formData.className || "");
      showToast(`Updated class name for ${students.length} students`, "success");
    }
    setShowClassUpdateModal(false);
  };

  const handleReset = () => {
    setFormData(lastSavedSettings);
    setShowResetModal(false);
    showToast("Changes discarded", "info");
  };

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader
        schoolName={settings.schoolName}
        actions={
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-2 py-2 sm:hidden">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500"></span>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="hidden items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 transition-all hover:bg-orange-100 active:scale-95 sm:flex"
                  title="Discard unsaved changes"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              </>
            )}
            <Link
              to="/"
              className="bg-background text-muted flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-all hover:bg-gray-100 active:scale-95 sm:px-4"
            >
              <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden text-sm font-medium sm:inline">Back</span>
            </Link>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        {/* Auto-Save Info */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="font-medium">
              Settings auto-save as you type{" "}
              <span className="hidden sm:inline">• No need to scroll for a save button</span>
            </p>
          </div>
        </div>

        {/* CARD 1: IDENTITY */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <School className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">School Identity</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-[140px_1fr]">
            <div className="mx-auto w-32 md:w-full">
              <ImageUploader
                label="School Crest"
                value={formData.logoUrl}
                onChange={(val) => setFormData({ ...formData, logoUrl: val })}
              />
            </div>

            <div className="space-y-4">
              <Input
                label="School Name"
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="text-main font-bold"
                placeholder="e.g. Royal International School"
              />

              <Input
                label="Motto"
                type="text"
                value={formData.schoolMotto || ""}
                onChange={(e) => setFormData({ ...formData, schoolMotto: e.target.value })}
                className="italic"
                placeholder="e.g. Knowledge is Power"
              />

              <Input
                label="Address / Location"
                type="text"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Kumasi, Ashanti Region"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.phoneNumber || ""}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="024 123 4567"
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="school@gmail.com"
                />
              </div>

              {/* School Type */}
              <div>
                <label className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase">
                  Curriculum Type
                </label>
                <div className="bg-background flex flex-wrap gap-4 rounded-lg border border-gray-100 p-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="schoolType"
                      checked={formData.schoolType === "STANDARD"}
                      onChange={() => setFormData({ ...formData, schoolType: "STANDARD" })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-gray-700">Standard (GES)</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="schoolType"
                      checked={formData.schoolType === "ISLAMIC"}
                      onChange={() => setFormData({ ...formData, schoolType: "ISLAMIC" })}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-bold text-gray-700">Islamic / Arabic</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="schoolType"
                      checked={formData.schoolType === "PRIVATE"}
                      onChange={() => setFormData({ ...formData, schoolType: "PRIVATE" })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-bold text-gray-700">Private School</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: ACADEMIC SESSION */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5">
              <BookOpen className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Academic Session</h2>
          </div>

          <div className="grid gap-6">
            {/* LEVEL SELECTOR */}
            <div>
              <label className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase">
                School Level
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["KG", "PRIMARY", "JHS", "SHS"] as SchoolLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleLevelChange(lvl)}
                    className={`rounded-lg border-2 px-3 py-3 text-sm font-bold shadow-sm transition-all active:scale-95 sm:px-4 sm:py-2.5 ${
                      formData.level === lvl
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
                <p>
                  {formData.level === "KG" &&
                    "Kindergarten: Uses developmental grading (Gold, Silver, Bronze)."}
                  {formData.level === "PRIMARY" && "Primary: Standard descriptive grading (1-5)."}
                  {formData.level === "JHS" && "JHS: Common Core SBA + Aggregate System."}
                  {formData.level === "SHS" && "SHS: WASSCE Grading (A1 - F9)."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase">
                  Class Name
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    value={formData.className || ""}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="pl-9 font-bold"
                    placeholder="e.g. Basic 4"
                  />
                  <Users className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <Input
                label="Class Size (Number on Roll)"
                type="number"
                inputMode="numeric"
                min="1"
                max="200"
                value={formData.classSize || ""}
                onChange={(e) =>
                  setFormData({ ...formData, classSize: Number(e.target.value) || undefined })
                }
                className="font-bold"
                placeholder="e.g. 30"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Total Attendance Days"
                type="number"
                inputMode="numeric"
                min="1"
                max="365"
                value={formData.totalAttendanceDays || ""}
                onChange={(e) =>
                  setFormData({ ...formData, totalAttendanceDays: Number(e.target.value) })
                }
                className="font-bold"
                placeholder="e.g. 70"
              />
              <Input
                label="Next Term Begins"
                type="date"
                value={formData.nextTermStarts || ""}
                onChange={(e) => setFormData({ ...formData, nextTermStarts: e.target.value })}
                className="font-bold"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Academic Year"
                type="text"
                required
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="font-bold"
                placeholder="e.g. 2025/2026"
              />
              <div>
                <label className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase">
                  Term / Semester
                </label>
                <select
                  value={formData.term}
                  onChange={(e) =>
                    setFormData({ ...formData, term: e.target.value as AcademicPeriod })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-bold transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>
            </div>

            {/* GRADING CONFIG - SBA RENAMED */}
            <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 sm:p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-yellow-900 uppercase">
                <AlertCircle className="h-4 w-4" /> Assessment Weights (SBA System)
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <Input
                  label="Continuous Assessment %"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  value={formData.classScoreMax || ""}
                  onChange={(e) => {
                    const classScore = Number(e.target.value) || 0;
                    const examScore = 100 - classScore;
                    setFormData({
                      ...formData,
                      classScoreMax: classScore,
                      examScoreMax: examScore,
                    });
                  }}
                  className="border-yellow-300 bg-white text-center font-bold focus:border-yellow-500 focus:ring-yellow-300"
                  placeholder="50"
                />
                <Input
                  label="Examination %"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  value={formData.examScoreMax || ""}
                  onChange={(e) => {
                    const examScore = Number(e.target.value) || 0;
                    const classScore = 100 - examScore;
                    setFormData({
                      ...formData,
                      classScoreMax: classScore,
                      examScoreMax: examScore,
                    });
                  }}
                  className="border-yellow-300 bg-white text-center font-bold focus:border-yellow-500 focus:ring-yellow-300"
                  placeholder="50"
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-yellow-800">
                <span className="font-bold">Total must equal 100%.</span> (Current:{" "}
                {(formData.classScoreMax || 0) + (formData.examScoreMax || 0)}%)
              </p>
            </div>

            {/* CLASS SCORE COMPONENTS - SBA RENAMED - RESPONSIVE FIXED */}
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-purple-700" />
                <h3 className="text-xs font-bold tracking-wider text-purple-900 uppercase">
                  SBA Task Library
                </h3>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-purple-700">
                Define standard SBA tasks (e.g. Class Tests, Group Works, Projects) to use across
                subjects.
              </p>

              {/* RESPONSIVE ADD COMPONENT INPUTS */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* 1. Category Selector */}
                <div className="w-full sm:w-32">
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-purple-900 uppercase">
                    Type
                  </label>
                  <select
                    value={newComponentCategory}
                    onChange={(e) => setNewComponentCategory(e.target.value as AssessmentCategory)}
                    className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="CAT">CAT (Test)</option>
                    <option value="GROUP">Group Work</option>
                    <option value="PROJECT">Project</option>
                    <option value="HOMEWORK">Homework</option>
                  </select>
                </div>

                {/* 2. Name Input */}
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-purple-900 uppercase">
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={newComponentName}
                    onChange={(e) => setNewComponentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document.getElementById("max-score-input")?.focus();
                      }
                    }}
                    className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="e.g. Natural Science Project"
                  />
                </div>

                {/* 3. Max Score & Button - RESPONSIVE FIXED */}
                <div className="flex w-full gap-2 sm:w-auto">
                  <div className="flex-1 sm:w-24 sm:flex-none">
                    <label className="mb-1 block text-[10px] font-bold tracking-wider text-purple-900 uppercase">
                      Max Score
                    </label>
                    <input
                      id="max-score-input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="100"
                      value={newComponentMax}
                      onChange={(e) => setNewComponentMax(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addComponent();
                        }
                      }}
                      className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-center text-sm outline-none focus:ring-2 focus:ring-purple-200"
                      placeholder="15"
                    />
                  </div>

                  <div className="flex-none">
                    <label className="mb-1 block text-[10px] font-bold tracking-wider text-transparent uppercase">
                      Add
                    </label>
                    <Button
                      type="button"
                      onClick={addComponent}
                      variant="primary"
                      size="sm"
                      className="h-10 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Component List */}
              {(formData.componentLibrary || []).length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-purple-800">
                    {(formData.componentLibrary || []).length} Task
                    {(formData.componentLibrary || []).length !== 1 ? "s" : ""} Defined
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(formData.componentLibrary || []).map((config) => (
                      <div
                        key={config.name}
                        className="flex items-center gap-3 rounded-lg border border-purple-200 bg-white py-2 pr-2 pl-3 text-sm shadow-sm"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-bold text-gray-800">
                            {config.name}
                          </span>
                          <span className="text-[10px] font-bold tracking-wide text-purple-500 uppercase">
                            {config.category === "CAT" ? "CLASS TEST" : config.category}
                          </span>
                        </div>
                        <Badge variant="primary" size="sm" className="ml-1">
                          /{config.maxScore}
                        </Badge>
                        <IconButton
                          type="button"
                          onClick={() => removeComponent(config.name)}
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${config.name}`}
                        >
                          <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-purple-200 bg-white p-4 text-center text-xs text-purple-400">
                  No SBA tasks defined. Add tasks (e.g. CAT 1, Group Work) to use with subjects.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 3: STAFF */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Staff Details</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <Input
                label="Head Teacher Name"
                type="text"
                value={formData.headTeacherName || ""}
                onChange={(e) => setFormData({ ...formData, headTeacherName: e.target.value })}
              />
              <ImageUploader
                label="Head Teacher Signature"
                value={formData.headTeacherSignature}
                onChange={(val) => setFormData({ ...formData, headTeacherSignature: val })}
                maxHeight="h-24"
              />
            </div>

            <div className="space-y-4">
              <Input
                label="Class Teacher Name"
                type="text"
                value={formData.classTeacherName || ""}
                onChange={(e) => setFormData({ ...formData, classTeacherName: e.target.value })}
              />
              <ImageUploader
                label="Class Teacher Signature"
                value={formData.teacherSignature}
                onChange={(val) => setFormData({ ...formData, teacherSignature: val })}
                maxHeight="h-24"
              />
            </div>
          </div>
        </div>

        {/* CARD 4: SUBJECTS */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
              Class Subjects (Learning Areas)
            </h2>
            <p className="text-muted text-xs">
              These subjects will be added to all new students automatically.
            </p>
          </div>

          <div className="mb-4 flex gap-2">
            <Input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
              className="flex-1"
              placeholder="Type subject name..."
            />
            <IconButton
              type="button"
              onClick={addSubject}
              variant="secondary"
              size="md"
              aria-label="Add subject"
              className="rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <Plus className="h-5 w-5" />
            </IconButton>
          </div>

          <div className="flex flex-wrap gap-2">
            {(formData.defaultSubjects || []).map((sub, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700"
              >
                {sub}
                <button
                  type="button"
                  onClick={() => removeSubject(index)}
                  className="rounded-full p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* CARD 5: SUBJECT COMPONENT ASSIGNMENT - SBA RENAMED */}
        {(formData.defaultSubjects || []).length > 0 &&
          (formData.componentLibrary || []).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4">
                <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
                  Subject Assessment Config
                </h2>
                <p className="text-muted text-xs">Assign specific SBA tasks to each subject.</p>
              </div>

              <div className="space-y-4">
                {(formData.defaultSubjects || []).map((subject) => {
                  const assignedComponents = formData.subjectComponentMap?.[subject] || [];
                  const availableComponents = (formData.componentLibrary || []).filter(
                    (lib) => !assignedComponents.some((assigned) => assigned.name === lib.name),
                  );

                  return (
                    <div key={subject} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">{subject}</h3>
                        {assignedComponents.length === 0 && (
                          <span className="text-xs text-gray-400 italic">No tasks assigned</span>
                        )}
                      </div>

                      {assignedComponents.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {assignedComponents.map((comp) => (
                            <div
                              key={comp.name}
                              className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm sm:items-center"
                            >
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-xs font-bold text-gray-700">
                                  {comp.name}
                                </span>
                                <span className="text-[10px] font-bold tracking-wide text-blue-500 uppercase">
                                  {comp.category === "CAT" ? "TEST" : comp.category}
                                </span>
                              </div>
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                                /{comp.maxScore}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeComponentFromSubject(subject, comp.name)}
                                className="rounded p-0.5 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {availableComponents.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {availableComponents.map((comp) => (
                            <button
                              key={comp.name}
                              type="button"
                              onClick={() => addComponentToSubject(subject, comp)}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {comp.name}
                              <span className="text-xs text-gray-400">/{comp.maxScore}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* CARD 6: SECURITY & PRIVACY */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5">
              <Lock className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Security & Privacy</h2>
          </div>

          <div className="space-y-4">
            <Alert variant="success" title="PIN Lock (Optional)">
              <p className="mb-4">
                Secure your student data with a 4-digit PIN. You'll need to enter it when opening
                the app.
              </p>
              <Button
                type="button"
                onClick={() => setShowPinSetup(true)}
                variant="primary"
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
              >
                {isPinConfigured() ? "Change PIN" : "Enable PIN Lock"}
              </Button>
            </Alert>

            {isPinConfigured() && (
              <Alert
                variant="warning"
                title={
                  <>
                    <Key className="inline h-4 w-4" /> Forgot Your PIN?
                  </>
                }
              >
                <p className="mb-3">You'll need your 6-digit recovery code to reset your PIN.</p>
                <Button
                  type="button"
                  onClick={() => setShowPinRecovery(true)}
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Reset PIN with Recovery Code
                </Button>
              </Alert>
            )}

            {isPinConfigured() && (
              <Alert variant="error" title="Disable PIN Lock">
                <p className="mb-3">
                  Remove PIN protection from the app. This action cannot be undone.
                </p>
                <Button
                  type="button"
                  onClick={() => setShowDisablePinModal(true)}
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Disable PIN Lock
                </Button>
                <p className="mt-3 text-xs">
                  <strong>Lost your recovery code?</strong> Disabling PIN lock is the only way to
                  regain access. Your student data will remain safe.
                </p>
              </Alert>
            )}

            {isPinConfigured() && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-2 font-bold text-blue-900">Auto-Lock Timer</h3>
                <p className="mb-3 text-sm text-blue-800">
                  Automatically lock the app after a period of inactivity.
                </p>
                <div className="flex items-center gap-3">
                  <label htmlFor="autoLockTimeout" className="text-sm font-medium text-blue-900">
                    Lock after:
                  </label>
                  <select
                    id="autoLockTimeout"
                    value={formData.autoLockTimeout || 5}
                    onChange={(e) =>
                      setFormData({ ...formData, autoLockTimeout: Number(e.target.value) })
                    }
                    className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-900 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value={1}>1 minute</option>
                    <option value={2}>2 minutes</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>
            )}

            {isPinConfigured() && biometricAvailable && (
              <Alert
                variant="info"
                title={
                  <>
                    <Fingerprint className="inline h-4 w-4" /> {getBiometricName(biometricType)}
                  </>
                }
              >
                <p className="mb-3">
                  Use {getBiometricName(biometricType)} to unlock the app quickly. Your PIN will
                  still work as a backup.
                </p>

                {isBiometricEnrolled() ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium">
                        {getBiometricName(biometricType)} is enabled
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={handleDisableBiometric}
                      variant="secondary"
                      size="sm"
                    >
                      Disable {getBiometricName(biometricType)}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleEnrollBiometric}
                    disabled={enrollingBiometric}
                    variant="primary"
                    size="sm"
                    isLoading={enrollingBiometric}
                    className="w-full sm:w-auto"
                  >
                    {enrollingBiometric
                      ? "Setting up..."
                      : `Enable ${getBiometricName(biometricType)}`}
                  </Button>
                )}
              </Alert>
            )}
          </div>
        </div>

        {/* STORAGE MONITORING */}
        <StorageMonitor />

        {/* BACKUP & DANGER ZONE */}
        <DataBackup />

        <Alert
          variant="error"
          title={
            <>
              <RotateCcw className="inline h-5 w-5" /> Reset Configuration
            </>
          }
        >
          <p className="mb-4">
            This will restore default subject lists and settings. Your student data will remain
            safe.
          </p>
          <Button
            onClick={() => setShowFactoryResetModal(true)}
            variant="danger"
            size="sm"
            className="w-full sm:w-auto"
          >
            Restore Factory Defaults
          </Button>
        </Alert>
      </main>

      {/* MODALS */}
      <ConfirmModal
        isOpen={showClassUpdateModal}
        title="Update Class Name Everywhere?"
        message={`You changed the class to "${formData.className}". Do you want to update this for all ${students.length} existing students?`}
        confirmText="Yes, Update Everyone"
        cancelText="No, Keep Old Name"
        onClose={() => setShowClassUpdateModal(false)}
        onConfirm={() => {
          setShowClassUpdateModal(false);
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

      {(formData.defaultSubjects.length >= 8 || (formData.componentLibrary?.length ?? 0) >= 3) && (
        <ScrollButton />
      )}

      <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />

      <ConfirmModal
        isOpen={showResetModal}
        title="Discard Changes?"
        message="This will reset all fields to their last saved state. Any unsaved changes will be lost."
        confirmText="Yes, Discard Changes"
        isDangerous={true}
        onClose={() => setShowResetModal(false)}
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
    </div>
  );
}

export default Settings;
