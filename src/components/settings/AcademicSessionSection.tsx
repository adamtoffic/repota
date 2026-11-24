import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, BookOpen, Plus, Users, X } from "lucide-react";
import type { AcademicPeriod, ExamType, SchoolLevel } from "../../types";
import { IconButton, Input } from "../ui";
import { SbaWeightsModal } from "../sba/SbaWeightsModal";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { useSchoolActions, useSchoolStudents } from "../../hooks/useSchoolData";

export function AcademicSessionSection() {
  const {
    formData,
    setFormData,
    isPersistenceSuspended,
    handleLevelChange,
    handleClassNameBlur,
    flushPendingSave,
    syncCommittedSettings,
    newSubject,
    setNewSubject,
    addSubject,
    removeSubject,
  } = useSettingsForm();
  const students = useSchoolStudents();
  const { updateAssessmentWeights } = useSchoolActions();
  const [pendingExamType, setPendingExamType] = useState<ExamType | null>(null);

  const handleExamTypeSelect = (type: ExamType) => {
    if (isPersistenceSuspended) return;
    if ((formData.examType ?? "TERMLY") === type) return;
    if (students.length === 0) {
      const targetClassMax = type === "MOCK" ? 0 : formData.level === "SHS" ? 30 : 50;
      const targetExamMax = 100 - targetClassMax;
      flushPendingSave();
      const updated = updateAssessmentWeights(targetClassMax, targetExamMax, {
        examType: type,
        scoreMode: "rescale",
      });
      syncCommittedSettings(updated);
      return;
    }
    setPendingExamType(type);
  };

  return (
    <>
      <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 space-y-6 border-0 p-0">
      {/* CARD 2: ACADEMIC SESSION */}
      <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-2.5 dark:bg-orange-950/60">
            <BookOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-main text-lg font-bold" data-record="true">
            Academic Session
          </h2>
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
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800/60"
                      : "border-border bg-surface text-secondary hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 dark:border dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
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
                  onBlur={handleClassNameBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  className="pl-9 font-bold"
                  placeholder="e.g. Basic 4"
                />
                <Users className="text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
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
                className="border-border-strong bg-input text-main w-full rounded-lg border p-2.5 text-sm font-bold transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>

          {/* EXAM TYPE SELECTOR */}
          <div>
            <label className="text-muted mb-2 block text-xs font-bold tracking-wide uppercase">
              Exam Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["TERMLY", "MOCK"] as ExamType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={(formData.examType ?? "TERMLY") === type}
                  onClick={() => handleExamTypeSelect(type)}
                  className={`rounded-lg border-2 px-3 py-3 text-sm font-bold shadow-sm transition-all active:scale-95 ${
                    (formData.examType ?? "TERMLY") === type
                      ? type === "MOCK"
                        ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60"
                        : "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800/60"
                      : "border-border bg-surface text-secondary hover:border-border-strong hover:bg-subtle"
                  }`}
                >
                  {type === "TERMLY" ? "📚 Termly" : "📃 Mock Exam"}
                </button>
              ))}
            </div>
            {formData.examType === "MOCK" ? (
              <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p>
                  <strong>Mock Exam mode:</strong> Only exam scores (0–100) are recorded. Class
                  scores and SBA components are disabled. Grades use the same system.
                </p>
              </div>
            ) : (
              <p className="text-muted mt-2 text-xs">
                Current split:{" "}
                <strong className="text-secondary">
                  {formData.classScoreMax}/{formData.examScoreMax}
                </strong>
                . Need to adjust Continuous Assessment weights or manage SBA tasks?{" "}
                <Link
                  to="/sba"
                  className="text-primary-text font-semibold hover:underline"
                >
                  Open SBA Markbook →
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CARD 4: SUBJECTS */}
      <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-main text-base font-bold tracking-wide uppercase" data-record="true">
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
            className="rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:hover:bg-blue-900/70"
          >
            <Plus className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="flex flex-wrap gap-2">
          {(formData.defaultSubjects || []).map((sub, index) => (
            <span
              key={index}
              className="border-border bg-subtle text-secondary inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
            >
              {sub}
              <button
                type="button"
                onClick={() => removeSubject(index)}
                className="text-muted rounded-full p-0.5 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-950/60 dark:hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
      </fieldset>

      <SbaWeightsModal
        isOpen={pendingExamType !== null}
        onClose={() => setPendingExamType(null)}
        students={students}
        settings={formData}
        initialExamType={pendingExamType ?? undefined}
        disabled={isPersistenceSuspended}
        onApplyWeights={(nextClass, nextExam, options) => {
          flushPendingSave();
          const updated = updateAssessmentWeights(nextClass, nextExam, options);
          syncCommittedSettings(updated);
        }}
      />
    </>
  );
}
