import { useRef, type KeyboardEvent } from "react";
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobileTabPanelId = `${idPrefix}-mobile-tabpanel`;
  const pillKeys = [...tasks.map((task) => task.name), "__SUMMARY__"];

  const activePillIndex = pillKeys.findIndex((pill) =>
    pill === "__SUMMARY__"
      ? activeMobilePill === "__SUMMARY__"
      : activeMobilePill !== "__SUMMARY__" &&
        normalizeTaskKey(activeMobilePill) === normalizeTaskKey(pill),
  );
  const resolvedActiveIdx = activePillIndex >= 0 ? activePillIndex : 0;
  const activeTabId = `${idPrefix}-mobile-tab-${resolvedActiveIdx}`;

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (pillKeys.length === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      let nextIdx: number;
      if (e.key === "ArrowRight") {
        nextIdx = (index + 1) % pillKeys.length;
      } else if (e.key === "ArrowLeft") {
        nextIdx = (index - 1 + pillKeys.length) % pillKeys.length;
      } else if (e.key === "Home") {
        nextIdx = 0;
      } else {
        nextIdx = pillKeys.length - 1;
      }
      onSelectMobilePill(pillKeys[nextIdx]);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div data-testid="sba-mobile-view">
      {/* Horizontal Task Pill Strip */}
      <div
        role="tablist"
        aria-label="SBA assessment tasks"
        className={`border-border bg-subtle no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2.5 ${
          isHeaderSticky
            ? "sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-20"
            : "relative"
        }`}
      >
        {tasks.map((task, idx) => {
          const isActive =
            activeMobilePill !== "__SUMMARY__" &&
            normalizeTaskKey(activeMobilePill) === normalizeTaskKey(task.name);
          const stats = taskStats.get(task.name);
          const scoredCount = stats?.scored ?? 0;
          const isComplete = totalStudentCount > 0 && scoredCount === totalStudentCount;
          return (
            <button
              key={task.name}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              id={`${idPrefix}-mobile-tab-${idx}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={mobileTabPanelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectMobilePill(task.name)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                isActive
                  ? "bg-purple-700 text-white shadow-xs"
                  : "border-border bg-surface text-secondary border hover:text-main"
              }`}
            >
              <span>{task.name}</span>
              {totalStudentCount > 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
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
          ref={(el) => {
            tabRefs.current[tasks.length] = el;
          }}
          id={`${idPrefix}-mobile-tab-${tasks.length}`}
          type="button"
          role="tab"
          aria-selected={activeMobilePill === "__SUMMARY__"}
          aria-controls={mobileTabPanelId}
          tabIndex={activeMobilePill === "__SUMMARY__" ? 0 : -1}
          onClick={() => onSelectMobilePill("__SUMMARY__")}
          onKeyDown={(e) => handleTabKeyDown(e, tasks.length)}
          className={`min-h-10 shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-colors ${
            activeMobilePill === "__SUMMARY__"
              ? "bg-slate-900 text-white dark:bg-elevated dark:text-main"
              : "border-border bg-surface text-secondary border hover:text-main"
          }`}
        >
          Summary
        </button>
      </div>

      <div id={mobileTabPanelId} role="tabpanel" aria-labelledby={activeTabId}>
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
    </div>
  );
}
