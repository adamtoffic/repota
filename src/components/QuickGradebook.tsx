import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";
import { captureEvent, trackScoreEntrySessionOnce } from "../utils/analytics";
import {
  buildSingleComponentExportCsv,
  buildSubjectQuickExportCsv,
  downloadCsvFile,
  resolveSubjectSbaTasks,
} from "../utils/csvImport";
import { QuickGradebookHeader } from "./gradebook/QuickGradebookHeader";
import { QuickGradebookRow } from "./gradebook/QuickGradebookRow";
import {
  computeGradebookColumnStats,
  computeGradebookPastePatches,
  isStudentUnscoredInGradebook,
  resolveStudentsFromSnapshot,
  syncOrderSnapshot,
  type FocusColumn,
  type OrderSnapshot,
} from "./gradebook/gradebookHelpers";

interface QuickGradebookProps {
  students: ProcessedStudent[];
  /**
   * Full unfiltered class roster used to keep edited rows mounted with live updated scores
   * even when a parent Dashboard filter (e.g., Incomplete / No Scores) stops matching mid-edit.
   */
  allStudents?: ProcessedStudent[];
  /**
   * Opaque key capturing parent search/filter/sort settings (must not depend on student scores).
   * Changing this key refreshes the frozen row-order snapshot.
   */
  sessionKey?: string;
  settings: SchoolSettings;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
  onBatchUpdateStudents?: (
    updater: (prev: StudentRecord[]) => StudentRecord[],
    options?: { silent?: boolean },
  ) => void;
  onOpenStudent?: (student: ProcessedStudent, orderedStudents?: ProcessedStudent[]) => void;
  onOpenScoreImport?: (subject: string, taskName?: string) => void;
  onClearParentFilters?: () => void;
}

