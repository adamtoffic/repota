import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Edit2, Plus, Sparkles, Trash2, X } from "lucide-react";
import type {
  AssessmentCategory,
  ClassScoreComponentConfig,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import {
  areSubjectsUsingUniformTasks,
  impactOfSbaTaskChange,
  normalizeTaskKey,
  SBA_PRESETS,
} from "../../utils/sbaReconciliation";
import { Button } from "../ui";
import { Modal } from "../ui/Modal";

export type SbaTaskManagerInitialAction =
  | { mode: "manage" | "add" }
  | { mode: "edit"; taskName: string };

interface SbaTaskManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: string;
  defaultSubjects: string[];
  students: StudentRecord[];
  settings: SchoolSettings;
  disabled?: boolean;
  initialAction?: SbaTaskManagerInitialAction | null;
  onCommitConfig: (
    nextMap: Record<string, ClassScoreComponentConfig[]>,
    options: {
      renamedTasks?: Record<string, string>;
      onClearTasks?: "preserve_class_score" | "zero";
      toastMessage: string;
    },
  ) => void;
}

interface PendingCommit {
  title: string;
  warning: string;
  nextMap: Record<string, ClassScoreComponentConfig[]>;
  renamedTasks?: Record<string, string>;
  onClearTasks?: "preserve_class_score" | "zero";
  toastMessage: string;
}

const CATEGORY_OPTIONS: Array<{ value: AssessmentCategory; label: string; badge: string }> = [
  { value: "CAT", label: "CAT (Test)", badge: "CAT" },
  { value: "GROUP", label: "Group Work", badge: "GROUP" },
  { value: "PROJECT", label: "Project", badge: "PROJECT" },
  { value: "HOMEWORK", label: "Homework", badge: "HOMEWORK" },
];

export function SbaTaskManagerModal(props: SbaTaskManagerModalProps) {
  if (!props.isOpen) return null;
  return <SbaTaskManagerModalContent {...props} />;
}

