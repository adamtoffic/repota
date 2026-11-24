import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BookOpen,
  Calculator,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Scale,
  Settings2,
  Upload,
  Users,
} from "lucide-react";
import { SettingsFormProvider } from "../context/SettingsFormContext";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type { ClassScoreComponentConfig } from "../types";
import { captureEvent } from "../utils/analytics";
import {
  buildSubjectQuickExportCsv,
  buildSubjectSbaExportCsv,
  downloadCsvFile,
  resolveSubjectSbaTasks,
} from "../utils/csvImport";
import { isStudentUnscoredForSba } from "../utils/sbaReconciliation";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui";
import { ScoreImportModal } from "../components/ScoreImportModal";
import { SettingsHeaderActions } from "../components/settings/SettingsHeaderActions";
import { SettingsStatusBanners } from "../components/settings/SettingsStatusBanners";
import { SbaMarkbookGrid } from "../components/sba/SbaMarkbookGrid";
import { SbaPresetOnboardingCard } from "../components/sba/SbaPresetOnboardingCard";
import { SbaTaskManagerModal } from "../components/sba/SbaTaskManagerModal";
import { SbaWeightsModal } from "../components/sba/SbaWeightsModal";

export function SbaPage() {
  return (
    <SettingsFormProvider>
      <SbaPageContent />
    </SettingsFormProvider>
  );
}

