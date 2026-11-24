import { useState } from "react";
import { AlertCircle, Scale, X } from "lucide-react";
import type { ExamType, SchoolSettings, StudentRecord } from "../../types";
import {
  countAffectedStudentsForWeightChange,
  WEIGHT_PRESETS,
} from "../../utils/sbaReconciliation";
import { Button, Input } from "../ui";
import { Modal } from "../ui/Modal";

interface SbaWeightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentRecord[];
  settings: SchoolSettings;
  disabled?: boolean;
  /** Optional exam mode to preselect when opened directly from an exam-mode toggle. */
  initialExamType?: ExamType;
  onApplyWeights: (
    nextClassScoreMax: number,
    nextExamScoreMax: number,
    options: { examType: ExamType; scoreMode: "rescale" | "clamp" },
  ) => void;
}

export function SbaWeightsModal(props: SbaWeightsModalProps) {
  if (!props.isOpen) return null;
  return <SbaWeightsModalContent {...props} />;
}

function SbaWeightsModalContent({
  isOpen,
  onClose,
  students,
  settings,
  disabled = false,
  initialExamType,
  onApplyWeights,
}: SbaWeightsModalProps) {
  const defaultTermlyClassMax = settings.level === "SHS" ? 30 : 50;
  const [examType, setExamType] = useState<ExamType>(
    initialExamType ?? settings.examType ?? "TERMLY",
  );
  const [classMax, setClassMax] = useState<number>(
    settings.examType === "MOCK" ? defaultTermlyClassMax : settings.classScoreMax,
  );
  const [examMax, setExamMax] = useState<number>(
    settings.examType === "MOCK" ? 100 - defaultTermlyClassMax : settings.examScoreMax,
  );
  const [scoreMode, setScoreMode] = useState<"rescale" | "clamp">("rescale");

  const targetClassMax = examType === "MOCK" ? 0 : classMax;
  const targetExamMax = examType === "MOCK" ? 100 : examMax;

  const affectedStudentsCount = countAffectedStudentsForWeightChange(
    students,
    settings.classScoreMax,
    settings.examScoreMax,
    targetClassMax,
    targetExamMax,
  );

  const handleClassChange = (value: string) => {
    const raw = Number(value);
    const clamped =
      value === "" || !Number.isFinite(raw) ? 0 : Math.min(100, Math.max(0, Math.round(raw)));
    setClassMax(clamped);
    setExamMax(100 - clamped);
  };

  const handleExamChange = (value: string) => {
    const raw = Number(value);
    const clamped =
      value === "" || !Number.isFinite(raw) ? 0 : Math.min(100, Math.max(0, Math.round(raw)));
    setExamMax(clamped);
    setClassMax(100 - clamped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onApplyWeights(targetClassMax, targetExamMax, { examType, scoreMode });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} className="max-w-lg">
      <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col overflow-hidden">
        <div className="border-border-subtle flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-main text-base font-bold" data-record="true">
                Grading Weights &amp; Exam Mode
              </h3>
              <p className="text-muted text-xs" data-record="true">
                Choose how Class Work and Final Exam combine to 100%.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close weights modal"
            className="text-muted hover:bg-subtle hover:text-main shrink-0 rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3.5 sm:p-5">
          {/* Exam Type Switcher */}
          <div>
            <label className="text-muted mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Exam Mode
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(["TERMLY", "MOCK"] as ExamType[]).map((modeOption) => {
                const isSelected = examType === modeOption;
                return (
                  <button
                    key={modeOption}
                    type="button"
                    disabled={disabled}
                    onClick={() => setExamType(modeOption)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? modeOption === "MOCK"
                          ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                          : "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200"
                        : "border-border bg-surface text-secondary hover:bg-subtle"
                    }`}
                  >
                    <span className="block text-sm font-bold">
                      {modeOption === "TERMLY" ? "Termly (SBA + Exam)" : "Mock Exam (0/100)"}
                    </span>
                    <span className="text-muted block text-[11px]">
                      {modeOption === "TERMLY"
                        ? "Continuous assessment + exam"
                        : "100% exam score only"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {examType === "TERMLY" ? (
            <>
              {/* One-Tap GES Weight Presets */}
              <div>
                <label className="text-muted mb-1.5 block text-xs font-bold tracking-wide uppercase">
                  Standard Presets
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {WEIGHT_PRESETS.map((preset) => {
                    const active =
                      classMax === preset.classScoreMax && examMax === preset.examScoreMax;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setClassMax(preset.classScoreMax);
                          setExamMax(preset.examScoreMax);
                        }}
                        className={`flex flex-col justify-center rounded-xl border px-1.5 py-2 text-center transition-all sm:px-2.5 ${
                          active
                            ? "border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20 dark:bg-purple-950/50 dark:text-purple-200"
                            : "border-border bg-surface text-main hover:bg-subtle"
                        }`}
                      >
                        <span className="block text-sm font-black tabular-nums">
                          {preset.label}
                        </span>
                        <span className="text-muted mt-0.5 line-clamp-2 block text-[10px] leading-tight">
                          {preset.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Inputs */}
              <div className="grid grid-cols-2 items-end gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-800/70 dark:bg-amber-950/30">
                <div className="min-w-0">
                  <Input
                    label="Continuous Assessment %"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    disabled={disabled}
                    value={classMax}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="px-2.5 py-2 text-center font-bold"
                  />
                </div>
                <div className="min-w-0">
                  <Input
                    label="Examination %"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    disabled={disabled}
                    value={examMax}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="px-2.5 py-2 text-center font-bold"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                Mock mode sets weights to <strong>0 / 100</strong>. Your configured SBA tasks and
                raw component marks remain safely saved in storage if you switch back later.
              </p>
            </div>
          )}

          {/* Existing Student Score Handling */}
          {affectedStudentsCount > 0 && (
            <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950 dark:border-blue-800/70 dark:bg-blue-950/35 dark:text-blue-100">
              <p className="font-bold">
                {affectedStudentsCount} student{affectedStudentsCount === 1 ? " has" : "s have"}{" "}
                existing scores affected by this change
              </p>
              <div className="space-y-1.5">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="weightScoreMode"
                    checked={scoreMode === "rescale"}
                    onChange={() => setScoreMode("rescale")}
                    className="mt-0.5 text-blue-600"
                  />
                  <span>
                    <strong>Rescale existing scores proportionally (Recommended)</strong> — SBA-tracked
                    subjects recompute from raw tasks; direct class &amp; exam scores scale cleanly
                    to {targetClassMax}/{targetExamMax}.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="weightScoreMode"
                    checked={scoreMode === "clamp"}
                    onChange={() => setScoreMode("clamp")}
                    className="mt-0.5 text-blue-600"
                  />
                  <span>
                    <strong>Keep current numbers</strong> — SBA subjects still recompute from raw
                    marks; direct/exam scores are capped at the new max ({targetClassMax}/
                    {targetExamMax}).
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="border-border-subtle flex shrink-0 flex-wrap justify-end gap-2 border-t px-3.5 py-3 sm:px-5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={disabled}>
            Apply Grading Split
          </Button>
        </div>
      </form>
    </Modal>
  );
}
