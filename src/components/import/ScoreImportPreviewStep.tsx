import { AlertTriangle, CheckCircle, PlusCircle, ShieldAlert } from "lucide-react";
import type { AssessmentCategory } from "../../types";
import type { NewSbaColumnOverride, SbaConflictPolicy } from "../../utils/csvImport";
import { Button } from "../ui/Button";
import type { DetectedNewScoreColumn, ParsedScoreImportResult } from "./scoreImportApply";

interface ScoreImportPreviewStepProps {
  parsedResult: ParsedScoreImportResult | null;
  activeSubject: string;
  classScoreMax: number;
  examScoreMax: number;
  createUnmatched: boolean;
  onCreateUnmatchedChange: (checked: boolean) => void;
  getOverrideForDetected: (col: DetectedNewScoreColumn) => NewSbaColumnOverride;
  onUpdateNewColOverride: (
    col: DetectedNewScoreColumn,
    patch: Partial<NewSbaColumnOverride>,
  ) => void;
  conflictPolicy: SbaConflictPolicy;
  onConflictPolicyChange: (policy: SbaConflictPolicy) => void;
  allowClampExceeding: boolean;
  onAllowClampExceedingChange: (checked: boolean) => void;
  onBack: () => void;
  onApplyScores: () => void;
}

export function ScoreImportPreviewStep({
  parsedResult,
  activeSubject,
  classScoreMax,
  examScoreMax,
  createUnmatched,
  onCreateUnmatchedChange,
  getOverrideForDetected,
  onUpdateNewColOverride,
  conflictPolicy,
  onConflictPolicyChange,
  allowClampExceeding,
  onAllowClampExceedingChange,
  onBack,
  onApplyScores,
}: ScoreImportPreviewStepProps) {
  return (
    <div className="space-y-3">
      {parsedResult && parsedResult.rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-900 dark:border dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              <span>
                Matched <strong>{parsedResult.matchedStudentCount}</strong> of{" "}
                <strong>{parsedResult.rows.length}</strong> row
                {parsedResult.rows.length === 1 ? "" : "s"} •{" "}
                {parsedResult.matchedColumns.join(" | ")}
              </span>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 font-bold">
              <input
                type="checkbox"
                checked={createUnmatched}
                onChange={(e) => onCreateUnmatchedChange(e.target.checked)}
                className="border-border-strong h-3.5 w-3.5 rounded text-purple-600"
              />
              <span>Add unmatched students</span>
            </label>
          </div>

          {parsedResult.unmatchedStudentCount > 0 && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                parsedResult.matchedStudentCount === 0 && !createUnmatched
                  ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>{parsedResult.unmatchedStudentCount}</strong> row
                {parsedResult.unmatchedStudentCount === 1 ? " did" : "s did"} not match any existing
                student in your class.
                {createUnmatched
                  ? " They will be created as new students (existing students will not receive those scores)."
                  : " Unmatched rows will be skipped — verify student names match your roster."}
              </span>
            </div>
          )}

          {/* Newly Detected SBA Components Card (Full Subject mode) */}
          {parsedResult.detectedNewColumns.length > 0 && (
            <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 dark:border-indigo-800/60 dark:bg-indigo-950/35">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                <PlusCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>
                  New SBA Component{parsedResult.detectedNewColumns.length > 1 ? "s" : ""} Detected
                  for {activeSubject}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                These columns aren&apos;t in {activeSubject}&apos;s SBA list yet. Checked items will
                be created in Settings and assigned to every student.
              </p>
              <div className="space-y-2">
                {parsedResult.detectedNewColumns.map((col) => {
                  const ov = getOverrideForDetected(col);
                  return (
                    <div
                      key={col.colIndex}
                      className="bg-surface grid grid-cols-1 gap-2 rounded-lg border border-indigo-200 p-2.5 sm:grid-cols-[auto_1.4fr_0.8fr_1fr] sm:items-center dark:border-indigo-800/60"
                    >
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Create SBA component ${col.rawHeader}`}
                          checked={ov.enabled}
                          onChange={(e) =>
                            onUpdateNewColOverride(col, { enabled: e.target.checked })
                          }
                          className="border-border-strong h-4 w-4 rounded text-indigo-600"
                        />
                        <span className="text-main text-xs font-bold sm:hidden">Create</span>
                      </label>

                      <input
                        type="text"
                        aria-label={`Task name for ${col.rawHeader}`}
                        value={ov.name}
                        disabled={!ov.enabled}
                        onChange={(e) => onUpdateNewColOverride(col, { name: e.target.value })}
                        className="border-border-strong bg-input text-main disabled:bg-subtle rounded border px-2 py-1 text-xs font-bold"
                      />

                      <div className="flex items-center gap-1">
                        <span className="text-muted text-[10px] font-bold">Max /</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          aria-label={`Max score for ${col.rawHeader}`}
                          value={ov.maxScore}
                          disabled={!ov.enabled}
                          onChange={(e) =>
                            onUpdateNewColOverride(col, {
                              maxScore: Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                            })
                          }
                          className="border-border-strong bg-input text-main disabled:bg-subtle w-16 rounded border px-2 py-1 text-center text-xs font-bold"
                        />
                      </div>

                      <select
                        aria-label={`Category for ${col.rawHeader}`}
                        value={ov.category}
                        disabled={!ov.enabled}
                        onChange={(e) =>
                          onUpdateNewColOverride(col, {
                            category: e.target.value as AssessmentCategory,
                          })
                        }
                        className="border-border-strong bg-input text-main disabled:bg-subtle rounded border px-2 py-1 text-xs font-semibold"
                      >
                        <option value="CAT">CAT (Test)</option>
                        <option value="PROJECT">Project</option>
                        <option value="GROUP">Group Work</option>
                        <option value="HOMEWORK">Homework</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Existing Score Conflict Policy */}
          {parsedResult.conflictCount > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {parsedResult.conflictCount} existing score
                  {parsedResult.conflictCount === 1 ? "" : "s"} already recorded for {activeSubject}
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                  <input
                    type="radio"
                    name="conflictPolicy"
                    checked={conflictPolicy === "OVERWRITE"}
                    onChange={() => onConflictPolicyChange("OVERWRITE")}
                    className="text-amber-600"
                  />
                  <span>Overwrite existing scores (show old → new)</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                  <input
                    type="radio"
                    name="conflictPolicy"
                    checked={conflictPolicy === "KEEP_EXISTING"}
                    onChange={() => onConflictPolicyChange("KEEP_EXISTING")}
                    className="text-amber-600"
                  />
                  <span>Keep existing scores (fill blank / 0 only)</span>
                </label>
              </div>
            </div>
          )}

          {parsedResult.duplicateRowCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs text-orange-900 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
              <span>
                Detected {parsedResult.duplicateRowCount} duplicate student row
                {parsedResult.duplicateRowCount > 1 ? "s" : ""} in your sheet.
              </span>
            </div>
          )}

          {parsedResult.headerMismatchWarning && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{parsedResult.headerMismatchWarning}</span>
            </div>
          )}

          {parsedResult.overMaxCount > 0 && (
            <div
              role="alert"
              className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-950 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
            >
              <div className="flex items-start gap-2 font-bold">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>
                  {parsedResult.overMaxCount} score
                  {parsedResult.overMaxCount === 1 ? " exceeds" : "s exceed"} the maximum allowed
                  limit. Fix the out-of-range score
                  {parsedResult.overMaxCount === 1 ? "" : "s"} in your sheet or enable clamping
                  below.
                </span>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-red-900 dark:text-red-200">
                <input
                  type="checkbox"
                  checked={allowClampExceeding}
                  onChange={(e) => onAllowClampExceedingChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-red-300 text-red-600 dark:border-red-700"
                />
                <span>Clamp scores above maximum to allowed limit</span>
              </label>
            </div>
          )}

          <div className="border-border max-h-60 overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-secondary sticky top-0 text-[10px] font-bold uppercase">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Details / Diff</th>
                  <th className="px-3 py-2 text-center">Class (/{classScoreMax})</th>
                  <th className="px-3 py-2 text-center">Exam (/{examScoreMax})</th>
                  <th className="px-3 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-border-subtle bg-surface divide-y">
                {parsedResult.rows.map((row, idx) => {
                  const total = row.computedClassScore + row.effectiveExamWeighted;
                  return (
                    <tr
                      key={idx}
                      className={row.hasOverMaxError ? "bg-red-50/60 dark:bg-red-950/35" : undefined}
                    >
                      <td className="text-main px-3 py-2 font-bold">
                        {row.studentName}
                        {row.isDuplicateInImport && (
                          <span className="ml-1.5 rounded bg-orange-100 px-1 py-0.5 text-[9px] font-bold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                            Duplicate
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.isNewStudent ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {createUnmatched ? "New Student" : "Skipped"}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Matched
                          </span>
                        )}
                      </td>
                      <td className="text-secondary px-3 py-2 text-[11px]">
                        {row.componentScores.map((c) => (
                          <span key={c.name} className="mr-2 inline-block">
                            <strong>{c.name}:</strong>{" "}
                            {c.clamped ? (
                              <span className="font-bold text-red-700 dark:text-red-400">
                                {c.rawScore} &gt; /{c.maxScore}!{" "}
                                <span className="text-[10px] font-normal">
                                  (max {c.maxScore})
                                </span>
                              </span>
                            ) : c.isConflict ? (
                              <span className="font-bold text-amber-700 dark:text-amber-400">
                                {conflictPolicy === "KEEP_EXISTING"
                                  ? `${c.existingScore} (kept)`
                                  : `${c.existingScore} → ${c.score}`}
                              </span>
                            ) : (
                              <span>
                                {c.score}/{c.maxScore}
                              </span>
                            )}
                          </span>
                        ))}
                        {row.componentScores.length === 0 && "—"}
                      </td>
                      <td className="text-main px-3 py-2 text-center font-mono font-bold">
                        <div>
                          {row.computedClassScore}
                          {row.hasWarnings && (
                            <span className="ml-1 text-[10px] text-red-600 dark:text-red-400">
                              *
                            </span>
                          )}
                        </div>
                        {row.sbaTaskCount > 0 && (
                          <div className="text-muted text-[10px] font-normal">
                            {row.sbaRawSum}/{row.sbaMaxSum} ({row.sbaTaskCount} task
                            {row.sbaTaskCount === 1 ? "" : "s"})
                          </div>
                        )}
                      </td>
                      <td className="text-main px-3 py-2 text-center font-mono font-bold">
                        {row.examRawScore ? (
                          row.examRawScore.clamped ? (
                            <span className="text-red-700 dark:text-red-400">
                              {row.examRawScore.enteredRaw}% &gt; /100!
                            </span>
                          ) : row.examRawScore.isConflict && conflictPolicy === "OVERWRITE" ? (
                            `${row.examRawScore.existingRaw ?? "?"}% → ${row.examRawScore.raw}%`
                          ) : (
                            `${row.examRawScore.weighted} (${row.examRawScore.raw}%)`
                          )
                        ) : row.existingExamWeighted > 0 ? (
                          <span className="text-muted text-[11px] font-semibold">
                            {row.existingExamWeighted} (kept)
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-primary-text px-3 py-2 text-center font-mono font-black">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
          Could not find valid header + score rows. Ensure row 1 contains headers like{" "}
          <code>Name, Science Project (/20), Exam</code>.
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="flex-1"
          disabled={
            !parsedResult ||
            parsedResult.rows.length === 0 ||
            Boolean(parsedResult.headerMismatchWarning) ||
            parsedResult.matchedColumns.length <= 1 ||
            (parsedResult.overMaxCount > 0 && !allowClampExceeding) ||
            (parsedResult.matchedStudentCount === 0 &&
              (!createUnmatched || parsedResult.unmatchedStudentCount === 0))
          }
          onClick={onApplyScores}
        >
          Apply Scores
        </Button>
      </div>
    </div>
  );
}
