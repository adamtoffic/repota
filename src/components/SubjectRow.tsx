// src/components/SubjectRow.tsx
import { Trash2 } from "lucide-react";
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
  // Calculate grade dynamically for visual feedback
  const total = (subject.classScore || 0) + (subject.examScore || 0);
  const { grade, remark } = calculateGrade(total, level);

  const handleChange = (field: "classScore" | "examScore", value: string) => {
    const numValue = Math.min(Math.max(Number(value), 0), 100); // Clamp between 0-100
    onChange({ ...subject, [field]: numValue });
  };

  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300 sm:p-4">
      {/* FLEX CONTAINER: Stacks on mobile (flex-col), Row on desktop (sm:flex-row) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* 1. SUBJECT NAME (Grows to fill space) */}
        <div className="flex flex-1 items-center justify-between">
          <div>
            <span className="text-sm font-bold text-gray-800 sm:text-base">{subject.name}</span>
            {/* Mobile-only Helper Text */}
            <p className="text-[10px] text-gray-400 sm:hidden">
              {remark} ({grade})
            </p>
          </div>

          {/* Mobile-only Delete Button (Easier to reach on thumb) */}
          {onDelete && (
            <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 sm:hidden">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 2. INPUTS AREA (Grid for perfect alignment on mobile) */}
        <div className="grid grid-cols-6 gap-2 sm:flex sm:w-auto sm:items-center">
          {/* Class Score Input */}
          <div className="col-span-2 sm:w-20">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase sm:hidden">
              Class ({maxClassScore})
            </label>
            <input
              type="number"
              min="0"
              max={maxClassScore}
              value={subject.classScore === 0 ? "" : subject.classScore} // Empty string handles 0 better for typing
              onChange={(e) => handleChange("classScore", e.target.value)}
              className="w-full rounded border border-gray-300 p-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
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
              min="0"
              max={maxExamScore}
              value={subject.examScore === 0 ? "" : subject.examScore} // Empty string handles 0 better for typing
              onChange={(e) => handleChange("examScore", e.target.value)}
              className="w-full rounded border border-gray-300 p-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`/${maxExamScore}`}
            />
          </div>

          {/* Grade Badge (Hidden on Mobile inputs row since we moved it to title) */}
          <div className="hidden justify-center sm:flex sm:w-16">
            <span
              className={`rounded px-2 py-1 text-xs font-bold ${
                total < 50 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {grade}
            </span>
          </div>

          {/* Desktop Delete Button */}
          <button
            onClick={onDelete}
            className="hidden rounded p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:block"
            title="Remove Subject"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
