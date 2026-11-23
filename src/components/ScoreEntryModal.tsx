import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  WifiOff,
  X,
} from "lucide-react";
import type { ProcessedStudent, SchoolLevel, StudentRecord } from "../types";
import { AcademicTab } from "./tabs/AcademicTab";
import { DetailsTab } from "./tabs/DetailsTab";
import { useSwipe } from "../hooks/useSwipe";
import { useSchoolLifecycle, useSchoolSettings } from "../hooks/useSchoolData";
import { trackScoreEntrySessionOnce } from "../utils/analytics";
import { getScoredSubjectCounts } from "../utils/studentValidation";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
  allStudents?: ProcessedStudent[];
  onNavigate?: (studentId: string) => void;
  initialTab?: "ACADEMIC" | "DETAILS";
  renderPrintAction?: (studentId: string) => ReactNode;
  renderSbaSetupLink?: () => ReactNode;
}

function getStudentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Isolated save-status leaf so 500ms storage debounce ticks never re-render ScoreEntryModal
 * or its score/detail tabs.
 */
function ModalSaveStatus() {
  const { isSaving, lastSaved } = useSchoolLifecycle();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <span
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300"
        title="Offline — changes save locally"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:inline" data-record="true">
          Offline
        </span>
      </span>
    );
  }

  if (isSaving) {
    return (
      <span
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/60 dark:text-blue-300"
        title="Saving changes..."
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span className="hidden md:inline" data-record="true">
          Saving…
        </span>
      </span>
    );
  }

  if (lastSaved) {
    return (
      <span
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300"
        title="All changes saved"
      >
        <Check className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:inline" data-record="true">
          Saved
        </span>
      </span>
    );
  }

  return (
    <span
      className="border-border bg-subtle text-muted hidden h-8 items-center rounded-lg border px-2 text-[11px] font-semibold md:inline-flex"
      data-record="true"
    >
      Auto-save
    </span>
  );
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
  renderPrintAction,
  renderSbaSetupLink,
}: Props) {
  const settings = useSchoolSettings();
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "DETAILS">(initialTab);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [hasNestedModal, setHasNestedModal] = useState(false);

  const modalContentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isMockExam = settings.examType === "MOCK";

  // Keep Settings subject order first, followed by any extra subjects across the roster.
  const availableSubjects = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const addSubject = (name: string) => {
      if (name && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    };

    (settings.defaultSubjects || []).forEach(addSubject);
    (allStudents ?? [student]).forEach((s) => s.subjects.forEach((sub) => addSubject(sub.name)));
    return ordered;
  }, [settings.defaultSubjects, allStudents, student]);

  const currentIndex = allStudents?.findIndex((s) => s.id === student.id) ?? -1;
  const totalStudents = allStudents?.length ?? 0;
  const hasNavigation = Boolean(allStudents && onNavigate && totalStudents > 1 && currentIndex >= 0);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < totalStudents - 1;

  // Lock background document scroll without shifting Dashboard's scroll offset.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Reset modal scroll position when switching students or tabs.
  useEffect(() => {
    if (!isOpen) return;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isOpen, student.id, activeTab]);

  // Keyboard shortcuts (Escape guarded when inner ConfirmModal is open; Cmd/Ctrl + Arrows navigate).
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (hasNestedModal) return;
        e.preventDefault();
        onClose();
        return;
      }

      if (hasNestedModal || !hasNavigation || !allStudents || !onNavigate) return;

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
  }, [
    isOpen,
    onClose,
    hasNestedModal,
    hasNavigation,
    hasPrevious,
    hasNext,
    currentIndex,
    allStudents,
    onNavigate,
  ]);

  // Swipe gestures scoped to the open modal sheet (disabled inside inputs and nested dialogs).
  useSwipe({
    enabled: isOpen && hasNavigation && !hasNestedModal,
    targetRef: modalContentRef,
    onSwipeLeft: () => {
      if (hasNavigation && hasNext && allStudents && onNavigate) {
        onNavigate(allStudents[currentIndex + 1].id);
      }
    },
    onSwipeRight: () => {
      if (hasNavigation && hasPrevious && allStudents && onNavigate) {
        onNavigate(allStudents[currentIndex - 1].id);
      }
    },
  });

  if (!isOpen) return null;

  const { scored, completed, total } = getScoredSubjectCounts(student, isMockExam);
  const hasAnyScores = scored > 0;
  const remainingSubjects = Math.max(total - completed, 0);
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const detailsMissingCount =
    (!student.attendancePresent ? 1 : 0) +
    (!student.teacherRemark?.trim() ? 1 : 0) +
    (!student.pictureUrl ? 1 : 0);

  const hasValidPosition = Boolean(
    hasAnyScores &&
      student.classPosition &&
      student.classPosition.toLowerCase() !== "pending...",
  );

  return (
    <div
      className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm sm:p-4 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-entry-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalContentRef}
        className="animate-sheet-up bg-surface sm:border-border flex h-dvh max-h-dvh w-full max-w-4xl flex-col overflow-hidden shadow-2xl sm:h-[min(86vh,780px)] sm:max-h-[90vh] sm:rounded-2xl sm:border dark:shadow-[0_24px_60px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.07)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="safe-top bg-surface shrink-0 sm:hidden" />

        {/* UNIFIED HEADER */}
        <div className="bg-surface border-border flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-3.5">
          {/* Student Avatar + Identity / Switcher */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="border-border bg-subtle h-9 w-9 shrink-0 overflow-hidden rounded-full border">
              {student.pictureUrl ? (
                <img src={student.pictureUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="bg-primary/10 text-primary-text flex h-full w-full items-center justify-center text-xs font-bold">
                  {getStudentInitials(student.name)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {hasNavigation && allStudents && onNavigate ? (
                <select
                  id="score-entry-modal-title"
                  aria-label="Switch student"
                  value={student.id}
                  onChange={(e) => onNavigate(e.target.value)}
                  className="border-border-strong bg-input text-main w-full max-w-xs truncate rounded-lg border px-2.5 py-1.5 text-sm font-bold transition-colors outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 sm:text-base"
                >
                  {allStudents.map((s, idx) => {
                    const counts = getScoredSubjectCounts(s, isMockExam);
                    const statusCue =
                      counts.total > 0 && counts.completed === counts.total
                        ? "✓"
                        : `(${counts.completed}/${counts.total})`;
                    return (
                      <option key={s.id} value={s.id}>
                        {idx + 1}. {s.name} {statusCue}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <h2
                  id="score-entry-modal-title"
                  className="text-main truncate text-base font-bold sm:text-lg"
                >
                  {student.name}
                </h2>
              )}

              <div className="text-muted mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span>{level}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{student.className}</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    isMockExam
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300"
                      : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/60 dark:text-blue-300"
                  }`}
                >
                  {isMockExam
                    ? "Mock /100"
                    : `Termly ${settings.classScoreMax}/${settings.examScoreMax}`}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {hasNavigation && allStudents && onNavigate && (
              <div className="border-border bg-subtle/60 hidden items-center rounded-lg border p-0.5 sm:inline-flex">
                <button
                  type="button"
                  onClick={() => hasPrevious && onNavigate(allStudents[currentIndex - 1].id)}
                  disabled={!hasPrevious}
                  aria-label="Previous student"
                  title="Previous student (Cmd/Ctrl + ←)"
                  className="text-secondary hover:bg-surface hover:text-main flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  data-record="true"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-secondary px-2 text-xs font-semibold tabular-nums">
                  {currentIndex + 1} / {totalStudents}
                </span>
                <button
                  type="button"
                  onClick={() => hasNext && onNavigate(allStudents[currentIndex + 1].id)}
                  disabled={!hasNext}
                  aria-label="Next student"
                  title="Next student (Cmd/Ctrl + →)"
                  className="text-secondary hover:bg-surface hover:text-main flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  data-record="true"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <ModalSaveStatus />

            {student.subjects.length > 0 && renderPrintAction?.(student.id)}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close (Esc)"
              className="text-muted hover:bg-subtle hover:text-main flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* LIVE STUDENT PULSE STRIP */}
        <div
          data-testid="student-pulse-strip"
          className="border-border-subtle bg-subtle/45 border-b px-4 py-2 sm:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-muted font-medium" data-record="true">
                  Average:
                </span>
                <span className="text-main font-bold tabular-nums">
                  {hasAnyScores ? `${student.averageScore}%` : "—"}
                </span>
              </div>

              {level !== "KG" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-medium" data-record="true">
                    Aggregate:
                  </span>
                  <span className="text-main font-bold tabular-nums">
                    {hasAnyScores && student.aggregate !== null && student.aggregate !== undefined
                      ? student.aggregate
                      : "—"}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-muted font-medium" data-record="true">
                  Rank:
                </span>
                <span className="text-main font-bold tabular-nums">
                  {hasValidPosition ? student.classPosition : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-secondary font-semibold tabular-nums">
                {completed}/{total}{" "}
                <span className="text-muted font-medium" data-record="true">
                  scored
                </span>
              </span>
              <div
                className="bg-border h-1.5 w-16 overflow-hidden rounded-full sm:w-24"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    total > 0 && completed === total
                      ? "bg-emerald-500"
                      : completed > 0
                        ? "bg-amber-500"
                        : "bg-muted/40"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* TABS WITH READINESS BADGES */}
        <div
          role="tablist"
          className="border-border bg-surface flex shrink-0 gap-1 border-b px-4 sm:px-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ACADEMIC"}
            onClick={() => setActiveTab("ACADEMIC")}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "ACADEMIC"
                ? "border-primary-text text-primary-text"
                : "text-muted hover:text-main border-transparent"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span data-record="true">Academic Scores</span>
            {total > 0 &&
              (remainingSubjects > 0 ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 tabular-nums dark:bg-amber-950/60 dark:text-amber-300">
                  {remainingSubjects} left
                </span>
              ) : (
                <Check
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                  aria-label="All subjects complete"
                />
              ))}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "DETAILS"}
            onClick={() => setActiveTab("DETAILS")}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "DETAILS"
                ? "border-primary-text text-primary-text"
                : "text-muted hover:text-main border-transparent"
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span data-record="true">Student Details</span>
            {detailsMissingCount > 0 ? (
              <span className="bg-subtle text-secondary rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {detailsMissingCount} missing
              </span>
            ) : (
              <Check
                className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                aria-label="Details complete"
              />
            )}
          </button>
        </div>

        {/* SCROLLABLE WORKSPACE */}
        <div
          ref={scrollContainerRef}
          className="bg-background/50 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5"
        >
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
                    examType: settings.examType,
                  });
                  onUpdateStudent(updated, true);
                }}
                filterSubject={selectedSubject}
                availableSubjects={availableSubjects}
                onFilterSubjectChange={setSelectedSubject}
                onNestedModalChange={setHasNestedModal}
                renderSbaSetupLink={renderSbaSetupLink}
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
          className="safe-bottom border-border bg-surface flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2.5 sm:hidden"
        >
          {hasNavigation && allStudents && onNavigate ? (
            <button
              type="button"
              onClick={() => hasPrevious && onNavigate(allStudents[currentIndex - 1].id)}
              disabled={!hasPrevious}
              aria-label="Previous student"
              className="border-border-strong bg-surface text-secondary flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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

          {hasNavigation && allStudents && onNavigate ? (
            <button
              type="button"
              onClick={() => hasNext && onNavigate(allStudents[currentIndex + 1].id)}
              disabled={!hasNext}
              aria-label="Next student"
              className="border-border-strong bg-surface text-secondary flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
