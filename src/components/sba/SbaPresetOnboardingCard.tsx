import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calculator, CheckCircle2, Copy, Plus, Sparkles } from "lucide-react";
import type { ClassScoreComponentConfig } from "../../types";
import { SBA_PRESETS } from "../../utils/sbaReconciliation";
import { Button } from "../ui";

interface SbaPresetOnboardingCardProps {
  activeSubject: string;
  defaultSubjects: string[];
  subjectComponentMap: Record<string, ClassScoreComponentConfig[]>;
  classScoreMax: number;
  disabled?: boolean;
  onApplyPreset: (
    tasks: ClassScoreComponentConfig[],
    applyToAllSubjects: boolean,
    presetLabel: string,
  ) => void;
  onCreateCustomTask: () => void;
}

export function SbaPresetOnboardingCard({
  activeSubject,
  defaultSubjects,
  subjectComponentMap,
  classScoreMax,
  disabled = false,
  onApplyPreset,
  onCreateCustomTask,
}: SbaPresetOnboardingCardProps) {
  const [applyToAll, setApplyToAll] = useState(true);

  const otherConfiguredEntry = Object.entries(subjectComponentMap).find(
    ([subName, tasks]) => subName !== activeSubject && tasks.length > 0,
  );

  return (
    <div className="border-border bg-surface space-y-5 rounded-xl border p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-purple-100 p-2.5 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-main text-base font-bold">
              <span data-record="true">Set up SBA tasks for</span> {activeSubject}
            </h2>
            <p className="text-muted mt-0.5 text-xs leading-relaxed" data-record="true">
              Pick a Ghanaian GES preset below to start recording continuous assessment marks right
              away, or create your own custom task.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={onCreateCustomTask}
          className="w-full shrink-0 gap-1.5 sm:w-auto"
          data-record="true"
        >
          <Plus className="h-4 w-4" />
          <span>Create Custom Task</span>
        </Button>
      </div>

      {defaultSubjects.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200/80 bg-purple-50/70 px-3.5 py-2.5 dark:border-purple-800/60 dark:bg-purple-950/35">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-purple-950 dark:text-purple-200">
            <input
              type="checkbox"
              checked={applyToAll}
              disabled={disabled}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="border-border-strong h-4 w-4 rounded text-purple-600"
            />
            <span>
              Apply to all {defaultSubjects.length} subjects
            </span>
          </label>
          <span className="text-[11px] text-purple-700 dark:text-purple-300" data-record="true">
            You can customize individual subjects anytime
          </span>
        </div>
      )}

      {otherConfiguredEntry && (
        <div className="border-border bg-subtle/60 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5">
          <p className="text-secondary text-xs">
            Already configured tasks for <strong>{otherConfiguredEntry[0]}</strong> (
            {otherConfiguredEntry[1].length} tasks).
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onApplyPreset(
                otherConfiguredEntry[1],
                applyToAll,
                `tasks from ${otherConfiguredEntry[0]}`,
              )
            }
            className="w-full gap-1.5 sm:w-auto"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy tasks from {otherConfiguredEntry[0]}</span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SBA_PRESETS.map((preset) => {
          const totalRaw = preset.tasks.reduce((sum, task) => sum + task.maxScore, 0);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onApplyPreset(preset.tasks, applyToAll, preset.name)}
              className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                preset.recommended
                  ? "border-purple-300 bg-purple-50/50 hover:border-purple-500 hover:bg-purple-50 dark:border-purple-700/80 dark:bg-purple-950/30 dark:hover:border-purple-500 dark:hover:bg-purple-950/50"
                  : "border-border bg-surface hover:border-blue-400 hover:bg-subtle/60"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-main text-sm font-bold" data-record="true">
                    {preset.name}
                  </span>
                  {preset.recommended && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white"
                      data-record="true"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-muted mt-1 text-xs leading-relaxed" data-record="true">
                  {preset.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {preset.tasks.map((task) => (
                    <span
                      key={task.name}
                      className="border-border bg-surface text-secondary rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                    >
                      {task.name} <span className="text-muted">/{task.maxScore}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-border-subtle mt-4 flex items-center justify-between border-t pt-2.5 text-xs font-bold">
                <span className="text-muted tabular-nums">
                  /{totalRaw} raw → /{classScoreMax} Class
                </span>
                <span className="text-primary-text group-hover:underline" data-record="true">
                  Use Preset →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-border bg-subtle/50 flex flex-col gap-2 rounded-lg border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-secondary">
          <Calculator className="text-muted h-4 w-4 shrink-0" />
          <span data-record="true">
            Prefer entering final Class Scores (/{classScoreMax}) directly without tasks? Enter
            them anytime on Home.
          </span>
        </div>
        <Link
          to="/"
          className="text-primary-text shrink-0 font-bold hover:underline"
          data-record="true"
        >
          Go to Home →
        </Link>
      </div>
    </div>
  );
}
