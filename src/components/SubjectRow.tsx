// src/components/SubjectRow.tsx - MOBILE OPTIMIZED
import { Trash2, AlertCircle } from "lucide-react";
import type { SavedSubject, SchoolLevel } from "../types";
import { calculateGrade } from "../utils/gradeCalculator";
import { useToast } from "../hooks/useToast";

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
  const { showToast } = useToast();

  const isClassInvalid = (subject.classScore || 0) > maxClassScore;
  const isExamInvalid = (subject.examScore || 0) > maxExamScore;

  const handleChange = (field: "classScore" | "examScore", value: string) => {
    const maxLimit = field === "classScore" ? maxClassScore : maxExamScore;

    if (value === "") {
      onChange({ ...subject, [field]: 0 });
      return;
    }

    const numValue = Number(value);

    if (numValue > maxLimit) {
      showToast(`Maximum allowed score is ${maxLimit}.`, "error");
    }

    onChange({ ...subject, [field]: numValue });
  };

  return (
    <div
      className={`group rounded-lg border bg-white p-3 shadow-sm transition-colors sm:p-4 ${
        isClassInvalid || isExamInvalid
          ? "border-red-300 ring-1 ring-red-100"
          : "border-gray-200 hover:border-blue-300"
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
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={subject.classScore === 0 ? "" : subject.classScore}
              onChange={(e) => handleChange("classScore", e.target.value)}
              className={`w-full rounded border p-2.5 text-center text-base font-bold outline-none focus:ring-2 ${
                isClassInvalid
                  ? "border-red-500 bg-red-50 text-red-900 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder={`/${maxClassScore}`}
            />
          </div>

          {/* Exam Score Input */}
          <div className="col-span-2 sm:w-20">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase sm:hidden">
              Exam ({maxExamScore})
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={subject.examScore === 0 ? "" : subject.examScore}
              onChange={(e) => handleChange("examScore", e.target.value)}
              className={`w-full rounded border p-2.5 text-center text-base font-bold outline-none focus:ring-2 ${
                isExamInvalid
                  ? "border-red-500 bg-red-50 text-red-900 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder={`/${maxExamScore}`}
            />
          </div>

          {/* Grade Badge */}
          <div className="hidden justify-center sm:flex sm:w-16">
            <span
              className={`rounded px-2 py-1 text-xs font-bold ${
                total < 50 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {grade}
            </span>
          </div>

          {/* Desktop Delete - ✅ Proper size */}
          <button
            onClick={onDelete}
            className="hidden rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
