import { ExternalLink, PlusCircle } from "lucide-react";
import type {
  ClassScoreComponentConfig,
  ProcessedStudent,
  SavedSubject,
  SchoolLevel,
} from "../../types";
import { calculateGrade } from "../../utils/gradeCalculator";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  getExamRawDisplayValue,
  updateComponentAndRecalculateClassScore,
} from "../../utils/scoreConversion";
import type { FocusColumn } from "./gradebookHelpers";

interface QuickGradebookRowProps {
  student: ProcessedStudent;
  index: number;
  visibleStudents: ProcessedStudent[];
  activeSubject: string;
  schoolLevel: SchoolLevel;
  isMockExam: boolean;
  maxClassScore: number;
  maxExamScore: number;
  activeFocusColumn: FocusColumn;
  activeComponentName: string | null;
  sbaTaskOptions: ClassScoreComponentConfig[];
  idPrefix: string;
  examDraft: { baseScore: number; raw: string } | undefined;
  onSetExamDraft: (draftKey: string, value: { baseScore: number; raw: string } | null) => void;
  onScheduleBlurCleanup: (draftKey: string) => void;
  onClearBlurCleanup: (draftKey: string) => void;
  onRegisterInput: (key: string, el: HTMLInputElement | null) => void;
  onFocusAdjacent: (
    field: "class" | "exam" | "comp",
    studentId: string,
    direction: 1 | -1,
  ) => void;
  onColumnPaste: (
    e: React.ClipboardEvent<HTMLInputElement>,
    field: "class" | "exam" | "comp",
    studentId: string,
  ) => void;
  onCommitSubjectUpdate: (student: ProcessedStudent, updatedSubject: SavedSubject) => void;
  onAddSubjectToStudent: (student: ProcessedStudent) => void;
  onSelectSbaTaskForStudent: (taskName: string, studentId: string) => void;
  onOpenStudent?: (student: ProcessedStudent, orderedStudents?: ProcessedStudent[]) => void;
}

