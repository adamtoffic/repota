import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Save,
  Plus,
  AlertCircle,
  School,
  BookOpen,
  Users,
  Briefcase,
  X,
  RotateCcw,
  Calculator,
} from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { ImageUploader } from "../components/ImageUploader";
import { DataBackup } from "../components/DataBackup";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { CLASS_OPTIONS } from "../constants/classes";
import type { SchoolLevel, SchoolSettings, AcademicPeriod } from "../types";
import { ScrollButton } from "../components/ScrollButton";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";

// ✅ FIX: Defined OUTSIDE the component to prevent re-render issues
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase">
    {children}
  </label>
);

const inputClass =
  "w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

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
  const navigate = useNavigate({ from: "/settings" });

  const [formData, setFormData] = useState<SchoolSettings>(settings);
  const [newSubject, setNewSubject] = useState("");
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentMax, setNewComponentMax] = useState("");
  const [showClassUpdateModal, setShowClassUpdateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // --- HANDLERS ---
  const handleLevelChange = (newLevel: SchoolLevel) => {
    const defaultSubs = DEFAULT_SUBJECTS[newLevel] || [];
    const defaultClass = CLASS_OPTIONS[newLevel]?.[0] || "";

    setFormData((prev) => ({
      ...prev,
      level: newLevel,
      defaultSubjects: defaultSubs,
      className: defaultClass,
    }));
    showToast(`Loaded presets for ${newLevel}`, "info");
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
    setFormData((prev) => ({
      ...prev,
      defaultSubjects: prev.defaultSubjects?.filter((_, i) => i !== index),
    }));
  };

  const addComponent = () => {
    const trimmed = newComponentName.trim();
    const maxScore = parseInt(newComponentMax);

    if (!trimmed) {
      showToast("Please enter a component name!", "error");
      return;
    }

    if (!maxScore || maxScore <= 0 || maxScore > 100) {
      showToast("Please enter a valid max score (1-100)!", "error");
      return;
    }

    const current = formData.classScoreComponentConfigs || [];
    if (current.some((c) => c.name === trimmed)) {
      showToast("This component already exists!", "error");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      classScoreComponentConfigs: [...current, { name: trimmed, maxScore }],
    }));
    setNewComponentName("");
    setNewComponentMax("");
    showToast("Component added!", "success");
  };

  const removeComponent = (componentName: string) => {
    setFormData((prev) => ({
      ...prev,
      classScoreComponentConfigs: (prev.classScoreComponentConfigs || []).filter(
        (config) => config.name !== componentName,
      ),
    }));
    showToast("Component removed!", "success");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.className !== settings.className && students.length > 0) {
      setShowClassUpdateModal(true);
      return;
    }
    finalizeSave();
  };

  const finalizeSave = (shouldUpdateStudents = false) => {
    setSettings(formData);
    if (shouldUpdateStudents) {
      updateClassNameForAll(formData.className || "");
      showToast(`Updated class name for ${students.length} students`, "success");
    }
    showToast("Configuration saved successfully!", "success");
    navigate({ to: "/" });
  };

  return (
    <div className="bg-background min-h-screen pb-20 font-sans">
      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-full p-2 text-gray-600 transition-transform hover:bg-gray-100 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-main text-lg font-bold sm:text-xl">Settings</h1>
          </div>
          <button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-md transition-all active:scale-95"
          >
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
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
              <div>
                <Label>School Name</Label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className={`${inputClass} text-main font-bold`}
                  placeholder="e.g. Royal International School"
                />
              </div>

              <div>
                <Label>Motto</Label>
                <input
                  type="text"
                  value={formData.schoolMotto || ""}
                  onChange={(e) => setFormData({ ...formData, schoolMotto: e.target.value })}
                  className={`${inputClass} italic`}
                  placeholder="e.g. Knowledge is Power"
                />
              </div>

              <div>
                <Label>Address / Location</Label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Kumasi, Ashanti Region"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Phone Number</Label>
                  <input
                    type="tel"
                    value={formData.phoneNumber || ""}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className={inputClass}
                    placeholder="024 123 4567"
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    placeholder="school@gmail.com"
                  />
                </div>
              </div>

              {/* School Type */}
              <div>
                <Label>Curriculum Type</Label>
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

              {/* Private School Fees */}
              {formData.schoolType === "PRIVATE" && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <Label>
                    <span className="text-purple-900">Fee Schedule (GH₵)</span>
                  </Label>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        School Fees <span className="text-[10px] text-slate-600">(Per Term)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={formData.schoolGift || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            schoolGift: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        className={inputClass}
                        placeholder="5.00"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Canteen Fees <span className="text-[10px] text-purple-600">(Daily)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={formData.canteenFees || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            canteenFees: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        className={inputClass}
                        placeholder="10.00"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        First Aid <span className="text-[10px] text-green-700">(Per Term)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={formData.firstAidFees || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            firstAidFees: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        className={inputClass}
                        placeholder="5.00"
                      />
                    </div>
                  </div>
                </div>
              )}
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
              <Label>School Level</Label>
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

              {/* Context Hint */}
              <div className="mt-3 flex gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
                <p>
                  {formData.level === "KG" &&
                    "Kindergarten: Uses developmental grading (Gold, Silver, Bronze)."}
                  {formData.level === "PRIMARY" &&
                    "Primary: Uses standard descriptive grading (1-5)."}
                  {formData.level === "JHS" &&
                    "Junior High: Uses the Aggregate System (Core 4 + Best 2)."}
                  {formData.level === "SHS" && "Senior High: Uses WASSCE Grading (A1 - F9)."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Class Name</Label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.className || ""}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className={`${inputClass} pl-9 font-bold`}
                    placeholder="e.g. Class 3"
                  />
                  <Users className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <Label>Class Size (Number on Roll)</Label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="200"
                  value={formData.classSize || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, classSize: Number(e.target.value) || undefined })
                  }
                  className={`${inputClass} font-bold`}
                  placeholder="e.g. 30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Total Attendance Days</Label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="365"
                  value={formData.totalAttendanceDays || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, totalAttendanceDays: Number(e.target.value) })
                  }
                  className={`${inputClass} font-bold`}
                  placeholder="e.g. 70"
                />
              </div>
              <div>
                <Label>Next Term Begins</Label>
                <input
                  type="date"
                  value={formData.nextTermStarts || ""}
                  onChange={(e) => setFormData({ ...formData, nextTermStarts: e.target.value })}
                  className={`${inputClass} font-bold`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Academic Year</Label>
                <input
                  type="text"
                  required
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className={`${inputClass} font-bold`}
                  placeholder="e.g. 2025/2026"
                />
              </div>
              <div>
                <Label>Term / Semester</Label>
                <select
                  value={formData.term}
                  onChange={(e) =>
                    setFormData({ ...formData, term: e.target.value as AcademicPeriod })
                  }
                  className={`${inputClass} bg-white font-bold`}
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>
            </div>

            {/* GRADING CONFIG */}
            <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 sm:p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-yellow-900 uppercase">
                <AlertCircle className="h-4 w-4" /> Grading Limits
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>Class Score Max</Label>
                  <input
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
                    className={`${inputClass} border-yellow-300 bg-white text-center font-bold focus:border-yellow-500 focus:ring-yellow-300`}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label>Exam Score Max</Label>
                  <input
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
                    className={`${inputClass} border-yellow-300 bg-white text-center font-bold focus:border-yellow-500 focus:ring-yellow-300`}
                    placeholder="70"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-yellow-800">
                <span className="font-bold">Total must equal 100.</span> Changing one value
                automatically adjusts the other. (Current:{" "}
                {(formData.classScoreMax || 0) + (formData.examScoreMax || 0)})
              </p>
            </div>

            {/* CLASS SCORE COMPONENTS */}
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-purple-700" />
                <h3 className="text-xs font-bold tracking-wider text-purple-900 uppercase">
                  Class Score Components (Optional)
                </h3>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-purple-700">
                Break down class scores into components like "Class Test" (max: 20), "Project" (max:
                30). Set a max score for each component. Students' actual scores will be summed and
                converted to the class score percentage.
              </p>

              {/* Add Component Input */}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
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
                  className="flex-1 rounded-lg border border-purple-300 bg-white p-2.5 text-sm transition-all outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  placeholder="e.g. Class Test, Project"
                />
                <div className="flex gap-2">
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
                    className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-center text-sm transition-all outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 sm:w-24"
                    placeholder="Max Score"
                  />
                  <button
                    type="button"
                    onClick={addComponent}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Component List */}
              {(formData.classScoreComponentConfigs || []).length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-purple-800">
                    {(formData.classScoreComponentConfigs || []).length} Component
                    {(formData.classScoreComponentConfigs || []).length !== 1 ? "s" : ""}
                    {" (Total: "}
                    {(formData.classScoreComponentConfigs || []).reduce(
                      (sum, c) => sum + c.maxScore,
                      0,
                    )}
                    {" marks)"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(formData.classScoreComponentConfigs || []).map((config) => (
                      <div
                        key={config.name}
                        className="flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm shadow-sm"
                      >
                        <span className="font-medium text-gray-700">{config.name}</span>
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                          /{config.maxScore}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeComponent(config.name)}
                          className="rounded p-0.5 text-purple-500 transition-colors hover:bg-purple-100 hover:text-purple-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-purple-200 bg-white p-4 text-center text-xs text-purple-400">
                  No components added. Class score will be entered directly (0-100 →{" "}
                  {formData.classScoreMax}%).
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
              <div>
                <Label>Head Teacher Name</Label>
                <input
                  type="text"
                  value={formData.headTeacherName || ""}
                  onChange={(e) => setFormData({ ...formData, headTeacherName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <ImageUploader
                label="Head Teacher Signature"
                value={formData.headTeacherSignature}
                onChange={(val) => setFormData({ ...formData, headTeacherSignature: val })}
                maxHeight="h-24"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label>Class Teacher Name</Label>
                <input
                  type="text"
                  value={formData.classTeacherName || ""}
                  onChange={(e) => setFormData({ ...formData, classTeacherName: e.target.value })}
                  className={inputClass}
                />
              </div>
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
              Class Subjects
            </h2>
            <p className="text-muted text-xs">
              These subjects will be added to all new students automatically.
            </p>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
              className={`${inputClass} flex-1`}
              placeholder="Type subject name..."
            />
            <button
              type="button"
              onClick={addSubject}
              className="rounded-lg bg-blue-100 px-4 font-bold text-blue-700 hover:bg-blue-200"
            >
              <Plus className="h-5 w-5" />
            </button>
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

        {/* BACKUP & DANGER ZONE */}
        <DataBackup />

        <div className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-red-900">
            <RotateCcw className="h-5 w-5" /> Reset Configuration
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-red-800">
            This will restore default subject lists and settings. Your student data will remain
            safe.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 sm:w-auto"
          >
            Restore Factory Defaults
          </button>
        </div>

        {/* ABOUT (Keep existing) */}
        {/* ... (Copy your About Card logic here if you want it) ... */}
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
        isOpen={showResetModal}
        title="Restore Default Settings?"
        message="Are you sure? This will overwrite your School Name, Logo, and Default Subjects."
        confirmText="Yes, Restore Defaults"
        isDangerous={true}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => {
          restoreDefaults();
          setShowResetModal(false);
          setTimeout(() => window.location.reload(), 1000);
        }}
      />

      {/* ✅ SCROLL BUTTON - Show when form is long (8+ subjects or 3+ components) */}
      {(formData.defaultSubjects.length >= 8 ||
        (formData.classScoreComponentConfigs?.length ?? 0) >= 3) && <ScrollButton />}

      {/* ✅ AUTO-SAVE INDICATOR */}
      <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
    </div>
  );
}

export default Settings;
