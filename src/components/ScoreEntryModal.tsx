// src/components/ScoreEntryModal.tsx
import { useState, useEffect, useRef } from "react";
import { X, User, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProcessedStudent, SchoolLevel, StudentRecord } from "../types";
import { AcademicTab } from "./tabs/AcademicTab";
import { DetailsTab } from "./tabs/DetailsTab";
import { useSwipe } from "../hooks/useSwipe";
import { trackScoreEntrySessionOnce } from "../utils/analytics";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
  // Navigation props
  allStudents?: ProcessedStudent[];
  onNavigate?: (studentId: string) => void;
  initialTab?: "ACADEMIC" | "DETAILS";
}

export function ScoreEntryModal({
  student,
  level,
  isOpen,
  onClose,
  onUpdateStudent,
  allStudents,
  onNavigate,
  initialTab = "ACADEMIC",
}: Props) {
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "DETAILS">(initialTab);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null); // null = show all
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Get all unique subjects from current student
  const availableSubjects = student.subjects.map((s) => s.name).sort();

  // Calculate navigation info
  const currentIndex = allStudents?.findIndex((s) => s.id === student.id) ?? -1;
  const totalStudents = allStudents?.length ?? 0;
  const hasNavigation = allStudents && onNavigate && totalStudents > 1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalStudents - 1;

  // Keyboard shortcuts (Escape always closes; Cmd/Ctrl + Arrows navigate when multiple students)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (!hasNavigation) return;

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
  }, [isOpen, onClose, hasNavigation, hasPrevious, hasNext, currentIndex, allStudents, onNavigate]);

  // Swipe gestures scoped to the open modal sheet (disabled inside inputs)
  useSwipe({
    enabled: isOpen && Boolean(hasNavigation),
    targetRef: modalContentRef,
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
      className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalContentRef}
        className="animate-sheet-up flex h-dvh max-h-dvh w-full max-w-4xl flex-col bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="safe-top bg-background shrink-0 sm:hidden" />

        {/* HEADER WITH NAVIGATION */}
        <div className="bg-background flex items-center justify-between gap-2 border-b border-gray-100 p-4 sm:rounded-t-xl sm:p-6">
          {/* Left: Previous Button (desktop/tablet — mobile uses thumb-zone footer) */}
          {hasNavigation && (
            <button
              type="button"
              onClick={() => hasPrevious && onNavigate(allStudents[currentIndex - 1].id)}
              disabled={!hasPrevious}
              className="hidden items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
              title="Previous student (Cmd/Ctrl + ←)"
              data-record="true"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
          )}

          {/* Center: Student Info with Picker */}
          <div className="min-w-0 flex-1 text-center">
            {hasNavigation ? (
              <select
                value={student.id}
                onChange={(e) => onNavigate(e.target.value)}
                className="mx-auto w-full max-w-xs rounded-lg border-2 border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 transition-all hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none sm:text-base"
              >
                {allStudents.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {idx + 1}. {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="truncate text-base font-bold text-gray-800 sm:text-xl">
                {student.name}
              </h2>
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
                  className="mx-auto w-full max-w-xs rounded-lg border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 transition-all hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none sm:text-sm"
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
          <div className="flex shrink-0 items-center gap-2">
            {hasNavigation && (
              <button
                type="button"
                onClick={() => hasNext && onNavigate(allStudents[currentIndex + 1].id)}
                disabled={!hasNext}
                className="hidden items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
                title="Next student (Cmd/Ctrl + →)"
                data-record="true"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-full p-2 transition-colors hover:bg-gray-200"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div role="tablist" className="flex flex-shrink-0 border-b border-gray-200 px-4 sm:px-6">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ACADEMIC"}
            onClick={() => setActiveTab("ACADEMIC")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "ACADEMIC"
                ? "border-blue-600 text-blue-600"
                : "text-muted border-transparent hover:text-gray-700"
            }`}
            data-record="true"
          >
            <BookOpen className="h-4 w-4" /> Academic Scores
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "DETAILS"}
            onClick={() => setActiveTab("DETAILS")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "DETAILS"
                ? "border-blue-600 text-blue-600"
                : "text-muted border-transparent hover:text-gray-700"
            }`}
            data-record="true"
          >
            <User className="h-4 w-4" /> Student Details
          </button>
        </div>

        {/* CONTENT */}
        <div className="bg-background/50 flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ✅ VITAL FIX: The 'key' prop.
            By passing student.id as a key, React completely destroys and recreates
            these components when you switch students. This ensures 'DetailsTab'
            resets its state without needing useEffect!
          */}
          <div key={`${student.id}-${activeTab}`} className="animate-page-enter">
            {activeTab === "ACADEMIC" && (
              <AcademicTab
                key={student.id}
                student={student}
                level={level}
                onUpdate={(updated) => {
                  trackScoreEntrySessionOnce({
                    entryMode: "score_modal",
                    usedColumnPaste: false,
                    schoolLevel: level,
                  });
                  onUpdateStudent(updated, true);
                }} // Silent mode - tab shows its own toast
                filterSubject={selectedSubject}
              />
            )}

            {activeTab === "DETAILS" && (
              <DetailsTab key={student.id} student={student} onUpdate={onUpdateStudent} />
            )}
          </div>
        </div>

        {/* MOBILE THUMB-ZONE FOOTER */}
        <div
          data-testid="mobile-modal-footer"
          className="safe-bottom flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3 sm:hidden"
        >
          {hasNavigation ? (
            <button
              type="button"
              onClick={() => hasPrevious && onNavigate(allStudents[currentIndex - 1].id)}
              disabled={!hasPrevious}
              aria-label="Previous student"
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 text-sm font-bold text-gray-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              data-record="true"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 min-h-11 rounded-xl px-5 text-sm font-bold text-white shadow-sm active:scale-95"
            data-record="true"
          >
            Done
          </button>

          {hasNavigation ? (
            <button
              type="button"
              onClick={() => hasNext && onNavigate(allStudents[currentIndex + 1].id)}
              disabled={!hasNext}
              aria-label="Next student"
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 text-sm font-bold text-gray-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              data-record="true"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
