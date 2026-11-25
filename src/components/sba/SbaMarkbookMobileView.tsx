import { Check } from "lucide-react";
import type { ClassScoreComponentConfig, ProcessedStudent } from "../../types";
import { normalizeTaskKey } from "../../utils/sbaReconciliation";
import { MobileSbaRow } from "./MobileSbaRow";

interface SbaMarkbookMobileViewProps {
  visibleStudents: ProcessedStudent[];
  totalStudentCount: number;
  activeSubject: string;
  tasks: ClassScoreComponentConfig[];
  taskStats: Map<string, { scored: number; avg: string }>;
  activeMobilePill: string;
  activeMobileTask: ClassScoreComponentConfig | undefined;
  isHeaderSticky: boolean;
  maxClassScore: number;
  idPrefix: string;
  disabled: boolean;
  cellErrors: Record<string, string | null>;
  cellDrafts: Record<string, { baseScore: number; raw: string }>;
  onSelectMobilePill: (pill: string) => void;
  onRegisterMobileInput: (studentId: string, el: HTMLInputElement | null) => void;
  onScoreEdit: (student: ProcessedStudent, task: ClassScoreComponentConfig, rawInput: string) => void;
  onClearCellDraft: (draftKey: string) => void;
  onFocusMobileRow: (studentIdx: number, direction: 1 | -1) => void;
  onAddSubjectToStudent: (student: ProcessedStudent) => void;
}

export function SbaMarkbookMobileView({
  visibleStudents,
  totalStudentCount,
  activeSubject,
  tasks,
  taskStats,
  activeMobilePill,
  activeMobileTask,
  isHeaderSticky,
  maxClassScore,
  idPrefix,
  disabled,
  cellErrors,
  cellDrafts,
  onSelectMobilePill,
  onRegisterMobileInput,
  onScoreEdit,
  onClearCellDraft,
  onFocusMobileRow,
  onAddSubjectToStudent,
}: SbaMarkbookMobileViewProps) {
  return (
    <div data-testid="sba-mobile-view">
      {/* Horizontal Task Pill Strip */}
      <div
        className={`border-border bg-subtle no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2.5 ${
          isHeaderSticky
            ? "sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-20"
            : "relative"
        }`}
      >
        {tasks.map((task) => {
          const isActive =
            activeMobilePill !== "__SUMMARY__" &&
            normalizeTaskKey(activeMobilePill) === normalizeTaskKey(task.name);
          const stats = taskStats.get(task.name);
          const scoredCount = stats?.scored ?? 0;
          const isComplete = totalStudentCount > 0 && scoredCount === totalStudentCount;
          return (
            <button
              key={task.name}
              type="button"
              onClick={() => onSelectMobilePill(task.name)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                isActive
                  ? "bg-purple-700 text-white shadow-xs"
                  : "border-border bg-surface text-secondary border hover:text-main"
              }`}
            >
              <span>{task.name}</span>
              {totalStudentCount > 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isComplete
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-subtle text-muted"
                  }`}
                >
                  {isComplete && <Check className="h-2.5 w-2.5" />}
                  {scoredCount}/{totalStudentCount}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onSelectMobilePill("__SUMMARY__")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            activeMobilePill === "__SUMMARY__"
              ? "bg-slate-900 text-white dark:bg-elevated dark:text-main"
              : "border-border bg-surface text-secondary border hover:text-main"
          }`}
        >
          Summary
        </button>
      </div>

      <form onSubmit={(e) => e.preventDefault()} noValidate className="divide-border-subtle divide-y">
        {visibleStudents.map((student, studentIdx) => (
          <MobileSbaRow
            key={student.id}
            student={student}
            studentIdx={studentIdx}
            activeSubject={activeSubject}
            tasks={tasks}
            maxClassScore={maxClassScore}
            idPrefix={idPrefix}
            disabled={disabled}
            activeMobileTask={activeMobileTask}
            isLastStudent={studentIdx === visibleStudents.length - 1}
            cellErrors={cellErrors}
            cellDrafts={cellDrafts}
            onRegisterMobileInput={onRegisterMobileInput}
            onScoreEdit={onScoreEdit}
            onClearCellDraft={onClearCellDraft}
            onFocusMobileRow={onFocusMobileRow}
            onAddSubjectToStudent={onAddSubjectToStudent}
          />
        ))}
      </form>
    </div>
  );
}
