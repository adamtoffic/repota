import type {
  AssessmentCategory,
  ClassScoreComponent,
  ClassScoreComponentConfig,
  SchoolSettings,
  StudentRecord,
} from "../../types";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  resolveExamRawScore,
  updateComponentAndRecalculateClassScore,
} from "../scoreConversion";
import { resolveSubjectSbaTasks } from "./sbaCsvTemplates";
import {
  DERIVED_EXPORT_HEADERS,
  buildStudentLookup,
  cleanTaskNameFromHeader,
  extractHeaderMaxScore,
  findMatchingStudent,
  inferAssessmentCategory,
  normalizeComponentNameKey,
  normalizeHeader,
  normalizeStudentNameKey,
  parseOptionalNumber,
  parseTabularText,
  stripNameListPrefix,
} from "./tabularParser";

export interface DetectedNewSbaColumn {
  colIndex: number;
  rawHeader: string;
  suggestedName: string;
  suggestedMaxScore: number;
  suggestedCategory: AssessmentCategory;
}

export interface NewSbaColumnOverride {
  enabled: boolean;
  name: string;
  maxScore: number;
  category: AssessmentCategory;
}

export type SbaConflictPolicy = "OVERWRITE" | "KEEP_EXISTING";

export interface ParsedSbaComponentPatch {
  name: string;
  rawScore: number;
  score: number;
  existingScore?: number;
  maxScore: number;
  clamped: boolean;
  isConflict: boolean;
  isNewTask: boolean;
  category?: AssessmentCategory;
}

export interface ParsedSbaScoreRow {
  studentName: string;
  matchedStudentId?: string;
  isNewStudent: boolean;
  isDuplicateInImport: boolean;
  componentScores: ParsedSbaComponentPatch[];
  directClassScore?: {
    rawScore: number;
    score: number;
    existingScore?: number;
    clamped: boolean;
    isConflict: boolean;
  };
  examRawScore?: {
    enteredRaw: number;
    raw: number;
    existingRaw?: number;
    weighted: number;
    clamped: boolean;
    isConflict: boolean;
  };
  computedClassScore: number;
  sbaRawSum: number;
  sbaMaxSum: number;
  sbaTaskCount: number;
  existingExamWeighted: number;
  effectiveExamWeighted: number;
  hasWarnings: boolean;
  hasOverMaxError: boolean;
  hasConflicts: boolean;
}

export interface SbaImportParseResult {
  rows: ParsedSbaScoreRow[];
  matchedColumns: string[];
  unmatchedHeaders: string[];
  detectedNewColumns: DetectedNewSbaColumn[];
  tasks: ClassScoreComponentConfig[];
  conflictCount: number;
  duplicateRowCount: number;
  overMaxCount: number;
  matchedStudentCount: number;
  unmatchedStudentCount: number;
  headerMismatchWarning?: string;
}

export interface UploadedScoreCsvInspection {
  detectedSubject?: string;
  suggestedMode?: SbaImportMode;
  matchedTaskName?: string;
  suggestedNewTask?: ClassScoreComponentConfig;
}

const GENERIC_SINGLE_TASK_HEADERS = new Set(["score", "marks", "mark", "sba", "points"]);
const EXAM_COLUMN_HEADERS = new Set([
  "exam",
  "examscore",
  "exams",
  "terminalexam",
  "finalexam",
]);
const DIRECT_CLASS_COLUMN_HEADERS = new Set([
  "classscore",
  "class",
  "sba",
  "sbatotal",
  "continuousassessment",
]);

/**
 * Inspects an uploaded CSV/TSV score file & filename to auto-detect target subject,
 * mode (`SINGLE_COMPONENT`, `EXAM_ONLY`, or `FULL_SUBJECT`), and SBA task metadata.
 */
