import { AlertCircle, Calculator, Plus, Upload, X } from "lucide-react";
import type { AssessmentCategory } from "../../types";
import { Badge, Button, IconButton, Input } from "../ui";
import { useSettingsForm } from "../../hooks/useSettingsForm";

interface SbaAssessmentSectionProps {
  onImportSubjectScores?: (subject: string) => void;
}

export function SbaAssessmentSection({ onImportSubjectScores }: SbaAssessmentSectionProps = {}) {
  const {
    formData,
    setFormData,
    isPersistenceSuspended,
    newComponentName,
    setNewComponentName,
    newComponentMax,
    setNewComponentMax,
    newComponentCategory,
    setNewComponentCategory,
    addComponent,
    removeComponent,
    addComponentToSubject,
    removeComponentFromSubject,
    assignAllComponentsToAllSubjects,
  } = useSettingsForm();

  const showSbaSetup = formData.examType !== "MOCK";
  const showSubjectAssignment =
    (formData.defaultSubjects || []).length > 0 && (formData.componentLibrary || []).length > 0;

  if (!showSbaSetup && !showSubjectAssignment) {
    return null;
  }

  return (
    <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 space-y-6 border-0 p-0">
      {/* SBA WEIGHTS & TASK LIBRARY — hidden in mock exam mode */}
      {showSbaSetup && (
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          {/* GRADING CONFIG - SBA RENAMED */}
          <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 sm:p-5">
            <h3
              className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-yellow-900 uppercase"
              data-record="true"
            >
              <AlertCircle className="h-4 w-4" /> Assessment Weights (SBA System)
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <Input
                label="Continuous Assessment %"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={formData.classScoreMax || ""}
                onChange={(e) => {
                  const classScore = Number(e.target.value) || 0;
                  const examScore = 100 - classScore;
                  setFormData({
                    ...formData,
                    classScoreMax: classScore,
                    examScoreMax: examScore,
                  });
                }}
                className="border-yellow-300 bg-white text-center font-bold focus:border-yellow-500 focus:ring-yellow-300"
                placeholder="50"
              />
              <Input
                label="Examination %"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={formData.examScoreMax || ""}
                onChange={(e) => {
                  const examScore = Number(e.target.value) || 0;
                  const classScore = 100 - examScore;
                  setFormData({
                    ...formData,
                    classScoreMax: classScore,
                    examScoreMax: examScore,
                  });
                }}
                className="border-yellow-300 bg-white text-center font-bold focus:border-yellow-500 focus:ring-yellow-300"
                placeholder="50"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-yellow-800">
              <span className="font-bold">Total must equal 100%.</span> (Current:{" "}
              {(formData.classScoreMax || 0) + (formData.examScoreMax || 0)}%)
            </p>
          </div>

          {/* CLASS SCORE COMPONENTS - SBA RENAMED - RESPONSIVE FIXED */}
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-purple-700" />
              <h3
                className="text-xs font-bold tracking-wider text-purple-900 uppercase"
                data-record="true"
              >
                SBA Task Library
              </h3>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-purple-700">
              Define standard SBA tasks (e.g. Class Tests, Group Works, Projects) to use across
              subjects.
            </p>

            {/* RESPONSIVE ADD COMPONENT INPUTS */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              {/* 1. Category Selector */}
              <div className="w-full sm:w-32">
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-purple-900 uppercase">
                  Type
                </label>
                <select
                  value={newComponentCategory}
                  onChange={(e) => setNewComponentCategory(e.target.value as AssessmentCategory)}
                  className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="CAT">CAT (Test)</option>
                  <option value="GROUP">Group Work</option>
                  <option value="PROJECT">Project</option>
                  <option value="HOMEWORK">Homework</option>
                </select>
              </div>

              {/* 2. Name Input */}
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-purple-900 uppercase">
                  Task Name
                </label>
                <input
                  type="text"
                  value={newComponentName}
                  onChange={(e) => setNewComponentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("max-score-input")?.focus();
                    }
                  }}
                  className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="e.g. Natural Science Project"
                />
              </div>

              {/* 3. Max Score & Button - RESPONSIVE FIXED */}
              <div className="flex w-full gap-2 sm:w-auto">
                <div className="flex-1 sm:w-24 sm:flex-none">
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-purple-900 uppercase">
                    Max Score
                  </label>
                  <input
                    id="max-score-input"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    value={newComponentMax}
                    onChange={(e) => setNewComponentMax(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addComponent();
                      }
                    }}
                    className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-center text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="15"
                  />
                </div>

                <div className="flex-none">
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-transparent uppercase">
                    Add
                  </label>
                  <Button
                    type="button"
                    onClick={addComponent}
                    variant="primary"
                    size="sm"
                    className="h-10 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Component List */}
            {(formData.componentLibrary || []).length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-purple-800">
                  {(formData.componentLibrary || []).length} Task
                  {(formData.componentLibrary || []).length !== 1 ? "s" : ""} Defined
                </p>
                <div className="flex flex-wrap gap-2">
                  {(formData.componentLibrary || []).map((config) => (
                    <div
                      key={config.name}
                      className="flex items-center gap-3 rounded-lg border border-purple-200 bg-white py-2 pr-2 pl-3 text-sm shadow-sm"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold text-gray-800">
                          {config.name}
                        </span>
                        <span className="text-[10px] font-bold tracking-wide text-purple-500 uppercase">
                          {config.category === "CAT" ? "CLASS TEST" : config.category}
                        </span>
                      </div>
                      <Badge variant="primary" size="sm" className="ml-1">
                        /{config.maxScore}
                      </Badge>
                      <IconButton
                        type="button"
                        onClick={() => removeComponent(config.name)}
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${config.name}`}
                      >
                        <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-purple-200 bg-white p-4 text-center text-xs text-purple-400">
                No SBA tasks defined. Add tasks (e.g. CAT 1, Group Work) to use with subjects.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CARD 5: SUBJECT COMPONENT ASSIGNMENT - SBA RENAMED */}
      {showSubjectAssignment && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                className="text-base font-bold tracking-wide text-gray-800 uppercase"
                data-record="true"
              >
                Subject Assessment Config
              </h2>
              <p className="text-muted text-xs">Assign specific SBA tasks to each subject.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={assignAllComponentsToAllSubjects}
              data-record="true"
            >
              Assign All Tasks to All Subjects
            </Button>
          </div>

          <div className="space-y-4">
            {(formData.defaultSubjects || []).map((subject) => {
              const assignedComponents = formData.subjectComponentMap?.[subject] || [];
              const totalRawMax = assignedComponents.reduce((sum, comp) => sum + comp.maxScore, 0);
              const availableComponents = (formData.componentLibrary || []).filter(
                (lib) => !assignedComponents.some((assigned) => assigned.name === lib.name),
              );

              return (
                <div key={subject} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">{subject}</h3>
                      {assignedComponents.length > 0 ? (
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                          {assignedComponents.length} task
                          {assignedComponents.length === 1 ? "" : "s"} • /{totalRawMax} raw →{" "}
                          {formData.classScoreMax || 0}% Class
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No tasks assigned</span>
                      )}
                    </div>

                    {onImportSubjectScores && showSbaSetup && (
                      <button
                        type="button"
                        onClick={() => onImportSubjectScores(subject)}
                        aria-label={`Import scores for ${subject}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-xs font-bold text-purple-700 shadow-2xs transition-colors hover:bg-purple-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Import Scores</span>
                      </button>
                    )}
                  </div>

                  {assignedComponents.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {assignedComponents.map((comp) => (
                        <div
                          key={comp.name}
                          className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm sm:items-center"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-bold text-gray-700">
                              {comp.name}
                            </span>
                            <span className="text-[10px] font-bold tracking-wide text-blue-500 uppercase">
                              {comp.category === "CAT" ? "TEST" : comp.category}
                            </span>
                          </div>
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                            /{comp.maxScore}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeComponentFromSubject(subject, comp.name)}
                            className="rounded p-0.5 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {availableComponents.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {availableComponents.map((comp) => (
                        <button
                          key={comp.name}
                          type="button"
                          onClick={() => addComponentToSubject(subject, comp)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {comp.name}
                          <span className="text-xs text-gray-400">/{comp.maxScore}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </fieldset>
  );
}
