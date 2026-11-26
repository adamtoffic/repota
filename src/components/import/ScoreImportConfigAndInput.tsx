import { Download, FileSpreadsheet } from "lucide-react";
import type { AssessmentCategory, ClassScoreComponentConfig } from "../../types";
import type { SbaImportMode } from "../../utils/csvImport";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";

export const CREATE_NEW_TASK_VALUE = "__CREATE_NEW_TASK__";

interface ModeTab {
  id: SbaImportMode;
  label: string;
  hint: string;
}

interface ScoreImportConfigAndInputProps {
  availableSubjects: string[];
  activeSubject: string;
  onSelectSubject: (subject: string) => void;
  modeTabs: ModeTab[];
  activeMode: SbaImportMode;
  onSelectMode: (mode: SbaImportMode) => void;
  isMock: boolean;
  activeTasks: ClassScoreComponentConfig[];
  classScoreMax: number;
  examScoreMax: number;
  effectiveTaskOption: string;
  onSelectTaskOption: (taskOption: string) => void;
  isCreatingSingleTask: boolean;
  activeSingleTask: ClassScoreComponentConfig | undefined;
  studentCount: number;
  newSingleTaskName: string;
  newSingleTaskMax: string;
  newSingleTaskCategory: AssessmentCategory;
  isSingleTaskMaxValid: boolean;
  onNewSingleTaskNameChange: (value: string) => void;
  onNewSingleTaskMaxChange: (value: string) => void;
  onNewSingleTaskCategoryChange: (value: AssessmentCategory) => void;
  onDownloadTemplate: () => void;
  onExportSingleComponent: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPreviewing: boolean;
  rawText: string;
  onRawTextChange: (value: string) => void;
  onStartPreview: () => void;
}

