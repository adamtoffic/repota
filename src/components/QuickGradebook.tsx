import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Download,
  ExternalLink,
  Filter,
  PlusCircle,
  RefreshCw,
  TableProperties,
  Upload,
} from "lucide-react";
import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";
import {
  buildSingleComponentExportCsv,
  buildSubjectQuickExportCsv,
  downloadCsvFile,
} from "../utils/csvImport";
import { calculateGrade } from "../utils/gradeCalculator";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  formatExamWeightedAsRaw,
  updateComponentAndRecalculateClassScore,
} from "../utils/scoreConversion";
import { captureEvent, trackScoreEntrySessionOnce } from "../utils/analytics";

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
  onOpenStudent?: (student: ProcessedStudent, orderedStudents?: ProcessedStudent[]) => void;
  onOpenScoreImport?: (subject: string, taskName?: string) => void;
  onClearParentFilters?: () => void;
}

type FocusColumn = "CLASS_EXAM" | "CLASS_ONLY" | "EXAM_ONLY" | `COMP:${string}`;

interface OrderSnapshot {
  key: string;
  ids: string[];
  knownRosterIds: Set<string>;
}

function syncOrderSnapshot(
  current: OrderSnapshot,
  nextKey: string,
  nextStudents: ProcessedStudent[],
  rosterStudents: ProcessedStudent[],
): OrderSnapshot | null {
  if (current.key !== nextKey) {
    return {
      key: nextKey,
      ids: nextStudents.map((student) => student.id),
      knownRosterIds: new Set(rosterStudents.map((student) => student.id)),
    };
  }

  const unseenIds = new Set<string>();
  for (const student of rosterStudents) {
    if (!current.knownRosterIds.has(student.id)) {
      unseenIds.add(student.id);
    }
  }
  if (unseenIds.size === 0) return null;

  const newlyMatchingIds = nextStudents
    .filter((student) => unseenIds.has(student.id))
    .map((student) => student.id);
  const nextKnown = new Set(current.knownRosterIds);
  unseenIds.forEach((id) => nextKnown.add(id));

  return {
    key: nextKey,
    ids: [...current.ids, ...newlyMatchingIds],
    knownRosterIds: nextKnown,
  };
}

function resolveStudentsFromSnapshot(
  ids: string[],
  rosterById: Map<string, ProcessedStudent>,
): ProcessedStudent[] {
  const resolved: ProcessedStudent[] = [];
  for (const id of ids) {
    const latest = rosterById.get(id);
    if (latest) resolved.push(latest);
  }
  return resolved;
}

function isStudentUnscoredInGradebook(
  student: ProcessedStudent,
  activeSubject: string,
  activeFocusColumn: FocusColumn,
  isMockExam: boolean,
): boolean {
  const sub = student.subjects.find((s) => s.name === activeSubject);
  if (!sub) return true;
  if (activeFocusColumn.startsWith("COMP:")) {
    const compName = activeFocusColumn.slice("COMP:".length);
    const comp = sub.classScoreComponents?.find((c) => c.name === compName);
    return !comp || comp.score === 0;
  }
  if (isMockExam || activeFocusColumn === "EXAM_ONLY") {
    return sub.examScore === 0;
  }
  if (activeFocusColumn === "CLASS_ONLY") {
    return sub.classScore === 0;
  }
  return sub.classScore === 0 || sub.examScore === 0;
}

