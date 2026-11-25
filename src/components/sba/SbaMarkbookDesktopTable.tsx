import { Settings2 } from "lucide-react";
import type { ClassScoreComponentConfig, ProcessedStudent } from "../../types";
import { DesktopSbaRow } from "./DesktopSbaRow";

interface SbaMarkbookDesktopTableProps {
  visibleStudents: ProcessedStudent[];
  totalStudentCount: number;
  activeSubject: string;
  tasks: ClassScoreComponentConfig[];
  taskStats: Map<string, { scored: number; avg: string }>;
  totalRawMax: number;
  maxClassScore: number;
  idPrefix: string;
  disabled: boolean;
  cellErrors: Record<string, string | null>;
  cellDrafts: Record<string, { baseScore: number; raw: string }>;
  onEditTask?: (taskName: string) => void;
  onOpenTaskManager: () => void;
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

export function SbaMarkbookDesktopTable({
  visibleStudents,
  totalStudentCount,
  activeSubject,
  tasks,
  taskStats,
  totalRawMax,
  maxClassScore,
  idPrefix,
  disabled,
  cellErrors,
  cellDrafts,
  onEditTask,
  onOpenTaskManager,
  onRegisterDesktopInput,
  onScoreEdit,
  onClearCellDraft,
  onGridPaste,
  onFocusDesktopCell,
  onAddSubjectToStudent,
}: SbaMarkbookDesktopTableProps) {
  return (
    <div data-testid="sba-desktop-view">
      <form onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-subtle sticky top-0 z-20">
              <tr className="border-border bg-subtle border-b text-xs">
                <th className="bg-subtle sticky left-0 z-30 w-10 min-w-10 max-w-10 px-2 py-3 text-center font-bold text-muted">
                  #
                </th>
                <th className="border-border-subtle bg-subtle sticky left-10 z-30 min-w-36 max-w-40 border-r px-3 py-3 font-bold text-main lg:min-w-44 lg:max-w-52">
                  Student
                </th>
                {tasks.map((task) => {
                  const stats = taskStats.get(task.name);
                  return (
                    <th key={task.name} className="min-w-32 px-2.5 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 uppercase dark:bg-purple-950/70 dark:text-purple-300">
                          {task.category ?? "CAT"}
                        </span>
                        <span className="text-main truncate font-bold">{task.name}</span>
                        <span className="text-muted font-semibold tabular-nums">
                          /{task.maxScore}
                        </span>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            onEditTask ? onEditTask(task.name) : onOpenTaskManager()
                          }
                          aria-label={`Configure ${task.name}`}
                          title={`Edit ${task.name}`}
                          className="text-muted hover:text-main rounded p-0.5 transition-colors disabled:opacity-40"
                        >
                          <Settings2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-muted mt-0.5 text-[10px] font-medium tabular-nums">
                        {stats?.scored ?? 0}/{totalStudentCount} · Avg {stats?.avg ?? "—"}
                      </div>
                    </th>
                  );
                })}
                <th className="min-w-24 px-3 py-2.5 text-center">
                  <span className="text-secondary block font-bold">Raw</span>
                  <span className="text-muted text-[10px] font-medium tabular-nums">
                    /{totalRawMax}
                  </span>
                </th>
                <th className="min-w-28 bg-purple-50 px-3 py-2.5 text-center dark:bg-purple-950/50">
                  <span className="block font-bold text-purple-900 dark:text-purple-200">
                    Class
                  </span>
                  <span className="text-[10px] font-semibold text-purple-700 tabular-nums dark:text-purple-300">
                    /{maxClassScore}
                  </span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-border-subtle divide-y">
              {visibleStudents.map((student, studentIdx) => (
                <DesktopSbaRow
                  key={student.id}
                  student={student}
                  studentIdx={studentIdx}
                  activeSubject={activeSubject}
                  tasks={tasks}
                  maxClassScore={maxClassScore}
                  idPrefix={idPrefix}
                  disabled={disabled}
                  cellErrors={cellErrors}
                  cellDrafts={cellDrafts}
                  onRegisterDesktopInput={onRegisterDesktopInput}
                  onScoreEdit={onScoreEdit}
                  onClearCellDraft={onClearCellDraft}
                  onGridPaste={onGridPaste}
                  onFocusDesktopCell={onFocusDesktopCell}
                  onAddSubjectToStudent={onAddSubjectToStudent}
                />
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
