import { memo } from "react";
import { PlusCircle } from "lucide-react";
import type { ClassScoreComponentConfig, ProcessedStudent } from "../../types";
import { calculateSbaPaceStats, normalizeTaskKey } from "../../utils/sbaReconciliation";
import { buildBaselineComponents } from "./sbaGridHelpers";

export interface MobileSbaRowProps {
  student: ProcessedStudent;
  studentIdx: number;
  activeSubject: string;
  tasks: ClassScoreComponentConfig[];
  maxClassScore: number;
  idPrefix: string;
  disabled: boolean;
  activeMobileTask: ClassScoreComponentConfig | undefined;
  isLastStudent: boolean;
  cellErrors: Record<string, string | null>;
  cellDrafts: Record<string, { baseScore: number; raw: string }>;
  onRegisterMobileInput: (studentId: string, el: HTMLInputElement | null) => void;
  onScoreEdit: (student: ProcessedStudent, task: ClassScoreComponentConfig, rawInput: string) => void;
  onClearCellDraft: (draftKey: string) => void;
  onFocusMobileRow: (studentIdx: number, direction: 1 | -1) => void;
  onAddSubjectToStudent: (student: ProcessedStudent) => void;
}

export const MobileSbaRow = memo(function MobileSbaRow({
  student,
  studentIdx,
  activeSubject,
  tasks,
  maxClassScore,
  idPrefix,
  disabled,
  activeMobileTask,
  isLastStudent,
  cellErrors,
  cellDrafts,
  onRegisterMobileInput,
  onScoreEdit,
  onClearCellDraft,
  onFocusMobileRow,
  onAddSubjectToStudent,
}: MobileSbaRowProps) {
  const subject = student.subjects.find((s) => s.name === activeSubject);

  if (!subject) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-main truncate text-sm font-bold">
            {studentIdx + 1}. {student.name}
          </p>
          <p className="text-muted text-xs">Missing {activeSubject}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddSubjectToStudent(student)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 disabled:opacity-50 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>
      </div>
    );
  }

  const baseline = buildBaselineComponents(
    subject.classScoreComponents,
    tasks,
    `draft-${student.id}`,
  );
  const pace = calculateSbaPaceStats(baseline, maxClassScore);

  if (!activeMobileTask) {
    return (
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-main truncate text-sm font-bold">
            {studentIdx + 1}. {student.name}
          </p>
          <span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 tabular-nums dark:bg-purple-950/60 dark:text-purple-200">
            Class: {subject.classScore}/{maxClassScore}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tasks.map((task) => {
            const comp = baseline.find(
              (c) => normalizeTaskKey(c.name) === normalizeTaskKey(task.name),
            );
            const score = comp?.score ?? 0;
            return (
              <span
                key={task.name}
                className="border-border bg-subtle text-secondary rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              >
                {task.name}: {score > 0 ? score : "—"}/{task.maxScore}
              </span>
            );
          })}
        </div>
        <div className="text-muted flex items-center justify-between text-[11px] tabular-nums">
          <span>
            Raw: {pace.rawSum}/{pace.rawMax}
          </span>
          {pace.isPartialMidTerm && pace.pacePercent !== null && (
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              {pace.gradedTasks}/{pace.totalTasks} · {pace.pacePercent}% pace
            </span>
          )}
        </div>
      </div>
    );
  }

  const activeComp = baseline.find(
    (c) => normalizeTaskKey(c.name) === normalizeTaskKey(activeMobileTask.name),
  );
  const score = activeComp?.score ?? 0;
  const mobileInputId = `${idPrefix}-mob-${studentIdx}`;
  const errorKey = `${student.id}:${activeMobileTask.name}`;
  const cellError = cellErrors[errorKey];
  const draft = cellDrafts[errorKey];
  const mobileDisplayValue =
    draft && draft.baseScore === score ? draft.raw : score === 0 ? "" : String(score);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-main truncate text-sm font-bold">
          {studentIdx + 1}. {student.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
          <span className="rounded-full bg-purple-100 px-2 py-0.5 font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-200">
            Class: {subject.classScore}/{maxClassScore}
          </span>
          {pace.isPartialMidTerm && pace.pacePercent !== null && (
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              {pace.gradedTasks}/{pace.totalTasks} · {pace.pacePercent}% pace
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <input
          id={mobileInputId}
          name={mobileInputId}
          ref={(el) => onRegisterMobileInput(student.id, el)}
          type="text"
          inputMode="decimal"
          enterKeyHint={isLastStudent ? "done" : "next"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          aria-label={`${student.name} ${activeMobileTask.name} Score (Mobile)`}
          value={mobileDisplayValue}
          placeholder={`/${activeMobileTask.maxScore}`}
          onChange={(e) => onScoreEdit(student, activeMobileTask, e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => onClearCellDraft(errorKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "ArrowDown") {
              e.preventDefault();
              onFocusMobileRow(studentIdx, 1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              onFocusMobileRow(studentIdx, -1);
            }
          }}
          className={`bg-input text-main placeholder:text-muted h-11 w-22 scroll-mt-24 scroll-mb-40 rounded-lg border px-2 text-center text-base font-bold tabular-nums outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            cellError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
              : "border-purple-300 focus:border-purple-500 focus:ring-purple-500/25 dark:border-purple-700"
          }`}
        />
        {cellError && (
          <span className="mt-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
            {cellError}
          </span>
        )}
      </div>
    </div>
  );
});