export function QuickGradebookRow({
  student,
  index,
  visibleStudents,
  activeSubject,
  schoolLevel,
  isMockExam,
  maxClassScore,
  maxExamScore,
  activeFocusColumn,
  activeComponentName,
  sbaTaskOptions,
  idPrefix,
  examDraft,
  onSetExamDraft,
  onScheduleBlurCleanup,
  onClearBlurCleanup,
  onRegisterInput,
  onFocusAdjacent,
  onColumnPaste,
  onCommitSubjectUpdate,
  onAddSubjectToStudent,
  onSelectSbaTaskForStudent,
  onOpenStudent,
}: QuickGradebookRowProps) {
  const subject = student.subjects.find((sub) => sub.name === activeSubject);

  if (!subject) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-main truncate text-sm font-bold">
            {index + 1}. {student.name}
          </p>
          <p className="text-muted text-xs">Missing {activeSubject}</p>
        </div>
        <button
          type="button"
          onClick={() => onAddSubjectToStudent(student)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950/80"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Add Subject</span>
        </button>
      </div>
    );
  }

  const hasComponents = !isMockExam && Boolean(subject.classScoreComponents?.length);
  const total = (subject.classScore || 0) + (subject.examScore || 0);
  const { grade } = calculateGrade(total, schoolLevel);

  const draftKey = `${student.id}:${subject.id}`;
  const examRawValue =
    examDraft !== undefined && examDraft.baseScore === subject.examScore
      ? examDraft.raw
      : getExamRawDisplayValue(subject, maxExamScore);

  const activeComponent = activeComponentName
    ? subject.classScoreComponents?.find((comp) => comp.name === activeComponentName)
    : undefined;
  const safeStudentId = student.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const compInputId = `${idPrefix}-comp-${safeStudentId}`;
  const classInputId = `${idPrefix}-class-${safeStudentId}`;
  const examInputId = `${idPrefix}-exam-${safeStudentId}`;
  const showClassInput =
    !isMockExam &&
    !hasComponents &&
    (activeFocusColumn === "CLASS_EXAM" || activeFocusColumn === "CLASS_ONLY");
  const showExamInput =
    isMockExam || activeFocusColumn === "CLASS_EXAM" || activeFocusColumn === "EXAM_ONLY";

  return (
    <div className="hover:bg-subtle/60 flex flex-col gap-2.5 px-4 py-3 transition-colors last:rounded-b-xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
      {/* Student Identity */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-main truncate text-sm font-bold">
            {index + 1}. {student.name}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            <span className="text-muted font-semibold tabular-nums">{total} total</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                total < 50
                  ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  : "bg-green-100 text-green-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              }`}
            >
              {grade}
            </span>
            {!isMockExam && hasComponents && (
              <span className="text-[11px] font-medium text-purple-700 tabular-nums dark:text-purple-400">
                Class: {subject.classScore}/{maxClassScore}
              </span>
            )}
          </div>
        </div>

        {onOpenStudent && (
          <button
            type="button"
            onClick={() => onOpenStudent(student, visibleStudents)}
            aria-label={`Open ${student.name} details`}
            className="text-muted hover:bg-subtle hover:text-main rounded-lg p-2"
            title="Open full score sheet"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Numeric Entry Inputs */}
      <div className="flex items-center gap-2 sm:shrink-0">
        {activeComponentName ? (
          activeComponent ? (
            <div className="flex flex-col items-center gap-0.5">
              <label
                htmlFor={compInputId}
                className="text-[10px] font-bold text-purple-700 uppercase dark:text-purple-300"
              >
                {activeComponent.name} (/{activeComponent.maxScore})
              </label>
              <input
                id={compInputId}
                name={compInputId}
                ref={(el) => onRegisterInput(`comp:${student.id}`, el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="next"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`${student.name} ${activeComponent.name} Score`}
                value={activeComponent.score === 0 ? "" : activeComponent.score}
                placeholder={`/${activeComponent.maxScore}`}
                onChange={(e) => {
                  if (!subject.classScoreComponents) return;
                  const raw = e.target.value;
                  if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                  const rawScore = raw === "" ? 0 : Number(raw);
                  if (!Number.isFinite(rawScore)) return;
                  const { updatedComponents, classScore } = updateComponentAndRecalculateClassScore(
                    subject.classScoreComponents,
                    activeComponent.id,
                    rawScore,
                    maxClassScore,
                  );
                  onCommitSubjectUpdate(student, {
                    ...subject,
                    classScoreComponents: updatedComponents,
                    classScore,
                  });
                }}
                onPaste={(e) => onColumnPaste(e, "comp", student.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "ArrowDown") {
                    e.preventDefault();
                    onFocusAdjacent("comp", student.id, 1);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    onFocusAdjacent("comp", student.id, -1);
                  }
                }}
                className="bg-input text-main placeholder:text-muted w-24 scroll-mt-24 scroll-mb-40 rounded-lg border border-purple-300 px-2 py-2 text-center text-sm font-bold tabular-nums outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-purple-700/70"
              />
            </div>
          ) : (
            <span className="border-border bg-subtle text-muted rounded-lg border px-3 py-2 text-xs">
              Not configured
            </span>
          )
        ) : (
          <>
            {activeFocusColumn === "CLASS_ONLY" && hasComponents && (
              <span className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 tabular-nums dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-300">
                SBA: {subject.classScore}/{maxClassScore}
              </span>
            )}

            {!isMockExam && hasComponents && activeFocusColumn === "CLASS_EXAM" && (
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-muted text-[10px] font-bold uppercase"
                  data-record="true"
                >
                  Class (/{maxClassScore})
                </span>
                {sbaTaskOptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelectSbaTaskForStudent(sbaTaskOptions[0].name, student.id)}
                    title="Open SBA task scores"
                    className="inline-flex h-[38px] items-center whitespace-nowrap rounded-lg border border-purple-200 bg-purple-50 px-2.5 text-xs font-semibold text-purple-700 tabular-nums transition-colors hover:bg-purple-100 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900/60"
                  >
                    {subject.classScore}/{maxClassScore} · SBA
                  </button>
                ) : (
                  <span className="inline-flex h-[38px] items-center whitespace-nowrap rounded-lg border border-purple-200 bg-purple-50 px-2.5 text-xs font-semibold text-purple-700 tabular-nums dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-300">
                    {subject.classScore}/{maxClassScore} · SBA
                  </span>
                )}
              </div>
            )}

            {showClassInput && (
              <div className="flex flex-col items-center gap-0.5">
                <label
                  htmlFor={classInputId}
                  className="text-muted text-[10px] font-bold uppercase"
                  data-record="true"
                >
                  Class (/{maxClassScore})
                </label>
                <input
                  id={classInputId}
                  name={classInputId}
                  ref={(el) => onRegisterInput(`class:${student.id}`, el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`${student.name} Class Score`}
                  value={subject.classScore === 0 ? "" : subject.classScore}
                  placeholder={`/${maxClassScore}`}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      onCommitSubjectUpdate(student, { ...subject, classScore: 0 });
                      return;
                    }
                    if (!/^\d*\.?\d*$/.test(raw)) return;
                    const numeric = Number(raw);
                    if (!Number.isFinite(numeric)) return;
                    const { score } = clampDirectClassScore(numeric, maxClassScore);
                    onCommitSubjectUpdate(student, { ...subject, classScore: score });
                  }}
                  onPaste={(e) => onColumnPaste(e, "class", student.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "ArrowDown") {
                      e.preventDefault();
                      onFocusAdjacent("class", student.id, 1);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      onFocusAdjacent("class", student.id, -1);
                    }
                  }}
                  className="border-border-strong bg-input text-main placeholder:text-muted w-20 scroll-mt-24 scroll-mb-40 rounded-lg border px-2 py-2 text-center text-sm font-bold tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            )}

            {showExamInput && (
              <div className="flex flex-col items-center gap-0.5">
                <label
                  htmlFor={examInputId}
                  className="text-muted text-[10px] font-bold uppercase"
                  data-record="true"
                >
                  {isMockExam ? "Score (/100)" : "Exam (/100)"}
                </label>
                <input
                  id={examInputId}
                  name={examInputId}
                  ref={(el) => onRegisterInput(`exam:${student.id}`, el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`${student.name} Exam Score`}
                  value={examRawValue}
                  placeholder="/100"
                  onFocus={() => onClearBlurCleanup(draftKey)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onClearBlurCleanup(draftKey);

                    if (raw === "") {
                      onSetExamDraft(draftKey, null);
                      const cleared = { ...subject, examScore: 0 };
                      delete cleared.examRawScore;
                      onCommitSubjectUpdate(student, cleared);
                      return;
                    }

                    if (!/^\d*\.?\d*$/.test(raw)) return;
                    const numeric = Number(raw);
                    if (!Number.isFinite(numeric)) return;

                    const { clampedRaw, wasClamped, weightedScore } = convertExamRawToWeighted(
                      numeric,
                      maxExamScore,
                    );
                    const nextExamRaw = weightedScore > 0 ? clampedRaw : undefined;
                    const normalizedDisplay = wasClamped ? String(clampedRaw) : raw;
                    const formattedWeighted = getExamRawDisplayValue(
                      { examScore: weightedScore, examRawScore: nextExamRaw },
                      maxExamScore,
                    );

                    if (normalizedDisplay !== formattedWeighted) {
                      onSetExamDraft(draftKey, {
                        baseScore: weightedScore,
                        raw: normalizedDisplay,
                      });
                    } else if (examDraft !== undefined) {
                      onSetExamDraft(draftKey, null);
                    }

                    const nextSub: SavedSubject = { ...subject, examScore: weightedScore };
                    if (nextExamRaw !== undefined) {
                      nextSub.examRawScore = nextExamRaw;
                    } else {
                      delete nextSub.examRawScore;
                    }
                    onCommitSubjectUpdate(student, nextSub);
                  }}
                  onBlur={() => {
                    if (examDraft === undefined) return;
                    onScheduleBlurCleanup(draftKey);
                  }}
                  onPaste={(e) => onColumnPaste(e, "exam", student.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "ArrowDown") {
                      e.preventDefault();
                      onFocusAdjacent("exam", student.id, 1);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      onFocusAdjacent("exam", student.id, -1);
                    }
                  }}
                  className="border-border-strong bg-input text-main placeholder:text-muted w-20 scroll-mt-24 scroll-mb-40 rounded-lg border px-2 py-2 text-center text-sm font-bold tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
