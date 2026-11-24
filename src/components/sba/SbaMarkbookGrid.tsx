import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, PlusCircle, RefreshCw, Settings2 } from "lucide-react";
import type {
  ClassScoreComponent,
  ClassScoreComponentConfig,
  ProcessedStudent,
  SavedSubject,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import { trackScoreEntrySessionOnce } from "../../utils/analytics";
import {
  calculateSbaPaceStats,
  isStudentUnscoredForSba,
  normalizeTaskKey,
} from "../../utils/sbaReconciliation";
import { updateComponentAndRecalculateClassScore } from "../../utils/scoreConversion";

interface SbaMarkbookGridProps {
  students: ProcessedStudent[];
  activeSubject: string;
  tasks: ClassScoreComponentConfig[];
  settings: SchoolSettings;
  unscoredOnly: boolean;
  unscoredTaskTarget?: string | null;
  unscoredRefreshNonce?: number;
  onRefreshUnscoredFilter?: () => void;
  selectedMobilePill?: string;
  onSelectMobilePill?: (pill: string) => void;
  onTaskTouched?: (taskName: string) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  onEditTask?: (taskName: string) => void;
  onPasteSummary?: (summary: { cells: number; students: number; clamped: number }) => void;
  onClearUnscoredFilter: () => void;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
  onOpenTaskManager: () => void;
  disabled?: boolean;
}

function getMatchedComponent(
  subject: SavedSubject | undefined,
  taskName: string,
): ClassScoreComponent | undefined {
  if (!subject?.classScoreComponents) return undefined;
  const targetKey = normalizeTaskKey(taskName);
  return subject.classScoreComponents.find((c) => normalizeTaskKey(c.name) === targetKey);
}

function buildBaselineComponents(
  existing: ClassScoreComponent[] | undefined,
  tasks: ClassScoreComponentConfig[],
): ClassScoreComponent[] {
  return tasks.map((task) => {
    const found = existing?.find(
      (c) => normalizeTaskKey(c.name) === normalizeTaskKey(task.name),
    );
    if (found) {
      return {
        ...found,
        name: task.name,
        maxScore: task.maxScore,
        score: Math.min(Math.max(found.score, 0), task.maxScore),
        category: task.category ?? found.category,
      };
    }
    return {
      id: crypto.randomUUID(),
      name: task.name,
      score: 0,
      maxScore: task.maxScore,
      ...(task.category !== undefined ? { category: task.category } : {}),
    };
  });
}

export function SbaMarkbookGrid({
  students,
  activeSubject,
  tasks,
  settings,
  unscoredOnly,
  unscoredTaskTarget = null,
  unscoredRefreshNonce = 0,
  onRefreshUnscoredFilter,
  selectedMobilePill: controlledMobilePill,
  onSelectMobilePill,
  onTaskTouched,
  searchQuery = "",
  onClearSearch,
  onEditTask,
  onPasteSummary,
  onClearUnscoredFilter,
  onUpdateStudent,
  onOpenTaskManager,
  disabled = false,
}: SbaMarkbookGridProps) {
  const maxClassScore = settings.classScoreMax;
  const idPrefix = useId();
  const desktopInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const mobileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const errorTimersRef = useRef<Record<string, number>>({});

  const [cellErrors, setCellErrors] = useState<Record<string, string | null>>({});
  const [cellDrafts, setCellDrafts] = useState<Record<string, { baseScore: number; raw: string }>>(
    {},
  );

  // Keep edited rows mounted while `Unscored only` is active until task target, refresh, subject, or toggle changes.
  const filterSessionKey = `${activeSubject}:${unscoredOnly}:${unscoredTaskTarget ?? "__ANY__"}:${unscoredRefreshNonce}`;
  const [pinnedState, setPinnedState] = useState<{ key: string; ids: Set<string> }>(() => ({
    key: filterSessionKey,
    ids: new Set(),
  }));
  const pinnedStudentIds = useMemo(
    () => (pinnedState.key === filterSessionKey ? pinnedState.ids : new Set<string>()),
    [pinnedState, filterSessionKey],
  );

  // Mobile pill selection: task name or "__SUMMARY__"
  const [internalMobilePill, setInternalMobilePill] = useState<string>(tasks[0]?.name ?? "");
  const effectiveMobilePill =
    controlledMobilePill !== undefined && controlledMobilePill !== ""
      ? controlledMobilePill
      : internalMobilePill;
  const activeMobilePill =
    effectiveMobilePill === "__SUMMARY__" ||
    tasks.some((t) => normalizeTaskKey(t.name) === normalizeTaskKey(effectiveMobilePill))
      ? effectiveMobilePill
      : (tasks[0]?.name ?? "__SUMMARY__");

  const handleSelectMobilePill = (pill: string) => {
    if (onSelectMobilePill) {
      onSelectMobilePill(pill);
    } else {
      setInternalMobilePill(pill);
    }
  };

  useEffect(() => {
    const timers = errorTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const showCellClampError = (errorKey: string, maxScore: number) => {
    setCellErrors((prev) => ({ ...prev, [errorKey]: `Max ${maxScore}` }));
    if (errorTimersRef.current[errorKey]) clearTimeout(errorTimersRef.current[errorKey]);
    errorTimersRef.current[errorKey] = window.setTimeout(() => {
      setCellErrors((prev) => ({ ...prev, [errorKey]: null }));
    }, 2000);
  };

  const clearCellClampError = (errorKey: string) => {
    if (cellErrors[errorKey]) {
      setCellErrors((prev) => ({ ...prev, [errorKey]: null }));
    }
  };

  const clearCellDraft = (draftKey: string) => {
    setCellDrafts((prev) => {
      if (!prev[draftKey]) return prev;
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  const pinStudent = (studentId: string) => {
    if (!unscoredOnly) return;
    setPinnedState((prev) => {
      const baseIds = prev.key === filterSessionKey ? prev.ids : new Set<string>();
      if (baseIds.has(studentId)) return prev;
      const next = new Set(baseIds);
      next.add(studentId);
      return { key: filterSessionKey, ids: next };
    });
  };

  const unscoredFilteredStudents = useMemo(() => {
    if (!unscoredOnly) return students;
    return students.filter(
      (student) =>
        pinnedStudentIds.has(student.id) ||
        isStudentUnscoredForSba(student, activeSubject, tasks, unscoredTaskTarget),
    );
  }, [unscoredOnly, students, pinnedStudentIds, activeSubject, tasks, unscoredTaskTarget]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleStudents = useMemo(() => {
    if (!normalizedSearch) return unscoredFilteredStudents;
    return unscoredFilteredStudents.filter((student) =>
      student.name.toLowerCase().includes(normalizedSearch),
    );
  }, [unscoredFilteredStudents, normalizedSearch]);

  const newlyScoredCount = useMemo(() => {
    if (!unscoredOnly) return 0;
    let count = 0;
    for (const student of unscoredFilteredStudents) {
      if (!isStudentUnscoredForSba(student, activeSubject, tasks, unscoredTaskTarget)) {
        count++;
      }
    }
    return count;
  }, [unscoredOnly, unscoredFilteredStudents, activeSubject, tasks, unscoredTaskTarget]);

  const taskStats = useMemo(() => {
    const map = new Map<string, { scored: number; avg: string }>();
    for (const task of tasks) {
      let sum = 0;
      let count = 0;
      for (const student of students) {
        const sub = student.subjects.find((s) => s.name === activeSubject);
        const comp = getMatchedComponent(sub, task.name);
        if (comp && comp.score > 0) {
          sum += comp.score;
          count++;
        }
      }
      map.set(task.name, {
        scored: count,
        avg: count > 0 ? (sum / count).toFixed(1) : "—",
      });
    }
    return map;
  }, [students, activeSubject, tasks]);

  const handleScoreEdit = (
    student: ProcessedStudent,
    task: ClassScoreComponentConfig,
    rawInput: string,
  ) => {
    if (disabled) return;
    if (rawInput !== "" && !/^\d*\.?\d*$/.test(rawInput)) return;
    const sub = student.subjects.find((s) => s.name === activeSubject);
    if (!sub) return;

    pinStudent(student.id);

    const baseline = buildBaselineComponents(sub.classScoreComponents, tasks);
    const target = baseline.find((c) => normalizeTaskKey(c.name) === normalizeTaskKey(task.name));
    if (!target) return;

    const errorKey = `${student.id}:${task.name}`;
    const isIntermediateDecimal = rawInput.endsWith(".") || rawInput === "0.";
    const rawScore = rawInput === "" || rawInput === "." ? 0 : Number(rawInput);
    if (!Number.isFinite(rawScore)) return;

    const { updatedComponents, classScore, wasClamped } = updateComponentAndRecalculateClassScore(
      baseline,
      target.id,
      rawScore,
      maxClassScore,
    );
    const nextComp = updatedComponents.find((c) => c.id === target.id);
    const committedScore = nextComp?.score ?? 0;

    setCellDrafts((prev) => {
      if (isIntermediateDecimal && !wasClamped) {
        return { ...prev, [errorKey]: { baseScore: committedScore, raw: rawInput } };
      }
      if (prev[errorKey]) {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      }
      return prev;
    });

    if (wasClamped) {
      showCellClampError(errorKey, task.maxScore);
    } else {
      clearCellClampError(errorKey);
    }

    const updatedSubjects = student.subjects.map((item) =>
      item.id === sub.id
        ? { ...item, classScoreComponents: updatedComponents, classScore }
        : item,
    );

    onUpdateStudent({ ...student, subjects: updatedSubjects }, true);
    onTaskTouched?.(task.name);
    trackScoreEntrySessionOnce({
      entryMode: "sba_markbook",
      usedColumnPaste: false,
      schoolLevel: settings.level,
      examType: settings.examType,
    });
  };

  const handleAddSubjectToStudent = (student: ProcessedStudent) => {
    if (disabled || !activeSubject) return;
    pinStudent(student.id);
    const newSubject: SavedSubject = {
      id: crypto.randomUUID(),
      name: activeSubject,
      classScore: 0,
      examScore: 0,
      classScoreComponents: tasks.map((task) => ({
        id: crypto.randomUUID(),
        name: task.name,
        score: 0,
        maxScore: task.maxScore,
        ...(task.category !== undefined ? { category: task.category } : {}),
      })),
    };
    onUpdateStudent({ ...student, subjects: [...student.subjects, newSubject] }, true);
  };

  const focusDesktopCell = (studentIdx: number, taskIdx: number, direction: 1 | -1) => {
    for (
      let nextIdx = studentIdx + direction;
      nextIdx >= 0 && nextIdx < visibleStudents.length;
      nextIdx += direction
    ) {
      const nextInput = desktopInputRefs.current[`${visibleStudents[nextIdx].id}:${taskIdx}`];
      if (nextInput && !nextInput.disabled) {
        nextInput.focus();
        nextInput.select();
        return;
      }
    }
  };

  const focusMobileRow = (studentIdx: number, direction: 1 | -1) => {
    for (
      let nextIdx = studentIdx + direction;
      nextIdx >= 0 && nextIdx < visibleStudents.length;
      nextIdx += direction
    ) {
      const nextInput = mobileInputRefs.current[visibleStudents[nextIdx].id];
      if (nextInput && !nextInput.disabled) {
        nextInput.focus();
        nextInput.select();
        return;
      }
    }
  };

  const handleGridPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIdx: number,
    startTaskIdx: number,
  ) => {
    if (disabled) return;
    const text = e.clipboardData.getData("text");
    if (!text || !/[\r\n\t]/.test(text)) return;

    const pastedRows = text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(/\t|,/));

    if (pastedRows.length === 0) return;
    if (pastedRows.length === 1 && pastedRows[0].length <= 1) return;

    e.preventDefault();
    let updatedAny = false;
    let cellsUpdated = 0;
    let studentsUpdated = 0;
    let clampedCount = 0;

    for (
      let rowOffset = 0;
      rowOffset < pastedRows.length && startStudentIdx + rowOffset < visibleStudents.length;
      rowOffset++
    ) {
      const student = visibleStudents[startStudentIdx + rowOffset];
      const sub = student.subjects.find((s) => s.name === activeSubject);
      if (!sub) continue;

      let workingComponents = buildBaselineComponents(sub.classScoreComponents, tasks);
      let nextClassScore = sub.classScore;
      let rowChanged = false;

      const rowCells = pastedRows[rowOffset];
      for (
        let colOffset = 0;
        colOffset < rowCells.length && startTaskIdx + colOffset < tasks.length;
        colOffset++
      ) {
        const rawCell = rowCells[colOffset].trim();
        if (!rawCell) continue;
        const numeric = Number(rawCell);
        if (!Number.isFinite(numeric)) continue;

        const targetTask = tasks[startTaskIdx + colOffset];
        const targetComp = workingComponents.find(
          (c) => normalizeTaskKey(c.name) === normalizeTaskKey(targetTask.name),
        );
        if (!targetComp) continue;

        const result = updateComponentAndRecalculateClassScore(
          workingComponents,
          targetComp.id,
          numeric,
          maxClassScore,
        );
        workingComponents = result.updatedComponents;
        nextClassScore = result.classScore;
        rowChanged = true;
        cellsUpdated++;
        if (result.wasClamped) {
          clampedCount++;
        }
      }

      if (rowChanged) {
        pinStudent(student.id);
        const updatedSubjects = student.subjects.map((item) =>
          item.id === sub.id
            ? { ...item, classScoreComponents: workingComponents, classScore: nextClassScore }
            : item,
        );
        onUpdateStudent({ ...student, subjects: updatedSubjects }, true);
        updatedAny = true;
        studentsUpdated++;
      }
    }

    if (updatedAny) {
      if (tasks[startTaskIdx]) {
        onTaskTouched?.(tasks[startTaskIdx].name);
      }
      onPasteSummary?.({
        cells: cellsUpdated,
        students: studentsUpdated,
        clamped: clampedCount,
      });
      trackScoreEntrySessionOnce({
        entryMode: "sba_markbook",
        usedColumnPaste: true,
        schoolLevel: settings.level,
        examType: settings.examType,
      });
    }
  };

  if (normalizedSearch && visibleStudents.length === 0) {
    return (
      <div className="border-border bg-surface rounded-xl border px-4 py-10 text-center shadow-sm">
        <p className="text-main text-sm font-bold" data-record="true">
          No students match your search
        </p>
        <p className="text-muted mt-1 text-xs" data-record="true">
          Try a different name or clear the search filter.
        </p>
        {onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="text-primary-text mt-3 text-xs font-bold hover:underline"
            data-record="true"
          >
            Clear search
          </button>
        )}
      </div>
    );
  }

  if (unscoredOnly && visibleStudents.length === 0) {
    return (
      <div className="border-border bg-surface rounded-xl border px-4 py-10 text-center shadow-sm">
        <p className="text-main text-sm font-bold">
          {unscoredTaskTarget ? (
            <>
              <span data-record="true">All students have marks entered for</span>{" "}
              <span>{unscoredTaskTarget}</span>
            </>
          ) : (
            <span data-record="true">All students have SBA marks entered for this subject</span>
          )}
        </p>
        <p className="text-muted mt-1 text-xs" data-record="true">
          Switch subjects or show all students to review or adjust scores.
        </p>
        <button
          type="button"
          onClick={onClearUnscoredFilter}
          className="text-primary-text mt-3 text-xs font-bold hover:underline"
          data-record="true"
        >
          Show All Students
        </button>
      </div>
    );
  }

  const totalRawMax = tasks.reduce((sum, task) => sum + task.maxScore, 0);
  const activeMobileTask =
    activeMobilePill !== "__SUMMARY__"
      ? tasks.find((t) => normalizeTaskKey(t.name) === normalizeTaskKey(activeMobilePill))
      : undefined;

  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border shadow-sm">
      {unscoredOnly && newlyScoredCount > 0 && onRefreshUnscoredFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50/80 px-4 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          <span data-record="true">
            <strong>{newlyScoredCount}</strong>{" "}
            {newlyScoredCount === 1 ? "student" : "students"} newly scored — rows stay pinned while typing
          </span>
          <button
            type="button"
            onClick={onRefreshUnscoredFilter}
            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-surface px-2.5 py-1 text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/60"
            data-record="true"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh list</span>
          </button>
        </div>
      )}

      {/* Desktop Multi-Column SBA Spreadsheet */}
      <div className="hidden md:block">
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-subtle sticky top-0 z-20">
                <tr className="border-border bg-subtle border-b text-xs">
                  <th className="bg-subtle sticky left-0 z-30 w-10 px-3 py-3 font-bold text-muted">
                    #
                  </th>
                  <th className="border-border-subtle bg-subtle sticky left-10 z-30 min-w-44 border-r px-3 py-3 font-bold text-main">
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
                          {stats?.scored ?? 0}/{students.length} · Avg {stats?.avg ?? "—"}
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
                {visibleStudents.map((student, studentIdx) => {
                  const subject = student.subjects.find((s) => s.name === activeSubject);

                  if (!subject) {
                    return (
                      <tr key={student.id} className="group hover:bg-subtle/40 transition-colors">
                        <td className="bg-surface group-hover:bg-subtle sticky left-0 z-10 px-3 py-3 text-xs font-semibold text-muted tabular-nums transition-colors">
                          {studentIdx + 1}
                        </td>
                        <td className="border-border-subtle bg-surface group-hover:bg-subtle sticky left-10 z-10 border-r px-3 py-3 text-sm font-bold text-main transition-colors">
                          {student.name}
                        </td>
                        <td colSpan={tasks.length + 2} className="px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted text-xs">
                              Not enrolled in {activeSubject} yet
                            </span>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => handleAddSubjectToStudent(student)}
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

                  const baseline = buildBaselineComponents(subject.classScoreComponents, tasks);
                  const pace = calculateSbaPaceStats(baseline, maxClassScore);

                  return (
                    <tr key={student.id} className="group hover:bg-subtle/40 transition-colors">
                      <td className="bg-surface group-hover:bg-subtle sticky left-0 z-10 px-3 py-2.5 text-xs font-semibold text-muted tabular-nums transition-colors">
                        {studentIdx + 1}
                      </td>
                      <td className="border-border-subtle bg-surface group-hover:bg-subtle sticky left-10 z-10 max-w-52 truncate border-r px-3 py-2.5 text-sm font-bold text-main transition-colors">
                        {student.name}
                      </td>

                      {tasks.map((task, taskIdx) => {
                        const comp = baseline.find(
                          (c) => normalizeTaskKey(c.name) === normalizeTaskKey(task.name),
                        );
                        const score = comp?.score ?? 0;
                        const inputId = `${idPrefix}-desk-${studentIdx}-${taskIdx}`;
                        const errorKey = `${student.id}:${task.name}`;
                        const cellError = cellErrors[errorKey];
                        const draft = cellDrafts[errorKey];
                        const displayValue =
                          draft && draft.baseScore === score
                            ? draft.raw
                            : score === 0
                              ? ""
                              : String(score);

                        return (
                          <td key={task.name} className="px-2 py-2 text-center align-top">
                            <input
                              id={inputId}
                              name={inputId}
                              ref={(el) => {
                                desktopInputRefs.current[`${student.id}:${taskIdx}`] = el;
                              }}
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
                              onChange={(e) => handleScoreEdit(student, task, e.target.value)}
                              onFocus={(e) => e.currentTarget.select()}
                              onBlur={() => clearCellDraft(errorKey)}
                              onPaste={(e) => handleGridPaste(e, studentIdx, taskIdx)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "ArrowDown") {
                                  e.preventDefault();
                                  focusDesktopCell(studentIdx, taskIdx, 1);
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  focusDesktopCell(studentIdx, taskIdx, -1);
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
                })}
              </tbody>
            </table>
          </div>
        </form>
      </div>

      {/* Mobile Focused 1-Thumb Task Pill Entry */}
      <div className="md:hidden">
        {/* Horizontal Task Pill Strip */}
        <div className="border-border bg-subtle/60 no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2.5">
          {tasks.map((task) => {
            const isActive =
              activeMobilePill !== "__SUMMARY__" &&
              normalizeTaskKey(activeMobilePill) === normalizeTaskKey(task.name);
            const stats = taskStats.get(task.name);
            const scoredCount = stats?.scored ?? 0;
            const isComplete = students.length > 0 && scoredCount === students.length;
            return (
              <button
                key={task.name}
                type="button"
                onClick={() => handleSelectMobilePill(task.name)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-purple-700 text-white shadow-xs"
                    : "border-border bg-surface text-secondary border hover:text-main"
                }`}
              >
                <span>{task.name}</span>
                {students.length > 0 && (
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
                    {scoredCount}/{students.length}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => handleSelectMobilePill("__SUMMARY__")}
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
          {visibleStudents.map((student, studentIdx) => {
            const subject = student.subjects.find((s) => s.name === activeSubject);

            if (!subject) {
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-main truncate text-sm font-bold">
                      {studentIdx + 1}. {student.name}
                    </p>
                    <p className="text-muted text-xs">Missing {activeSubject}</p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleAddSubjectToStudent(student)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 disabled:opacity-50 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              );
            }

            const baseline = buildBaselineComponents(subject.classScoreComponents, tasks);
            const pace = calculateSbaPaceStats(baseline, maxClassScore);

            if (!activeMobileTask) {
              return (
                <div key={student.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-main truncate text-sm font-bold">
                      {studentIdx + 1}. {student.name}
                    </p>
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 tabular-nums dark:bg-purple-950/60 dark:text-purple-200">
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
              draft && draft.baseScore === score
                ? draft.raw
                : score === 0
                  ? ""
                  : String(score);

            return (
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
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
                    ref={(el) => {
                      mobileInputRefs.current[student.id] = el;
                    }}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint={studentIdx === visibleStudents.length - 1 ? "done" : "next"}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={disabled}
                    aria-label={`${student.name} ${activeMobileTask.name} Score (Mobile)`}
                    value={mobileDisplayValue}
                    placeholder={`/${activeMobileTask.maxScore}`}
                    onChange={(e) => handleScoreEdit(student, activeMobileTask, e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={() => clearCellDraft(errorKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "ArrowDown") {
                        e.preventDefault();
                        focusMobileRow(studentIdx, 1);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        focusMobileRow(studentIdx, -1);
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
          })}
        </form>
      </div>
    </div>
  );
}