export function QuickGradebook({
  students,
  allStudents,
  sessionKey,
  settings,
  onUpdateStudent,
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
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const blurCleanupTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const timers = blurCleanupTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const clearBlurCleanupTimer = (draftKey: string) => {
    const existingTimer = blurCleanupTimersRef.current[draftKey];
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      delete blurCleanupTimersRef.current[draftKey];
    }
  };

  // Discover SBA tasks attached to this subject across the class
  const sbaTaskOptions = useMemo(() => {
    if (isMockExam || !activeSubject) return [] as Array<{ name: string; maxScore: number }>;
    const byName = new Map<string, number>();
    rosterStudents.forEach((student) => {
      const subject = student.subjects.find((sub) => sub.name === activeSubject);
      subject?.classScoreComponents?.forEach((comp) => {
        if (!byName.has(comp.name)) {
          byName.set(comp.name, comp.maxScore);
        }
      });
    });
    return Array.from(byName.entries()).map(([name, maxScore]) => ({ name, maxScore }));
  }, [isMockExam, activeSubject, rosterStudents]);

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

  const columnStats = useMemo(() => {
    if (!activeSubject || sessionStudents.length === 0) return { scored: 0, avgLabel: "" };
    if (activeTaskConfig) {
      const scores: number[] = [];
      sessionStudents.forEach((student) => {
        const sub = student.subjects.find((s) => s.name === activeSubject);
        const comp = sub?.classScoreComponents?.find((c) => c.name === activeTaskConfig.name);
        if (comp && comp.score > 0) scores.push(comp.score);
      });
      const avg =
        scores.length > 0
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          : "0";
      return {
        scored: scores.length,
        avgLabel: `Avg: ${avg}/${activeTaskConfig.maxScore}`,
      };
    }

    if (activeFocusColumn === "CLASS_ONLY") {
      const scores: number[] = [];
      sessionStudents.forEach((student) => {
        const sub = student.subjects.find((s) => s.name === activeSubject);
        if (sub && sub.classScore > 0) scores.push(sub.classScore);
      });
      const avg =
        scores.length > 0
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          : "0";
      return {
        scored: scores.length,
        avgLabel: `Avg: ${avg}/${maxClassScore}`,
      };
    }

    if (!isMockExam && activeFocusColumn === "EXAM_ONLY") {
      const rawScores: number[] = [];
      sessionStudents.forEach((student) => {
        const sub = student.subjects.find((s) => s.name === activeSubject);
        if (sub && sub.examScore > 0) {
          rawScores.push(maxExamScore > 0 ? (sub.examScore / maxExamScore) * 100 : 0);
        }
      });
      const avg =
        rawScores.length > 0
          ? (rawScores.reduce((a, b) => a + b, 0) / rawScores.length).toFixed(1)
          : "0";
      return {
        scored: rawScores.length,
        avgLabel: `Avg: ${avg}/100`,
      };
    }

    const totals: number[] = [];
    sessionStudents.forEach((student) => {
      const sub = student.subjects.find((s) => s.name === activeSubject);
      if (!sub) return;
      const hasAny = isMockExam ? sub.examScore > 0 : sub.classScore > 0 || sub.examScore > 0;
      if (hasAny) totals.push((sub.classScore || 0) + (sub.examScore || 0));
    });
    const avg =
      totals.length > 0
        ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)
        : "0";
    return { scored: totals.length, avgLabel: `Avg: ${avg}%` };
  }, [
    activeSubject,
    activeTaskConfig,
    activeFocusColumn,
    isMockExam,
    maxClassScore,
    maxExamScore,
    sessionStudents,
  ]);

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

  const scoredCount = columnStats.scored;

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

  /**
   * Power-user clipboard paste: pasting a multi-line column of numbers copied from
   * Excel or Google Sheets fills consecutive students downward from `startStudentId`.
   */
  const handleColumnPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    field: "class" | "exam" | "comp",
    startStudentId: string,
  ) => {
    const text = e.clipboardData.getData("text");
    if (!text || !/[\r\n]/.test(text)) return;

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length <= 1) return;

    const startIndex = visibleStudents.findIndex((student) => student.id === startStudentId);
    if (startIndex === -1) return;

    e.preventDefault();
    let lineOffset = 0;
    let updatedAny = false;

    for (let idx = startIndex; idx < visibleStudents.length && lineOffset < lines.length; idx++) {
      const targetStudent = visibleStudents[idx];
      const sub = targetStudent.subjects.find((s) => s.name === activeSubject);
      if (!sub) continue;

      const rawCell = lines[lineOffset].split(/\t|,/)[0].trim();
      lineOffset++;
      const numeric = Number(rawCell);
      if (!Number.isFinite(numeric)) continue;

      if (field === "comp" && activeComponentName) {
        const comp = sub.classScoreComponents?.find((c) => c.name === activeComponentName);
        if (!comp || !sub.classScoreComponents) continue;
        const { updatedComponents, classScore } = updateComponentAndRecalculateClassScore(
          sub.classScoreComponents,
          comp.id,
          numeric,
          maxClassScore,
        );
        commitSubjectUpdate(
          targetStudent,
          {
            ...sub,
            classScoreComponents: updatedComponents,
            classScore,
          },
          true,
        );
        updatedAny = true;
      } else if (field === "class") {
        if (!isMockExam && sub.classScoreComponents?.length) continue;
        const { score } = clampDirectClassScore(numeric, maxClassScore);
        commitSubjectUpdate(targetStudent, { ...sub, classScore: score }, true);
        updatedAny = true;
      } else if (field === "exam") {
        const { weightedScore } = convertExamRawToWeighted(numeric, maxExamScore);
        commitSubjectUpdate(targetStudent, { ...sub, examScore: weightedScore }, true);
        updatedAny = true;
      }
    }

    if (updatedAny) {
      trackScoreEntrySessionOnce({
        entryMode: "quick_gradebook",
        usedColumnPaste: true,
        schoolLevel: settings.level,
        examType: settings.examType,
      });
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

  const handleAddSubjectToStudent = (student: ProcessedStudent) => {
    if (!activeSubject) return;
    const configuredTasks = settings.subjectComponentMap?.[activeSubject];
    const newSubject: SavedSubject = {
      id: crypto.randomUUID(),
      name: activeSubject,
      classScore: 0,
      examScore: 0,
      classScoreComponents: configuredTasks?.map((task, idx) => ({
        id: `${Date.now()}-${idx}-${task.name}`,
        name: task.name,
        maxScore: task.maxScore,
        score: 0,
      })),
    };
    onUpdateStudent({ ...student, subjects: [...student.subjects, newSubject] }, true);
  };

  if (availableSubjects.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-gray-400" />
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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header Controls */}
      <div className="border-b border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TableProperties className="text-primary h-5 w-5" />
              <h2 className="text-main text-lg font-bold" data-record="true">
                Quick Gradebook
              </h2>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                  isMockExam
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700"
                }`}
              >
                {isMockExam ? "Mock (0/100)" : `Termly (${maxClassScore}/${maxExamScore})`}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {scoredCount}/{sessionStudents.length} scored
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {scoredCount > 0 && columnStats.avgLabel ? columnStats.avgLabel : "Avg: —"}
              </span>
            </div>
            <p className="text-muted mt-0.5 text-xs" data-record="true">
              Enter scores subject-by-subject. Use Enter/Arrows to move or paste a column from Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Gradebook subject"
              value={activeSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {availableSubjects.map((subjectName) => (
                <option key={subjectName} value={subjectName}>
                  {subjectName}
                </option>
              ))}
            </select>

            {!isMockExam && (
              <select
                aria-label="Gradebook score column"
                value={activeFocusColumn}
                onChange={(e) => setFocusColumn(e.target.value as FocusColumn)}
                className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800 shadow-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 sm:text-sm"
              >
                <option value="CLASS_EXAM">Class &amp; Exam (/100)</option>
                {hasDirectClassEntry && (
                  <option value="CLASS_ONLY">Class only (/{maxClassScore})</option>
                )}
                <option value="EXAM_ONLY">Exam only (/100)</option>
                {sbaTaskOptions.map((task) => (
                  <option key={task.name} value={`COMP:${task.name}`}>
                    SBA: {task.name} (/{task.maxScore})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              aria-pressed={unscoredOnly}
              onClick={() => setUnscoredOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold shadow-xs transition-colors ${
                unscoredOnly
                  ? "border-amber-500 bg-amber-50 text-amber-900"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              data-record="true"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Unscored only</span>
              {unscoredCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    unscoredOnly ? "bg-amber-200 text-amber-950" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {unscoredCount}
                </span>
              )}
            </button>

            {hasPendingOrderOrFilterChanges && (
              <button
                type="button"
                onClick={() => setRefreshNonce((prev) => prev + 1)}
                title="Row order is locked while entering scores. Click to apply the active sort and filters."
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 shadow-xs transition-colors hover:bg-blue-100"
                data-record="true"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Order locked · Re-apply</span>
              </button>
            )}

            {sessionStudents.length > 0 && (
              <button
                type="button"
                onClick={handleExportCurrentView}
                title={
                  activeTaskConfig
                    ? `Export ${activeTaskConfig.name} scores to CSV`
                    : `Export ${activeSubject} scores to CSV`
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 shadow-xs transition-colors hover:bg-emerald-100"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{activeTaskConfig ? "Export Task CSV" : "Export CSV"}</span>
              </button>
            )}

            {onOpenScoreImport && (
              <button
                type="button"
                onClick={() =>
                  onOpenScoreImport(activeSubject, activeComponentName ?? undefined)
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-purple-700 shadow-xs transition-colors hover:bg-purple-50"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gradebook Rows */}
      <div className="divide-y divide-gray-100">
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
                className="text-primary hover:text-primary/80 mt-3 text-xs font-bold hover:underline"
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
                  className="text-primary hover:text-primary/80 mt-3 text-xs font-bold hover:underline"
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

          if (!subject) {
            return (
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-main truncate text-sm font-bold">
                    {index + 1}. {student.name}
                  </p>
                  <p className="text-muted text-xs">Missing {activeSubject}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSubjectToStudent(student)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add Subject</span>
                </button>
              </div>
            );
          }

          const hasComponents =
            !isMockExam && Boolean(subject.classScoreComponents?.length);
          const total = (subject.classScore || 0) + (subject.examScore || 0);
          const { grade } = calculateGrade(total, settings.level);

          const draftKey = `${student.id}:${subject.id}`;
          const draft = examDrafts[draftKey];
          const examRawValue =
            draft !== undefined && draft.baseScore === subject.examScore
              ? draft.raw
              : formatExamWeightedAsRaw(subject.examScore, maxExamScore);

          const activeComponent = activeComponentName
            ? subject.classScoreComponents?.find((comp) => comp.name === activeComponentName)
            : undefined;
          const showClassInput =
            !isMockExam &&
            !hasComponents &&
            (activeFocusColumn === "CLASS_EXAM" || activeFocusColumn === "CLASS_ONLY");
          const showExamInput =
            isMockExam ||
            activeFocusColumn === "CLASS_EXAM" ||
            activeFocusColumn === "EXAM_ONLY";

          return (
            <div
              key={student.id}
              className="flex flex-col gap-2.5 px-4 py-3 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              {/* Student Identity */}
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-main truncate text-sm font-bold">
                    {index + 1}. {student.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-600">{total} total</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        total < 50 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {grade}
                    </span>
                    {!isMockExam && hasComponents && (
                      <span className="text-[11px] font-medium text-purple-700">
                        Class: {subject.classScore}/{maxClassScore}
                      </span>
                    )}
                  </div>
                </div>

                {onOpenStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenStudent(student, visibleStudents)}
                    aria-label={`Open ${student.name} details`}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Open full score sheet"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Numeric Entry Inputs */}
              <div className="flex items-center gap-2 sm:shrink-0">
                {activeComponentName ? (
                  activeComponent ? (
                    <label className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-purple-700 uppercase">
                        {activeComponent.name} (/{activeComponent.maxScore})
                      </span>
                      <input
                        ref={(el) => {
                          inputRefs.current[`comp:${student.id}`] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        enterKeyHint="next"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-label={`${student.name} ${activeComponent.name} Score`}
                        value={activeComponent.score === 0 ? "" : activeComponent.score}
                        placeholder={`/${activeComponent.maxScore}`}
                        onChange={(e) => {
                          if (!subject.classScoreComponents) return;
                          const raw = e.target.value;
                          if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                          const rawScore = raw === "" ? 0 : Number(raw);
                          if (!Number.isFinite(rawScore)) return;
                          const { updatedComponents, classScore } =
                            updateComponentAndRecalculateClassScore(
                              subject.classScoreComponents,
                              activeComponent.id,
                              rawScore,
                              maxClassScore,
                            );
                          commitSubjectUpdate(student, {
                            ...subject,
                            classScoreComponents: updatedComponents,
                            classScore,
                          });
                        }}
                        onPaste={(e) => handleColumnPaste(e, "comp", student.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "ArrowDown") {
                            e.preventDefault();
                            focusAdjacentStudentInput("comp", student.id, 1);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            focusAdjacentStudentInput("comp", student.id, -1);
                          }
                        }}
                        className="w-24 rounded-lg border border-purple-300 bg-white px-2 py-2 text-center text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />
                    </label>
                  ) : (
                    <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      Not configured
                    </span>
                  )
                ) : (
                  <>
                    {activeFocusColumn === "CLASS_ONLY" && hasComponents && (
                      <span className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700">
                        SBA: {subject.classScore}/{maxClassScore}
                      </span>
                    )}

                    {showClassInput && (
                      <label className="flex flex-col items-center gap-0.5">
                        <span
                          className="text-[10px] font-bold text-gray-500 uppercase"
                          data-record="true"
                        >
                          Class (/{maxClassScore})
                        </span>
                        <input
                          ref={(el) => {
                            inputRefs.current[`class:${student.id}`] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          enterKeyHint="next"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-label={`${student.name} Class Score`}
                          value={subject.classScore === 0 ? "" : subject.classScore}
                          placeholder={`/${maxClassScore}`}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              commitSubjectUpdate(student, { ...subject, classScore: 0 });
                              return;
                            }
                            if (!/^\d*\.?\d*$/.test(raw)) return;
                            const numeric = Number(raw);
                            if (!Number.isFinite(numeric)) return;
                            const { score } = clampDirectClassScore(numeric, maxClassScore);
                            commitSubjectUpdate(student, { ...subject, classScore: score });
                          }}
                          onPaste={(e) => handleColumnPaste(e, "class", student.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "ArrowDown") {
                              e.preventDefault();
                              focusAdjacentStudentInput("class", student.id, 1);
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              focusAdjacentStudentInput("class", student.id, -1);
                            }
                          }}
                          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    )}

                    {showExamInput && (
                      <label className="flex flex-col items-center gap-0.5">
                        <span
                          className="text-[10px] font-bold text-gray-500 uppercase"
                          data-record="true"
                        >
                          {isMockExam ? "Score (/100)" : "Exam (/100)"}
                        </span>
                        <input
                          ref={(el) => {
                            inputRefs.current[`exam:${student.id}`] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          enterKeyHint="next"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-label={`${student.name} Exam Score`}
                          value={examRawValue}
                          placeholder="/100"
                          onChange={(e) => {
                            const raw = e.target.value;
                            clearBlurCleanupTimer(draftKey);

                            if (raw === "") {
                              setExamDrafts((prev) => {
                                if (!(draftKey in prev)) return prev;
                                const next = { ...prev };
                                delete next[draftKey];
                                return next;
                              });
                              commitSubjectUpdate(student, { ...subject, examScore: 0 });
                              return;
                            }

                            if (!/^\d*\.?\d*$/.test(raw)) return;
                            const numeric = Number(raw);
                            if (!Number.isFinite(numeric)) return;

                            const { clampedRaw, wasClamped, weightedScore } =
                              convertExamRawToWeighted(numeric, maxExamScore);
                            const normalizedDisplay = wasClamped ? String(clampedRaw) : raw;
                            const formattedWeighted = formatExamWeightedAsRaw(
                              weightedScore,
                              maxExamScore,
                            );

                            if (normalizedDisplay !== formattedWeighted) {
                              setExamDrafts((prev) => ({
                                ...prev,
                                [draftKey]: {
                                  baseScore: weightedScore,
                                  raw: normalizedDisplay,
                                },
                              }));
                            } else if (draftKey in examDrafts) {
                              setExamDrafts((prev) => {
                                if (!(draftKey in prev)) return prev;
                                const next = { ...prev };
                                delete next[draftKey];
                                return next;
                              });
                            }

                            commitSubjectUpdate(student, { ...subject, examScore: weightedScore });
                          }}
                          onBlur={() => {
                            if (!(draftKey in examDrafts)) return;
                            clearBlurCleanupTimer(draftKey);
                            blurCleanupTimersRef.current[draftKey] = window.setTimeout(() => {
                              delete blurCleanupTimersRef.current[draftKey];
                              setExamDrafts((prev) => {
                                if (!(draftKey in prev)) return prev;
                                const next = { ...prev };
                                delete next[draftKey];
                                return next;
                              });
                            }, 0);
                          }}
                          onPaste={(e) => handleColumnPaste(e, "exam", student.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "ArrowDown") {
                              e.preventDefault();
                              focusAdjacentStudentInput("exam", student.id, 1);
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              focusAdjacentStudentInput("exam", student.id, -1);
                            }
                          }}
                          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