export function ScoreImportConfigAndInput({
  availableSubjects,
  activeSubject,
  onSelectSubject,
  modeTabs,
  activeMode,
  onSelectMode,
  isMock,
  activeTasks,
  classScoreMax,
  examScoreMax,
  effectiveTaskOption,
  onSelectTaskOption,
  isCreatingSingleTask,
  activeSingleTask,
  studentCount,
  newSingleTaskName,
  newSingleTaskMax,
  newSingleTaskCategory,
  isSingleTaskMaxValid,
  onNewSingleTaskNameChange,
  onNewSingleTaskMaxChange,
  onNewSingleTaskCategoryChange,
  onDownloadTemplate,
  onExportSingleComponent,
  onFileUpload,
  isPreviewing,
  rawText,
  onRawTextChange,
  onStartPreview,
}: ScoreImportConfigAndInputProps) {
  return (
    <>
      {/* Step 1: Subject + Mode Tabs */}
      <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/70 p-3 sm:p-4 dark:border-purple-800/60 dark:bg-purple-950/35">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <label
              htmlFor="sba-import-subject"
              className="mb-1 block text-xs font-bold tracking-wider text-purple-900 uppercase dark:text-purple-200"
            >
              1. Target Subject (Subject-by-Subject)
            </label>
            <select
              id="sba-import-subject"
              value={activeSubject}
              onChange={(e) => onSelectSubject(e.target.value)}
              className="bg-input text-main w-full rounded-lg border border-purple-300 px-3 py-2 text-sm font-bold outline-none focus:border-purple-500 dark:border-purple-700"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div
            role="tablist"
            aria-label="Score import mode"
            className={`bg-surface grid w-full min-w-0 ${
              modeTabs.length === 1 ? "grid-cols-1" : "grid-cols-3"
            } gap-1 rounded-xl border border-purple-200 p-1 dark:border-purple-800/70`}
          >
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeMode === tab.id}
                onClick={() => onSelectMode(tab.id)}
                className={`min-h-10 min-w-0 rounded-lg px-1.5 py-1.5 text-center text-[11px] leading-tight font-bold whitespace-normal transition-colors sm:min-h-0 sm:px-2.5 sm:text-xs sm:whitespace-nowrap ${
                  activeMode === tab.id
                    ? "bg-purple-700 text-white shadow-xs"
                    : "text-secondary hover:bg-purple-50 dark:hover:bg-purple-950/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SBA Aggregation Formula / Status Strip */}
        {!isMock &&
          (activeTasks.length > 0 ? (
            <p className="bg-surface/90 rounded-lg border border-purple-200/80 px-3 py-1.5 text-[11px] font-medium text-purple-900 dark:border-purple-800/60 dark:text-purple-200">
              <strong>{activeSubject} SBA:</strong> {activeTasks.length} component
              {activeTasks.length === 1 ? "" : "s"} (total /
              {activeTasks.reduce((sum, t) => sum + t.maxScore, 0)}) aggregate to{" "}
              <strong>Class Score (/{classScoreMax})</strong> +{" "}
              <strong>Exam (/100 → /{examScoreMax})</strong>
            </p>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              No SBA components assigned to <strong>{activeSubject}</strong> yet. Open the SBA
              Markbook or use <strong>Single SBA Task</strong> →{" "}
              <strong>+ Create New SBA Task...</strong> to import component scores.
            </p>
          ))}

        {/* Single SBA Component Picker / Creator */}
        {activeMode === "SINGLE_COMPONENT" && (
          <div className="bg-surface space-y-3 rounded-lg border border-purple-200 p-3 dark:border-purple-800/60">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
              <div>
                <label
                  htmlFor="single-sba-task-select"
                  className="text-secondary mb-1 block text-[11px] font-bold uppercase"
                >
                  SBA Component
                </label>
                <select
                  id="single-sba-task-select"
                  value={effectiveTaskOption}
                  onChange={(e) => onSelectTaskOption(e.target.value)}
                  className="border-border-strong bg-input text-main w-full rounded-lg border px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                >
                  {activeTasks.map((task) => (
                    <option key={task.name} value={task.name}>
                      {task.name} (/{task.maxScore})
                    </option>
                  ))}
                  <option value={CREATE_NEW_TASK_VALUE}>+ Create New SBA Task...</option>
                </select>
              </div>

              {!isCreatingSingleTask && activeSingleTask && studentCount > 0 && (
                <div className="flex justify-start sm:justify-end">
                  <button
                    type="button"
                    onClick={onExportSingleComponent}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export {activeSingleTask.name} (CSV)
                  </button>
                </div>
              )}
            </div>

            {isCreatingSingleTask && (
              <div className="space-y-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 dark:border-indigo-800/60 dark:bg-indigo-950/35">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_0.7fr_1fr] sm:items-center">
                  <input
                    type="text"
                    aria-label="New SBA Task Name"
                    value={newSingleTaskName}
                    onChange={(e) => onNewSingleTaskNameChange(e.target.value)}
                    placeholder="e.g. English Summary Group Work"
                    className="bg-input text-main h-10 rounded-lg border border-indigo-200 px-2.5 text-xs font-bold outline-none focus:border-indigo-500 sm:h-9 dark:border-indigo-700"
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    aria-label="New SBA Max Score"
                    value={newSingleTaskMax}
                    onChange={(e) => onNewSingleTaskMaxChange(e.target.value)}
                    placeholder="Max (15)"
                    className={`bg-input text-main h-10 rounded-lg border px-2.5 text-center text-xs font-bold outline-none focus:border-indigo-500 sm:h-9 ${
                      isSingleTaskMaxValid
                        ? "border-indigo-200 dark:border-indigo-700"
                        : "border-red-400 text-red-700 dark:border-red-500 dark:text-red-400"
                    }`}
                  />
                  <select
                    aria-label="New SBA Category"
                    value={newSingleTaskCategory}
                    onChange={(e) =>
                      onNewSingleTaskCategoryChange(e.target.value as AssessmentCategory)
                    }
                    className="bg-input text-main h-10 rounded-lg border border-indigo-200 px-2.5 text-xs font-semibold outline-none sm:h-9 dark:border-indigo-700"
                  >
                    <option value="CAT">CAT (Test)</option>
                    <option value="GROUP">Group Work</option>
                    <option value="PROJECT">Project</option>
                    <option value="HOMEWORK">Homework</option>
                  </select>
                </div>
                {!isSingleTaskMaxValid && (
                  <p
                    className="text-[11px] font-semibold text-red-700 dark:text-red-400"
                    role="alert"
                  >
                    Max score must be between 1 and 100.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Template Download & CSV Upload Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-purple-900 dark:text-purple-200">
            {activeMode === "SINGLE_COMPONENT"
              ? activeSingleTask
                ? `2-column sheet: Name, ${activeSingleTask.name} (/${activeSingleTask.maxScore})`
                : "Enter a new SBA task name above to generate its 2-column template."
              : activeMode === "EXAM_ONLY"
                ? "2-column end-of-term sheet: Name, Exam (/100). Keeps SBA tasks untouched."
                : `Expected columns: Name${
                    activeTasks.length > 0
                      ? `, ${activeTasks.map((t) => `${t.name} (/${t.maxScore})`).join(", ")}, Exam (/100)`
                      : `, Class Score (/${classScoreMax}), Exam (/100)`
                  }`}
          </p>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="bg-surface inline-flex items-center gap-1.5 rounded-lg border border-purple-300 px-3 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/60"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template (CSV)
            </button>
            <label className="focus-within:ring-primary-text focus-within:ring-offset-surface inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800 focus-within:ring-2 focus-within:ring-offset-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Upload CSV</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                onChange={onFileUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </div>

      {!isPreviewing && (
        <div className="space-y-3">
          <p className="text-secondary text-xs">
            Paste rows directly from Excel or Google Sheets (include the header row), or upload a
            completed CSV template above. Blank cells leave existing scores intact.
          </p>
          <Textarea
            aria-label="Paste subject scores or CSV rows"
            value={rawText}
            onChange={(e) => onRawTextChange(e.target.value)}
            placeholder={
              activeMode === "EXAM_ONLY"
                ? "Name\tExam (/100)\nKwame Mensah\t78\nAma Serwaa\t85"
                : activeMode === "SINGLE_COMPONENT"
                  ? `Name\t${activeSingleTask?.name || "English Summary Group Work"} (/${
                      activeSingleTask?.maxScore || 15
                    })\nKwame Mensah\t13\nAma Serwaa\t14`
                  : `Name\t${activeTasks[0]?.name || "Science Project (/20)"}\tExam\nKwame Mensah\t16\t78\nAma Serwaa\t18\t85`
            }
            className="h-44 font-mono text-xs sm:h-52"
          />
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            disabled={
              !rawText.trim() ||
              (activeMode === "SINGLE_COMPONENT" && (!activeSingleTask || !isSingleTaskMaxValid))
            }
            onClick={onStartPreview}
          >
            Preview &amp; Validate Scores
          </Button>
        </div>
      )}
    </>
  );
}
