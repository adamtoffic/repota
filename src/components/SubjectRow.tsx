// src/components/SubjectRow.tsx
import { Trash2 } from "lucide-react";
import type { SavedSubject, SchoolLevel } from "../types"; // Removed Grade import, not needed explicitly
import { calculateGrade } from "../utils/gradeCalculator";

interface Props {
  subject: SavedSubject;
  level: SchoolLevel;
  onChange: (updatedSubject: SavedSubject) => void;
  onDelete: () => void;
}

export function SubjectRow({ subject, level, onChange, onDelete }: Props) {
  // 1. DERIVED STATE (No useState, No useEffect!)
  // Just calculate it right here. It recalculates instantly whenever props change.
  const total = (Number(subject.classScore) || 0) + (Number(subject.examScore) || 0);
  const gradeInfo = calculateGrade(total, level);

  // Helper to handle input changes
  const handleInputChange = (field: "classScore" | "examScore", value: string) => {
    // 1. Handle empty deletion (user backspaces everything) -> set to 0
    if (value === "") {
      onChange({ ...subject, [field]: 0 });
      return;
    }

    // 2. Parse the number (handles decimals better than Number())
    const numValue = parseFloat(value);

    // 3. CRITICAL SAFETY: If user types "12abc", numValue is NaN.
    // We must NOT save NaN to the database, or math will crash later.
    if (isNaN(numValue)) return;

    // 4. Boundary Checks (Optional but good)
    if (numValue < 0) return; // No negative scores
    // if (field === "classScore" && numValue > 50) return; // Strict Class Score limit (optional)
    // if (field === "examScore" && numValue > 100) return; // Strict Exam limit (optional)

    onChange({ ...subject, [field]: numValue });
  };

  return (
    <div className="grid grid-cols-12 items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3 transition-colors hover:border-blue-200">
      {/* 1. Subject Name */}
      <div className="col-span-4">
        <input
          type="text"
          value={subject.name}
          onChange={(e) => onChange({ ...subject, name: e.target.value })}
          className="w-full border-none bg-transparent p-0 font-medium text-gray-800 focus:ring-0"
          placeholder="Subject Name"
        />
      </div>

      {/* 2. Class Score */}
      <div className="col-span-2">
        <input
          type="number"
          value={subject.classScore === 0 ? "" : subject.classScore} // Show empty if 0 for easier typing
          onChange={(e) => handleInputChange("classScore", e.target.value)}
          className="w-full rounded border p-2 text-center outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      {/* 3. Exam Score */}
      <div className="col-span-2">
        <input
          type="number"
          value={subject.examScore === 0 ? "" : subject.examScore}
          onChange={(e) => handleInputChange("examScore", e.target.value)}
          className="w-full rounded border p-2 text-center outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      {/* 4. Total & Grade (Visual Feedback) */}
      <div className="col-span-3 flex flex-col items-center justify-center rounded border bg-white py-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-blue-700">{total}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-bold ${
              // Simple color logic based on the remark
              ["Fail", "Lowest", "Lower", "Low"].includes(gradeInfo.remark)
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {gradeInfo.grade}
          </span>
        </div>
      </div>

      {/* 5. Delete Button */}
      <div className="col-span-1 text-right">
        <button
          onClick={onDelete}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Remove Subject"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
