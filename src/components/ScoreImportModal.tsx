import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  PlusCircle,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type {
  AssessmentCategory,
  ClassScoreComponent,
  ClassScoreComponentConfig,
  SavedSubject,
  SchoolSettings,
  StudentRecord,
} from "../types";
import {
  buildDefaultSubjectsForStudent,
  buildExamOnlyTemplateCsv,
  buildSbaScoreTemplateCsv,
  buildSingleComponentExportCsv,
  buildSingleComponentTemplateCsv,
  downloadCsvFile,
  inspectUploadedScoreCsv,
  normalizeComponentNameKey,
  parseSbaScoreImport,
  resolveSubjectSbaTasks,
  type NewSbaColumnOverride,
  type SbaConflictPolicy,
  type SbaImportMode,
} from "../utils/csvImport";
import { updateComponentAndRecalculateClassScore } from "../utils/scoreConversion";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Textarea } from "./ui/Textarea";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialMode?: SbaImportMode;
  initialTaskName?: string;
  onSettingsUpdated?: (nextSettings: SchoolSettings) => void;
}

const CREATE_NEW_TASK_VALUE = "__CREATE_NEW_TASK__";

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
  const { addStudent, updateStudent, setSettings } = useSchoolActions();
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

  const getOverrideForDetected = (
    col: NonNullable<typeof parsedResult>["detectedNewColumns"][number],
  ): NewSbaColumnOverride =>
    newColumnOverrides[col.colIndex] ?? {
      enabled: true,
      name: col.suggestedName,
      maxScore: col.suggestedMaxScore,
      category: col.suggestedCategory,
    };

  const updateNewColOverride = (
    col: NonNullable<typeof parsedResult>["detectedNewColumns"][number],
    patch: Partial<NewSbaColumnOverride>,
  ) => {
    const current = getOverrideForDetected(col);
    setNewColumnOverrides((prev) => ({
      ...prev,
      [col.colIndex]: { ...current, ...patch },
    }));
  };

  const applyScoreRowToSubject = (
    existingSubject: SavedSubject | undefined,
    row: NonNullable<typeof parsedResult>["rows"][number],
    tasks: ClassScoreComponentConfig[],
  ): SavedSubject => {
    const baseSubject: SavedSubject = existingSubject ?? {
      id: crypto.randomUUID(),
      name: activeSubject,
      classScore: 0,
      examScore: 0,
    };

    const nextExamScore =
      row.examRawScore !== undefined ? row.examRawScore.weighted : baseSubject.examScore;

    // Exam-only imports preserve existing SBA components & classScore untouched
    if (
      activeMode === "EXAM_ONLY" &&
      row.componentScores.length === 0 &&
      !row.directClassScore
    ) {
      return {
        ...baseSubject,
        examScore: nextExamScore,
      };
    }

    let nextComponents: ClassScoreComponent[] | undefined = baseSubject.classScoreComponents
      ? baseSubject.classScoreComponents.map((c) => {
          const matchingConfig = tasks.find(
            (t) => normalizeComponentNameKey(t.name) === normalizeComponentNameKey(c.name),
          );
          return matchingConfig
            ? {
                ...c,
                maxScore: matchingConfig.maxScore,
                score: Math.min(c.score, matchingConfig.maxScore),
                category: matchingConfig.category ?? c.category,
              }
            : { ...c };
        })
      : tasks.length > 0
        ? tasks.map((t) => ({
            id: crypto.randomUUID(),
            name: t.name,
            score: 0,
            maxScore: t.maxScore,
            category: t.category,
          }))
        : row.componentScores.length > 0
          ? row.componentScores.map((c) => ({
              id: crypto.randomUUID(),
              name: c.name,
              score: 0,
              maxScore: c.maxScore,
              category: c.category,
            }))
          : undefined;

    if (nextComponents) {
      for (const task of tasks) {
        const taskKey = normalizeComponentNameKey(task.name);
        if (!nextComponents.some((c) => normalizeComponentNameKey(c.name) === taskKey)) {
          nextComponents.push({
            id: crypto.randomUUID(),
            name: task.name,
            score: 0,
            maxScore: task.maxScore,
            category: task.category,
          });
        }
      }
    }

    let nextClassScore = baseSubject.classScore;

    if (row.componentScores.length > 0 && nextComponents) {
      for (const compPatch of row.componentScores) {
        const patchKey = normalizeComponentNameKey(compPatch.name);
        let target = nextComponents.find((c) => normalizeComponentNameKey(c.name) === patchKey);
        if (!target) {
          target = {
            id: crypto.randomUUID(),
            name: compPatch.name,
            score: 0,
            maxScore: compPatch.maxScore,
            category: compPatch.category,
          };
          nextComponents.push(target);
        }

        const shouldKeepExisting =
          conflictPolicy === "KEEP_EXISTING" &&
          compPatch.existingScore !== undefined &&
          compPatch.existingScore > 0;
        const scoreToApply = shouldKeepExisting ? compPatch.existingScore! : compPatch.score;

        const res = updateComponentAndRecalculateClassScore(
          nextComponents,
          target.id,
          scoreToApply,
          settings.classScoreMax,
        );
        nextComponents = res.updatedComponents;
        nextClassScore = res.classScore;
      }
    } else if (row.directClassScore) {
      const shouldKeepExisting =
        conflictPolicy === "KEEP_EXISTING" &&
        row.directClassScore.existingScore !== undefined &&
        row.directClassScore.existingScore > 0;
      nextClassScore = shouldKeepExisting
        ? row.directClassScore.existingScore!
        : row.directClassScore.score;
    }

    return {
      ...baseSubject,
      classScore: nextClassScore,
      examScore: nextExamScore,
      ...(nextComponents ? { classScoreComponents: nextComponents } : {}),
    };
  };

  const handleApplyScores = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;

    // 1. Collect newly created SBA tasks (either auto-detected in FULL_SUBJECT or explicit in SINGLE_COMPONENT)
    const enabledNewTasks: ClassScoreComponentConfig[] = parsedResult.detectedNewColumns
      .map((col) => getOverrideForDetected(col))
      .filter((ov) => ov.enabled && ov.name.trim().length > 0)
      .map((ov) => ({
        name: ov.name.trim(),
        maxScore: Math.min(100, Math.max(1, ov.maxScore)),
        category: ov.category,
      }));

    if (
      activeMode === "SINGLE_COMPONENT" &&
      activeSingleTask &&
      !activeTasks.some(
        (t) => normalizeComponentNameKey(t.name) === normalizeComponentNameKey(activeSingleTask.name),
      )
    ) {
      enabledNewTasks.push(activeSingleTask);
    }

    const mergedTasksForCreation = [...activeTasks];
    for (const t of enabledNewTasks) {
      const tKey = normalizeComponentNameKey(t.name);
      if (!mergedTasksForCreation.some((e) => normalizeComponentNameKey(e.name) === tKey)) {
        mergedTasksForCreation.push(t);
      }
    }

    let effectiveSettings = settings;
    if (enabledNewTasks.length > 0 && typeof setSettings === "function") {
      const currentLib = settings.componentLibrary ?? [];
      const nextLib = [...currentLib];
      for (const task of enabledNewTasks) {
        const taskKey = normalizeComponentNameKey(task.name);
        if (!nextLib.some((t) => normalizeComponentNameKey(t.name) === taskKey)) {
          nextLib.push(task);
        }
      }

      const currentMap = settings.subjectComponentMap ?? {};
      const currentSubTasks = currentMap[activeSubject] ?? [];
      const nextSubTasks = [...currentSubTasks];
      for (const task of mergedTasksForCreation) {
        const taskKey = normalizeComponentNameKey(task.name);
        if (!nextSubTasks.some((t) => normalizeComponentNameKey(t.name) === taskKey)) {
          nextSubTasks.push(task);
        }
      }

      effectiveSettings = {
        ...settings,
        componentLibrary: nextLib,
        subjectComponentMap: {
          ...currentMap,
          [activeSubject]: nextSubTasks,
        },
      };
      setSettings(effectiveSettings);
      onSettingsUpdated?.(effectiveSettings);
    }

    // 2. Apply scores to matched students & create new students if enabled
    const studentMap = new Map<string, StudentRecord>(students.map((s) => [s.id, s]));
    const touchedStudentIds = new Set<string>();
    let updatedCount = 0;
    let createdCount = 0;

    parsedResult.rows.forEach((row, idx) => {
      if (row.matchedStudentId && studentMap.has(row.matchedStudentId)) {
        const student = studentMap.get(row.matchedStudentId)!;
        const existingSub = student.subjects.find(
          (s) => s.name.trim().toLowerCase() === activeSubject.trim().toLowerCase(),
        );
        const updatedSub = applyScoreRowToSubject(existingSub, row, mergedTasksForCreation);
        const nextSubjects = existingSub
          ? student.subjects.map((s) =>
              s === existingSub || (existingSub.id && s.id === existingSub.id) ? updatedSub : s,
            )
          : [...student.subjects, updatedSub];

        const nextRecord: StudentRecord = { ...student, subjects: nextSubjects };
        studentMap.set(student.id, nextRecord);
        touchedStudentIds.add(student.id);
        updateStudent(nextRecord, true);
        updatedCount++;
        return;
      }

      if (createUnmatched && row.isNewStudent) {
        const defaultSubs = buildDefaultSubjectsForStudent(effectiveSettings);
        const targetExisting = defaultSubs.find(
          (s) => s.name.trim().toLowerCase() === activeSubject.trim().toLowerCase(),
        );
        const updatedSub = applyScoreRowToSubject(targetExisting, row, mergedTasksForCreation);
        const nextSubjects = targetExisting
          ? defaultSubs.map((s) => (s.id === targetExisting.id ? updatedSub : s))
          : [...defaultSubs, updatedSub];

        const newStudent: StudentRecord = {
          id:
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
          name: row.studentName,
          gender: "Male",
          className: effectiveSettings.className || "Class",
          subjects: nextSubjects,
          attendancePresent: 0,
        };
        addStudent(newStudent, true);
        createdCount++;
      }
    });

    // 3. Keep remaining existing students synced with active + newly created SBA tasks (score: 0)
    if (enabledNewTasks.length > 0 && updatedCount + createdCount > 0) {
      students.forEach((student) => {
        if (touchedStudentIds.has(student.id)) return;
        const existingSub = student.subjects.find(
          (s) => s.name.trim().toLowerCase() === activeSubject.trim().toLowerCase(),
        );
        if (!existingSub) return;

        const existingComps = existingSub.classScoreComponents ?? [];
        const additions = mergedTasksForCreation
          .filter(
            (t) =>
              !existingComps.some(
                (c) => normalizeComponentNameKey(c.name) === normalizeComponentNameKey(t.name),
              ),
          )
          .map((t) => ({
            id: crypto.randomUUID(),
            name: t.name,
            score: 0,
            maxScore: t.maxScore,
            category: t.category,
          }));
        if (additions.length === 0) return;

        const nextComps = [...existingComps, ...additions];
        const totalActual = nextComps.reduce((sum, c) => sum + c.score, 0);
        const totalMax = nextComps.reduce((sum, c) => sum + c.maxScore, 0);
        const nextClassScore =
          totalMax > 0 ? Math.round((totalActual / totalMax) * settings.classScoreMax) : 0;

        updateStudent(
          {
            ...student,
            subjects: student.subjects.map((s) =>
              s === existingSub || (existingSub.id && s.id === existingSub.id)
                ? { ...s, classScoreComponents: nextComps, classScore: nextClassScore }
                : s,
            ),
          },
          true,
        );
      });
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
    <Modal isOpen={isOpen} onClose={resetAndClose} closeOnBackdrop={false} className="max-w-3xl">
      <div className="flex max-h-[90vh] flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <h3
            className="text-main flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg"
            data-record="true"
          >
            <Upload className="text-primary h-5 w-5 shrink-0" />
            <span className="truncate">Import &amp; Export Subject Scores</span>
          </h3>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close modal"
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {availableSubjects.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Add at least one subject in Settings before importing scores.
            </div>
          ) : (
            <>
              {/* Step 1: Subject + Mode Tabs */}
              <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/70 p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div className="min-w-0">
                    <label
                      htmlFor="sba-import-subject"
                      className="mb-1 block text-xs font-bold tracking-wider text-purple-900 uppercase"
                    >
                      1. Target Subject (Subject-by-Subject)
                    </label>
                    <select
                      id="sba-import-subject"
                      value={activeSubject}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setNewColumnOverrides({});
                        setIsPreviewing(false);
                      }}
                      className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-purple-500"
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
                    className={`grid w-full min-w-0 ${
                      modeTabs.length === 1 ? "grid-cols-1" : "grid-cols-3"
                    } gap-1 rounded-xl border border-purple-200 bg-white p-1`}
                  >
                    {modeTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeMode === tab.id}
                        onClick={() => {
                          setModeState(tab.id);
                          setIsPreviewing(false);
                        }}
                        className={`min-w-0 rounded-lg px-1.5 py-1.5 text-center text-[11px] leading-tight font-bold whitespace-normal transition-colors sm:px-2.5 sm:text-xs sm:whitespace-nowrap ${
                          activeMode === tab.id
                            ? "bg-purple-700 text-white shadow-xs"
                            : "text-gray-600 hover:bg-purple-50"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SBA Aggregation Formula / Status Strip */}
                {!isMock && (
                  activeTasks.length > 0 ? (
                    <p className="rounded-lg border border-purple-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-purple-900">
                      <strong>{activeSubject} SBA:</strong> {activeTasks.length} component
                      {activeTasks.length === 1 ? "" : "s"} (total /
                      {activeTasks.reduce((sum, t) => sum + t.maxScore, 0)}) aggregate to{" "}
                      <strong>Class Score (/{settings.classScoreMax})</strong> +{" "}
                      <strong>Exam (/100 → /{settings.examScoreMax})</strong>
                    </p>
                  ) : (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900">
                      No SBA components assigned to <strong>{activeSubject}</strong> yet. Add
                      tasks on the SBA page or use <strong>Single SBA Task</strong> →{" "}
                      <strong>+ Create New SBA Task...</strong> to import component scores.
                    </p>
                  )
                )}

                {/* Single SBA Component Picker / Creator */}
                {activeMode === "SINGLE_COMPONENT" && (
                  <div className="space-y-3 rounded-lg border border-purple-200 bg-white p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                      <div>
                        <label
                          htmlFor="single-sba-task-select"
                          className="mb-1 block text-[11px] font-bold text-gray-600 uppercase"
                        >
                          SBA Component
                        </label>
                        <select
                          id="single-sba-task-select"
                          value={effectiveTaskOption}
                          onChange={(e) => {
                            setSelectedTaskOption(e.target.value);
                            setIsPreviewing(false);
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-purple-500"
                        >
                          {activeTasks.map((task) => (
                            <option key={task.name} value={task.name}>
                              {task.name} (/{task.maxScore})
                            </option>
                          ))}
                          <option value={CREATE_NEW_TASK_VALUE}>
                            + Create New SBA Task...
                          </option>
                        </select>
                      </div>

                      {!isCreatingSingleTask && activeSingleTask && students.length > 0 && (
                        <div className="flex justify-start sm:justify-end">
                          <button
                            type="button"
                            onClick={handleExportSingleComponent}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Export {activeSingleTask.name} (CSV)
                          </button>
                        </div>
                      )}
                    </div>

                    {isCreatingSingleTask && (
                      <div className="space-y-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_0.7fr_1fr]">
                          <input
                            type="text"
                            aria-label="New SBA Task Name"
                            value={newSingleTaskName}
                            onChange={(e) => setNewSingleTaskName(e.target.value)}
                            placeholder="e.g. English Summary Group Work"
                            className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-500"
                          />
                          <input
                            type="number"
                            min={1}
                            max={100}
                            aria-label="New SBA Max Score"
                            value={newSingleTaskMax}
                            onChange={(e) => setNewSingleTaskMax(e.target.value)}
                            placeholder="Max (15)"
                            className={`rounded-lg border bg-white px-2.5 py-1.5 text-center text-xs font-bold outline-none focus:border-indigo-500 ${
                              isSingleTaskMaxValid
                                ? "border-indigo-200"
                                : "border-red-400 text-red-700"
                            }`}
                          />
                          <select
                            aria-label="New SBA Category"
                            value={newSingleTaskCategory}
                            onChange={(e) =>
                              setNewSingleTaskCategory(e.target.value as AssessmentCategory)
                            }
                            className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold"
                          >
                            <option value="CAT">CAT (Test)</option>
                            <option value="GROUP">Group Work</option>
                            <option value="PROJECT">Project</option>
                            <option value="HOMEWORK">Homework</option>
                          </select>
                        </div>
                        {!isSingleTaskMaxValid && (
                          <p className="text-[11px] font-semibold text-red-700" role="alert">
                            Max score must be between 1 and 100.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Template Download & CSV Upload Actions */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-purple-900">
                    {activeMode === "SINGLE_COMPONENT"
                      ? activeSingleTask
                        ? `2-column sheet: Name, ${activeSingleTask.name} (/${activeSingleTask.maxScore})`
                        : "Enter a new SBA task name above to generate its 2-column template."
                      : activeMode === "EXAM_ONLY"
                        ? "2-column end-of-term sheet: Name, Exam (/100). Keeps SBA tasks untouched."
                        : `Expected columns: Name${
                            activeTasks.length > 0
                              ? `, ${activeTasks.map((t) => `${t.name} (/${t.maxScore})`).join(", ")}, Exam (/100)`
                              : `, Class Score (/${settings.classScoreMax}), Exam (/100)`
                          }`}
                  </p>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Template (CSV)
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Upload CSV</span>
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt,text/csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {!isPreviewing ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    Paste rows directly from Excel or Google Sheets (include the header row), or
                    upload a completed CSV template above. Blank cells leave existing scores intact.
                  </p>
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
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
                      (activeMode === "SINGLE_COMPONENT" &&
                        (!activeSingleTask || !isSingleTaskMaxValid))
                    }
                    onClick={() => {
                      setAllowClampExceeding(false);
                      setIsPreviewing(true);
                    }}
                  >
                    Preview &amp; Validate Scores
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {parsedResult && parsedResult.rows.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-900">
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
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
                            onChange={(e) => setCreateUnmatched(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600"
                          />
                          <span>Add unmatched students</span>
                        </label>
                      </div>

                      {parsedResult.unmatchedStudentCount > 0 && (
                        <div
                          role="alert"
                          className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                            parsedResult.matchedStudentCount === 0 && !createUnmatched
                              ? "border-red-300 bg-red-50 text-red-900"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <span>
                            <strong>{parsedResult.unmatchedStudentCount}</strong> row
                            {parsedResult.unmatchedStudentCount === 1 ? " did" : "s did"} not match
                            any existing student in your class.
                            {createUnmatched
                              ? " They will be created as new students (existing students will not receive those scores)."
                              : " Unmatched rows will be skipped — verify student names match your roster."}
                          </span>
                        </div>
                      )}

                      {/* Newly Detected SBA Components Card (Full Subject mode) */}
                      {parsedResult.detectedNewColumns.length > 0 && (
                        <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                            <PlusCircle className="h-4 w-4 text-indigo-600" />
                            <span>
                              New SBA Component{parsedResult.detectedNewColumns.length > 1 ? "s" : ""}{" "}
                              Detected for {activeSubject}
                            </span>
                          </div>
                          <p className="text-[11px] text-indigo-800">
                            These columns aren&apos;t in {activeSubject}&apos;s SBA list yet. Checked
                            items will be created in Settings and assigned to every student.
                          </p>
                          <div className="space-y-2">
                            {parsedResult.detectedNewColumns.map((col) => {
                              const ov = getOverrideForDetected(col);
                              return (
                                <div
                                  key={col.colIndex}
                                  className="grid grid-cols-1 gap-2 rounded-lg border border-indigo-200 bg-white p-2.5 sm:grid-cols-[auto_1.4fr_0.8fr_1fr] sm:items-center"
                                >
                                  <label className="inline-flex cursor-pointer items-center gap-2">
                                    <input
                                      type="checkbox"
                                      aria-label={`Create SBA component ${col.rawHeader}`}
                                      checked={ov.enabled}
                                      onChange={(e) =>
                                        updateNewColOverride(col, { enabled: e.target.checked })
                                      }
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                    />
                                    <span className="text-xs font-bold sm:hidden">Create</span>
                                  </label>

                                  <input
                                    type="text"
                                    aria-label={`Task name for ${col.rawHeader}`}
                                    value={ov.name}
                                    disabled={!ov.enabled}
                                    onChange={(e) =>
                                      updateNewColOverride(col, { name: e.target.value })
                                    }
                                    className="rounded border border-gray-300 px-2 py-1 text-xs font-bold disabled:bg-gray-100"
                                  />

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-gray-500">
                                      Max /
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={100}
                                      aria-label={`Max score for ${col.rawHeader}`}
                                      value={ov.maxScore}
                                      disabled={!ov.enabled}
                                      onChange={(e) =>
                                        updateNewColOverride(col, {
                                          maxScore: Math.min(
                                            100,
                                            Math.max(1, Number(e.target.value) || 1),
                                          ),
                                        })
                                      }
                                      className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-xs font-bold disabled:bg-gray-100"
                                    />
                                  </div>

                                  <select
                                    aria-label={`Category for ${col.rawHeader}`}
                                    value={ov.category}
                                    disabled={!ov.enabled}
                                    onChange={(e) =>
                                      updateNewColOverride(col, {
                                        category: e.target.value as AssessmentCategory,
                                      })
                                    }
                                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold disabled:bg-gray-100"
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
                        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
                          <div className="flex items-center gap-2 font-bold">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>
                              {parsedResult.conflictCount} existing score
                              {parsedResult.conflictCount === 1 ? "" : "s"} already recorded for{" "}
                              {activeSubject}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                              <input
                                type="radio"
                                name="conflictPolicy"
                                checked={conflictPolicy === "OVERWRITE"}
                                onChange={() => setConflictPolicy("OVERWRITE")}
                                className="text-amber-600"
                              />
                              <span>Overwrite existing scores (show old → new)</span>
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                              <input
                                type="radio"
                                name="conflictPolicy"
                                checked={conflictPolicy === "KEEP_EXISTING"}
                                onChange={() => setConflictPolicy("KEEP_EXISTING")}
                                className="text-amber-600"
                              />
                              <span>Keep existing scores (fill blank / 0 only)</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {parsedResult.duplicateRowCount > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs text-orange-900">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600" />
                          <span>
                            Detected {parsedResult.duplicateRowCount} duplicate student row
                            {parsedResult.duplicateRowCount > 1 ? "s" : ""} in your sheet.
                          </span>
                        </div>
                      )}

                      {parsedResult.headerMismatchWarning && (
                        <div
                          role="alert"
                          className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                          <span>{parsedResult.headerMismatchWarning}</span>
                        </div>
                      )}

                      {parsedResult.overMaxCount > 0 && (
                        <div
                          role="alert"
                          className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-950"
                        >
                          <div className="flex items-start gap-2 font-bold">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                            <span>
                              {parsedResult.overMaxCount} score
                              {parsedResult.overMaxCount === 1 ? " exceeds" : "s exceed"} the
                              maximum allowed limit. Fix the out-of-range score
                              {parsedResult.overMaxCount === 1 ? "" : "s"} in your sheet or enable
                              clamping below.
                            </span>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-red-900">
                            <input
                              type="checkbox"
                              checked={allowClampExceeding}
                              onChange={(e) => setAllowClampExceeding(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-red-300 text-red-600"
                            />
                            <span>Clamp scores above maximum to allowed limit</span>
                          </label>
                        </div>
                      )}

                      <div className="max-h-60 overflow-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                            <tr>
                              <th className="px-3 py-2">Student</th>
                              <th className="px-3 py-2">Match</th>
                              <th className="px-3 py-2">Details / Diff</th>
                              <th className="px-3 py-2 text-center">Class (/{settings.classScoreMax})</th>
                              <th className="px-3 py-2 text-center">Exam (/{settings.examScoreMax})</th>
                              <th className="px-3 py-2 text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {parsedResult.rows.map((row, idx) => {
                              const total = row.computedClassScore + row.effectiveExamWeighted;
                              return (
                                <tr
                                  key={idx}
                                  className={row.hasOverMaxError ? "bg-red-50/60" : undefined}
                                >
                                  <td className="px-3 py-2 font-bold text-gray-800">
                                    {row.studentName}
                                    {row.isDuplicateInImport && (
                                      <span className="ml-1.5 rounded bg-orange-100 px-1 py-0.5 text-[9px] font-bold text-orange-800">
                                        Duplicate
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {row.isNewStudent ? (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                        {createUnmatched ? "New Student" : "Skipped"}
                                      </span>
                                    ) : (
                                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                        Matched
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-[11px] text-gray-600">
                                    {row.componentScores.map((c) => (
                                      <span key={c.name} className="mr-2 inline-block">
                                        <strong>{c.name}:</strong>{" "}
                                        {c.clamped ? (
                                          <span className="font-bold text-red-700">
                                            {c.rawScore} &gt; /{c.maxScore}!{" "}
                                            <span className="text-[10px] font-normal">
                                              (max {c.maxScore})
                                            </span>
                                          </span>
                                        ) : c.isConflict ? (
                                          <span className="font-bold text-amber-700">
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
                                  <td className="px-3 py-2 text-center font-mono font-bold">
                                    <div>
                                      {row.computedClassScore}
                                      {row.hasWarnings && (
                                        <span className="ml-1 text-[10px] text-red-600">*</span>
                                      )}
                                    </div>
                                    {row.sbaTaskCount > 0 && (
                                      <div className="text-[10px] font-normal text-gray-500">
                                        {row.sbaRawSum}/{row.sbaMaxSum} ({row.sbaTaskCount} task
                                        {row.sbaTaskCount === 1 ? "" : "s"})
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center font-mono font-bold">
                                    {row.examRawScore ? (
                                      row.examRawScore.clamped ? (
                                        <span className="text-red-700">
                                          {row.examRawScore.enteredRaw}% &gt; /100!
                                        </span>
                                      ) : row.examRawScore.isConflict &&
                                        conflictPolicy === "OVERWRITE" ? (
                                        `${row.examRawScore.existingRaw ?? "?"}% → ${row.examRawScore.raw}%`
                                      ) : (
                                        `${row.examRawScore.weighted} (${row.examRawScore.raw}%)`
                                      )
                                    ) : row.existingExamWeighted > 0 ? (
                                      <span className="text-[11px] font-semibold text-gray-500">
                                        {row.existingExamWeighted} (kept)
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="text-primary px-3 py-2 text-center font-mono font-black">
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
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                      Could not find valid header + score rows. Ensure row 1 contains headers like{" "}
                      <code>Name, Science Project (/20), Exam</code>.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="flex-1"
                      onClick={() => {
                        setAllowClampExceeding(false);
                        setIsPreviewing(false);
                      }}
                    >
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
                      onClick={handleApplyScores}
                    >
                      Apply Scores
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