function SbaTaskManagerModalContent({
  isOpen,
  onClose,
  activeSubject,
  defaultSubjects,
  students,
  settings,
  disabled = false,
  initialAction = null,
  onCommitConfig,
}: SbaTaskManagerModalProps) {
  const currentMap = settings.subjectComponentMap ?? {};
  const uniformState = areSubjectsUsingUniformTasks(defaultSubjects, settings.subjectComponentMap);
  const initialScope: "ALL" | "SUBJECT" =
    defaultSubjects.length <= 1 || (!uniformState.isUniform && activeSubject) ? "SUBJECT" : "ALL";
  const initialTasks: ClassScoreComponentConfig[] =
    initialScope === "SUBJECT"
      ? currentMap[activeSubject] ?? []
      : uniformState.isUniform
        ? uniformState.sharedTasks
        : (currentMap[activeSubject]?.length
            ? currentMap[activeSubject]
            : Object.values(currentMap).find((list) => list.length > 0)) ?? [];
  const initialEditTask =
    initialAction?.mode === "edit"
      ? initialTasks.find(
          (t) => normalizeTaskKey(t.name) === normalizeTaskKey(initialAction.taskName),
        )
      : undefined;

  const [scope, setScope] = useState<"ALL" | "SUBJECT">(initialScope);

  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState("15");
  const [newCategory, setNewCategory] = useState<AssessmentCategory>("CAT");
  const [formError, setFormError] = useState<string | null>(null);
  const newNameInputRef = useRef<HTMLInputElement | null>(null);

  const [editingTaskName, setEditingTaskName] = useState<string | null>(
    () => initialEditTask?.name ?? null,
  );
  const [editName, setEditName] = useState(() => initialEditTask?.name ?? "");
  const [editMax, setEditMax] = useState(() =>
    initialEditTask ? String(initialEditTask.maxScore) : "",
  );
  const [editCategory, setEditCategory] = useState<AssessmentCategory>(
    () => initialEditTask?.category ?? "CAT",
  );
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingCommit, setPendingCommit] = useState<PendingCommit | null>(null);

  useEffect(() => {
    if (initialAction?.mode === "add") {
      newNameInputRef.current?.focus();
    }
  }, [initialAction?.mode]);

  const targetSubjects =
    scope === "ALL"
      ? defaultSubjects.length > 0
        ? defaultSubjects
        : [activeSubject]
      : [activeSubject];

  const currentTasks: ClassScoreComponentConfig[] =
    scope === "SUBJECT"
      ? currentMap[activeSubject] ?? []
      : uniformState.isUniform
        ? uniformState.sharedTasks
        : (currentMap[activeSubject]?.length
            ? currentMap[activeSubject]
            : Object.values(currentMap).find((list) => list.length > 0)) ?? [];

  const isSubjectCustomized =
    defaultSubjects.length > 1 && !uniformState.isUniform && scope === "SUBJECT";

  const otherSharedTasks = Object.entries(currentMap).find(
    ([subName, list]) => subName !== activeSubject && list.length > 0,
  );

  const buildNextMapForTargets = (
    tasks: ClassScoreComponentConfig[],
    subjectsToSet = targetSubjects,
  ): Record<string, ClassScoreComponentConfig[]> => {
    const nextMap: Record<string, ClassScoreComponentConfig[]> = { ...currentMap };
    for (const sub of subjectsToSet) {
      if (tasks.length === 0) {
        delete nextMap[sub];
      } else {
        nextMap[sub] = tasks.map((task) => ({ ...task }));
      }
    }
    return nextMap;
  };

  const commitOrConfirm = (
    commit: PendingCommit,
    affectedStudentCount: number,
    affectedScoreCount: number,
  ) => {
    if (affectedStudentCount > 0) {
      setPendingCommit({
        ...commit,
        warning: `${commit.warning} This affects ${affectedScoreCount} recorded score${
          affectedScoreCount === 1 ? "" : "s"
        } across ${affectedStudentCount} student${affectedStudentCount === 1 ? "" : "s"}.`,
      });
      return;
    }

    onCommitConfig(commit.nextMap, {
      renamedTasks: commit.renamedTasks,
      onClearTasks: commit.onClearTasks,
      toastMessage: commit.toastMessage,
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setFormError(null);

    const trimmed = newName.trim();
    const parsedMax = Number(newMax);
    if (!trimmed) {
      setFormError("Please enter a task name.");
      return;
    }
    if (!newMax.trim() || !Number.isFinite(parsedMax) || parsedMax < 1 || parsedMax > 100) {
      setFormError("Max score must be between 1 and 100.");
      return;
    }
    if (currentTasks.some((t) => normalizeTaskKey(t.name) === normalizeTaskKey(trimmed))) {
      setFormError(`"${trimmed}" already exists in this list.`);
      return;
    }

    const nextTasks: ClassScoreComponentConfig[] = [
      ...currentTasks,
      { name: trimmed, maxScore: Math.round(parsedMax), category: newCategory },
    ];
    const nextMap = buildNextMapForTargets(nextTasks);

    const impact =
      scope === "ALL" && !uniformState.isUniform
        ? impactOfSbaTaskChange(students, targetSubjects, {
            type: "replace_all",
            nextTasks,
          })
        : { affectedStudentCount: 0, affectedScoreCount: 0 };

    commitOrConfirm(
      {
        title: "Apply shared task list?",
        warning: "Applying this shared task list will overwrite subject overrides.",
        nextMap,
        toastMessage: `Added "${trimmed}"`,
      },
      impact.affectedStudentCount,
      impact.affectedScoreCount,
    );

    if (impact.affectedStudentCount === 0) {
      setNewName("");
      setNewMax("15");
      setNewCategory("CAT");
    }
  };

  const startEditing = (task: ClassScoreComponentConfig) => {
    setEditingTaskName(task.name);
    setEditName(task.name);
    setEditMax(String(task.maxScore));
    setEditCategory(task.category ?? "CAT");
    setEditError(null);
  };

  const handleSaveEdit = (original: ClassScoreComponentConfig) => {
    if (disabled) return;
    setEditError(null);

    const trimmed = editName.trim();
    const parsedMax = Number(editMax);
    if (!trimmed) {
      setEditError("Task name is required.");
      return;
    }
    if (!editMax.trim() || !Number.isFinite(parsedMax) || parsedMax < 1 || parsedMax > 100) {
      setEditError("Max score must be 1–100.");
      return;
    }

    const collision = currentTasks.some(
      (t) =>
        normalizeTaskKey(t.name) !== normalizeTaskKey(original.name) &&
        normalizeTaskKey(t.name) === normalizeTaskKey(trimmed),
    );
    if (collision) {
      setEditError(`"${trimmed}" already exists.`);
      return;
    }

    const nextMax = Math.round(parsedMax);
    const nextTasks = currentTasks.map((t) =>
      normalizeTaskKey(t.name) === normalizeTaskKey(original.name)
        ? { name: trimmed, maxScore: nextMax, category: editCategory }
        : t,
    );

    const renamedTasks =
      normalizeTaskKey(original.name) !== normalizeTaskKey(trimmed)
        ? { [original.name]: trimmed }
        : undefined;

    const shrinkImpact =
      nextMax < original.maxScore
        ? impactOfSbaTaskChange(students, targetSubjects, {
            type: "shrink_max",
            taskName: original.name,
            newMaxScore: nextMax,
          })
        : { affectedStudentCount: 0, affectedScoreCount: 0 };

    const uniformImpact =
      scope === "ALL" && !uniformState.isUniform
        ? impactOfSbaTaskChange(students, targetSubjects, {
            type: "replace_all",
            nextTasks,
          })
        : { affectedStudentCount: 0, affectedScoreCount: 0 };

    const totalAffectedStudents = Math.max(
      shrinkImpact.affectedStudentCount,
      uniformImpact.affectedStudentCount,
    );
    const totalAffectedScores = Math.max(
      shrinkImpact.affectedScoreCount,
      uniformImpact.affectedScoreCount,
    );

    commitOrConfirm(
      {
        title: `Update "${original.name}"?`,
        warning:
          shrinkImpact.affectedStudentCount > 0
            ? `Lowering the max score to /${nextMax} will clamp higher scores.`
            : "Updating the shared list will overwrite subject overrides.",
        nextMap: buildNextMapForTargets(nextTasks),
        renamedTasks,
        toastMessage: `Updated "${trimmed}"`,
      },
      totalAffectedStudents,
      totalAffectedScores,
    );

    if (totalAffectedStudents === 0) {
      setEditingTaskName(null);
    }
  };

  const handleDeleteTask = (taskName: string) => {
    if (disabled) return;
    const nextTasks = currentTasks.filter(
      (t) => normalizeTaskKey(t.name) !== normalizeTaskKey(taskName),
    );
    const impact = impactOfSbaTaskChange(students, targetSubjects, {
      type: "delete_task",
      taskName,
    });

    commitOrConfirm(
      {
        title: `Remove "${taskName}"?`,
        warning: `Removing "${taskName}" will delete student marks entered for this task${
          nextTasks.length === 0 ? " (existing total class scores will be preserved)" : ""
        }.`,
        nextMap: buildNextMapForTargets(nextTasks),
        onClearTasks: "preserve_class_score",
        toastMessage: `Removed "${taskName}"`,
      },
      impact.affectedStudentCount,
      impact.affectedScoreCount,
    );
  };

  const handleApplyPreset = (presetName: string, presetTasks: ClassScoreComponentConfig[]) => {
    if (disabled) return;
    const impact = impactOfSbaTaskChange(students, targetSubjects, {
      type: "replace_all",
      nextTasks: presetTasks,
    });

    commitOrConfirm(
      {
        title: `Switch to ${presetName}?`,
        warning: `Applying "${presetName}" removes or clamps mismatched task marks.`,
        nextMap: buildNextMapForTargets(presetTasks),
        toastMessage: `Applied ${presetName}`,
      },
      impact.affectedStudentCount,
      impact.affectedScoreCount,
    );
  };

  const handleClearToDirectMode = () => {
    if (disabled) return;
    const impact = impactOfSbaTaskChange(students, targetSubjects, { type: "clear_tasks" });

    commitOrConfirm(
      {
        title: "Switch to Direct Class Score?",
        warning:
          "Task breakdowns will be removed, while each student's current weighted Class Score stays intact for direct editing.",
        nextMap: buildNextMapForTargets([]),
        onClearTasks: "preserve_class_score",
        toastMessage: "Switched to Direct Class Score mode",
      },
      impact.affectedStudentCount,
      impact.affectedScoreCount,
    );
  };

  const handleApplyCurrentSubjectToAll = () => {
    if (disabled || defaultSubjects.length <= 1 || currentTasks.length === 0) return;
    const impact = impactOfSbaTaskChange(students, defaultSubjects, {
      type: "replace_all",
      nextTasks: currentTasks,
    });

    commitOrConfirm(
      {
        title: `Use ${activeSubject}'s tasks for all subjects?`,
        warning: "Other subjects will adopt this exact task list.",
        nextMap: buildNextMapForTargets(currentTasks, defaultSubjects),
        toastMessage: `Applied ${activeSubject} tasks to all ${defaultSubjects.length} subjects`,
      },
      impact.affectedStudentCount,
      impact.affectedScoreCount,
    );
  };

  const totalRawMax = currentTasks.reduce((sum, task) => sum + task.maxScore, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} className="max-w-2xl">
      <div className="flex max-h-[90vh] flex-col overflow-hidden">
        <div className="border-border-subtle flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h3 className="text-main truncate text-base font-bold sm:text-lg" data-record="true">
              Manage SBA Tasks
            </h3>
            <p className="text-muted text-xs" data-record="true">
              Add, rename, resize, or customize continuous assessment tasks. Changes sync
              automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task manager"
            className="text-muted hover:bg-subtle hover:text-main shrink-0 rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Scope Segmented Control */}
          {defaultSubjects.length > 1 && (
            <div className="space-y-2">
              <div
                role="tablist"
                aria-label="SBA task scope"
                className="border-border bg-subtle grid grid-cols-2 gap-1 rounded-xl border p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "ALL"}
                  onClick={() => {
                    setScope("ALL");
                    setEditingTaskName(null);
                    setPendingCommit(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    scope === "ALL"
                      ? "bg-surface text-main shadow-xs"
                      : "text-secondary hover:text-main"
                  }`}
                >
                  All Subjects (Shared)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "SUBJECT"}
                  onClick={() => {
                    setScope("SUBJECT");
                    setEditingTaskName(null);
                    setPendingCommit(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    scope === "SUBJECT"
                      ? "bg-surface text-main shadow-xs"
                      : "text-secondary hover:text-main"
                  }`}
                >
                  <span className="truncate">Only {activeSubject}</span>
                  {!uniformState.isUniform && (
                    <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      Custom
                    </span>
                  )}
                </button>
              </div>

              {scope === "ALL" && !uniformState.isUniform && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  Subjects currently have different task lists. Editing in{" "}
                  <strong>All Subjects</strong> sets every subject to match this list.
                </p>
              )}

              {isSubjectCustomized && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs dark:border-purple-800/60 dark:bg-purple-950/35">
                  <span className="font-medium text-purple-900 dark:text-purple-200">
                    Viewing tasks specifically for <strong>{activeSubject}</strong>.
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentTasks.length > 0 && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={handleApplyCurrentSubjectToAll}
                        className="font-bold text-purple-700 hover:underline disabled:opacity-50 dark:text-purple-300"
                      >
                        Apply to all subjects
                      </button>
                    )}
                    {otherSharedTasks && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          handleApplyPreset(
                            `tasks from ${otherSharedTasks[0]}`,
                            otherSharedTasks[1],
                          )
                        }
                        className="font-bold text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-300"
                      >
                        Copy from {otherSharedTasks[0]}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary font-bold uppercase" data-record="true">
                Active Tasks ({currentTasks.length})
              </span>
              {currentTasks.length > 0 && (
                <span className="text-muted font-semibold tabular-nums">
                  Total Raw: /{totalRawMax} → {settings.classScoreMax}% Class
                </span>
              )}
            </div>

            {currentTasks.length === 0 ? (
              <div className="border-border bg-subtle/50 text-muted rounded-xl border-2 border-dashed p-5 text-center text-xs">
                No SBA tasks configured for this scope. Add a task below or apply a preset.
              </div>
            ) : (
              <div className="divide-border border-border divide-y overflow-hidden rounded-xl border">
                {currentTasks.map((task) => {
                  const isEditing =
                    editingTaskName !== null &&
                    normalizeTaskKey(editingTaskName) === normalizeTaskKey(task.name);

                  if (isEditing) {
                    return (
                      <div key={task.name} className="bg-subtle/60 space-y-2 p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)_5.5rem]">
                          <select
                            aria-label="Edit task category"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as AssessmentCategory)}
                            className="border-border-strong bg-input text-main rounded-lg border px-2 py-1.5 text-xs font-semibold"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            aria-label="Edit task name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border-border-strong bg-input text-main rounded-lg border px-2.5 py-1.5 text-xs font-bold"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={100}
                            aria-label="Edit task max score"
                            value={editMax}
                            onChange={(e) => setEditMax(e.target.value)}
                            className="border-border-strong bg-input text-main rounded-lg border px-2 py-1.5 text-center text-xs font-bold"
                          />
                        </div>
                        {editError && (
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                            {editError}
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingTaskName(null);
                              setEditError(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={disabled}
                            onClick={() => handleSaveEdit(task)}
                            className="gap-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Save</span>
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  const catBadge =
                    CATEGORY_OPTIONS.find((c) => c.value === task.category)?.badge ??
                    task.category ??
                    "CAT";

                  return (
                    <div
                      key={task.name}
                      className="bg-surface flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 uppercase dark:bg-purple-950/60 dark:text-purple-300">
                          {catBadge}
                        </span>
                        <span className="text-main truncate text-sm font-bold">{task.name}</span>
                        <span className="bg-subtle text-secondary shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums">
                          /{task.maxScore}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => startEditing(task)}
                          aria-label={`Edit ${task.name}`}
                          className="text-secondary hover:bg-subtle hover:text-main rounded-lg p-1.5 transition-colors disabled:opacity-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleDeleteTask(task.name)}
                          aria-label={`Remove ${task.name}`}
                          className="text-muted rounded-lg p-1.5 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Task Form */}
          <form
            onSubmit={handleAddTask}
            className="space-y-2.5 rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 dark:border-purple-800/60 dark:bg-purple-950/30"
          >
            <p
              className="text-xs font-bold tracking-wide text-purple-950 uppercase dark:text-purple-200"
              data-record="true"
            >
              Add New Task
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_5.5rem_auto]">
              <select
                aria-label="New task category"
                value={newCategory}
                disabled={disabled}
                onChange={(e) => setNewCategory(e.target.value as AssessmentCategory)}
                className="bg-input text-main rounded-lg border border-purple-200 px-2.5 py-2 text-xs font-semibold outline-none focus:border-purple-500 dark:border-purple-700"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                ref={newNameInputRef}
                type="text"
                aria-label="New task name"
                value={newName}
                disabled={disabled}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Midterm Quiz"
                className="bg-input text-main placeholder:text-muted rounded-lg border border-purple-200 px-3 py-2 text-sm font-medium outline-none focus:border-purple-500 dark:border-purple-700"
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                aria-label="New task max score"
                value={newMax}
                disabled={disabled}
                onChange={(e) => setNewMax(e.target.value)}
                placeholder="15"
                className="bg-input text-main placeholder:text-muted rounded-lg border border-purple-200 px-2.5 py-2 text-center text-sm font-bold outline-none focus:border-purple-500 dark:border-purple-700"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={disabled}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Task</span>
              </Button>
            </div>
            {formError && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
                {formError}
              </p>
            )}
          </form>

          {/* Quick Preset Switcher & Direct Score Switch */}
          <div className="border-border bg-subtle/40 flex flex-col gap-2.5 rounded-xl border p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span data-record="true">Quick Presets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SBA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleApplyPreset(preset.name, preset.tasks)}
                  className="border-border-strong bg-surface text-secondary hover:border-purple-400 hover:bg-purple-50 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 dark:hover:border-purple-600 dark:hover:bg-purple-950/50"
                >
                  {preset.name}
                </button>
              ))}
              {currentTasks.length > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleClearToDirectMode}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
                >
                  Switch to Direct Class Score
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Destructive Impact Confirmation (always visible above footer) */}
        {pendingCommit && (
          <div
            role="alert"
            className="shrink-0 space-y-2.5 border-t border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 sm:px-5 dark:border-amber-700/80 dark:bg-amber-950/60 dark:text-amber-100"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-bold">{pendingCommit.title}</p>
                <p className="mt-0.5 leading-relaxed">{pendingCommit.warning}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPendingCommit(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onCommitConfig(pendingCommit.nextMap, {
                    renamedTasks: pendingCommit.renamedTasks,
                    onClearTasks: pendingCommit.onClearTasks,
                    toastMessage: pendingCommit.toastMessage,
                  });
                  setPendingCommit(null);
                  setEditingTaskName(null);
                  setNewName("");
                }}
              >
                Confirm &amp; Update
              </Button>
            </div>
          </div>
        )}

        <div className="border-border-subtle flex shrink-0 justify-end border-t px-4 py-3 sm:px-5">
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
