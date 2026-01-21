// src/components/ScoreEntryModal.tsx
import { useState } from "react";
import { X, User, BookOpen } from "lucide-react";
import type { ProcessedStudent, SchoolLevel, StudentRecord } from "../types";
import { AcademicTab } from "./tabs/AcademicTab";
import { DetailsTab } from "./tabs/DetailsTab";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
}

export function ScoreEntryModal({ student, level, isOpen, onClose, onUpdateStudent }: Props) {
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "DETAILS">("ACADEMIC");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-background flex items-center justify-between rounded-t-xl border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
            <p className="text-muted text-sm">
              {level} • {student.className}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-200"
          >
            <X className="text-muted h-5 w-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab("ACADEMIC")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "ACADEMIC"
                ? "border-blue-600 text-blue-600"
                : "text-muted border-transparent hover:text-gray-700"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Academic Scores
          </button>
          <button
            onClick={() => setActiveTab("DETAILS")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "DETAILS"
                ? "border-blue-600 text-blue-600"
                : "text-muted border-transparent hover:text-gray-700"
            }`}
          >
            <User className="h-4 w-4" /> Student Details
          </button>
        </div>

        {/* CONTENT */}
        <div className="bg-background/50 flex-1 overflow-y-auto p-6">
          {/* ✅ VITAL FIX: The 'key' prop.
            By passing student.id as a key, React completely destroys and recreates
            these components when you switch students. This ensures 'DetailsTab'
            resets its state without needing useEffect!
          */}
          {activeTab === "ACADEMIC" && (
            <AcademicTab
              key={student.id}
              student={student}
              level={level}
              onUpdate={(updated) => onUpdateStudent(updated, true)} // Silent mode - tab shows its own toast
            />
          )}

          {activeTab === "DETAILS" && (
            <DetailsTab key={student.id} student={student} onUpdate={onUpdateStudent} />
          )}
        </div>
      </div>
    </div>
  );
}
