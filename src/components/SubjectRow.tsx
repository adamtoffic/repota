import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ClassScoreComponentConfig, SavedSubject, SchoolLevel } from "../types";
import { calculateGrade } from "../utils/gradeCalculator";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  formatExamWeightedAsRaw,
  updateComponentAndRecalculateClassScore,
} from "../utils/scoreConversion";
import { getSubjectScoreStatus } from "../utils/studentValidation";

export type FieldNavigationDirection = "next" | "prev" | "down" | "up";

interface Props {
  subject: SavedSubject;
  level: SchoolLevel;
  maxClassScore: number;
  maxExamScore: number;
  componentLibrary?: ClassScoreComponentConfig[];
  isMockExam?: boolean;
  isObsolete?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isLastRow?: boolean;
  registerInputRef?: (fieldKey: string, el: HTMLInputElement | null) => void;
  onNavigateField?: (fieldKey: string, direction: FieldNavigationDirection) => void;
  onChange: (updated: SavedSubject) => void;
  onDelete?: () => void;
}

const NUMBER_INPUT_RESET_CLASSES =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function SubjectRow({
  subject,
  level,
  maxClassScore,
  maxExamScore,
  isMockExam = false,
  isObsolete = false,
  isExpanded,
  onToggleExpand,
  isLastRow = false,
  registerInputRef,
  onNavigateField,
  onChange,
  onDelete,
}: Props) {
  const components = subject.classScoreComponents ?? [];
  const hasComponents = !isMockExam && components.length > 0;

  // Standalone callers without controlled `isExpanded` default expanded when SBA tasks exist.
  const [internalExpanded, setInternalExpanded] = useState(hasComponents);
  const showComponents = isExpanded !== undefined ? isExpanded : internalExpanded;

  const toggleComponents = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const status = getSubjectScoreStatus(subject, isMockExam);
  const hasAnyScore = status !== "unscored";
  const total = (subject.classScore || 0) + (subject.examScore || 0);
  const { grade, remark } = calculateGrade(total, level);

  const sbaTotalCount = components.length;
  const sbaScoredCount = components.filter((comp) => comp.score > 0).length;
  const sbaRawTotal = components.reduce((sum, comp) => sum + comp.score, 0);
  const sbaRawMax = components.reduce((sum, comp) => sum + comp.maxScore, 0);

  const [classScoreError, setClassScoreError] = useState<string | null>(null);
  const [examScoreError, setExamScoreError] = useState<string | null>(null);
  const [componentErrors, setComponentErrors] = useState<Record<string, string | null>>({});
  const timersRef = useRef<Record<string, number>>({});

  // Pair active typing draft with committed examScore so external clears resync immediately.
  const [examDraft, setExamDraft] = useState<{ baseScore: number; raw: string } | null>(null);
  const examRawInput =
    examDraft !== null && examDraft.baseScore === subject.examScore
      ? examDraft.raw
      : formatExamWeightedAsRaw(subject.examScore, maxExamScore);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const scheduleTimer = (key: string, fn: () => void, ms: number) => {
    if (timersRef.current[key]) clearTimeout(timersRef.current[key]);
    timersRef.current[key] = window.setTimeout(fn, ms);
  };

  const handleExamChange = (value: string) => {
    if (value === "") {
      setExamDraft({ baseScore: 0, raw: "" });
      onChange({ ...subject, examScore: 0 });
      setExamScoreError(null);
      return;
    }

    const { clampedRaw, wasClamped, weightedScore } = convertExamRawToWeighted(
      Number(value),
      maxExamScore,
    );

    if (wasClamped) {
      setExamScoreError("Max 100");
      setExamDraft({ baseScore: weightedScore, raw: String(clampedRaw) });
      onChange({ ...subject, examScore: weightedScore });
      scheduleTimer("examError", () => setExamScoreError(null), 2000);
      return;
    }

    setExamScoreError(null);
    setExamDraft({ baseScore: weightedScore, raw: value });
    onChange({ ...subject, examScore: weightedScore });
  };

  const handleClassChange = (value: string) => {
    if (hasComponents) return;

    if (value === "") {
      onChange({ ...subject, classScore: 0 });
      setClassScoreError(null);
      return;
    }

    const { score, wasClamped } = clampDirectClassScore(Number(value), maxClassScore);

    if (wasClamped) {
      setClassScoreError(`Max ${maxClassScore}`);
      onChange({ ...subject, classScore: score });
      scheduleTimer("classError", () => setClassScoreError(null), 2000);
      return;
    }

    setClassScoreError(null);
    onChange({ ...subject, classScore: score });
  };

  const handleComponentChange = (componentId: string, maxScore: number, value: string) => {
    if (!subject.classScoreComponents) return;

    const rawScore = value === "" ? 0 : Number(value);
    const { updatedComponents, classScore, wasClamped } = updateComponentAndRecalculateClassScore(
      subject.classScoreComponents,
      componentId,
      rawScore,
      maxClassScore,
    );

    if (wasClamped) {
      setComponentErrors((prev) => ({ ...prev, [componentId]: `Max ${maxScore}` }));
      scheduleTimer(
        `compError:${componentId}`,
        () =>
          setComponentErrors((prev) => ({
            ...prev,
            [componentId]: null,
          })),
        2000,
      );
    } else if (componentErrors[componentId]) {
      setComponentErrors((prev) => ({ ...prev, [componentId]: null }));
    }

    onChange({
      ...subject,
      classScoreComponents: updatedComponents,
      classScore,
    });
  };

  const handleFieldKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    fieldKey: string,
  ) => {
    if (!onNavigateField) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onNavigateField(fieldKey, e.shiftKey ? "prev" : "next");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onNavigateField(fieldKey, "down");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onNavigateField(fieldKey, "up");
    }
  };

  const statusDotClass =
    status === "complete"
      ? "bg-emerald-500"
      : status === "partial"
        ? "bg-amber-500"
        : "bg-border-strong";

  const gradeBadgeClass =
    total < 50
      ? "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800/70"
      : level === "KG" && grade === "BRONZE"
        ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/70"
        : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/70";

  const desktopGridColumns = isMockExam
    ? onDelete
      ? "sm:grid-cols-[minmax(0,1fr)_6.75rem_3.75rem_7rem_auto]"
      : "sm:grid-cols-[minmax(0,1fr)_6.75rem_3.75rem_7rem]"
    : onDelete
      ? "sm:grid-cols-[minmax(0,1fr)_6.25rem_6.75rem_3.75rem_7rem_auto]"
      : "sm:grid-cols-[minmax(0,1fr)_6.25rem_6.75rem_3.75rem_7rem]";

  return (
    <div
      className={`border-border bg-surface overflow-hidden rounded-xl border shadow-xs transition-colors focus-within:border-blue-400/80 dark:focus-within:border-blue-500/70 ${
        isObsolete ? "opacity-75" : ""
      }`}
    >
      {/* Main Responsive Row */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 p-3 sm:items-center sm:gap-3 sm:px-4 sm:py-3 ${desktopGridColumns}`}
      >
        {/* 1. Subject Identity & SBA Pill */}
        <div className="min-w-0 max-sm:col-start-1 max-sm:row-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`} aria-hidden="true" />
            <span className="text-main truncate text-sm font-semibold">{subject.name}</span>
            {isObsolete && (
              <span
                className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300"
                data-record="true"
              >
                Not in Settings
              </span>
            )}
            {hasComponents && (
              <button
                type="button"
                onClick={toggleComponents}
                aria-expanded={showComponents}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  sbaScoredCount === sbaTotalCount
                    ? "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-950/90"
                    : "bg-amber-100/90 text-amber-800 hover:bg-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-950/90"
                }`}
                title="Toggle SBA component breakdown"
              >
                <span className="tabular-nums">
                  SBA {sbaScoredCount}/{sbaTotalCount}
                </span>
                {showComponents ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
          {status === "complete" && (
            <p className="text-muted mt-0.5 pl-4 text-[11px] sm:hidden">{remark}</p>
          )}
        </div>

        {/* 2. Score Inputs */}
        <div
          className={`grid gap-2.5 max-sm:col-span-2 max-sm:row-start-2 sm:contents ${
            isMockExam ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {/* Class Score — omitted in Mock mode */}
          {!isMockExam && (
            <div className="min-w-0">
              <span
                className="text-muted mb-1 block text-center text-[10px] font-bold tracking-wide uppercase sm:hidden"
                data-record="true"
              >
                Class (/{maxClassScore})
              </span>
              {hasComponents ? (
                <button
                  type="button"
                  onClick={toggleComponents}
                  aria-expanded={showComponents}
                  title={`Auto-calculated from SBA tasks (${subject.classScore}/${maxClassScore})`}
                  className="flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 text-sm font-bold text-purple-700 tabular-nums transition-colors hover:bg-purple-100 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-950/80"
                >
                  <span>{subject.classScore}</span>
                  <span className="text-[11px] font-medium text-purple-500 dark:text-purple-400">
                    /{maxClassScore}
                  </span>
                  {showComponents ? (
                    <ChevronUp className="h-3.5 w-3.5 opacity-75" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 opacity-75" />
                  )}
                </button>
              ) : (
                <>
                  <input
                    ref={(el) => registerInputRef?.("class", el)}
                    type="number"
                    inputMode="numeric"
                    enterKeyHint="next"
                    min={0}
                    max={maxClassScore}
                    aria-label={`${subject.name} Class Score`}
                    value={subject.classScore === 0 ? "" : subject.classScore}
                    onChange={(e) => handleClassChange(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => handleFieldKeyDown(e, "class")}
                    className={`placeholder:text-muted h-10 w-full rounded-lg border px-2 text-center text-base font-bold tabular-nums transition-colors outline-none focus:ring-2 sm:text-sm ${NUMBER_INPUT_RESET_CLASSES} ${
                      classScoreError
                        ? "bg-input text-main border-red-500 focus:border-red-500 focus:ring-red-500/25"
                        : "border-border-strong bg-input text-main hover:border-muted focus:border-blue-500 focus:ring-blue-500/25"
                    }`}
                    placeholder={`/${maxClassScore}`}
                    title={`Enter class score (0-${maxClassScore})`}
                  />
                  {classScoreError && (
                    <p className="mt-0.5 text-center text-[10px] font-semibold whitespace-nowrap text-red-600 dark:text-red-400">
                      {classScoreError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Exam Score */}
          <div className="min-w-0">
            <span
              className="text-muted mb-1 block text-center text-[10px] font-bold tracking-wide uppercase sm:hidden"
              data-record="true"
            >
              {isMockExam ? "Score (/100)" : "Exam (/100)"}
            </span>
            <input
              ref={(el) => registerInputRef?.("exam", el)}
              type="number"
              inputMode="numeric"
              enterKeyHint={isLastRow ? "done" : "next"}
              min={0}
              max={100}
              aria-label={`${subject.name} Exam Score`}
              value={examRawInput}
              onChange={(e) => handleExamChange(e.target.value)}
              onBlur={() => setExamDraft(null)}
              onFocus={(e) => e.currentTarget.select()}
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => handleFieldKeyDown(e, "exam")}
              className={`bg-input text-main placeholder:text-muted hover:border-muted h-10 w-full rounded-lg border px-2 text-center text-base font-bold tabular-nums transition-colors outline-none focus:ring-2 sm:text-sm ${NUMBER_INPUT_RESET_CLASSES} ${
                examScoreError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                  : "border-border-strong focus:border-blue-500 focus:ring-blue-500/25"
              }`}
              placeholder="/100"
              title={
                isMockExam
                  ? "Enter exam score (0-100)"
                  : `Enter raw score (0-100). Converts to ${maxExamScore}%`
              }
            />
            {!isMockExam && (
              <p className="text-muted mt-0.5 text-center text-[10px] font-medium tabular-nums">
                = {subject.examScore}/{maxExamScore}
              </p>
            )}
            {examScoreError && (
              <p className="mt-0.5 text-center text-[10px] font-semibold whitespace-nowrap text-red-600 dark:text-red-400">
                {examScoreError}
              </p>
            )}
          </div>
        </div>

        {/* 3. Single-DOM Outcome (Total + Status/Grade + Optional Delete) */}
        <div className="flex items-center justify-end gap-2 max-sm:col-start-2 max-sm:row-start-1 sm:contents">
          {/* Single Total Node */}
          <div className="flex items-baseline justify-end sm:justify-center">
            <span
              className={`text-sm font-bold tabular-nums ${
                hasAnyScore ? "text-main" : "text-muted"
              }`}
            >
              {hasAnyScore ? total : "—"}
            </span>
          </div>

          {/* Honest Status / Grade + Remark */}
          <div className="flex flex-col items-end sm:items-center">
            {status === "unscored" ? (
              <span
                className="bg-subtle text-muted rounded-md px-2 py-0.5 text-[11px] font-semibold"
                data-record="true"
              >
                Pending
              </span>
            ) : status === "partial" ? (
              <>
                <span
                  className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/70"
                  data-record="true"
                >
                  Partial
                </span>
                <span
                  className="text-muted mt-0.5 hidden text-[10px] sm:block"
                  data-record="true"
                >
                  {subject.classScore === 0 ? "Need class" : "Need exam"}
                </span>
              </>
            ) : (
              <>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${gradeBadgeClass}`}>
                  {grade}
                </span>
                <span className="text-muted mt-0.5 hidden max-w-full truncate text-[10px] sm:block">
                  {remark}
                </span>
              </>
            )}
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Remove ${subject.name}`}
              className="text-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Streamlined SBA Component Breakdown Drawer */}
      {hasComponents && showComponents && (
        <div className="border-t border-purple-200/80 bg-purple-50/45 px-3 py-3 sm:px-4 dark:border-purple-800/60 dark:bg-purple-950/30">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span
              className="font-semibold text-purple-900 dark:text-purple-200"
              data-record="true"
            >
              SBA Breakdown
            </span>
            <div className="flex items-center gap-2 text-[11px] tabular-nums">
              <span className="text-purple-700 dark:text-purple-300">
                Raw {sbaRawTotal}/{sbaRawMax}
              </span>
              <span className="text-purple-300 dark:text-purple-700">·</span>
              <span className="font-semibold text-purple-900 dark:text-purple-200">
                Class Score: {subject.classScore}/{maxClassScore}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {components.map((component) => {
              const compInputId = `sba-${subject.id}-${component.id}`;
              const compError = componentErrors[component.id];
              return (
                <div
                  key={component.id}
                  className="bg-surface rounded-lg border border-purple-200 p-2.5 shadow-2xs dark:border-purple-800/60"
                >
                  <label
                    htmlFor={compInputId}
                    className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold text-purple-900 dark:text-purple-200"
                  >
                    <span className="truncate">{component.name}</span>
                    <span className="shrink-0 text-purple-500 tabular-nums dark:text-purple-400">
                      /{component.maxScore}
                    </span>
                  </label>
                  <input
                    id={compInputId}
                    ref={(el) => registerInputRef?.(`comp:${component.id}`, el)}
                    type="number"
                    inputMode="numeric"
                    enterKeyHint="next"
                    min={0}
                    max={component.maxScore}
                    aria-label={`${subject.name} ${component.name} Score`}
                    value={component.score === 0 ? "" : component.score}
                    onChange={(e) =>
                      handleComponentChange(component.id, component.maxScore, e.target.value)
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => handleFieldKeyDown(e, `comp:${component.id}`)}
                    className={`bg-input text-main placeholder:text-muted h-9 w-full rounded-md border px-2 text-center text-sm font-bold tabular-nums transition-colors outline-none focus:ring-2 ${NUMBER_INPUT_RESET_CLASSES} ${
                      compError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                        : "border-purple-200 focus:border-purple-500 focus:ring-purple-500/30 dark:border-purple-700/70"
                    }`}
                    placeholder={`/${component.maxScore}`}
                  />
                  {compError && (
                    <p className="mt-1 text-center text-[10px] font-semibold whitespace-nowrap text-red-600 dark:text-red-400">
                      {compError}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