export function QuickGradebook({
  students,
  allStudents,
  sessionKey,
  settings,
  onUpdateStudent,
  onBatchUpdateStudents,
  onOpenStudent,
  onOpenScoreImport,
  onClearParentFilters,
}: QuickGradebookProps) {
  const isMockExam = settings.examType === "MOCK";
  const maxClassScore = settings.classScoreMax;
  const maxExamScore = settings.examScoreMax;

  const rosterStudents = allStudents ?? students;
  const rosterById = useMemo(
    () => new Map(rosterStudents.map((student) => [student.id, student])),
    [rosterStudents],
  );

  const availableSubjects = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const addSubjectName = (name: string) => {
      if (name && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    };

    (settings.defaultSubjects || []).forEach(addSubjectName);
    rosterStudents.forEach((student) =>
      student.subjects.forEach((sub) => addSubjectName(sub.name)),
    );
    return ordered;
  }, [settings.defaultSubjects, rosterStudents]);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const activeSubject = availableSubjects.includes(selectedSubject)
    ? selectedSubject
    : (availableSubjects[0] ?? "");

  const [focusColumn, setFocusColumn] = useState<FocusColumn>("CLASS_EXAM");
  const [unscoredOnly, setUnscoredOnly] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [examDrafts, setExamDrafts] = useState<Record<string, { baseScore: number; raw: string }>>(
    {},
  );
  const idPrefix = useId();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const blurCleanupTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const timers = blurCleanupTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const clearBlurCleanupTimer = useCallback((draftKey: string) => {
    const existingTimer = blurCleanupTimersRef.current[draftKey];
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      delete blurCleanupTimersRef.current[draftKey];
    }
  }, []);

  const scheduleBlurCleanup = useCallback(
    (draftKey: string) => {
      clearBlurCleanupTimer(draftKey);
      blurCleanupTimersRef.current[draftKey] = window.setTimeout(() => {
        delete blurCleanupTimersRef.current[draftKey];
        setExamDrafts((prev) => {
          if (!(draftKey in prev)) return prev;
          const next = { ...prev };
          delete next[draftKey];
          return next;
        });
      }, 180);
    },
    [clearBlurCleanupTimer],
  );

  const handleSetExamDraft = useCallback(
    (draftKey: string, value: { baseScore: number; raw: string } | null) => {
      setExamDrafts((prev) => {
        if (value === null) {
          if (!(draftKey in prev)) return prev;
          const next = { ...prev };
          delete next[draftKey];
          return next;
        }
        return { ...prev, [draftKey]: value };
      });
    },
    [],
  );

  const registerInput = useCallback((key: string, el: HTMLInputElement | null) => {
    inputRefs.current[key] = el;
  }, []);

  // Discover SBA tasks configured for this subject (falling back to student records)
  const sbaTaskOptions = useMemo(() => {
    if (!activeSubject) return [];
    return resolveSubjectSbaTasks(activeSubject, rosterStudents, settings);
  }, [activeSubject, rosterStudents, settings]);

  const hasDirectClassEntry = useMemo(
    () =>
      !isMockExam &&
      Boolean(activeSubject) &&
      rosterStudents.some((student) => {
        const sub = student.subjects.find((s) => s.name === activeSubject);
        return Boolean(sub && !sub.classScoreComponents?.length);
      }),
    [isMockExam, activeSubject, rosterStudents],
  );

  const activeFocusColumn: FocusColumn = isMockExam
    ? "EXAM_ONLY"
    : focusColumn === "CLASS_ONLY"
      ? hasDirectClassEntry
        ? "CLASS_ONLY"
        : "CLASS_EXAM"
      : focusColumn === "EXAM_ONLY"
        ? "EXAM_ONLY"
        : focusColumn.startsWith("COMP:") &&
            sbaTaskOptions.some((task) => `COMP:${task.name}` === focusColumn)
          ? focusColumn
          : "CLASS_EXAM";

  const activeComponentName = activeFocusColumn.startsWith("COMP:")
    ? activeFocusColumn.slice("COMP:".length)
    : null;

  const activeTaskConfig = activeComponentName
    ? sbaTaskOptions.find((t) => t.name === activeComponentName)
    : undefined;

  // Tier 1: Freeze parent-filtered/sorted student scope & order across score edits
  const scopeKey = `${sessionKey ?? ""}|${refreshNonce}`;
  const [scopeSnapshot, setScopeSnapshot] = useState<OrderSnapshot>(() => ({
    key: scopeKey,
    ids: students.map((student) => student.id),
    knownRosterIds: new Set(rosterStudents.map((student) => student.id)),
  }));

  const nextScopeSnapshot = syncOrderSnapshot(scopeSnapshot, scopeKey, students, rosterStudents);
  const activeScopeSnapshot = nextScopeSnapshot ?? scopeSnapshot;
  if (nextScopeSnapshot) {
    setScopeSnapshot(nextScopeSnapshot);
  }

  const sessionStudents = useMemo(
    () => resolveStudentsFromSnapshot(activeScopeSnapshot.ids, rosterById),
    [activeScopeSnapshot.ids, rosterById],
  );

  // Tier 2: Freeze gradebook row membership & order while entering scores under Unscored-only
  const sessionUnscoredFiltered = useMemo(() => {
    if (!unscoredOnly) return sessionStudents;
    return sessionStudents.filter((student) =>
      isStudentUnscoredInGradebook(student, activeSubject, activeFocusColumn, isMockExam),
    );
  }, [unscoredOnly, sessionStudents, activeSubject, activeFocusColumn, isMockExam]);

  const visibleKey = `${scopeKey}|${activeSubject}|${activeFocusColumn}|${unscoredOnly ? "unscored" : "all"}`;
  const [visibleSnapshot, setVisibleSnapshot] = useState<OrderSnapshot>(() => ({
    key: visibleKey,
    ids: sessionUnscoredFiltered.map((student) => student.id),
    knownRosterIds: new Set(rosterStudents.map((student) => student.id)),
  }));

  const nextVisibleSnapshot = syncOrderSnapshot(
    visibleSnapshot,
    visibleKey,
    sessionUnscoredFiltered,
    rosterStudents,
  );
  const activeVisibleSnapshot = nextVisibleSnapshot ?? visibleSnapshot;
  if (nextVisibleSnapshot) {
    setVisibleSnapshot(nextVisibleSnapshot);
  }

  const visibleStudents = useMemo(
    () => resolveStudentsFromSnapshot(activeVisibleSnapshot.ids, rosterById),
    [activeVisibleSnapshot.ids, rosterById],
  );

  const liveVisibleStudents = useMemo(() => {
    if (!unscoredOnly) return students;
    return students.filter((student) =>
      isStudentUnscoredInGradebook(student, activeSubject, activeFocusColumn, isMockExam),
    );
  }, [unscoredOnly, students, activeSubject, activeFocusColumn, isMockExam]);

  const hasPendingOrderOrFilterChanges = useMemo(() => {
    if (visibleStudents.length !== liveVisibleStudents.length) return true;
    for (let i = 0; i < visibleStudents.length; i++) {
      if (visibleStudents[i].id !== liveVisibleStudents[i].id) return true;
    }
    return false;
  }, [visibleStudents, liveVisibleStudents]);

  const columnStats = useMemo(
    () =>
      computeGradebookColumnStats({
        sessionStudents,
        activeSubject,
        activeTaskConfig,
        activeFocusColumn,
        isMockExam,
        maxClassScore,
        maxExamScore,
      }),
    [
      activeSubject,
      activeTaskConfig,
      activeFocusColumn,
      isMockExam,
      maxClassScore,
      maxExamScore,
      sessionStudents,
    ],
  );

  const unscoredCount = useMemo(() => {
    if (!activeSubject) return 0;
    return sessionStudents.filter((student) =>
      isStudentUnscoredInGradebook(student, activeSubject, activeFocusColumn, isMockExam),
    ).length;
  }, [sessionStudents, activeSubject, activeFocusColumn, isMockExam]);

  const handleExportCurrentView = () => {
    if (!activeSubject || sessionStudents.length === 0) return;
    const dateStamp = new Date().toISOString().split("T")[0];
    const safeSub = activeSubject.replace(/\s+/g, "_");
    if (activeTaskConfig) {
      const csv = buildSingleComponentExportCsv(
        activeSubject,
        activeTaskConfig,
        sessionStudents,
        settings,
      );
      downloadCsvFile(
        csv,
        `${safeSub}_${activeTaskConfig.name.replace(/\s+/g, "_")}_${dateStamp}.csv`,
      );
    } else {
      const csv = buildSubjectQuickExportCsv(activeSubject, sessionStudents, settings);
      downloadCsvFile(csv, `${safeSub}_Gradebook_${dateStamp}.csv`);
    }
    captureEvent("Class_Tool_Used", {
      tool: "gradebook_csv_export",
      students_count: sessionStudents.length,
      school_level: settings.level || "unknown",
    });
  };

  const focusAdjacentStudentInput = (
    field: "class" | "exam" | "comp",
    currentStudentId: string,
    direction: 1 | -1 = 1,
  ) => {
    const currentIndex = visibleStudents.findIndex((student) => student.id === currentStudentId);
    if (currentIndex === -1) return;
    for (
      let nextIndex = currentIndex + direction;
      nextIndex >= 0 && nextIndex < visibleStudents.length;
      nextIndex += direction
    ) {
      const nextInput = inputRefs.current[`${field}:${visibleStudents[nextIndex].id}`];
      if (nextInput && !nextInput.disabled) {
        nextInput.focus();
        nextInput.select();
        return;
      }
    }
  };

  const commitSubjectUpdate = (
    student: ProcessedStudent,
    updatedSubject: SavedSubject,
    fromPaste = false,
  ) => {
    const updatedSubjects = student.subjects.map((sub) =>
      sub.id === updatedSubject.id ? updatedSubject : sub,
    );
    onUpdateStudent({ ...student, subjects: updatedSubjects }, true);
    if (!fromPaste) {
      trackScoreEntrySessionOnce({
        entryMode: "quick_gradebook",
        usedColumnPaste: false,
        schoolLevel: settings.level,
        examType: settings.examType,
      });
    }
  };

  const handleColumnPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    field: "class" | "exam" | "comp",
    startStudentId: string,
  ) => {
    const patches = computeGradebookPastePatches({
      text: e.clipboardData.getData("text"),
      visibleStudents,
      startStudentId,
      activeSubject,
      field,
      activeComponentName,
      isMockExam,
      maxClassScore,
      maxExamScore,
    });
    if (!patches) return;

    e.preventDefault();
    if (patches.length === 0) return;

    if (onBatchUpdateStudents) {
      const subjectByStudentId = new Map(patches.map((p) => [p.student.id, p.updatedSubject]));
      onBatchUpdateStudents(
        (prev) =>
          prev.map((student) => {
            const updatedSub = subjectByStudentId.get(student.id);
            if (!updatedSub) return student;
            return {
              ...student,
              subjects: student.subjects.map((sub) =>
                sub.id === updatedSub.id ? updatedSub : sub,
              ),
            };
          }),
        { silent: true },
      );
    } else {
      for (const patch of patches) {
        commitSubjectUpdate(patch.student, patch.updatedSubject, true);
      }
    }

    trackScoreEntrySessionOnce({
      entryMode: "quick_gradebook",
      usedColumnPaste: true,
      schoolLevel: settings.level,
      examType: settings.examType,
    });
  };

  const handleAddSubjectToStudent = (student: ProcessedStudent) => {
    if (!activeSubject) return;
    const configuredTasks = settings.subjectComponentMap?.[activeSubject];
    const newSubject: SavedSubject = {
      id: crypto.randomUUID(),
      name: activeSubject,
      classScore: 0,
      examScore: 0,
      classScoreComponents: configuredTasks?.map((task) => ({
        id: crypto.randomUUID(),
        name: task.name,
        maxScore: task.maxScore,
        score: 0,
        category: task.category,
      })),
    };
    onUpdateStudent({ ...student, subjects: [...student.subjects, newSubject] }, true);
  };

  const handleSelectSbaTaskForStudent = (taskName: string, studentId: string) => {
    setFocusColumn(`COMP:${taskName}`);
    requestAnimationFrame(() => {
      inputRefs.current[`comp:${studentId}`]?.focus();
    });
  };

  if (availableSubjects.length === 0) {
    return (
      <div className="border-border bg-surface rounded-xl border p-8 text-center shadow-sm">
        <BookOpen className="text-muted mx-auto mb-3 h-8 w-8" />
        <h3 className="text-main text-base font-bold" data-record="true">
          No Subjects Configured
        </h3>
        <p className="text-muted mt-1 text-sm" data-record="true">
          Add default subjects in Settings to use Quick Gradebook entry.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface rounded-xl border shadow-sm">
      <QuickGradebookHeader
        isMockExam={isMockExam}
        maxClassScore={maxClassScore}
        maxExamScore={maxExamScore}
        scoredCount={columnStats.scored}
        totalSessionStudents={sessionStudents.length}
        avgLabel={columnStats.avgLabel}
        activeSubject={activeSubject}
        availableSubjects={availableSubjects}
        activeFocusColumn={activeFocusColumn}
        hasDirectClassEntry={hasDirectClassEntry}
        sbaTaskOptions={sbaTaskOptions}
        activeTaskConfig={activeTaskConfig}
        activeComponentName={activeComponentName}
        unscoredOnly={unscoredOnly}
        unscoredCount={unscoredCount}
        hasPendingOrderOrFilterChanges={hasPendingOrderOrFilterChanges}
        onSelectSubject={setSelectedSubject}
        onSelectFocusColumn={setFocusColumn}
        onToggleUnscoredOnly={() => setUnscoredOnly((prev) => !prev)}
        onReapplyOrder={() => setRefreshNonce((prev) => prev + 1)}
        onExportCurrentView={handleExportCurrentView}
        onOpenScoreImport={onOpenScoreImport}
      />

      {/* Gradebook Rows */}
      <form onSubmit={(e) => e.preventDefault()} noValidate className="divide-border-subtle divide-y">
        {visibleStudents.length === 0 ? (
          unscoredOnly && sessionStudents.length > 0 ? (
            <div className="px-4 py-10 text-center sm:px-6">
              <p className="text-main text-sm font-bold" data-record="true">
                All students have scores entered for this view
              </p>
              <p className="text-muted mt-1 text-xs" data-record="true">
                Switch subjects or turn off the filter to review existing marks.
              </p>
              <button
                type="button"
                onClick={() => setUnscoredOnly(false)}
                className="text-primary-text hover:text-primary-text/80 mt-3 text-xs font-bold hover:underline"
                data-record="true"
              >
                Show All Students
              </button>
            </div>
          ) : (
            <div className="px-4 py-10 text-center sm:px-6">
              <p className="text-main text-sm font-bold" data-record="true">
                No students match the current search or filter
              </p>
              <p className="text-muted mt-1 text-xs" data-record="true">
                Clear or adjust the dashboard search and filters to enter scores.
              </p>
              {onClearParentFilters && (
                <button
                  type="button"
                  onClick={onClearParentFilters}
                  className="text-primary-text hover:text-primary-text/80 mt-3 text-xs font-bold hover:underline"
                  data-record="true"
                >
                  Clear Search &amp; Filters
                </button>
              )}
            </div>
          )
        ) : (
          visibleStudents.map((student, index) => {
            const subject = student.subjects.find((sub) => sub.name === activeSubject);
            const draftKey = subject ? `${student.id}:${subject.id}` : "";
            return (
              <QuickGradebookRow
                key={student.id}
                student={student}
                index={index}
                visibleStudents={visibleStudents}
                activeSubject={activeSubject}
                schoolLevel={settings.level}
                isMockExam={isMockExam}
                maxClassScore={maxClassScore}
                maxExamScore={maxExamScore}
                activeFocusColumn={activeFocusColumn}
                activeComponentName={activeComponentName}
                sbaTaskOptions={sbaTaskOptions}
                idPrefix={idPrefix}
                examDraft={draftKey ? examDrafts[draftKey] : undefined}
                onSetExamDraft={handleSetExamDraft}
                onScheduleBlurCleanup={scheduleBlurCleanup}
                onClearBlurCleanup={clearBlurCleanupTimer}
                onRegisterInput={registerInput}
                onFocusAdjacent={focusAdjacentStudentInput}
                onColumnPaste={handleColumnPaste}
                onCommitSubjectUpdate={commitSubjectUpdate}
                onAddSubjectToStudent={handleAddSubjectToStudent}
                onSelectSbaTaskForStudent={handleSelectSbaTaskForStudent}
                onOpenStudent={onOpenStudent}
              />
            );
          })
        )}
      </form>
    </div>
  );
}
