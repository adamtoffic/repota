import { Link } from "@tanstack/react-router";
import { Download, Filter, RefreshCw, TableProperties, Upload } from "lucide-react";
import type { ClassScoreComponentConfig } from "../../types";
import type { FocusColumn } from "./gradebookHelpers";

interface QuickGradebookHeaderProps {
  isMockExam: boolean;
  maxClassScore: number;
  maxExamScore: number;
  scoredCount: number;
  totalSessionStudents: number;
  avgLabel: string;
  activeSubject: string;
  availableSubjects: string[];
  activeFocusColumn: FocusColumn;
  hasDirectClassEntry: boolean;
  sbaTaskOptions: ClassScoreComponentConfig[];
  activeTaskConfig: ClassScoreComponentConfig | undefined;
  activeComponentName: string | null;
  unscoredOnly: boolean;
  unscoredCount: number;
  hasPendingOrderOrFilterChanges: boolean;
  onSelectSubject: (subject: string) => void;
  onSelectFocusColumn: (col: FocusColumn) => void;
  onToggleUnscoredOnly: () => void;
  onReapplyOrder: () => void;
  onExportCurrentView: () => void;
  onOpenScoreImport?: (subject: string, taskName?: string) => void;
}

export function QuickGradebookHeader({
  isMockExam,
  maxClassScore,
  maxExamScore,
  scoredCount,
  totalSessionStudents,
  avgLabel,
  activeSubject,
  availableSubjects,
  activeFocusColumn,
  hasDirectClassEntry,
  sbaTaskOptions,
  activeTaskConfig,
  activeComponentName,
  unscoredOnly,
  unscoredCount,
  hasPendingOrderOrFilterChanges,
  onSelectSubject,
  onSelectFocusColumn,
  onToggleUnscoredOnly,
  onReapplyOrder,
  onExportCurrentView,
  onOpenScoreImport,
}: QuickGradebookHeaderProps) {
  return (
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
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 tabular-nums dark:bg-blue-950/60 dark:text-blue-300">
              {scoredCount}/{totalSessionStudents} scored
            </span>
            <span className="min-w-[6.75rem] rounded-full bg-emerald-50 px-2.5 py-0.5 text-center text-xs font-bold text-emerald-700 tabular-nums dark:bg-emerald-950/60 dark:text-emerald-300">
              {scoredCount > 0 && avgLabel ? avgLabel : "Avg: —"}
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
            onChange={(e) => onSelectSubject(e.target.value)}
            className="border-border-strong bg-input text-main rounded-lg border px-3 py-2 text-sm font-bold shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              onChange={(e) => onSelectFocusColumn(e.target.value as FocusColumn)}
              className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800 shadow-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 sm:text-sm dark:border-purple-700/70 dark:bg-purple-950/60 dark:text-purple-200"
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
            onClick={onToggleUnscoredOnly}
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

          {hasPendingOrderOrFilterChanges && (
            <button
              type="button"
              onClick={onReapplyOrder}
              title="Row order is locked while entering scores. Click to apply the active sort and filters."
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 shadow-xs transition-colors hover:bg-blue-100 dark:border-blue-700/70 dark:bg-blue-950/60 dark:text-blue-200 dark:hover:bg-blue-950/80"
              data-record="true"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Order locked · Re-apply</span>
            </button>
          )}

          {totalSessionStudents > 0 && (
            <button
              type="button"
              onClick={onExportCurrentView}
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
          {!isMockExam && sbaTaskOptions.length > 0 && (
            <Link
              to="/sba"
              className="bg-surface inline-flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700 shadow-xs transition-colors hover:bg-purple-50 dark:border-purple-800/70 dark:text-purple-300 dark:hover:bg-purple-950/50"
              data-record="true"
            >
              <TableProperties className="h-3.5 w-3.5" />
              <span>SBA Markbook</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
