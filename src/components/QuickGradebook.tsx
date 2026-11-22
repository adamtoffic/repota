import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Download,
  ExternalLink,
  Filter,
  PlusCircle,
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
  settings: SchoolSettings;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
  onOpenStudent?: (student: ProcessedStudent) => void;
  onOpenScoreImport?: (subject: string, taskName?: string) => void;
}

type FocusColumn = "CLASS_EXAM" | `COMP:${string}`;

function isStudentUnscoredInGradebook(
  student: ProcessedStudent,
  activeSubject: string,
  activeComponentName: string | null,
  isMockExam: boolean,
): boolean {
  const sub = student.subjects.find((s) => s.name === activeSubject);
  if (!sub) return true;
  if (activeComponentName) {
    const comp = sub.classScoreComponents?.find((c) => c.name === activeComponentName);
    return !comp || comp.score === 0;
  }
  if (isMockExam) {
    return sub.examScore === 0;
  }
  return sub.classScore === 0 || sub.examScore === 0;
}

export function QuickGradebook({
  students,
  settings,
  onUpdateStudent,
  onOpenStudent,
  onOpenScoreImport,
}: QuickGradebookProps) {
  const isMockExam = settings.examType === "MOCK";
  const maxClassScore = settings.classScoreMax;
  const maxExamScore = settings.examScoreMax;

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
    students.forEach((student) => student.subjects.forEach((sub) => addSubjectName(sub.name)));
    return ordered;
  }, [settings.defaultSubjects, students]);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const activeSubject = availableSubjects.includes(selectedSubject)
    ? selectedSubject
    : (availableSubjects[0] ?? "");

  const [focusColumn, setFocusColumn] = useState<FocusColumn>("CLASS_EXAM");
  const [unscoredOnly, setUnscoredOnly] = useState(false);
  const [pinnedStudentIds, setPinnedStudentIds] = useState<Set<string>>(() => new Set());
  const [examDrafts, setExamDrafts] = useState<Record<string, { baseScore: number; raw: string }>>(
    {},
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Discover SBA tasks attached to this subject across the class
  const sbaTaskOptions = useMemo(() => {
    if (isMockExam || !activeSubject) return [] as Array<{ name: string; maxScore: number }>;
    const byName = new Map<string, number>();
    students.forEach((student) => {
      const subject = student.subjects.find((sub) => sub.name === activeSubject);
      subject?.classScoreComponents?.forEach((comp) => {
        if (!byName.has(comp.name)) {
          byName.set(comp.name, comp.maxScore);
        }
      });
    });
    return Array.from(byName.entries()).map(([name, maxScore]) => ({ name, maxScore }));
  }, [isMockExam, activeSubject, students]);

  const activeFocusColumn: FocusColumn =
    focusColumn.startsWith("COMP:") &&
    sbaTaskOptions.some((task) => `COMP:${task.name}` === focusColumn)
      ? focusColumn
      : "CLASS_EXAM";

  const activeComponentName = activeFocusColumn.startsWith("COMP:")
    ? activeFocusColumn.slice("COMP:".length)
    : null;

  const activeTaskConfig = activeComponentName
    ? sbaTaskOptions.find((t) => t.name === activeComponentName)
    : undefined;

  const columnStats = useMemo(() => {
    if (!activeSubject || students.length === 0) return { scored: 0, avgLabel: "" };
    if (activeTaskConfig) {
      const scores: number[] = [];
      students.forEach((student) => {
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

    const totals: number[] = [];
    students.forEach((student) => {
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
  }, [activeSubject, activeTaskConfig, isMockExam, students]);

  const unscoredCount = useMemo(() => {
    if (!activeSubject) return 0;
    return students.filter((student) =>
      isStudentUnscoredInGradebook(student, activeSubject, activeComponentName, isMockExam),
    ).length;
  }, [students, activeSubject, activeComponentName, isMockExam]);

  const visibleStudents = useMemo(() => {
    if (!unscoredOnly) return students;
    return students.filter(
      (student) =>
        pinnedStudentIds.has(student.id) ||
        isStudentUnscoredInGradebook(student, activeSubject, activeComponentName, isMockExam),
    );
  }, [unscoredOnly, students, pinnedStudentIds, activeSubject, activeComponentName, isMockExam]);

  const handleExportCurrentView = () => {
    if (!activeSubject || students.length === 0) return;
    const dateStamp = new Date().toISOString().split("T")[0];
    const safeSub = activeSubject.replace(/\s+/g, "_");
    if (activeTaskConfig) {
      const csv = buildSingleComponentExportCsv(activeSubject, activeTaskConfig, students, settings);
      downloadCsvFile(
        csv,
        `${safeSub}_${activeTaskConfig.name.replace(/\s+/g, "_")}_${dateStamp}.csv`,
      );
    } else {
      const csv = buildSubjectQuickExportCsv(activeSubject, students, settings);
      downloadCsvFile(csv, `${safeSub}_Gradebook_${dateStamp}.csv`);
    }
    captureEvent("Class_Tool_Used", {
      tool: "gradebook_csv_export",
      students_count: students.length,
      school_level: settings.level || "unknown",
    });
  };

  const scoredCount = columnStats.scored;

  const focusAdjacentStudentInput = (
    field: "class" | "exam" | "comp",
    currentIndex: number,
    direction: 1 | -1 = 1,
  ) => {
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
   * Excel or Google Sheets fills consecutive students downward from `startIndex`.
   */
  const handleColumnPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    field: "class" | "exam" | "comp",
    startIndex: number,
  ) => {
    const text = e.clipboardData.getData("text");
    if (!text || !/[\r\n]/.test(text)) return;

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length <= 1) return;

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

  const pinStudentWhileFiltering = (studentId: string) => {
    if (!unscoredOnly) return;
    setPinnedStudentIds((prev) => {
      if (prev.has(studentId)) return prev;
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });
  };

  const commitSubjectUpdate = (
    student: ProcessedStudent,
    updatedSubject: SavedSubject,
    fromPaste = false,
  ) => {
    pinStudentWhileFiltering(student.id);
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
    pinStudentWhileFiltering(student.id);
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
    <div className="border-border bg-surface overflow-hidden rounded-xl border shadow-sm">
      {/* Header Controls */}
      <div className="border-border-subtle border-b p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TableProperties className="text-primary-text h-5 w-5" />
              <h2 className="text-main text-lg font-bold" data-record="true">
                Quick Gradebook
              </h2>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                  isMockExam
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-300"
                }`}
              >
                {isMockExam ? "Mock (0/100)" : `Termly (${maxClassScore}/${maxExamScore})`}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {scoredCount}/{students.length} scored
              </span>
              {scoredCount > 0 && columnStats.avgLabel && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {columnStats.avgLabel}
                </span>
              )}
            </div>
            <p className="text-muted mt-0.5 text-xs" data-record="true">
              Enter scores subject-by-subject. Use Enter/Arrows to move or paste a column from Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Gradebook subject"
              value={activeSubject}
              onChange={(e) => {
                setPinnedStudentIds(new Set());
                setSelectedSubject(e.target.value);
              }}
              className="border-border-strong bg-input text-main rounded-lg border px-3 py-2 text-sm font-bold shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {availableSubjects.map((subjectName) => (
                <option key={subjectName} value={subjectName}>
                  {subjectName}
                </option>
              ))}
            </select>

            {sbaTaskOptions.length > 0 && (
              <select
                aria-label="Gradebook score column"
                value={activeFocusColumn}
                onChange={(e) => {
                  setPinnedStudentIds(new Set());
                  setFocusColumn(e.target.value as FocusColumn);
                }}
                className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800 shadow-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 sm:text-sm dark:border-purple-700/70 dark:bg-purple-950/60 dark:text-purple-200"
              >
                <option value="CLASS_EXAM">Class &amp; Exam (/100)</option>
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
              onClick={() => {
                setPinnedStudentIds(new Set());
                setUnscoredOnly((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold shadow-xs transition-colors ${
                unscoredOnly
                  ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                  : "border-border-strong bg-surface text-secondary hover:bg-subtle"
              }`}
              data-record="true"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Unscored only</span>
              {unscoredCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    unscoredOnly
                      ? "bg-amber-200 text-amber-950 dark:bg-amber-900/80 dark:text-amber-100"
                      : "bg-subtle text-secondary"
                  }`}
                >
                  {unscoredCount}
                </span>
              )}
            </button>

            {students.length > 0 && (
              <button
                type="button"
                onClick={handleExportCurrentView}
                title={
                  activeTaskConfig
                    ? `Export ${activeTaskConfig.name} scores to CSV`
                    : `Export ${activeSubject} scores to CSV`
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 shadow-xs transition-colors hover:bg-emerald-100 dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950/80"
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
                className="bg-surface inline-flex items-center gap-1.5 rounded-lg border border-purple-300 px-3 py-2 text-xs font-bold text-purple-700 shadow-xs transition-colors hover:bg-purple-50 dark:border-purple-700/70 dark:text-purple-300 dark:hover:bg-purple-950/50"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gradebook Rows */}
      <div className="divide-border-subtle divide-y">
        {unscoredOnly && visibleStudents.length === 0 ? (
          <div className="px-4 py-10 text-center sm:px-6">
            <p className="text-main text-sm font-bold" data-record="true">
              All students have scores entered for this view
            </p>
            <p className="text-muted mt-1 text-xs">
              Switch subjects or turn off the filter to review existing marks.
            </p>
            <button
              type="button"
              onClick={() => {
                setPinnedStudentIds(new Set());
                setUnscoredOnly(false);
              }}
              className="text-primary-text hover:text-primary-text/80 mt-3 text-xs font-bold hover:underline"
            >
              Show All Students
            </button>
          </div>
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
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950/80"
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

          return (
            <div
              key={student.id}
              className="hover:bg-subtle/60 flex flex-col gap-2.5 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              {/* Student Identity */}
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-main truncate text-sm font-bold">
                    {index + 1}. {student.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="text-muted font-semibold">{total} total</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        total < 50
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                          : "bg-green-100 text-green-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {grade}
                    </span>
                    {!isMockExam && hasComponents && (
                      <span className="text-[11px] font-medium text-purple-700 dark:text-purple-400">
                        Class: {subject.classScore}/{maxClassScore}
                      </span>
                    )}
                  </div>
                </div>

                {onOpenStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenStudent(student)}
                    aria-label={`Open ${student.name} details`}
                    className="text-muted hover:bg-subtle hover:text-main rounded-lg p-2"
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
                      <span className="text-[10px] font-bold text-purple-700 uppercase dark:text-purple-300">
                        {activeComponent.name} (/{activeComponent.maxScore})
                      </span>
                      <input
                        ref={(el) => {
                          inputRefs.current[`comp:${student.id}`] = el;
                        }}
                        type="number"
                        inputMode="numeric"
                        enterKeyHint="next"
                        min={0}
                        max={activeComponent.maxScore}
                        aria-label={`${student.name} ${activeComponent.name} Score`}
                        value={activeComponent.score === 0 ? "" : activeComponent.score}
                        placeholder={`/${activeComponent.maxScore}`}
                        onChange={(e) => {
                          if (!subject.classScoreComponents) return;
                          const rawScore = e.target.value === "" ? 0 : Number(e.target.value);
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
                        onPaste={(e) => handleColumnPaste(e, "comp", index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "ArrowDown") {
                            e.preventDefault();
                            focusAdjacentStudentInput("comp", index, 1);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            focusAdjacentStudentInput("comp", index, -1);
                          }
                        }}
                        className="bg-input text-main placeholder:text-muted w-24 rounded-lg border border-purple-300 px-2 py-2 text-center text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-purple-700/70"
                      />
                    </label>
                  ) : (
                    <span className="border-border bg-subtle text-muted rounded-lg border px-3 py-2 text-xs">
                      Not configured
                    </span>
                  )
                ) : (
                  <>
                    {!isMockExam && !hasComponents && (
                      <label className="flex flex-col items-center gap-0.5">
                        <span
                          className="text-muted text-[10px] font-bold uppercase"
                          data-record="true"
                        >
                          Class (/{maxClassScore})
                        </span>
                        <input
                          ref={(el) => {
                            inputRefs.current[`class:${student.id}`] = el;
                          }}
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          min={0}
                          max={maxClassScore}
                          aria-label={`${student.name} Class Score`}
                          value={subject.classScore === 0 ? "" : subject.classScore}
                          placeholder={`/${maxClassScore}`}
                          onChange={(e) => {
                            if (e.target.value === "") {
                              commitSubjectUpdate(student, { ...subject, classScore: 0 });
                              return;
                            }
                            const { score } = clampDirectClassScore(
                              Number(e.target.value),
                              maxClassScore,
                            );
                            commitSubjectUpdate(student, { ...subject, classScore: score });
                          }}
                          onPaste={(e) => handleColumnPaste(e, "class", index)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "ArrowDown") {
                              e.preventDefault();
                              focusAdjacentStudentInput("class", index, 1);
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              focusAdjacentStudentInput("class", index, -1);
                            }
                          }}
                          className="border-border-strong bg-input text-main placeholder:text-muted w-20 rounded-lg border px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                        />
                      </label>
                    )}

                    <label className="flex flex-col items-center gap-0.5">
                      <span
                        className="text-muted text-[10px] font-bold uppercase"
                        data-record="true"
                      >
                        {isMockExam ? "Score (/100)" : "Exam (/100)"}
                      </span>
                      <input
                        ref={(el) => {
                          inputRefs.current[`exam:${student.id}`] = el;
                        }}
                        type="number"
                        inputMode="numeric"
                        enterKeyHint="next"
                        min={0}
                        max={100}
                        aria-label={`${student.name} Exam Score`}
                        value={examRawValue}
                        placeholder="/100"
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setExamDrafts((prev) => ({
                              ...prev,
                              [draftKey]: { baseScore: 0, raw: "" },
                            }));
                            commitSubjectUpdate(student, { ...subject, examScore: 0 });
                            return;
                          }

                          const { clampedRaw, wasClamped, weightedScore } = convertExamRawToWeighted(
                            Number(raw),
                            maxExamScore,
                          );
                          setExamDrafts((prev) => ({
                            ...prev,
                            [draftKey]: {
                              baseScore: weightedScore,
                              raw: wasClamped ? String(clampedRaw) : raw,
                            },
                          }));
                          commitSubjectUpdate(student, { ...subject, examScore: weightedScore });
                        }}
                        onBlur={() => {
                          setExamDrafts((prev) => {
                            if (!(draftKey in prev)) return prev;
                            const next = { ...prev };
                            delete next[draftKey];
                            return next;
                          });
                        }}
                        onPaste={(e) => handleColumnPaste(e, "exam", index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "ArrowDown") {
                            e.preventDefault();
                            focusAdjacentStudentInput("exam", index, 1);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            focusAdjacentStudentInput("exam", index, -1);
                          }
                        }}
                        className="border-border-strong bg-input text-main placeholder:text-muted w-20 rounded-lg border px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      />
                    </label>
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
