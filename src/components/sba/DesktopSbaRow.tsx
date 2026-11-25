import { memo } from "react";
import { PlusCircle } from "lucide-react";
import type { ClassScoreComponentConfig, ProcessedStudent } from "../../types";
import { calculateSbaPaceStats, normalizeTaskKey } from "../../utils/sbaReconciliation";
import { buildBaselineComponents } from "./sbaGridHelpers";

export interface DesktopSbaRowProps {
  student: ProcessedStudent;
  studentIdx: number;
  activeSubject: string;
  tasks: ClassScoreComponentConfig[];
  maxClassScore: number;
  idPrefix: string;
  disabled: boolean;
  cellErrors: Record<string, string | null>;
  cellDrafts: Record<string, { baseScore: number; raw: string }>;
  onRegisterDesktopInput: (key: string, el: HTMLInputElement | null) => void;
  onScoreEdit: (student: ProcessedStudent, task: ClassScoreComponentConfig, rawInput: string) => void;
  onClearCellDraft: (draftKey: string) => void;
  onGridPaste: (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIdx: number,
    startTaskIdx: number,
  ) => void;
  onFocusDesktopCell: (studentIdx: number, taskIdx: number, direction: 1 | -1) => void;
  onAddSubjectToStudent: (student: ProcessedStudent) => void;
}

export const DesktopSbaRow = memo(function DesktopSbaRow({
  student,
  studentIdx,
  activeSubject,
  tasks,
  maxClassScore,
  idPrefix,
  disabled,
  cellErrors,
  cellDrafts,
  onRegisterDesktopInput,
  onScoreEdit,
  onClearCellDraft,
  onGridPaste,
  onFocusDesktopCell,
  onAddSubjectToStudent,
}: DesktopSbaRowProps) {
  const subject = student.subjects.find((s) => s.name === activeSubject);

  if (!subject) {
    return (
      <tr className="group hover:bg-subtle/40 transition-colors">
        <td className="bg-surface group-hover:bg-subtle sticky left-0 z-10 w-10 min-w-10 max-w-10 px-2 py-3 text-center text-xs font-semibold text-muted tabular-nums transition-colors">
          {studentIdx + 1}
        </td>
        <td className="border-border-subtle bg-surface group-hover:bg-subtle sticky left-10 z-10 max-w-40 truncate border-r px-3 py-3 text-sm font-bold text-main transition-colors lg:max-w-52">
          {student.name}
        </td>
        <td colSpan={tasks.length + 2} className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-xs">Not enrolled in {activeSubject} yet</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAddSubjectToStudent(student)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add {activeSubject}</span>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const baseline = buildBaselineComponents(
    subject.classScoreComponents,
    tasks,
    `draft-${student.id}`,
  );
  const pace = calculateSbaPaceStats(baseline, maxClassScore);

  return (
    <tr className="group hover:bg-subtle/40 transition-colors">
      <td className="bg-surface group-hover:bg-subtle sticky left-0 z-10 w-10 min-w-10 max-w-10 px-2 py-2.5 text-center text-xs font-semibold text-muted tabular-nums transition-colors">
        {studentIdx + 1}
      </td>
      <td className="border-border-subtle bg-surface group-hover:bg-subtle sticky left-10 z-10 max-w-40 truncate border-r px-3 py-2.5 text-sm font-bold text-main transition-colors lg:max-w-52">
        {student.name}
      </td>

      {tasks.map((task, taskIdx) => {
        const comp = baseline.find((c) => normalizeTaskKey(c.name) === normalizeTaskKey(task.name));
        const score = comp?.score ?? 0;
        const inputId = `${idPrefix}-desk-${studentIdx}-${taskIdx}`;
        const errorKey = `${student.id}:${task.name}`;
        const cellError = cellErrors[errorKey];
        const draft = cellDrafts[errorKey];
        const displayValue =
          draft && draft.baseScore === score ? draft.raw : score === 0 ? "" : String(score);

        return (
          <td key={task.name} className="px-2 py-2 text-center align-top">
            <input
              id={inputId}
              name={inputId}
              ref={(el) => onRegisterDesktopInput(`${student.id}:${taskIdx}`, el)}
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={disabled}
              aria-label={`${student.name} ${task.name} Score`}
              value={displayValue}
              placeholder={`/${task.maxScore}`}
              onChange={(e) => onScoreEdit(student, task, e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => onClearCellDraft(errorKey)}
              onPaste={(e) => onGridPaste(e, studentIdx, taskIdx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "ArrowDown") {
                  e.preventDefault();
                  onFocusDesktopCell(studentIdx, taskIdx, 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  onFocusDesktopCell(studentIdx, taskIdx, -1);
                }
              }}
              className={`bg-input text-main placeholder:text-muted h-9 w-20 rounded-lg border px-2 text-center text-sm font-bold tabular-nums outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                cellError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                  : "border-border-strong focus:border-purple-500 focus:ring-purple-500/25"
              }`}
            />
            {cellError && (
              <p className="mt-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                {cellError}
              </p>
            )}
          </td>
        );
      })}

      <td className="px-3 py-2.5 text-center text-xs font-semibold text-secondary tabular-nums">
        {pace.rawSum}/{pace.rawMax}
      </td>

      <td className="bg-purple-50/40 px-3 py-2 text-center dark:bg-purple-950/20">
        <div className="text-sm font-black text-purple-800 tabular-nums dark:text-purple-200">
          {subject.classScore}/{maxClassScore}
        </div>
        {pace.isPartialMidTerm && pace.pacePercent !== null && (
          <div className="text-[10px] font-semibold text-amber-700 tabular-nums dark:text-amber-300">
            {pace.gradedTasks}/{pace.totalTasks} · {pace.pacePercent}% pace
          </div>
        )}
      </td>
    </tr>
  );
});
