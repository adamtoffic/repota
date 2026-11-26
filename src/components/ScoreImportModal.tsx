import { useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type {
  AssessmentCategory,
  ClassScoreComponentConfig,
  SchoolSettings,
} from "../types";
import { captureEvent } from "../utils/analytics";
import {
  buildExamOnlyTemplateCsv,
  buildSbaScoreTemplateCsv,
  buildSingleComponentExportCsv,
  buildSingleComponentTemplateCsv,
  downloadCsvFile,
  inspectUploadedScoreCsv,
  parseSbaScoreImport,
  resolveSubjectSbaTasks,
  type NewSbaColumnOverride,
  type SbaConflictPolicy,
  type SbaImportMode,
} from "../utils/csvImport";
import {
  CREATE_NEW_TASK_VALUE,
  ScoreImportConfigAndInput,
} from "./import/ScoreImportConfigAndInput";
import { ScoreImportPreviewStep } from "./import/ScoreImportPreviewStep";
import {
  buildScoreImportPlan,
  resolveDetectedColumnOverride,
  type DetectedNewScoreColumn,
} from "./import/scoreImportApply";
import { Modal } from "./ui/Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialMode?: SbaImportMode;
  initialTaskName?: string;
  onSettingsUpdated?: (nextSettings: SchoolSettings) => void;
}

export function ScoreImportModal(props: Props) {
  if (!props.isOpen) return null;
  return <ScoreImportModalContent {...props} />;
}

