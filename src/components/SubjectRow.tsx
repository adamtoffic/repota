// src/components/SubjectRow.tsx - MOBILE OPTIMIZED WITH AUTO-CONVERSION
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { SavedSubject, SchoolLevel, ClassScoreComponentConfig } from "../types";
import { calculateGrade } from "../utils/gradeCalculator";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  formatExamWeightedAsRaw,
  updateComponentAndRecalculateClassScore,
} from "../utils/scoreConversion";

interface Props {
  subject: SavedSubject;
  level: SchoolLevel;
  maxClassScore: number;
  maxExamScore: number;
  componentLibrary?: ClassScoreComponentConfig[]; // Available component templates
  isMockExam?: boolean; // When true, only exam score entry is shown
  onChange: (updated: SavedSubject) => void;
  onDelete?: () => void;
}

export function SubjectRow({
  subject,
  level,
  maxClassScore,
  maxExamScore,
  componentLibrary,
  isMockExam = false,
  onChange,
  onDelete,
}: Props) {
  const hasComponents =
    !isMockExam && subject.classScoreComponents && subject.classScoreComponents.length > 0;
  const hasLibrary = !isMockExam && componentLibrary && componentLibrary.length > 0;
  // Auto-expand components when they exist
  const [showComponents, setShowComponents] = useState(hasComponents);

  const total = (subject.classScore || 0) + (subject.examScore || 0);
  const { grade, remark } = calculateGrade(total, level);

  const [showClassSaved, setShowClassSaved] = useState(false);
  const [showExamSaved, setShowExamSaved] = useState(false);
  const [classScoreError, setClassScoreError] = useState<string | null>(null);
  const [examScoreError, setExamScoreError] = useState<string | null>(null);
  const timersRef = useRef<Record<string, number>>({});

  // Track active typing draft paired with the score it committed, so external clears (e.g. Clear Scores) resync immediately
  const [examDraft, setExamDraft] = useState<{ baseScore: number; raw: string } | null>(null);
  const examRawInput =
    examDraft !== null && examDraft.baseScore === subject.examScore
      ? examDraft.raw
      : formatExamWeightedAsRaw(subject.examScore, maxExamScore);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const scheduleTimer = (key: string, fn: () => void, ms: number) => {
    if (timersRef.current[key]) clearTimeout(timersRef.current[key]);
    timersRef.current[key] = window.setTimeout(fn, ms);
  };

  // Update component score (read-only management - components managed in Settings)
  const handleExamChange = (value: string) => {
    if (value === "") {
      setExamDraft({ baseScore: 0, raw: "" });
      onChange({ ...subject, examScore: 0 });
      setExamScoreError(null);
      return;
    }

    const { clampedRaw, wasClamped, weightedScore } = convertExamRawToWeighted(
      Number(value),
      maxExamScore,
    );

    if (wasClamped) {
      setExamScoreError(`Auto-clamped to 100`);
      setExamDraft({ baseScore: weightedScore, raw: String(clampedRaw) });
      onChange({ ...subject, examScore: weightedScore });
      scheduleTimer("examError", () => setExamScoreError(null), 2000);
      return;
    }

    setExamScoreError(null);
    setExamDraft({ baseScore: weightedScore, raw: value });
    onChange({ ...subject, examScore: weightedScore });
  };

  // Handle class score - direct entry when no components
  const handleClassChange = (value: string) => {
    if (hasComponents) return; // Don't allow direct entry if components exist

    if (value === "") {
      onChange({ ...subject, classScore: 0 });
      setClassScoreError(null);
      return;
    }

    const { score, wasClamped } = clampDirectClassScore(Number(value), maxClassScore);

    if (wasClamped) {
      setClassScoreError(`Auto-clamped to max (${maxClassScore})`);
      onChange({ ...subject, classScore: score });
      scheduleTimer("classError", () => setClassScoreError(null), 2000);
      return;
    }

    setClassScoreError(null);
    onChange({ ...subject, classScore: score });
  };

  // Handle individual component score change
  const handleComponentChange = (componentId: string, value: string) => {
    if (!subject.classScoreComponents) return;

    const rawScore = value === "" ? 0 : Number(value);
    const { updatedComponents, classScore } = updateComponentAndRecalculateClassScore(
      subject.classScoreComponents,
      componentId,
      rawScore,
      maxClassScore,
    );

    onChange({
      ...subject,
      classScoreComponents: updatedComponents,
      classScore,
    });
  };

  // Save on blur with instant visual feedback
  const handleBlur = (field: "classScore" | "examScore") => {
    if (field === "examScore") {
      setExamDraft(null);
    }
    const setShow = field === "classScore" ? setShowClassSaved : setShowExamSaved;

    // Show checkmark and auto-hide after 2 seconds
    setShow(true);
    scheduleTimer(field, () => setShow(false), 2000);
  };

  return (
    <div className="group border-border bg-surface rounded-lg border shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-500/60">
      {/* Main Row */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* 1. SUBJECT NAME */}
          <div className="flex flex-1 items-center justify-between">
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-main truncate text-sm font-bold sm:text-base">
                  {subject.name}
                </span>
                {!isMockExam && (hasComponents || hasLibrary) && (
                  <button
                    onClick={() => setShowComponents(!showComponents)}
                    className="flex shrink-0 items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-950/90"
                    title="Toggle class score components"
                  >
                    <span className="text-[10px] font-bold">
                      {showComponents ? "Hide" : "Show"}
                    </span>
                    {showComponents ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] sm:hidden">
                <span className="text-secondary font-bold">{total} pts</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-bold ${
                    total < 50
                      ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                      : "bg-green-100 text-green-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}
                >
                  {grade}
                </span>
                <span className="text-muted">{remark}</span>
              </div>
              {hasComponents &&
                subject.classScoreComponents &&
                subject.classScoreComponents.length > 0 && (
                  <p className="mt-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                    {subject.classScoreComponents.length} component
                    {subject.classScoreComponents.length !== 1 ? "s" : ""} configured
                  </p>
                )}
            </div>

            {onDelete && (
              <button
                onClick={onDelete}
                className="text-muted flex h-11 w-11 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 active:scale-95 sm:hidden dark:hover:bg-red-950/50 dark:hover:text-red-400"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 2. INPUTS AREA */}
          <div
            className={`grid gap-2 sm:flex sm:w-auto sm:items-center ${isMockExam ? "grid-cols-4" : "grid-cols-6"}`}
          >
            {/* Class Score Input — hidden in mock exam mode */}
            {!isMockExam && (
              <div className="col-span-2 sm:w-20">
                <label className="text-muted mb-1 block text-center text-[10px] font-bold uppercase">
                  Class (/{maxClassScore})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={maxClassScore}
                    aria-label={`${subject.name} Class Score`}
                    value={subject.classScore === 0 ? "" : subject.classScore}
                    onChange={(e) => handleClassChange(e.target.value)}
                    onBlur={() => handleBlur("classScore")}
                    disabled={hasComponents}
                    className={`placeholder:text-muted w-full rounded-lg border px-2 py-2 text-center text-base font-bold transition-all outline-none focus:ring-2 sm:p-2.5 ${
                      hasComponents
                        ? "cursor-not-allowed border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-300"
                        : classScoreError
                          ? "bg-input text-main border-red-500 focus:border-red-500 focus:ring-red-500/25"
                          : "border-border-strong bg-input text-main hover:border-muted focus:border-blue-500 focus:ring-blue-500/25"
                    }`}
                    placeholder={hasComponents ? "Auto" : `/${maxClassScore}`}
                    title={
                      hasComponents
                        ? `Auto-calculated: ${subject.classScore}/${maxClassScore}`
                        : `Enter class score (0-${maxClassScore})`
                    }
                  />
                  {showClassSaved && !hasComponents && (
                    <div className="animate-scale-in absolute top-1/2 right-2 -translate-y-1/2">
                      <Check size={16} className="text-green-600 dark:text-emerald-400" strokeWidth={3} />
                    </div>
                  )}
                </div>
                {hasComponents && (
                  <p className="mt-1 text-center text-[10px] text-purple-600 dark:text-purple-400">
                    = {subject.classScore}/{maxClassScore}
                  </p>
                )}
                {classScoreError && (
                  <p className="mt-1 text-center text-[10px] font-bold text-red-600 dark:text-red-400">
                    ⚠️ {classScoreError}
                  </p>
                )}
              </div>
            )}

            {/* Exam Score Input */}
            <div className="col-span-2 sm:w-20">
              <label className="text-muted mb-1 block text-center text-[10px] font-bold uppercase">
                {isMockExam ? "Score (/100)" : "Exam (/100)"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  aria-label={`${subject.name} Exam Score`}
                  value={examRawInput}
                  onChange={(e) => handleExamChange(e.target.value)}
                  onBlur={() => handleBlur("examScore")}
                  className={`bg-input text-main placeholder:text-muted hover:border-muted w-full rounded-lg border px-2 py-2 text-center text-base font-bold transition-all outline-none focus:ring-2 sm:p-2.5 ${
                    examScoreError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                      : "border-border-strong focus:border-blue-500 focus:ring-blue-500/25"
                  }`}
                  placeholder="/100"
                  title={
                    isMockExam
                      ? "Enter exam score (0-100)"
                      : `Enter raw score (0-100). Converts to ${maxExamScore}%`
                  }
                />
                {showExamSaved && (
                  <div className="animate-scale-in absolute top-1/2 right-2 -translate-y-1/2">
                    <Check size={16} className="text-green-600 dark:text-emerald-400" strokeWidth={3} />
                  </div>
                )}
              </div>
              {!isMockExam && (
                <p className="mt-1 text-center text-[10px] text-blue-600 dark:text-blue-400">
                  = {subject.examScore}/{maxExamScore}
                </p>
              )}
              {examScoreError && (
                <p className="mt-1 text-center text-[10px] font-bold text-red-600 dark:text-red-400">
                  ⚠️ {examScoreError}
                </p>
              )}
            </div>

            {/* Total Score - Mobile */}
            <div className="col-span-2 flex flex-col items-center justify-center sm:hidden">
              <label className="text-muted mb-1 block text-[10px] font-bold uppercase">
                Total
              </label>
              <div className="text-main text-base font-bold">{total}</div>
            </div>

            {/* Grade Badge - Desktop */}
            <div className="hidden justify-center sm:flex sm:w-16">
              <span
                className={`rounded-lg px-2 py-1 text-xs font-bold shadow-sm ${
                  total < 50
                    ? "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800/70"
                    : "bg-green-100 text-green-700 ring-1 ring-green-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/70"
                }`}
              >
                {grade}
              </span>
            </div>

            {/* Desktop Delete */}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-muted hidden rounded-lg p-2.5 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 sm:block dark:hover:bg-red-950/50 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Class Score Components Section — hidden in mock exam mode */}
      {!isMockExam && (hasComponents || hasLibrary) && showComponents && (
        <div className="border-t border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800/70 dark:bg-purple-950/35">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
              Component Breakdown
            </p>
            {hasComponents && subject.classScoreComponents && (
              <p className="text-[10px] font-medium text-purple-700 dark:text-purple-300">
                Total: {subject.classScoreComponents.reduce((sum, c) => sum + c.score, 0)}/
                {subject.classScoreComponents.reduce((sum, c) => sum + c.maxScore, 0)} marks
              </p>
            )}
          </div>

          {/* Existing Components */}
          {hasComponents && subject.classScoreComponents && (
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subject.classScoreComponents.map((component) => (
                <div
                  key={component.id}
                  className="bg-surface relative rounded-lg border border-purple-300 p-3 shadow-sm dark:border-purple-800/70"
                >
                  <label className="mb-1.5 block text-xs font-bold text-purple-800 dark:text-purple-200">
                    {component.name}
                    <span className="ml-1 text-purple-500 dark:text-purple-400">
                      (/{component.maxScore})
                    </span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={component.maxScore}
                    value={component.score === 0 ? "" : component.score}
                    onChange={(e) => handleComponentChange(component.id, e.target.value)}
                    className="bg-input text-main placeholder:text-muted w-full rounded-lg border border-purple-300 p-2.5 text-center text-base font-bold transition-all outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-purple-700/70"
                    placeholder={`/${component.maxScore}`}
                  />
                  <p className="mt-1 text-center text-[10px] text-purple-600 dark:text-purple-400">
                    {component.score > 0
                      ? ((component.score / component.maxScore) * 100).toFixed(0)
                      : 0}
                    %
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Class Score Summary */}
          {hasComponents && subject.classScoreComponents && (
            <div className="mt-3 rounded-lg bg-purple-100 p-2 text-center dark:bg-purple-950/60">
              <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Class Score: {subject.classScore}/{maxClassScore}
                <span className="ml-2 text-purple-600 dark:text-purple-300">
                  (
                  {subject.classScoreComponents.length > 0
                    ? Math.round(
                        (subject.classScoreComponents.reduce((sum, c) => sum + c.score, 0) /
                          subject.classScoreComponents.reduce((sum, c) => sum + c.maxScore, 0)) *
                          100,
                      )
                    : 0}
                  % achieved)
                </span>
              </p>
            </div>
          )}

          {/* Info: Components are managed in the SBA tab */}
          {hasComponents && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/70 dark:bg-blue-950/45">
              <p className="text-xs text-blue-700 dark:text-blue-200">
                ℹ️ <strong>Components are configured in the SBA tab.</strong>{" "}
                <Link
                  to="/sba"
                  className="font-bold underline hover:text-blue-900 dark:hover:text-blue-100"
                >
                  Open SBA Setup →
                </Link>
              </p>
            </div>
          )}

          {/* Empty State when no components */}
          {!hasComponents && (
            <div className="bg-surface mt-3 rounded-lg border-2 border-dashed border-purple-200 p-4 text-center text-xs text-purple-600 dark:border-purple-800/70 dark:text-purple-300">
              No components configured for this subject yet.{" "}
              <Link
                to="/sba"
                className="font-bold underline hover:text-purple-900 dark:hover:text-purple-100"
              >
                Configure in SBA Setup →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