function SbaPageContent() {
  const {
    formData,
    committedSchoolName,
    isPersistenceSuspended,
    flushPendingSave,
    syncCommittedSettings,
  } = useSettingsForm();
  const students = useSchoolStudents();
  const committedSettings = useSchoolSettings();
  const {
    updateStudent,
    applySbaConfig,
    updateAssessmentWeights,
    detectComponentMismatches,
    syncSubjectComponentsFromSettings,
  } = useSchoolActions();
  const { showToast } = useToast();

  // Read live draft fields so fast sub-route navigation from /settings/academic sees fresh subjects/exam mode immediately.
  const effectiveSettings = formData;

  const availableSubjects = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const addName = (name: string) => {
      if (name && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    };
    (effectiveSettings.defaultSubjects || []).forEach(addName);
    students.forEach((student) => student.subjects.forEach((sub) => addName(sub.name)));
    return ordered;
  }, [effectiveSettings.defaultSubjects, students]);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const activeSubject = availableSubjects.includes(selectedSubject)
    ? selectedSubject
    : (availableSubjects[0] ?? "");

  const [unscoredOnly, setUnscoredOnly] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [showScoreImport, setShowScoreImport] = useState(false);

  const activeSubjectTasks = useMemo(
    () =>
      activeSubject
        ? resolveSubjectSbaTasks(activeSubject, students, effectiveSettings)
        : [],
    [activeSubject, students, effectiveSettings],
  );

  const rawMax = useMemo(
    () => activeSubjectTasks.reduce((sum, task) => sum + task.maxScore, 0),
    [activeSubjectTasks],
  );

  const unscoredCount = useMemo(() => {
    if (!activeSubject || students.length === 0) return 0;
    return students.filter((student) =>
      isStudentUnscoredForSba(student, activeSubject, activeSubjectTasks),
    ).length;
  }, [students, activeSubject, activeSubjectTasks]);

  const mismatch = useMemo(() => {
    void students;
    void committedSettings.subjectComponentMap;
    return detectComponentMismatches();
  }, [detectComponentMismatches, students, committedSettings.subjectComponentMap]);
  const hasMismatches = mismatch.hasOutdated || mismatch.hasMissing;

  const handleApplyPresetFromOnboarding = (
    tasks: ClassScoreComponentConfig[],
    applyToAllSubjects: boolean,
    presetLabel: string,
  ) => {
    if (isPersistenceSuspended || !activeSubject) return;
    flushPendingSave();
    const targetSubjects =
      applyToAllSubjects && (effectiveSettings.defaultSubjects || []).length > 0
        ? effectiveSettings.defaultSubjects
        : [activeSubject];

    const nextSettings = applySbaConfig(
      (prev) => {
        const nextMap = { ...(prev.subjectComponentMap ?? {}) };
        for (const sub of targetSubjects) {
          nextMap[sub] = tasks.map((task) => ({ ...task }));
        }
        return {
          settings: {
            ...prev,
            subjectComponentMap: nextMap,
          },
        };
      },
      {
        toastMessage: applyToAllSubjects
          ? `Applied ${presetLabel} to all ${targetSubjects.length} subjects!`
          : `Applied ${presetLabel} to ${activeSubject}!`,
      },
    );
    syncCommittedSettings(nextSettings);
  };

  const handleCommitTaskConfig = (
    nextMap: Record<string, ClassScoreComponentConfig[]>,
    options: {
      renamedTasks?: Record<string, string>;
      onClearTasks?: "preserve_class_score" | "zero";
      toastMessage: string;
    },
  ) => {
    if (isPersistenceSuspended) return;
    flushPendingSave();
    const nextSettings = applySbaConfig(
      (prev) => ({
        settings: {
          ...prev,
          subjectComponentMap: nextMap,
        },
        renamedTasks: options.renamedTasks,
        onClearTasks: options.onClearTasks,
      }),
      { toastMessage: options.toastMessage },
    );
    syncCommittedSettings(nextSettings);
  };

  const handleApplyWeights = (
    nextClassScoreMax: number,
    nextExamScoreMax: number,
    options: { examType: "TERMLY" | "MOCK"; scoreMode: "rescale" | "clamp" },
  ) => {
    if (isPersistenceSuspended) return;
    flushPendingSave();
    const nextSettings = updateAssessmentWeights(nextClassScoreMax, nextExamScoreMax, options);
    syncCommittedSettings(nextSettings);
  };

  const handleExportSbaCsv = () => {
    if (!activeSubject || students.length === 0) return;
    try {
      const dateStamp = new Date().toISOString().split("T")[0];
      const safeSub = activeSubject.replace(/\s+/g, "_");
      const csv =
        activeSubjectTasks.length > 0
          ? buildSubjectSbaExportCsv(activeSubject, students, effectiveSettings)
          : buildSubjectQuickExportCsv(activeSubject, students, effectiveSettings);

      downloadCsvFile(csv, `${safeSub}_SBA_Sheet_${dateStamp}.csv`);
      showToast(`${activeSubject} SBA sheet exported!`, "success");
      captureEvent("Class_Tool_Used", {
        tool: "sba_sheet_csv_export",
        students_count: students.length,
        school_level: effectiveSettings.level || "unknown",
      });
    } catch (error) {
      console.error("SBA CSV export failed:", error);
      showToast(
        error instanceof Error ? error.message : "Export failed. Please try again.",
        "error",
      );
    }
  };

  const isMockMode = effectiveSettings.examType === "MOCK";

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader
        hideOnDesktop
        sticky={false}
        schoolName={committedSchoolName}
        actions={<SettingsHeaderActions showBack={false} />}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        {/* Top Markbook Header Card */}
        <div className="border-border bg-surface rounded-xl border p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-950/60">
                <Calculator className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-main text-xl font-bold" data-record="true">
                    SBA Markbook
                  </h1>
                  <button
                    type="button"
                    disabled={isPersistenceSuspended}
                    onClick={() => setShowWeightsModal(true)}
                    aria-label="Grading weights and exam mode"
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isMockMode
                        ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200"
                        : "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-200"
                    }`}
                  >
                    <Scale className="h-3 w-3" />
                    <span>
                      {isMockMode
                        ? "Mock · 0/100"
                        : `Termly · ${effectiveSettings.classScoreMax}/${effectiveSettings.examScoreMax}`}
                    </span>
                  </button>
                </div>
                <p className="text-muted mt-1 text-xs leading-relaxed" data-record="true">
                  Record continuous assessment marks, customize tasks, and manage grading weights.
                </p>
              </div>
            </div>

            {!isMockMode && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isPersistenceSuspended || availableSubjects.length === 0}
                  onClick={() => setShowTaskManager(true)}
                  className="gap-1.5"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>Manage Tasks</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isPersistenceSuspended || availableSubjects.length === 0}
                  onClick={() => {
                    flushPendingSave();
                    setShowScoreImport(true);
                  }}
                  className="gap-1.5"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import CSV</span>
                </Button>
                {students.length > 0 && activeSubject && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleExportSbaCsv}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export SBA CSV</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <SettingsStatusBanners />

        {isMockMode ? (
          <div className="border-border bg-surface rounded-xl border p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-main text-base font-bold" data-record="true">
                    Mock Exam mode is active (0/100)
                  </h2>
                  <p className="text-muted mt-1 text-xs leading-relaxed" data-record="true">
                    Mock exams use 100% examination scores. Your SBA task setup and any previously
                    entered component marks remain safely saved.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isPersistenceSuspended}
                  onClick={() =>
                    handleApplyWeights(50, 50, { examType: "TERMLY", scoreMode: "rescale" })
                  }
                >
                  Switch to Termly Mode
                </Button>
                <Link
                  to="/settings/academic"
                  className="border-border-strong bg-surface text-secondary hover:bg-subtle inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-bold transition-colors"
                >
                  Academic Settings
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Legacy Drift Safety Net (only when external/backup records differ from Settings) */}
            {hasMismatches && students.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-bold" data-record="true">
                      Student SBA tasks need reconciliation
                    </p>
                    <p
                      className="mt-0.5 text-xs text-amber-800 dark:text-amber-300"
                      data-record="true"
                    >
                      Some existing student records do not match your latest SBA task configuration.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={isPersistenceSuspended}
                  onClick={() => {
                    flushPendingSave();
                    syncSubjectComponentsFromSettings();
                  }}
                  className="shrink-0 gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reconcile Tasks</span>
                </Button>
              </div>
            )}

            {availableSubjects.length === 0 ? (
              <div className="border-border bg-surface rounded-xl border p-8 text-center shadow-sm">
                <BookOpen className="text-muted mx-auto mb-3 h-8 w-8" />
                <h2 className="text-main text-base font-bold" data-record="true">
                  No Subjects Configured
                </h2>
                <p className="text-muted mt-1 text-sm" data-record="true">
                  Add class subjects before setting up SBA tasks.
                </p>
                <Link
                  to="/settings/academic"
                  className="text-primary-text mt-3 inline-block text-sm font-bold hover:underline"
                >
                  Configure Subjects →
                </Link>
              </div>
            ) : (
              <>
                {/* Subject Toolbar */}
                <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      aria-label="SBA subject"
                      value={activeSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="border-border-strong bg-input text-main rounded-lg border px-3 py-2 text-sm font-bold shadow-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25"
                    >
                      {availableSubjects.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>

                    {activeSubjectTasks.length > 0 ? (
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800 tabular-nums dark:bg-purple-950/60 dark:text-purple-200">
                        {activeSubjectTasks.length} task
                        {activeSubjectTasks.length === 1 ? "" : "s"} · /{rawMax} raw → /
                        {effectiveSettings.classScoreMax} Class
                      </span>
                    ) : (
                      <span className="bg-subtle text-secondary rounded-full px-2.5 py-1 text-xs font-semibold">
                        Direct Class Score (/{effectiveSettings.classScoreMax})
                      </span>
                    )}
                  </div>

                  {activeSubjectTasks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {students.length > 0 && (
                        <button
                          type="button"
                          aria-pressed={unscoredOnly}
                          onClick={() => setUnscoredOnly((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
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
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isPersistenceSuspended}
                        onClick={() => setShowTaskManager(true)}
                        className="gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Task</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Main SBA Workspace */}
                {activeSubjectTasks.length === 0 ? (
                  <SbaPresetOnboardingCard
                    activeSubject={activeSubject}
                    defaultSubjects={effectiveSettings.defaultSubjects || []}
                    subjectComponentMap={effectiveSettings.subjectComponentMap ?? {}}
                    classScoreMax={effectiveSettings.classScoreMax}
                    disabled={isPersistenceSuspended}
                    onApplyPreset={handleApplyPresetFromOnboarding}
                    onCreateCustomTask={() => setShowTaskManager(true)}
                  />
                ) : students.length === 0 ? (
                  <div className="border-border bg-surface space-y-4 rounded-xl border p-6 text-center shadow-sm">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {activeSubjectTasks.map((task) => (
                        <span
                          key={task.name}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-200"
                        >
                          {task.name} /{task.maxScore}
                        </span>
                      ))}
                    </div>
                    <div>
                      <Users className="text-muted mx-auto mb-2 h-8 w-8" />
                      <h2 className="text-main text-base font-bold" data-record="true">
                        No students in your class yet
                      </h2>
                      <p className="text-muted mt-1 text-xs" data-record="true">
                        Your SBA tasks are ready! Add students on Home to begin entering marks.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        to="/"
                        className="bg-primary hover:bg-primary/90 inline-flex items-center rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs"
                      >
                        Go to Home to Add Students →
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isPersistenceSuspended}
                        onClick={() => setShowTaskManager(true)}
                      >
                        Manage Tasks
                      </Button>
                    </div>
                  </div>
                ) : (
                  <SbaMarkbookGrid
                    students={students}
                    activeSubject={activeSubject}
                    tasks={activeSubjectTasks}
                    settings={effectiveSettings}
                    unscoredOnly={unscoredOnly}
                    onClearUnscoredFilter={() => setUnscoredOnly(false)}
                    onUpdateStudent={updateStudent}
                    onOpenTaskManager={() => setShowTaskManager(true)}
                    disabled={isPersistenceSuspended}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      <SbaTaskManagerModal
        key={`tasks:${showTaskManager ? "open" : "closed"}:${activeSubject}`}
        isOpen={showTaskManager}
        onClose={() => setShowTaskManager(false)}
        activeSubject={activeSubject}
        defaultSubjects={effectiveSettings.defaultSubjects || []}
        students={students}
        settings={effectiveSettings}
        disabled={isPersistenceSuspended}
        onCommitConfig={handleCommitTaskConfig}
      />

      <SbaWeightsModal
        key={`weights:${showWeightsModal ? "open" : "closed"}`}
        isOpen={showWeightsModal}
        onClose={() => setShowWeightsModal(false)}
        students={students}
        settings={effectiveSettings}
        disabled={isPersistenceSuspended}
        onApplyWeights={handleApplyWeights}
      />

      <ScoreImportModal
        key={`${showScoreImport ? "open" : "closed"}:${activeSubject}`}
        isOpen={showScoreImport}
        onClose={() => setShowScoreImport(false)}
        initialSubject={activeSubject || undefined}
        onSettingsUpdated={syncCommittedSettings}
      />
    </div>
  );
}

export default SbaPage;
