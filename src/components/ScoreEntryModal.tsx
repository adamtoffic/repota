// src/components/ScoreEntryModal.tsx
import { useState, useEffect } from "react";
import { X, User, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProcessedStudent, SchoolLevel, StudentRecord } from "../types";
import { AcademicTab } from "./tabs/AcademicTab";
import { DetailsTab } from "./tabs/DetailsTab";
import { useSwipe } from "../hooks/useSwipe";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
  // Navigation props
  allStudents?: ProcessedStudent[];
  onNavigate?: (studentId: string) => void;
}

export function ScoreEntryModal({
  student,
  level,
  isOpen,
  onClose,
  onUpdateStudent,
  allStudents,
  onNavigate,
}: Props) {
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "DETAILS">("ACADEMIC");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null); // null = show all

  // Get all unique subjects from current student
  const availableSubjects = student.subjects.map((s) => s.name).sort();

  // Calculate navigation info
  const currentIndex = allStudents?.findIndex((s) => s.id === student.id) ?? -1;
  const totalStudents = allStudents?.length ?? 0;
  const hasNavigation = allStudents && onNavigate && totalStudents > 1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalStudents - 1;

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen || !hasNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Arrow keys for navigation
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft" && hasPrevious) {
        e.preventDefault();
        onNavigate(allStudents[currentIndex - 1].id);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNavigate(allStudents[currentIndex + 1].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasNavigation, hasPrevious, hasNext, currentIndex, allStudents, onNavigate]);

  // Swipe gestures for mobile
  useSwipe({
    onSwipeLeft: () => {
      if (hasNavigation && hasNext) {
        onNavigate(allStudents[currentIndex + 1].id);
      }
    },
    onSwipeRight: () => {
      if (hasNavigation && hasPrevious) {
        onNavigate(allStudents[currentIndex - 1].id);
      }
    },
  });

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
        {/* HEADER WITH NAVIGATION */}
        <div className="bg-background flex items-center justify-between rounded-t-xl border-b border-gray-100 p-4 sm:p-6">
          {/* Left: Previous Button */}
          {hasNavigation && (
            <button
              onClick={() => hasPrevious && onNavigate(allStudents[currentIndex - 1].id)}
              disabled={!hasPrevious}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
              title="Previous student (Cmd/Ctrl + ←)"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Prev</span>
            </button>
          )}

          {/* Center: Student Info with Picker */}
          <div className="flex-1 text-center">
            {hasNavigation ? (
              <select
                value={student.id}
                onChange={(e) => onNavigate(e.target.value)}
                className="mx-auto max-w-xs rounded-lg border-2 border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 transition-all hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none sm:text-base"
              >
                {allStudents.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {idx + 1}. {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="text-base font-bold text-gray-800 sm:text-xl">{student.name}</h2>
            )}
            <p className="text-muted mt-1 text-xs sm:text-sm">
              {level} • {student.className}
              {hasNavigation && (
                <span className="ml-2 text-blue-600">
                  ({currentIndex + 1} of {totalStudents})
                </span>
              )}
            </p>

            {/* Subject Filter - Only show in Academic tab */}
            {activeTab === "ACADEMIC" && availableSubjects.length > 0 && (
              <div className="mt-2">
                <select
                  value={selectedSubject || "all"}
                  onChange={(e) =>
                    setSelectedSubject(e.target.value === "all" ? null : e.target.value)
                  }
                  className="mx-auto max-w-xs rounded-lg border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 transition-all hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none sm:text-sm"
                >
                  <option value="all">📚 All Subjects</option>
                  {availableSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
                {selectedSubject && (
                  <p className="mt-1 text-xs text-purple-600">Focus Mode: {selectedSubject}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Next Button or Close */}
          <div className="flex items-center gap-2">
            {hasNavigation && (
              <button
                onClick={() => hasNext && onNavigate(allStudents[currentIndex + 1].id)}
                disabled={!hasNext}
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                title="Next student (Cmd/Ctrl + →)"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-gray-200"
              title="Close (Esc)"
            >
              <X className="text-muted h-5 w-5" />
            </button>
          </div>
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
              filterSubject={selectedSubject}
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