function ScoreImportModalContent({
  isOpen,
  onClose,
  initialSubject,
  initialMode,
  initialTaskName,
  onSettingsUpdated,
}: Props) {
  const settings = useSchoolSettings();
  const students = useSchoolStudents();
  const { addStudent, updateStudent, batchUpdateStudents, setSettings } = useSchoolActions();
  const { showToast } = useToast();

  const isMock = settings.examType === "MOCK";

  const availableSubjects = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const add = (name: string) => {
      if (name && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    };
    (settings.defaultSubjects || []).forEach(add);
    students.forEach((s) => s.subjects.forEach((sub) => add(sub.name)));
    return ordered;
  }, [settings.defaultSubjects, students]);

  const [selectedSubject, setSelectedSubject] = useState(initialSubject || "");
  const activeSubject = availableSubjects.includes(selectedSubject)
    ? selectedSubject
    : (availableSubjects[0] ?? "");

  const [modeState, setModeState] = useState<SbaImportMode>(
    initialMode ?? (initialTaskName ? "SINGLE_COMPONENT" : "FULL_SUBJECT"),
  );
  const activeMode: SbaImportMode = isMock && modeState !== "EXAM_ONLY" ? "EXAM_ONLY" : modeState;

  const activeTasks = useMemo(
    () => (activeSubject ? resolveSubjectSbaTasks(activeSubject, students, settings) : []),
    [activeSubject, students, settings],
  );

  const [selectedTaskOption, setSelectedTaskOption] = useState<string>(initialTaskName || "");
  const effectiveTaskOption =
    selectedTaskOption === CREATE_NEW_TASK_VALUE ||
    activeTasks.some((t) => t.name === selectedTaskOption)
      ? selectedTaskOption
      : (activeTasks[0]?.name ?? CREATE_NEW_TASK_VALUE);

  const isCreatingSingleTask =
    activeMode === "SINGLE_COMPONENT" && effectiveTaskOption === CREATE_NEW_TASK_VALUE;

  const [newSingleTaskName, setNewSingleTaskName] = useState("");
  const [newSingleTaskMax, setNewSingleTaskMax] = useState("15");
  const [newSingleTaskCategory, setNewSingleTaskCategory] = useState<AssessmentCategory>("CAT");

  const parsedNewSingleTaskMax = Number(newSingleTaskMax);
  const isSingleTaskMaxValid =
    !isCreatingSingleTask ||
    (newSingleTaskMax.trim() !== "" &&
      Number.isFinite(parsedNewSingleTaskMax) &&
      parsedNewSingleTaskMax >= 1 &&
      parsedNewSingleTaskMax <= 100);

  const activeSingleTask: ClassScoreComponentConfig | undefined = useMemo(() => {
    if (activeMode !== "SINGLE_COMPONENT") return undefined;
    if (isCreatingSingleTask) {
      const trimmed = newSingleTaskName.trim();
      if (!trimmed || !isSingleTaskMaxValid) return undefined;
      return {
        name: trimmed,
        maxScore: Math.round(parsedNewSingleTaskMax),
        category: newSingleTaskCategory,
      };
    }
    return activeTasks.find((t) => t.name === effectiveTaskOption);
  }, [
    activeMode,
    isCreatingSingleTask,
    newSingleTaskName,
    isSingleTaskMaxValid,
    parsedNewSingleTaskMax,
    newSingleTaskCategory,
    activeTasks,
    effectiveTaskOption,
  ]);

  const [rawText, setRawText] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [createUnmatched, setCreateUnmatched] = useState(false);
  const [allowClampExceeding, setAllowClampExceeding] = useState(false);
  const [conflictPolicy, setConflictPolicy] = useState<SbaConflictPolicy>("OVERWRITE");
  const [newColumnOverrides, setNewColumnOverrides] = useState<
    Record<number, NewSbaColumnOverride>
  >({});

  const parsedResult = useMemo(() => {
    if (!isPreviewing || !activeSubject || !rawText.trim()) return null;
    return parseSbaScoreImport({
      rawText,
      subjectName: activeSubject,
      existingStudents: students,
      settings,
      customNewTasks: newColumnOverrides,
      conflictPolicy,
      importMode: activeMode,
      targetTask: activeSingleTask,
    });
  }, [
    isPreviewing,
    activeSubject,
    rawText,
    students,
    settings,
    newColumnOverrides,
    conflictPolicy,
    activeMode,
    activeSingleTask,
  ]);

  const handleDownloadTemplate = () => {
    if (!activeSubject) return;
    const dateStamp = new Date().toISOString().split("T")[0];
    const safeSub = activeSubject.replace(/\s+/g, "_");

    if (activeMode === "SINGLE_COMPONENT") {
      if (!activeSingleTask) {
        showToast(
          !isSingleTaskMaxValid
            ? "Max score must be between 1 and 100."
            : "Enter a task name first to download its template.",
          "info",
        );
        return;
      }
      const csv = buildSingleComponentTemplateCsv(activeSubject, activeSingleTask, students);
      downloadCsvFile(
        csv,
        `${safeSub}_${activeSingleTask.name.replace(/\s+/g, "_")}_Template_${dateStamp}.csv`,
      );
      showToast(`Downloaded ${activeSingleTask.name} template!`, "success");
      return;
    }

    if (activeMode === "EXAM_ONLY") {
      const csv = buildExamOnlyTemplateCsv(activeSubject, students, settings);
      downloadCsvFile(csv, `${safeSub}_Final_Exam_Template_${dateStamp}.csv`);
      showToast(`Downloaded ${activeSubject} Exam template!`, "success");
      return;
    }

    const csv = buildSbaScoreTemplateCsv(activeSubject, students, settings);
    downloadCsvFile(csv, `${safeSub}_Full_SBA_Template_${dateStamp}.csv`);
    showToast(`Downloaded ${activeSubject} Full Subject template!`, "success");
  };

  const handleExportSingleComponent = () => {
    if (!activeSubject || !activeSingleTask) return;
    const csv = buildSingleComponentExportCsv(activeSubject, activeSingleTask, students, settings);
    const dateStamp = new Date().toISOString().split("T")[0];
    downloadCsvFile(
      csv,
      `${activeSubject.replace(/\s+/g, "_")}_${activeSingleTask.name.replace(/\s+/g, "_")}_${dateStamp}.csv`,
    );
    showToast(`Exported ${activeSingleTask.name} scores to CSV!`, "success");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content =
      typeof file.text === "function" ? await file.text() : await new Response(file).text();

    const tasksBySubject: Record<string, ClassScoreComponentConfig[]> = {};
    availableSubjects.forEach((sub) => {
      tasksBySubject[sub] = resolveSubjectSbaTasks(sub, students, settings);
    });

    const inspection = inspectUploadedScoreCsv(
      content,
      file.name,
      availableSubjects,
      tasksBySubject,
    );

    if (inspection.detectedSubject && inspection.detectedSubject !== activeSubject) {
      setSelectedSubject(inspection.detectedSubject);
      showToast(`Selected ${inspection.detectedSubject} from CSV file.`, "info");
    }

    if (!isMock && inspection.suggestedMode) {
      setModeState(inspection.suggestedMode);
      if (inspection.suggestedMode === "SINGLE_COMPONENT") {
        if (inspection.matchedTaskName) {
          setSelectedTaskOption(inspection.matchedTaskName);
        } else if (inspection.suggestedNewTask) {
          setSelectedTaskOption(CREATE_NEW_TASK_VALUE);
          setNewSingleTaskName(inspection.suggestedNewTask.name);
          setNewSingleTaskMax(String(inspection.suggestedNewTask.maxScore));
          setNewSingleTaskCategory(inspection.suggestedNewTask.category ?? "CAT");
        }
      }
    }

    setRawText(content);
    setNewColumnOverrides({});
    setAllowClampExceeding(false);
    setIsPreviewing(true);
    e.target.value = "";
  };

  const getOverrideForDetected = (col: DetectedNewScoreColumn): NewSbaColumnOverride =>
    resolveDetectedColumnOverride(col, newColumnOverrides);

  const updateNewColOverride = (
    col: DetectedNewScoreColumn,
    patch: Partial<NewSbaColumnOverride>,
  ) => {
    const current = getOverrideForDetected(col);
    setNewColumnOverrides((prev) => ({
      ...prev,
      [col.colIndex]: { ...current, ...patch },
    }));
  };

  const handleApplyScores = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;

    const {
      enabledNewTasks,
      nextSettings,
      updatedRecords,
      newRecords,
      updatedCount,
      createdCount,
    } = buildScoreImportPlan({
      parsedResult,
      activeSubject,
      activeMode,
      activeSingleTask,
      activeTasks,
      students,
      settings,
      newColumnOverrides,
      createUnmatched,
      conflictPolicy,
    });

    if (nextSettings && typeof setSettings === "function") {
      setSettings(nextSettings);
      onSettingsUpdated?.(nextSettings);
    }

    if (updatedRecords.size + newRecords.length > 0) {
      if (batchUpdateStudents) {
        batchUpdateStudents(
          (prev) => [
            ...prev.map((student) => updatedRecords.get(student.id) ?? student),
            ...newRecords,
          ],
          { silent: true },
        );
      } else {
        updatedRecords.forEach((rec) => updateStudent(rec, true));
        newRecords.forEach((rec) => addStudent(rec, true));
      }
    }

    const summary: string[] = [];
    if (updatedCount > 0) summary.push(`${updatedCount} updated`);
    if (createdCount > 0) summary.push(`${createdCount} added`);
    if (enabledNewTasks.length > 0) {
      summary.push(
        `${enabledNewTasks.length} new SBA task${enabledNewTasks.length > 1 ? "s" : ""} created`,
      );
    }
    showToast(
      summary.length > 0
        ? `Imported ${activeSubject} scores (${summary.join(", ")})!`
        : "No scores were applied.",
      summary.length > 0 ? "success" : "info",
    );

    if (updatedCount + createdCount > 0) {
      captureEvent("Scores_Imported", {
        mode: activeMode,
        students_updated: updatedCount,
        students_created: createdCount,
        new_tasks_created: enabledNewTasks.length,
        school_level: settings.level || "unknown",
        exam_type: (settings.examType || "TERMLY").trim().toUpperCase(),
      });
    }

    setRawText("");
    setNewColumnOverrides({});
    setAllowClampExceeding(false);
    setIsPreviewing(false);
    onClose();
  };

  const resetAndClose = () => {
    setRawText("");
    setNewColumnOverrides({});
    setAllowClampExceeding(false);
    setIsPreviewing(false);
    onClose();
  };

  const modeTabs: Array<{ id: SbaImportMode; label: string; hint: string }> = isMock
    ? [{ id: "EXAM_ONLY", label: "Mock Exam (/100)", hint: "Final mock scores only" }]
    : [
        {
          id: "SINGLE_COMPONENT",
          label: "Single SBA Task",
          hint: "Import or export 1 SBA component (e.g. Group Work)",
        },
        {
          id: "EXAM_ONLY",
          label: "Final Exam (/100)",
          hint: "End-of-term exam scores only (keeps SBA untouched)",
        },
        {
          id: "FULL_SUBJECT",
          label: "Full Subject Sheet",
          hint: "All SBA tasks + Exam together",
        },
      ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      closeOnBackdrop={false}
      ariaLabelledBy="score-import-modal-title"
      className="max-w-3xl"
    >
      <div className="flex max-h-[90dvh] flex-col overflow-hidden">
        <div className="border-border-subtle flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3.5 sm:px-5 sm:py-4">
          <h3
            id="score-import-modal-title"
            className="text-main flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg"
            data-record="true"
          >
            <Upload className="text-primary-text h-5 w-5 shrink-0" />
            <span className="truncate">Import &amp; Export Subject Scores</span>
          </h3>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close modal"
            className="text-muted hover:bg-subtle hover:text-main shrink-0 rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {availableSubjects.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              Add at least one subject in Settings before importing scores.
            </div>
          ) : (
            <>
              <ScoreImportConfigAndInput
                availableSubjects={availableSubjects}
                activeSubject={activeSubject}
                onSelectSubject={(subject) => {
                  setSelectedSubject(subject);
                  setNewColumnOverrides({});
                  setIsPreviewing(false);
                }}
                modeTabs={modeTabs}
                activeMode={activeMode}
                onSelectMode={(mode) => {
                  setModeState(mode);
                  setIsPreviewing(false);
                }}
                isMock={isMock}
                activeTasks={activeTasks}
                classScoreMax={settings.classScoreMax}
                examScoreMax={settings.examScoreMax}
                effectiveTaskOption={effectiveTaskOption}
                onSelectTaskOption={(option) => {
                  setSelectedTaskOption(option);
                  setIsPreviewing(false);
                }}
                isCreatingSingleTask={isCreatingSingleTask}
                activeSingleTask={activeSingleTask}
                studentCount={students.length}
                newSingleTaskName={newSingleTaskName}
                newSingleTaskMax={newSingleTaskMax}
                newSingleTaskCategory={newSingleTaskCategory}
                isSingleTaskMaxValid={isSingleTaskMaxValid}
                onNewSingleTaskNameChange={setNewSingleTaskName}
                onNewSingleTaskMaxChange={setNewSingleTaskMax}
                onNewSingleTaskCategoryChange={setNewSingleTaskCategory}
                onDownloadTemplate={handleDownloadTemplate}
                onExportSingleComponent={handleExportSingleComponent}
                onFileUpload={handleFileUpload}
                isPreviewing={isPreviewing}
                rawText={rawText}
                onRawTextChange={setRawText}
                onStartPreview={() => {
                  setAllowClampExceeding(false);
                  setIsPreviewing(true);
                }}
              />

              {isPreviewing && (
                <ScoreImportPreviewStep
                  parsedResult={parsedResult}
                  activeSubject={activeSubject}
                  classScoreMax={settings.classScoreMax}
                  examScoreMax={settings.examScoreMax}
                  createUnmatched={createUnmatched}
                  onCreateUnmatchedChange={setCreateUnmatched}
                  getOverrideForDetected={getOverrideForDetected}
                  onUpdateNewColOverride={updateNewColOverride}
                  conflictPolicy={conflictPolicy}
                  onConflictPolicyChange={setConflictPolicy}
                  allowClampExceeding={allowClampExceeding}
                  onAllowClampExceedingChange={setAllowClampExceeding}
                  onBack={() => {
                    setAllowClampExceeding(false);
                    setIsPreviewing(false);
                  }}
                  onApplyScores={handleApplyScores}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
