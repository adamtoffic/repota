import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronsUpDown,
  Eraser,
  Plus,
} from "lucide-react";
import { SubjectRow, type FieldNavigationDirection } from "../SubjectRow";
import type { ProcessedStudent, SavedSubject, SchoolLevel, StudentRecord } from "../../types";
import { useSchoolActions, useSchoolSettings } from "../../hooks/useSchoolData";
import { getSubjectScoreStatus } from "../../utils/studentValidation";
import { ConfirmModal } from "../ConfirmModal";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  onUpdate: (updatedRecord: StudentRecord) => void;
  filterSubject?: string | null;
  availableSubjects?: string[];
  onFilterSubjectChange?: (subject: string | null) => void;
  onNestedModalChange?: (isOpen: boolean) => void;
  renderSbaSetupLink?: () => ReactNode;
}

export function AcademicTab({
  student,
  level,
  onUpdate,
  filterSubject,
  availableSubjects,
  onFilterSubjectChange,
  onNestedModalChange,
  renderSbaSetupLink,
}: Props) {
  const settings = useSchoolSettings();
  const { clearStudentScores, detectComponentMismatches, syncSubjectComponentsFromSettings } =
    useSchoolActions();
  const masterList = useMemo(() => settings.defaultSubjects || [], [settings.defaultSubjects]);
  const isMockExam = settings.examType === "MOCK";

  const [statusFilter, setStatusFilter] = useState<"ALL" | "INCOMPLETE">("ALL");
  const [pinnedSubjectIds, setPinnedSubjectIds] = useState<Set<string>>(() => new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [collapsedInFocusIds, setCollapsedInFocusIds] = useState<Set<string>>(() => new Set());

  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showClearScoresModal, setShowClearScoresModal] = useState(false);

  const onNestedModalChangeRef = useRef(onNestedModalChange);
  useEffect(() => {
    onNestedModalChangeRef.current = onNestedModalChange;
  });
  useEffect(() => {
    return () => {
      onNestedModalChangeRef.current?.(false);
    };
  }, []);

  const setCleanModalOpen = (open: boolean) => {
    setShowCleanModal(open);
    onNestedModalChangeRef.current?.(open || showClearScoresModal);
  };

  const setClearScoresModalOpen = (open: boolean) => {
    setShowClearScoresModal(open);
    onNestedModalChangeRef.current?.(showCleanModal || open);
  };

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const missingSubjects = useMemo(
    () => masterList.filter((masterName) => !student.subjects.some((sub) => sub.name === masterName)),
    [masterList, student.subjects],
  );

  const obsoleteSubjects = useMemo(
    () => student.subjects.filter((sub) => !masterList.includes(sub.name)),
    [masterList, student.subjects],
  );

  const subjectOptions = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const addName = (name: string) => {
      if (name && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    };
    (availableSubjects ?? masterList).forEach(addName);
    student.subjects.forEach((sub) => addName(sub.name));
    return ordered;
  }, [availableSubjects, masterList, student.subjects]);

  const { hasOutdated, hasMissing } = detectComponentMismatches();
  const showComponentSyncAlert = !isMockExam && (hasOutdated || hasMissing);

  const incompleteCount = useMemo(
    () =>
      student.subjects.filter((sub) => getSubjectScoreStatus(sub, isMockExam) !== "complete")
        .length,
    [student.subjects, isMockExam],
  );

  const displayedSubjects = useMemo(() => {
    if (filterSubject) {
      return student.subjects.filter((sub) => sub.name === filterSubject);
    }
    if (statusFilter === "INCOMPLETE") {
      return student.subjects.filter(
        (sub) =>
          pinnedSubjectIds.has(sub.id) || getSubjectScoreStatus(sub, isMockExam) !== "complete",
      );
    }
    return student.subjects;
  }, [filterSubject, statusFilter, student.subjects, pinnedSubjectIds, isMockExam]);

  // Single-row focus defaults SBA expanded; multi-subject lists default collapsed to prevent vertical bloat.
  const isFocusExpandedDefault = Boolean(filterSubject) || displayedSubjects.length === 1;
  const isSubjectExpanded = (subjectId: string) =>
    isFocusExpandedDefault ? !collapsedInFocusIds.has(subjectId) : expandedIds.has(subjectId);

  const sbaSubjects = useMemo(
    () =>
      displayedSubjects.filter(
        (sub) => !isMockExam && Boolean(sub.classScoreComponents && sub.classScoreComponents.length > 0),
      ),
    [displayedSubjects, isMockExam],
  );

  const allSbaExpanded =
    sbaSubjects.length > 0 && sbaSubjects.every((sub) => isSubjectExpanded(sub.id));

  const toggleSubjectExpand = (subjectId: string) => {
    if (isFocusExpandedDefault) {
      setCollapsedInFocusIds((prev) => {
        const next = new Set(prev);
        if (next.has(subjectId)) next.delete(subjectId);
        else next.add(subjectId);
        return next;
      });
      return;
    }

    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    if (isFocusExpandedDefault) {
      setCollapsedInFocusIds((prev) => {
        const next = new Set(prev);
        if (allSbaExpanded) {
          sbaSubjects.forEach((sub) => next.add(sub.id));
        } else {
          sbaSubjects.forEach((sub) => next.delete(sub.id));
        }
        return next;
      });
      return;
    }

    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (allSbaExpanded) {
        sbaSubjects.forEach((sub) => next.delete(sub.id));
      } else {
        sbaSubjects.forEach((sub) => next.add(sub.id));
      }
      return next;
    });
  };

  const buildSubjectWithComponents = (name: string): SavedSubject => {
    const configuredTasks = !isMockExam ? settings.subjectComponentMap?.[name] : undefined;
    return {
      id: crypto.randomUUID(),
      name,
      classScore: 0,
      examScore: 0,
      ...(configuredTasks && configuredTasks.length > 0
        ? {
            classScoreComponents: configuredTasks.map((task) => ({
              id: crypto.randomUUID(),
              name: task.name,
              score: 0,
              maxScore: task.maxScore,
              category: task.category,
            })),
          }
        : {}),
    };
  };

  const handleScoreUpdate = (updatedSubject: SavedSubject) => {
    if (statusFilter === "INCOMPLETE") {
      setPinnedSubjectIds((prev) => {
        if (prev.has(updatedSubject.id)) return prev;
        const next = new Set(prev);
        next.add(updatedSubject.id);
        return next;
      });
    }
    const newSubjects = student.subjects.map((s) =>
      s.id === updatedSubject.id ? updatedSubject : s,
    );
    onUpdate({ ...student, subjects: newSubjects });
  };

  const handleAddMissing = () => {
    if (missingSubjects.length === 0) return;
    const newSubjects = missingSubjects.map(buildSubjectWithComponents);
    onUpdate({ ...student, subjects: [...student.subjects, ...newSubjects] });
  };

  const handleAddSingleSubject = (subjectName: string) => {
    if (student.subjects.some((sub) => sub.name === subjectName)) return;
    const newSubject = buildSubjectWithComponents(subjectName);
    onUpdate({ ...student, subjects: [...student.subjects, newSubject] });
  };

  const executeRemoveObsolete = () => {
    const cleanSubjects = student.subjects.filter((sub) => masterList.includes(sub.name));
    onUpdate({ ...student, subjects: cleanSubjects });
    setCleanModalOpen(false);
  };

  const handleClearScores = () => {
    clearStudentScores(student.id);
    setClearScoresModalOpen(false);
  };

  const registerInputRef = (subjectId: string, fieldKey: string, el: HTMLInputElement | null) => {
    const refKey = `${subjectId}:${fieldKey}`;
    if (el) {
      inputRefs.current[refKey] = el;
    } else {
      delete inputRefs.current[refKey];
    }
  };

  const getOrderedFieldKeys = (): string[] => {
    const keys: string[] = [];
    for (const sub of displayedSubjects) {
      const comps = !isMockExam ? sub.classScoreComponents ?? [] : [];
      const hasComps = comps.length > 0;
      if (!isMockExam && !hasComps) {
        keys.push(`${sub.id}:class`);
      } else if (!isMockExam && hasComps && isSubjectExpanded(sub.id)) {
        for (const comp of comps) {
          keys.push(`${sub.id}:comp:${comp.id}`);
        }
      }
      keys.push(`${sub.id}:exam`);
    }
    return keys;
  };

  const handleNavigateField = (
    subjectId: string,
    fieldKey: string,
    direction: FieldNavigationDirection,
  ) => {
    const focusEl = (el: HTMLInputElement | null | undefined) => {
      if (!el || el.disabled) return false;
      el.focus();
      el.select();
      return true;
    };

    if (direction === "next" || direction === "prev") {
      const orderedKeys = getOrderedFieldKeys();
      const currentIdx = orderedKeys.indexOf(`${subjectId}:${fieldKey}`);
      if (currentIdx === -1) return;
      const step = direction === "next" ? 1 : -1;
      for (let i = currentIdx + step; i >= 0 && i < orderedKeys.length; i += step) {
        if (focusEl(inputRefs.current[orderedKeys[i]])) return;
      }
      return;
    }

    const rowIdx = displayedSubjects.findIndex((sub) => sub.id === subjectId);
    if (rowIdx === -1) return;
    const step = direction === "down" ? 1 : -1;
    for (let i = rowIdx + step; i >= 0 && i < displayedSubjects.length; i += step) {
      const candidate = displayedSubjects[i];
      if (focusEl(inputRefs.current[`${candidate.id}:${fieldKey}`])) return;
    }
  };

  const hasMaintenanceAlerts =
    showComponentSyncAlert || missingSubjects.length > 0 || obsoleteSubjects.length > 0;
  const onlyObsoleteAlert =
    obsoleteSubjects.length > 0 && !showComponentSyncAlert && missingSubjects.length === 0;

  return (
    <div className="space-y-3">
      {/* Consolidated Settings Sync Strip */}
      {hasMaintenanceAlerts && (
        <div
          className={`rounded-xl border p-3 ${
            onlyObsoleteAlert
              ? "border-amber-200 bg-amber-50/75 dark:border-amber-800/70 dark:bg-amber-950/35"
              : "border-blue-200 bg-blue-50/75 dark:border-blue-800/70 dark:bg-blue-950/35"
          }`}
        >
          <div className="space-y-2">
            {showComponentSyncAlert && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span data-record="true">
                    {hasMissing && hasOutdated
                      ? "SBA components need updating from Settings"
                      : hasMissing
                        ? "Missing SBA components from Settings"
                        : "Outdated SBA component weights detected"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => syncSubjectComponentsFromSettings()}
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors active:scale-95"
                  data-record="true"
                >
                  Sync SBA
                </button>
              </div>
            )}

            {missingSubjects.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    <span data-record="true">Missing</span> {missingSubjects.length}{" "}
                    <span data-record="true">
                      subject{missingSubjects.length !== 1 ? "s" : ""} from Settings
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddMissing}
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors active:scale-95"
                  data-record="true"
                >
                  Add Missing
                </button>
              </div>
            )}

            {obsoleteSubjects.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    {obsoleteSubjects.length}{" "}
                    <span data-record="true">
                      subject{obsoleteSubjects.length !== 1 ? "s" : ""} no longer in Settings
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCleanModalOpen(true)}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-amber-700 active:scale-95"
                  data-record="true"
                >
                  Remove Old
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Utility Row */}
      {(student.subjects.length > 0 || Boolean(filterSubject)) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Filter Pills */}
          {!filterSubject ? (
            <div
              role="group"
              aria-label="Filter subjects by completion"
              className="border-border bg-subtle inline-flex rounded-lg border p-0.5"
            >
              <button
                type="button"
                aria-pressed={statusFilter === "ALL"}
                onClick={() => {
                  setPinnedSubjectIds(new Set());
                  setStatusFilter("ALL");
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-surface text-main shadow-2xs"
                    : "text-secondary hover:text-main"
                }`}
              >
                <span data-record="true">All</span> ({student.subjects.length})
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === "INCOMPLETE"}
                onClick={() => {
                  setPinnedSubjectIds(new Set());
                  setStatusFilter("INCOMPLETE");
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === "INCOMPLETE"
                    ? "bg-surface text-main shadow-2xs"
                    : "text-secondary hover:text-main"
                }`}
              >
                <span data-record="true">Incomplete</span> ({incompleteCount})
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-200"
                data-record="true"
              >
                Subject focus
              </span>
              {onFilterSubjectChange && (
                <button
                  type="button"
                  onClick={() => onFilterSubjectChange(null)}
                  className="text-primary-text text-xs font-semibold hover:underline"
                  data-record="true"
                >
                  Show all
                </button>
              )}
            </div>
          )}

          {/* Subject Focus & SBA Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {onFilterSubjectChange && subjectOptions.length > 1 && (
              <select
                aria-label="Filter by subject"
                value={filterSubject || "all"}
                onChange={(e) =>
                  onFilterSubjectChange(e.target.value === "all" ? null : e.target.value)
                }
                className="border-border-strong bg-input text-main focus:border-primary-text focus:ring-primary-text/25 h-9 max-w-44 rounded-lg border px-2.5 text-base font-semibold outline-none focus:ring-2 sm:h-8 sm:text-xs"
              >
                <option value="all">All subjects</option>
                {subjectOptions.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            )}

            {sbaSubjects.length > 0 && !filterSubject && (
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="border-border-strong bg-surface text-secondary hover:bg-subtle hover:text-main inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors"
                data-record="true"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span>{allSbaExpanded ? "Collapse SBA" : "Expand SBA"}</span>
              </button>
            )}

            {sbaSubjects.length > 0 && renderSbaSetupLink?.()}
          </div>
        </div>
      )}

      {/* Desktop Column Headers */}
      {displayedSubjects.length > 0 && (
        <div
          className={`text-muted hidden px-4 text-[11px] font-bold tracking-wider uppercase sm:grid sm:items-center sm:gap-3 ${
            isMockExam
              ? "sm:grid-cols-[minmax(0,1fr)_6.75rem_3.75rem_7rem]"
              : "sm:grid-cols-[minmax(0,1fr)_6.25rem_6.75rem_3.75rem_7rem]"
          }`}
        >
          <span data-record="true">Subject</span>
          {!isMockExam && (
            <span className="text-center" data-record="true">
              Class (/{settings.classScoreMax})
            </span>
          )}
          <span className="text-center" data-record="true">
            {isMockExam ? "Score (/100)" : "Exam (/100)"}
          </span>
          <span className="text-center" data-record="true">
            Total
          </span>
          <span className="text-center" data-record="true">
            Grade
          </span>
        </div>
      )}

      {/* Subject List / Empty States (semantic form enables iOS WebKit Form Assistant traversal) */}
      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-2.5">
        {displayedSubjects.length === 0 ? (
          filterSubject ? (
            <div className="border-border bg-surface rounded-xl border border-dashed px-4 py-10 text-center">
              <p className="text-main text-sm font-semibold">
                This student doesn&apos;t have &ldquo;{filterSubject}&rdquo; yet.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddSingleSubject(filterSubject)}
                  className="bg-primary hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add {filterSubject}</span>
                </button>
                {onFilterSubjectChange && (
                  <button
                    type="button"
                    onClick={() => onFilterSubjectChange(null)}
                    className="border-border-strong bg-surface text-secondary hover:bg-subtle rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors"
                    data-record="true"
                  >
                    Show all subjects
                  </button>
                )}
              </div>
            </div>
          ) : statusFilter === "INCOMPLETE" && student.subjects.length > 0 ? (
            <div className="border-border bg-surface rounded-xl border px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-500" />
              <p className="text-main text-sm font-semibold" data-record="true">
                All subjects scored
              </p>
              <p className="text-muted mt-1 text-xs" data-record="true">
                Every subject has its required scores entered.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPinnedSubjectIds(new Set());
                  setStatusFilter("ALL");
                }}
                className="text-primary-text mt-3 text-xs font-semibold hover:underline"
                data-record="true"
              >
                Show all subjects
              </button>
            </div>
          ) : (
            <div
              className="border-border bg-subtle/50 text-muted rounded-xl border border-dashed py-12 text-center text-sm"
              data-record="true"
            >
              No subjects found. Use the alerts above to sync with Settings.
            </div>
          )
        ) : (
          displayedSubjects.map((subject, idx) => {
            const isObsolete = !masterList.includes(subject.name);
            return (
              <SubjectRow
                key={subject.id}
                subject={subject}
                level={level}
                onChange={handleScoreUpdate}
                maxClassScore={settings.classScoreMax}
                maxExamScore={settings.examScoreMax}
                isMockExam={isMockExam}
                isObsolete={isObsolete}
                isExpanded={isSubjectExpanded(subject.id)}
                onToggleExpand={() => toggleSubjectExpand(subject.id)}
                isLastRow={idx === displayedSubjects.length - 1}
                registerInputRef={(fieldKey, el) => registerInputRef(subject.id, fieldKey, el)}
                onNavigateField={(fieldKey, direction) =>
                  handleNavigateField(subject.id, fieldKey, direction)
                }
              />
            );
          })
        )}
      </form>

      {/* Discreet Bottom Utility Row */}
      {student.subjects.length > 0 && (
        <div className="border-border-subtle flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted text-xs" data-record="true">
            Changes auto-save
          </span>

          <button
            type="button"
            onClick={() => setClearScoresModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 active:scale-95 dark:text-red-400 dark:hover:bg-red-950/40"
            data-record="true"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Clear all scores</span>
          </button>
        </div>
      )}

      {/* Confirm Remove Obsolete Subjects */}
      <ConfirmModal
        isOpen={showCleanModal}
        title="Remove Old Subjects?"
        message={`This will permanently remove ${obsoleteSubjects.length} subjects from this student. This action cannot be undone.`}
        confirmText="Yes, Remove"
        isDangerous={true}
        onConfirm={executeRemoveObsolete}
        onClose={() => setCleanModalOpen(false)}
      />

      {/* Confirm Clear Scores */}
      <ConfirmModal
        isOpen={showClearScoresModal}
        title="Clear All Scores?"
        message={`This will reset all class and exam scores to 0 for ${student.name}. This action cannot be undone.`}
        confirmText="Yes, Clear Scores"
        isDangerous={true}
        onConfirm={handleClearScores}
        onClose={() => setClearScoresModalOpen(false)}
      />
    </div>
  );
}
