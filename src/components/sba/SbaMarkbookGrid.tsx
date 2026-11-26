import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import type {
  ClassScoreComponentConfig,
  ProcessedStudent,
  SavedSubject,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import { trackScoreEntrySessionOnce } from "../../utils/analytics";
import { isStudentUnscoredForSba, normalizeTaskKey } from "../../utils/sbaReconciliation";
import { updateComponentAndRecalculateClassScore } from "../../utils/scoreConversion";
import { SbaMarkbookDesktopTable } from "./SbaMarkbookDesktopTable";
import { SbaMarkbookMobileView } from "./SbaMarkbookMobileView";
import {
  buildBaselineComponents,
  computeGridPastePatches,
  getMatchedComponent,
} from "./sbaGridHelpers";

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
  onBatchUpdateStudents?: (
    updater: (prev: StudentRecord[]) => StudentRecord[],
    options?: { silent?: boolean },
  ) => void;
  onOpenTaskManager: () => void;
  disabled?: boolean;
  isHeaderSticky?: boolean;
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
  onBatchUpdateStudents,
  onOpenTaskManager,
  disabled = false,
  isHeaderSticky = true,
}: SbaMarkbookGridProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
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

  const pinStudent = useCallback(
    (studentId: string) => {
      if (!unscoredOnly) return;
      setPinnedState((prev) => {
        const baseIds = prev.key === filterSessionKey ? prev.ids : new Set<string>();
        if (baseIds.has(studentId)) return prev;
        const next = new Set(baseIds);
        next.add(studentId);
        return { key: filterSessionKey, ids: next };
      });
    },
    [filterSessionKey, unscoredOnly],
  );

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

  const handleScoreEdit = useCallback(
    (student: ProcessedStudent, task: ClassScoreComponentConfig, rawInput: string) => {
      if (disabled) return;
      if (rawInput !== "" && !/^\d*\.?\d*$/.test(rawInput)) return;
      const sub = student.subjects.find((s) => s.name === activeSubject);
      if (!sub) return;

      pinStudent(student.id);

      const baseline = buildBaselineComponents(sub.classScoreComponents, tasks);
      const target = baseline.find((c) => normalizeTaskKey(c.name) === normalizeTaskKey(task.name));
      if (!target) return;

      const errorKey = `${student.id}:${task.name}`;
      const isIntermediateDecimal =
        rawInput === "." || rawInput.endsWith(".") || /\.\d*0$/.test(rawInput);
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
        setCellErrors((prev) => ({ ...prev, [errorKey]: `Max ${task.maxScore}` }));
        if (errorTimersRef.current[errorKey]) clearTimeout(errorTimersRef.current[errorKey]);
        errorTimersRef.current[errorKey] = window.setTimeout(() => {
          setCellErrors((prev) => ({ ...prev, [errorKey]: null }));
        }, 2000);
      } else {
        setCellErrors((prev) => (prev[errorKey] ? { ...prev, [errorKey]: null } : prev));
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
    },
    [
      activeSubject,
      disabled,
      maxClassScore,
      onTaskTouched,
      onUpdateStudent,
      pinStudent,
      settings.examType,
      settings.level,
      tasks,
    ],
  );

  const handleAddSubjectToStudent = useCallback(
    (student: ProcessedStudent) => {
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
    },
    [activeSubject, disabled, onUpdateStudent, pinStudent, tasks],
  );

  const handleGridPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>, startStudentIdx: number, startTaskIdx: number) => {
      if (disabled) return;
      const result = computeGridPastePatches({
        text: e.clipboardData.getData("text"),
        visibleStudents,
        startStudentIdx,
        startTaskIdx,
        activeSubject,
        tasks,
        maxClassScore,
      });
      if (!result) return;

      e.preventDefault();
      if (result.patches.length === 0) return;

      for (const patch of result.patches) {
        pinStudent(patch.student.id);
      }

      if (onBatchUpdateStudents) {
        const subjectsById = new Map(
          result.patches.map((p) => [p.student.id, p.updatedSubjects]),
        );
        onBatchUpdateStudents(
          (prev) =>
            prev.map((student) =>
              subjectsById.has(student.id)
                ? { ...student, subjects: subjectsById.get(student.id)! }
                : student,
            ),
          { silent: true },
        );
      } else {
        for (const patch of result.patches) {
          onUpdateStudent({ ...patch.student, subjects: patch.updatedSubjects }, true);
        }
      }

      if (tasks[startTaskIdx]) {
        onTaskTouched?.(tasks[startTaskIdx].name);
      }
      onPasteSummary?.({
        cells: result.cellsUpdated,
        students: result.studentsUpdated,
        clamped: result.clampedCount,
      });
      trackScoreEntrySessionOnce({
        entryMode: "sba_markbook",
        usedColumnPaste: true,
        schoolLevel: settings.level,
        examType: settings.examType,
      });
    },
    [
      activeSubject,
      disabled,
      maxClassScore,
      onBatchUpdateStudents,
      onPasteSummary,
      onTaskTouched,
      onUpdateStudent,
      pinStudent,
      settings.examType,
      settings.level,
      tasks,
      visibleStudents,
    ],
  );

  const registerDesktopInput = useCallback((key: string, el: HTMLInputElement | null) => {
    desktopInputRefs.current[key] = el;
  }, []);

  const registerMobileInput = useCallback((studentId: string, el: HTMLInputElement | null) => {
    mobileInputRefs.current[studentId] = el;
  }, []);

  const clearCellDraft = useCallback((draftKey: string) => {
    setCellDrafts((prev) => {
      if (!prev[draftKey]) return prev;
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  }, []);

  const focusDesktopCell = useCallback(
    (studentIdx: number, taskIdx: number, direction: 1 | -1) => {
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
    },
    [visibleStudents],
  );

  const focusMobileRow = useCallback(
    (studentIdx: number, direction: 1 | -1) => {
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
    },
    [visibleStudents],
  );

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
    <div className="border-border bg-surface overflow-x-clip rounded-xl border shadow-sm">
      {unscoredOnly && newlyScoredCount > 0 && onRefreshUnscoredFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50/80 px-4 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          <span>
            <strong>{newlyScoredCount}</strong>{" "}
            <span data-record="true">
              {newlyScoredCount === 1 ? "student" : "students"} newly scored — rows stay pinned while typing
            </span>
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

      {isDesktop ? (
        <SbaMarkbookDesktopTable
          visibleStudents={visibleStudents}
          totalStudentCount={students.length}
          activeSubject={activeSubject}
          tasks={tasks}
          taskStats={taskStats}
          totalRawMax={totalRawMax}
          maxClassScore={maxClassScore}
          idPrefix={idPrefix}
          disabled={disabled}
          cellErrors={cellErrors}
          cellDrafts={cellDrafts}
          onEditTask={onEditTask}
          onOpenTaskManager={onOpenTaskManager}
          onRegisterDesktopInput={registerDesktopInput}
          onScoreEdit={handleScoreEdit}
          onClearCellDraft={clearCellDraft}
          onGridPaste={handleGridPaste}
          onFocusDesktopCell={focusDesktopCell}
          onAddSubjectToStudent={handleAddSubjectToStudent}
        />
      ) : (
        <SbaMarkbookMobileView
          visibleStudents={visibleStudents}
          totalStudentCount={students.length}
          activeSubject={activeSubject}
          tasks={tasks}
          taskStats={taskStats}
          activeMobilePill={activeMobilePill}
          activeMobileTask={activeMobileTask}
          isHeaderSticky={isHeaderSticky}
          maxClassScore={maxClassScore}
          idPrefix={idPrefix}
          disabled={disabled}
          cellErrors={cellErrors}
          cellDrafts={cellDrafts}
          onSelectMobilePill={handleSelectMobilePill}
          onRegisterMobileInput={registerMobileInput}
          onScoreEdit={handleScoreEdit}
          onClearCellDraft={clearCellDraft}
          onFocusMobileRow={focusMobileRow}
          onAddSubjectToStudent={handleAddSubjectToStudent}
        />
      )}
    </div>
  );
}
