// src/components/SubjectRow.tsx - MOBILE OPTIMIZED WITH AUTO-CONVERSION
import { useState, useEffect, useRef } from "react";
import { Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { SavedSubject, SchoolLevel, ClassScoreComponentConfig } from "../types";
import { calculateGrade } from "../utils/gradeCalculator";

interface Props {
  subject: SavedSubject;
  level: SchoolLevel;
  maxClassScore: number;
  maxExamScore: number;
  componentLibrary?: ClassScoreComponentConfig[]; // Available component templates
  onChange: (updated: SavedSubject) => void;
  onDelete?: () => void;
}

export function SubjectRow({
  subject,
  level,
  maxClassScore,
  maxExamScore,
  componentLibrary,
  onChange,
  onDelete,
}: Props) {
  const hasComponents = subject.classScoreComponents && subject.classScoreComponents.length > 0;
  const hasLibrary = componentLibrary && componentLibrary.length > 0;
  // Auto-expand components when they exist
  const [showComponents, setShowComponents] = useState(hasComponents);

  const total = (subject.classScore || 0) + (subject.examScore || 0);
  const { grade, remark } = calculateGrade(total, level);

  const [showClassSaved, setShowClassSaved] = useState(false);
  const [showExamSaved, setShowExamSaved] = useState(false);
  const [classScoreError, setClassScoreError] = useState<string | null>(null);
  const [examScoreError, setExamScoreError] = useState<string | null>(null);
  const classTimerRef = useRef<number | null>(null);
  const examTimerRef = useRef<number | null>(null);

  // Track raw exam input (0-100) to avoid conversion rounding issues
  const [examRawInput, setExamRawInput] = useState<string>(() =>
    subject.examScore === 0 ? "" : Math.round((subject.examScore / maxExamScore) * 100).toString(),
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const classTimer = classTimerRef.current;
    const examTimer = examTimerRef.current;

    return () => {
      if (classTimer) clearTimeout(classTimer);
      if (examTimer) clearTimeout(examTimer);
    };
  }, []);

  // Update component score (read-only management - components managed in Settings)
  const handleExamChange = (value: string) => {
    setExamRawInput(value); // Store raw input

    if (value === "") {
      onChange({ ...subject, examScore: 0 });
      setExamScoreError(null);
      return;
    }

    const rawScore = Number(value);

    // Auto-clamp instead of blocking - better UX
    if (rawScore > 100) {
      setExamScoreError(`Auto-clamped to 100`);
      const clampedRaw = Math.min(rawScore, 100);
      const convertedScore = (clampedRaw / 100) * maxExamScore;
      onChange({ ...subject, examScore: Math.round(convertedScore) });

      // Clear error message after 2 seconds
      setTimeout(() => setExamScoreError(null), 2000);
      return;
    }

    setExamScoreError(null);
    // Clamp to 0-100
    const clampedRaw = Math.min(Math.max(rawScore, 0), 100);
    // Convert to percentage of maxExamScore
    const convertedScore = (clampedRaw / 100) * maxExamScore;

    onChange({ ...subject, examScore: Math.round(convertedScore) });
  };

  // Handle class score - direct entry when no components
  const handleClassChange = (value: string) => {
    if (hasComponents) return; // Don't allow direct entry if components exist

    if (value === "") {
      onChange({ ...subject, classScore: 0 });
      setClassScoreError(null);
      return;
    }

    const rawScore = Number(value);

    // Auto-clamp instead of blocking - better UX
    if (rawScore > maxClassScore) {
      setClassScoreError(`Auto-clamped to max (${maxClassScore})`);
      const clampedScore = Math.min(rawScore, maxClassScore);
      onChange({ ...subject, classScore: Math.round(clampedScore) });

      // Clear error message after 2 seconds
      setTimeout(() => setClassScoreError(null), 2000);
      return;
    }

    setClassScoreError(null);
    // Clamp to 0-maxClassScore (direct entry, no conversion)
    const clampedScore = Math.min(Math.max(rawScore, 0), maxClassScore);

    onChange({ ...subject, classScore: Math.round(clampedScore) });
  };

  // Handle individual component score change
  const handleComponentChange = (componentId: string, value: string, componentMaxScore: number) => {
    if (!subject.classScoreComponents) return;

    const rawScore = value === "" ? 0 : Number(value);
    // Clamp to 0-componentMaxScore
    const clampedScore = Math.min(Math.max(rawScore, 0), componentMaxScore);

    const updatedComponents = subject.classScoreComponents.map((comp) =>
      comp.id === componentId ? { ...comp, score: clampedScore } : comp,
    );

    // Sum all actual scores and all max scores
    const totalActualScore = updatedComponents.reduce((sum, comp) => sum + comp.score, 0);
    const totalMaxScore = updatedComponents.reduce((sum, comp) => sum + comp.maxScore, 0);

    // Calculate class score: (actualTotal / maxTotal) × classScoreMax
    // e.g., Assignment: 8/10, Project: 25/30, Test: 18/20 = 51/60 = 85%
    // If classScoreMax is 40, then: 0.85 × 40 = 34
    const percentageAchieved = totalMaxScore > 0 ? totalActualScore / totalMaxScore : 0;
    const convertedClassScore = percentageAchieved * maxClassScore;

    onChange({
      ...subject,
      classScoreComponents: updatedComponents,
      classScore: Math.round(convertedClassScore),
    });
  };

  // Save on blur with instant visual feedback
  const handleBlur = (field: "classScore" | "examScore") => {
    const setShow = field === "classScore" ? setShowClassSaved : setShowExamSaved;
    const timerRef = field === "classScore" ? classTimerRef : examTimerRef;

    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Show checkmark
    setShow(true);

    // Hide after 2 seconds
    timerRef.current = window.setTimeout(() => {
      setShow(false);
    }, 2000);
  };

  return (
    <div
      className={`group rounded-lg border bg-white shadow-sm transition-all duration-200 ${"border-gray-200 hover:border-blue-300 hover:shadow-md"}`}
    >
      {/* Main Row */}
      <div className="p-4 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* 1. SUBJECT NAME */}
          <div className="flex flex-1 items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800 sm:text-base">{subject.name}</span>
                {(hasComponents || hasLibrary) && (
                  <button
                    onClick={() => setShowComponents(!showComponents)}
                    className="flex items-center gap-1 rounded-lg bg-purple-100 px-2 py-1 text-purple-700 hover:bg-purple-200"
                    title="Toggle class score components"
                  >
                    <span className="text-[10px] font-bold">
                      {showComponents ? "Hide" : "Show"} Components
                    </span>
                    {showComponents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 sm:hidden">
                {remark} ({grade})
              </p>
              {hasComponents &&
                subject.classScoreComponents &&
                subject.classScoreComponents.length > 0 && (
                  <p className="mt-0.5 text-[10px] font-medium text-purple-600">
                    {subject.classScoreComponents.length} component
                    {subject.classScoreComponents.length !== 1 ? "s" : ""} configured
                  </p>
                )}
            </div>

            {onDelete && (
              <button
                onClick={onDelete}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 active:scale-95 sm:hidden"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 2. INPUTS AREA */}
          <div className="grid grid-cols-6 gap-2 sm:flex sm:w-auto sm:items-center">
            {/* Class Score Input */}
            <div className="col-span-2 sm:w-20">
              <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase sm:hidden">
                Class ({maxClassScore})
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={maxClassScore}
                  value={subject.classScore === 0 ? "" : subject.classScore}
                  onChange={(e) => handleClassChange(e.target.value)}
                  onBlur={() => handleBlur("classScore")}
                  disabled={hasComponents}
                  className={`w-full rounded-lg border p-3 text-center text-lg font-bold transition-all outline-none focus:ring-2 sm:p-2.5 sm:text-base ${
                    hasComponents
                      ? "cursor-not-allowed border-purple-200 bg-purple-50 text-purple-700"
                      : classScoreError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  placeholder={hasComponents ? "Auto" : `/${maxClassScore}`}
                  title={
                    hasComponents
                      ? `Auto-calculated: ${subject.classScore}/${maxClassScore}`
                      : `Enter class score (0-${maxClassScore})`
                  }
                />
                {showClassSaved && !hasComponents && (
                  <div className="animate-in fade-in zoom-in-95 absolute top-1/2 right-2 -translate-y-1/2 duration-200">
                    <Check size={16} className="text-green-600" strokeWidth={3} />
                  </div>
                )}
              </div>
              {hasComponents && (
                <p className="mt-1 text-center text-[10px] text-purple-600">
                  = {subject.classScore}/{maxClassScore}
                </p>
              )}
              {classScoreError && (
                <p className="mt-1 text-center text-[10px] font-bold text-red-600">
                  ⚠️ {classScoreError}
                </p>
              )}
            </div>

            {/* Exam Score Input */}
            <div className="col-span-2 sm:w-20">
              <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase sm:hidden">
                Exam ({maxExamScore})
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  value={examRawInput}
                  onChange={(e) => handleExamChange(e.target.value)}
                  onBlur={() => handleBlur("examScore")}
                  className={`w-full rounded-lg border p-3 text-center text-lg font-bold transition-all outline-none hover:border-gray-400 focus:ring-2 sm:p-2.5 sm:text-base ${
                    examScoreError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  placeholder="/100"
                  title={`Enter raw score (0-100). Converts to ${maxExamScore}%`}
                />
                {showExamSaved && (
                  <div className="animate-in fade-in zoom-in-95 absolute top-1/2 right-2 -translate-y-1/2 duration-200">
                    <Check size={16} className="text-green-600" strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="mt-1 text-center text-[10px] text-blue-600">
                = {subject.examScore}/{maxExamScore}
              </p>
              {examScoreError && (
                <p className="mt-1 text-center text-[10px] font-bold text-red-600">
                  ⚠️ {examScoreError}
                </p>
              )}
            </div>

            {/* Grade Badge */}
            <div className="hidden justify-center sm:flex sm:w-16">
              <span
                className={`rounded-lg px-2 py-1 text-xs font-bold shadow-sm ${
                  total < 50
                    ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                    : "bg-green-100 text-green-700 ring-1 ring-green-200"
                }`}
              >
                {grade}
              </span>
            </div>

            {/* Desktop Delete */}
            {onDelete && (
              <button
                onClick={onDelete}
                className="hidden rounded-lg p-2.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 sm:block"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Class Score Components Section */}
      {(hasComponents || hasLibrary) && showComponents && (
        <div className="border-t border-purple-200 bg-purple-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-purple-900">Component Breakdown</p>
            {hasComponents && subject.classScoreComponents && (
              <p className="text-[10px] font-medium text-purple-700">
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
                  className="relative rounded-lg border border-purple-300 bg-white p-3 shadow-sm"
                >
                  <label className="mb-1.5 block text-xs font-bold text-purple-800">
                    {component.name}
                    <span className="ml-1 text-purple-500">(/{component.maxScore})</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={component.maxScore}
                    value={component.score === 0 ? "" : component.score}
                    onChange={(e) =>
                      handleComponentChange(component.id, e.target.value, component.maxScore)
                    }
                    className="w-full rounded-lg border border-purple-300 p-2.5 text-center text-base font-bold transition-all outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder={`/${component.maxScore}`}
                  />
                  <p className="mt-1 text-center text-[10px] text-purple-600">
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
            <div className="mt-3 rounded-lg bg-purple-100 p-2 text-center">
              <p className="text-xs font-bold text-purple-900">
                Class Score: {subject.classScore}/{maxClassScore}
                <span className="ml-2 text-purple-600">
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

          {/* Info: Components are managed in Settings */}
          {hasComponents && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                ℹ️ <strong>Components managed in Settings.</strong> Go to Settings → Subject
                Components to add or remove.
              </p>
            </div>
          )}

          {/* Empty State when no components */}
          {!hasComponents && (
            <div className="mt-3 rounded-lg border-2 border-dashed border-purple-200 bg-white p-4 text-center text-xs text-purple-400">
              No components configured. Add components for this subject in Settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
