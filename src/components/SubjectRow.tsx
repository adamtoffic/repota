// src/components/SubjectRow.tsx - MOBILE OPTIMIZED
import { useState, useEffect, useRef } from "react";
import { Trash2, AlertCircle, Check } from "lucide-react";
import type { SavedSubject, SchoolLevel } from "../types";
import { calculateGrade } from "../utils/gradeCalculator";

interface Props {
  subject: SavedSubject;
  level: SchoolLevel;
  maxClassScore: number;
  maxExamScore: number;
  onChange: (updated: SavedSubject) => void;
  onDelete?: () => void;
}

export function SubjectRow({
  subject,
  level,
  maxClassScore,
  maxExamScore,
  onChange,
  onDelete,
}: Props) {
  const total = (subject.classScore || 0) + (subject.examScore || 0);
  const { grade, remark } = calculateGrade(total, level);

  const [showClassSaved, setShowClassSaved] = useState(false);
  const [showExamSaved, setShowExamSaved] = useState(false);
  const classTimerRef = useRef<number | null>(null);
  const examTimerRef = useRef<number | null>(null);

  const isClassInvalid = (subject.classScore || 0) > maxClassScore;
  const isExamInvalid = (subject.examScore || 0) > maxExamScore;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      const classTimer = classTimerRef.current;
      const examTimer = examTimerRef.current;
      if (classTimer) clearTimeout(classTimer);
      if (examTimer) clearTimeout(examTimer);
    };
  }, []);

  const handleChange = (field: "classScore" | "examScore", value: string) => {
    const maxLimit = field === "classScore" ? maxClassScore : maxExamScore;

    if (value === "") {
      onChange({ ...subject, [field]: 0 });
      return;
    }

    const numValue = Number(value);

    // Silently clamp to max value instead of showing error toast
    const clampedValue = Math.min(numValue, maxLimit);
    onChange({ ...subject, [field]: clampedValue });
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
      className={`group rounded-lg border bg-white p-4 shadow-sm transition-all duration-200 sm:p-4 ${
        isClassInvalid || isExamInvalid
          ? "border-red-300 bg-red-50/50 ring-2 ring-red-100"
          : "border-gray-200 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* 1. SUBJECT NAME */}
        <div className="flex flex-1 items-center justify-between">
          <div>
            <span className="text-sm font-bold text-gray-800 sm:text-base">{subject.name}</span>
            <p className="text-[10px] text-gray-400 sm:hidden">
              {remark} ({grade})
            </p>

            {(isClassInvalid || isExamInvalid) && (
              <p className="mt-0.5 flex animate-pulse items-center gap-1 text-[10px] font-bold text-red-600">
                <AlertCircle size={10} />
                Limit Exceeded
              </p>
            )}
          </div>

          {/* ✅ FIX: Increased touch target to 44px */}
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
          {/* Class Score Input - ✅ Increased height for easier tapping */}
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
                onChange={(e) => handleChange("classScore", e.target.value)}
                onBlur={() => handleBlur("classScore")}
                className={`w-full rounded-lg border p-3 text-center text-lg font-bold transition-all outline-none focus:ring-2 sm:p-2.5 sm:text-base ${
                  isClassInvalid
                    ? "border-red-400 bg-red-50 text-red-900 ring-2 ring-red-200"
                    : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-200"
                }`}
                placeholder={`/${maxClassScore}`}
              />
              {showClassSaved && (
                <div className="animate-in fade-in zoom-in-95 absolute top-1/2 right-2 -translate-y-1/2 duration-200">
                  <Check size={16} className="text-green-600" strokeWidth={3} />
                </div>
              )}
            </div>
            {isClassInvalid && (
              <p className="mt-1 text-[10px] font-bold text-red-600">Max: {maxClassScore}</p>
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
                max={maxExamScore}
                value={subject.examScore === 0 ? "" : subject.examScore}
                onChange={(e) => handleChange("examScore", e.target.value)}
                onBlur={() => handleBlur("examScore")}
                className={`w-full rounded-lg border p-3 text-center text-lg font-bold transition-all outline-none focus:ring-2 sm:p-2.5 sm:text-base ${
                  isExamInvalid
                    ? "border-red-400 bg-red-50 text-red-900 ring-2 ring-red-200"
                    : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-200"
                }`}
                placeholder={`/${maxExamScore}`}
              />
              {showExamSaved && (
                <div className="animate-in fade-in zoom-in-95 absolute top-1/2 right-2 -translate-y-1/2 duration-200">
                  <Check size={16} className="text-green-600" strokeWidth={3} />
                </div>
              )}
            </div>
            {isExamInvalid && (
              <p className="mt-1 text-[10px] font-bold text-red-600">Max: {maxExamScore}</p>
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

          {/* Desktop Delete - ✅ Proper size */}
          <button
            onClick={onDelete}
            className="hidden rounded-lg p-2.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 sm:block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