export function inspectUploadedScoreCsv(
  rawText: string,
  filename: string,
  availableSubjects: string[],
  existingTasksBySubject: Record<string, ClassScoreComponentConfig[]>,
): UploadedScoreCsvInspection {
  const fileBase = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  let detectedSubject: string | undefined;
  if (fileBase) {
    const sortedSubjects = [...availableSubjects].sort((a, b) => b.length - a.length);
    for (const sub of sortedSubjects) {
      const subNorm = sub.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      if (subNorm && (fileBase === subNorm || fileBase.startsWith(`${subNorm} `))) {
        detectedSubject = sub;
        break;
      }
    }
  }

  const table = parseTabularText(rawText);
  if (table.length === 0) {
    return { detectedSubject };
  }

  const rawHeaders = table[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  const nameColIdx = normalizedHeaders.findIndex((h) =>
    ["name", "studentname", "fullname", "student"].includes(h),
  );
  const effectiveNameCol = nameColIdx >= 0 ? nameColIdx : 0;

  const scoreCols = rawHeaders
    .map((raw, idx) => ({ raw, norm: normalizedHeaders[idx], idx }))
    .filter(
      (col) =>
        col.idx !== effectiveNameCol &&
        col.norm.length > 0 &&
        !DERIVED_EXPORT_HEADERS.has(col.norm),
    );

  if (scoreCols.length === 0) {
    return { detectedSubject };
  }

  const targetSubject = detectedSubject ?? availableSubjects[0];
  const existingTasks = targetSubject ? (existingTasksBySubject[targetSubject] ?? []) : [];

  if (scoreCols.length === 1) {
    const only = scoreCols[0];
    const matchingTask = existingTasks.find(
      (t) => normalizeComponentNameKey(t.name) === only.norm,
    );
    if (matchingTask) {
      return {
        detectedSubject,
        suggestedMode: "SINGLE_COMPONENT",
        matchedTaskName: matchingTask.name,
      };
    }

    const headerMax = extractHeaderMaxScore(only.raw);
    const isExamHeader =
      EXAM_COLUMN_HEADERS.has(only.norm) ||
      (only.norm === "score" && (headerMax === 100 || fileBase.includes("exam")));
    if (isExamHeader) {
      return {
        detectedSubject,
        suggestedMode: "EXAM_ONLY",
      };
    }

    if (!DIRECT_CLASS_COLUMN_HEADERS.has(only.norm)) {
      if (GENERIC_SINGLE_TASK_HEADERS.has(only.norm)) {
        return {
          detectedSubject,
          suggestedMode: "SINGLE_COMPONENT",
        };
      }
      const cleanedName = cleanTaskNameFromHeader(only.raw) || only.raw.trim();
      return {
        detectedSubject,
        suggestedMode: "SINGLE_COMPONENT",
        suggestedNewTask: {
          name: cleanedName,
          maxScore: headerMax ?? 15,
          category: inferAssessmentCategory(cleanedName),
        },
      };
    }
  }

  return {
    detectedSubject,
    suggestedMode: "FULL_SUBJECT",
  };
}

export type SbaImportMode = "FULL_SUBJECT" | "SINGLE_COMPONENT" | "EXAM_ONLY";

export function parseSbaScoreImport({
  rawText,
  subjectName,
  existingStudents,
  settings,
  customNewTasks,
  conflictPolicy = "OVERWRITE",
  importMode = "FULL_SUBJECT",
  targetTask,
}: {
  rawText: string;
  subjectName: string;
  existingStudents: StudentRecord[];
  settings: SchoolSettings;
  customNewTasks?: Record<number, NewSbaColumnOverride>;
  conflictPolicy?: SbaConflictPolicy;
  importMode?: SbaImportMode;
  targetTask?: ClassScoreComponentConfig;
}): SbaImportParseResult {
  const table = parseTabularText(rawText);
  const existingTasks = resolveSubjectSbaTasks(subjectName, existingStudents, settings);
  if (table.length < 2) {
    return {
      rows: [],
      matchedColumns: [],
      unmatchedHeaders: [],
      detectedNewColumns: [],
      tasks: existingTasks,
      conflictCount: 0,
      duplicateRowCount: 0,
      overMaxCount: 0,
      matchedStudentCount: 0,
      unmatchedStudentCount: 0,
    };
  }

  const isMock = settings.examType === "MOCK";
  const rawHeaders = table[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const studentByName = buildStudentLookup(existingStudents);

  const nameColIdx = normalizedHeaders.findIndex((h) =>
    ["name", "studentname", "fullname", "student"].includes(h),
  );
  const effectiveNameCol = nameColIdx >= 0 ? nameColIdx : 0;

  const taskColMap = new Map<number, ClassScoreComponentConfig & { isNewTask: boolean }>();
  let directClassCol = -1;
  let examCol = -1;
  const matchedColumns: string[] = [`Name -> col ${effectiveNameCol + 1}`];
  const unmatchedHeaders: string[] = [];
  const detectedNewColumns: DetectedNewSbaColumn[] = [];
  let headerMismatchWarning: string | undefined;
  const dataRows = table.slice(1);

  if (importMode === "EXAM_ONLY") {
    rawHeaders.forEach((rawHeader, idx) => {
      if (idx === effectiveNameCol) return;
      const norm = normalizedHeaders[idx];
      if (!norm) return;
      if (DERIVED_EXPORT_HEADERS.has(norm)) {
        unmatchedHeaders.push(rawHeader);
        return;
      }
      if (
        examCol === -1 &&
        [...EXAM_COLUMN_HEADERS, "score", "marks"].includes(norm)
      ) {
        examCol = idx;
        matchedColumns.push(`${rawHeader} -> Exam (/100)`);
        return;
      }
      unmatchedHeaders.push(rawHeader);
    });
    // Fallback for 2-column exam sheets with custom/blank header
    if (examCol === -1 && rawHeaders.length === 2) {
      const otherIdx = effectiveNameCol === 0 ? 1 : 0;
      const otherNorm = normalizedHeaders[otherIdx];
      if (!DERIVED_EXPORT_HEADERS.has(otherNorm)) {
        examCol = otherIdx;
        matchedColumns.push(`${rawHeaders[otherIdx]} -> Exam (/100)`);
      }
    }
  } else if (importMode === "SINGLE_COMPONENT" && targetTask && !isMock) {
    const targetNorm = normalizeHeader(targetTask.name);
    const alreadyExists = existingTasks.some((t) => normalizeHeader(t.name) === targetNorm);
    let mappedIdx = rawHeaders.findIndex(
      (_, idx) => idx !== effectiveNameCol && normalizedHeaders[idx] === targetNorm,
    );
    if (mappedIdx === -1) {
      mappedIdx = rawHeaders.findIndex(
        (_, idx) =>
          idx !== effectiveNameCol && GENERIC_SINGLE_TASK_HEADERS.has(normalizedHeaders[idx]),
      );
    }
    if (mappedIdx === -1 && rawHeaders.length === 2) {
      const otherIdx = effectiveNameCol === 0 ? 1 : 0;
      const otherHeader = rawHeaders[otherIdx] ?? "";
      const otherNorm = normalizedHeaders[otherIdx] ?? "";
      if (!otherNorm || GENERIC_SINGLE_TASK_HEADERS.has(otherNorm) || otherNorm === targetNorm) {
        mappedIdx = otherIdx;
      } else if (!DERIVED_EXPORT_HEADERS.has(otherNorm)) {
        const cleanedOther = cleanTaskNameFromHeader(otherHeader) || otherHeader.trim();
        headerMismatchWarning = `CSV column "${otherHeader}" does not match selected SBA component "${targetTask.name}". Switch to "${cleanedOther}" or create it instead.`;
      }
    }

    if (mappedIdx >= 0) {
      taskColMap.set(mappedIdx, { ...targetTask, isNewTask: !alreadyExists });
      matchedColumns.push(
        `${rawHeaders[mappedIdx]} -> ${alreadyExists ? "SBA" : "New SBA"}: ${targetTask.name} (/${targetTask.maxScore})`,
      );
    }
    rawHeaders.forEach((h, idx) => {
      if (idx !== effectiveNameCol && idx !== mappedIdx && h.trim()) unmatchedHeaders.push(h);
    });
  } else {
    rawHeaders.forEach((rawHeader, idx) => {
      if (idx === effectiveNameCol) return;
      const norm = normalizedHeaders[idx];
      if (!norm) return;

      const matchingTask = existingTasks.find((t) => normalizeHeader(t.name) === norm);
      if (matchingTask && !isMock) {
        taskColMap.set(idx, { ...matchingTask, isNewTask: false });
        matchedColumns.push(`${rawHeader} -> SBA: ${matchingTask.name}`);
        return;
      }

      if (DERIVED_EXPORT_HEADERS.has(norm)) {
        unmatchedHeaders.push(rawHeader);
        return;
      }

      if (!isMock && DIRECT_CLASS_COLUMN_HEADERS.has(norm)) {
        // When SBA components are configured for this subject, ignore derived Class Score columns
        // so uploaded export sheets do not overwrite SBA-aggregated Class Score.
        if (existingTasks.length === 0) {
          directClassCol = idx;
          matchedColumns.push(`${rawHeader} -> Class Score`);
        } else {
          unmatchedHeaders.push(rawHeader);
        }
        return;
      }

      if ([...EXAM_COLUMN_HEADERS, "score"].includes(norm)) {
        examCol = idx;
        matchedColumns.push(`${rawHeader} -> Exam (/100)`);
        return;
      }

      // Check if unmatched column contains numeric scores (potential new SBA component)
      const numericSamples = dataRows
        .map((r) => parseOptionalNumber(r[idx]))
        .filter((v): v is number => v !== undefined);

      if (!isMock && numericSamples.length > 0) {
        const cleanedName = cleanTaskNameFromHeader(rawHeader) || rawHeader.trim();
        const headerMax = extractHeaderMaxScore(rawHeader);
        const maxObserved = Math.max(...numericSamples);
        const suggestedMaxScore =
          headerMax ??
          (maxObserved > 20
            ? Math.min(100, Math.ceil(maxObserved / 5) * 5)
            : maxObserved > 15
              ? 20
              : 15);
        const suggestedCategory = inferAssessmentCategory(cleanedName);

        detectedNewColumns.push({
          colIndex: idx,
          rawHeader,
          suggestedName: cleanedName,
          suggestedMaxScore,
          suggestedCategory,
        });

        const override = customNewTasks?.[idx];
        const isEnabled = override ? override.enabled : true;
        if (isEnabled) {
          const effectiveName = (override?.name ?? cleanedName).trim() || cleanedName;
          const effectiveMax = Math.min(
            100,
            Math.max(1, override?.maxScore ?? suggestedMaxScore),
          );
          const effectiveCat = override?.category ?? suggestedCategory;
          taskColMap.set(idx, {
            name: effectiveName,
            maxScore: effectiveMax,
            category: effectiveCat,
            isNewTask: true,
          });
          matchedColumns.push(`${rawHeader} -> New SBA: ${effectiveName} (/${effectiveMax})`);
          return;
        }
      }

      unmatchedHeaders.push(rawHeader);
    });
  }

  // Merge existing tasks with any enabled new tasks so classScore recalculation sees full denominator
  const combinedTasks: ClassScoreComponentConfig[] = [...existingTasks];
  taskColMap.forEach((task) => {
    if (task.isNewTask && !combinedTasks.some((t) => normalizeHeader(t.name) === normalizeHeader(task.name))) {
      combinedTasks.push({
        name: task.name,
        maxScore: task.maxScore,
        category: task.category,
      });
    }
  });

  const rows: ParsedSbaScoreRow[] = [];
  const seenNames = new Set<string>();
  let conflictCount = 0;
  let duplicateRowCount = 0;
  let overMaxCount = 0;
  let matchedStudentCount = 0;
  let unmatchedStudentCount = 0;

  for (const cells of dataRows) {
    const rawName = (cells[effectiveNameCol] ?? "").replace(/\s+/g, " ").trim();
    if (!rawName) continue;

    const matchedStudent = findMatchingStudent(rawName, studentByName);
    const nameKey = matchedStudent
      ? normalizeStudentNameKey(matchedStudent.name)
      : normalizeStudentNameKey(rawName);
    const isDuplicateInImport = seenNames.has(nameKey);
    if (isDuplicateInImport) duplicateRowCount++;
    seenNames.add(nameKey);

    if (matchedStudent) matchedStudentCount++;
    else unmatchedStudentCount++;

    const existingSubject = matchedStudent?.subjects.find((s) => s.name === subjectName);

    let hasWarnings = false;
    let hasOverMaxError = false;
    let hasConflicts = false;
    const componentScores: ParsedSbaComponentPatch[] = [];

    // Seed baseline components from existing subject + all configured/new SBA tasks
    let workingComponents: ClassScoreComponent[] = combinedTasks.map((t) => {
      const existingComp = existingSubject?.classScoreComponents?.find(
        (c) => normalizeHeader(c.name) === normalizeHeader(t.name),
      );
      return {
        id: existingComp?.id || crypto.randomUUID(),
        name: t.name,
        maxScore: t.maxScore,
        score: Math.min(existingComp?.score ?? 0, t.maxScore),
        category: t.category ?? existingComp?.category,
      };
    });

    const hasExistingComponents = Boolean(
      existingSubject?.classScoreComponents && existingSubject.classScoreComponents.length > 0,
    );
    let computedClassScore =
      !isMock &&
      taskColMap.size > 0 &&
      workingComponents.length > 0 &&
      (hasExistingComponents || (existingSubject?.classScore ?? 0) === 0)
        ? (() => {
            const totalActual = workingComponents.reduce((sum, c) => sum + c.score, 0);
            const totalMax = workingComponents.reduce((sum, c) => sum + c.maxScore, 0);
            return totalMax > 0 ? Math.round((totalActual * settings.classScoreMax) / totalMax) : 0;
          })()
        : (existingSubject?.classScore ?? 0);

    if (!isMock && taskColMap.size > 0) {
      taskColMap.forEach((task, colIdx) => {
        const val = parseOptionalNumber(cells[colIdx]);
        if (val === undefined) return;
        const clamped = val > task.maxScore;
        if (clamped) {
          hasWarnings = true;
          hasOverMaxError = true;
          overMaxCount++;
        }
        const clampedVal = Math.min(Math.max(val, 0), task.maxScore);

        const existingComp = existingSubject?.classScoreComponents?.find(
          (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
        );
        const existingScore = existingComp && existingComp.score > 0 ? existingComp.score : undefined;
        const isConflict = existingScore !== undefined && existingScore !== clampedVal;
        if (isConflict) {
          hasConflicts = true;
          conflictCount++;
        }

        const effectiveVal =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingScore !== undefined
            ? existingScore
            : clampedVal;

        componentScores.push({
          name: task.name,
          rawScore: val,
          score: clampedVal,
          existingScore,
          maxScore: task.maxScore,
          clamped,
          isConflict,
          isNewTask: task.isNewTask,
          category: task.category,
        });

        const targetComp = workingComponents.find(
          (c) => normalizeHeader(c.name) === normalizeHeader(task.name),
        );
        if (targetComp) {
          const res = updateComponentAndRecalculateClassScore(
            workingComponents,
            targetComp.id,
            effectiveVal,
            settings.classScoreMax,
          );
          workingComponents = res.updatedComponents;
          computedClassScore = res.classScore;
        }
      });
    }

    let directClassScore: ParsedSbaScoreRow["directClassScore"];
    if (!isMock && directClassCol >= 0 && taskColMap.size === 0) {
      const val = parseOptionalNumber(cells[directClassCol]);
      if (val !== undefined) {
        const res = clampDirectClassScore(val, settings.classScoreMax);
        if (res.wasClamped) {
          hasWarnings = true;
          hasOverMaxError = true;
          overMaxCount++;
        }
        const existingCls =
          existingSubject && existingSubject.classScore > 0 ? existingSubject.classScore : undefined;
        const isConflict = existingCls !== undefined && existingCls !== res.score;
        if (isConflict) {
          hasConflicts = true;
          conflictCount++;
        }
        const effectiveCls =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingCls !== undefined
            ? existingCls
            : res.score;
        directClassScore = {
          rawScore: val,
          score: res.score,
          existingScore: existingCls,
          clamped: res.wasClamped,
          isConflict,
        };
        computedClassScore = effectiveCls;
      }
    }

    let examRawScore: ParsedSbaScoreRow["examRawScore"];
    if (examCol >= 0) {
      const val = parseOptionalNumber(cells[examCol]);
      if (val !== undefined) {
        const res = convertExamRawToWeighted(val, settings.examScoreMax);
        if (res.wasClamped) {
          hasWarnings = true;
          hasOverMaxError = true;
          overMaxCount++;
        }
        const existingRaw = existingSubject
          ? resolveExamRawScore(existingSubject, settings.examScoreMax)
          : undefined;
        const isConflict =
          existingSubject !== undefined &&
          existingSubject.examScore > 0 &&
          existingSubject.examScore !== res.weightedScore;
        if (isConflict) {
          hasConflicts = true;
          conflictCount++;
        }
        const effectiveWeighted =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingSubject
            ? existingSubject.examScore
            : res.weightedScore;
        const effectiveRaw =
          isConflict && conflictPolicy === "KEEP_EXISTING" && existingRaw !== undefined
            ? existingRaw
            : res.clampedRaw;

        examRawScore = {
          enteredRaw: val,
          raw: effectiveRaw,
          existingRaw,
          weighted: effectiveWeighted,
          clamped: res.wasClamped,
          isConflict,
        };
      }
    }

    const sbaRawSum =
      Math.round(workingComponents.reduce((sum, c) => sum + c.score, 0) * 100) / 100;
    const sbaMaxSum = workingComponents.reduce((sum, c) => sum + c.maxScore, 0);
    const existingExamWeighted = existingSubject?.examScore ?? 0;
    const effectiveExamWeighted =
      examRawScore !== undefined ? examRawScore.weighted : existingExamWeighted;

    rows.push({
      studentName: matchedStudent ? matchedStudent.name : stripNameListPrefix(rawName),
      matchedStudentId: matchedStudent?.id,
      isNewStudent: !matchedStudent,
      isDuplicateInImport,
      componentScores,
      directClassScore,
      examRawScore,
      computedClassScore,
      sbaRawSum,
      sbaMaxSum,
      sbaTaskCount: workingComponents.length,
      existingExamWeighted,
      effectiveExamWeighted,
      hasWarnings,
      hasOverMaxError,
      hasConflicts,
    });
  }

  return {
    rows,
    matchedColumns,
    unmatchedHeaders,
    detectedNewColumns,
    tasks: combinedTasks,
    conflictCount,
    duplicateRowCount,
    overMaxCount,
    matchedStudentCount,
    unmatchedStudentCount,
    ...(headerMismatchWarning ? { headerMismatchWarning } : {}),
  };
}
