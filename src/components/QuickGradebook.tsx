import { useMemo, useRef, useState } from "react";
import { BookOpen, ExternalLink, PlusCircle, TableProperties } from "lucide-react";
import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";
import { calculateGrade } from "../utils/gradeCalculator";
import {
  clampDirectClassScore,
  convertExamRawToWeighted,
  formatExamWeightedAsRaw,
  updateComponentAndRecalculateClassScore,
} from "../utils/scoreConversion";

interface QuickGradebookProps {
  students: ProcessedStudent[];
  settings: SchoolSettings;
  onUpdateStudent: (updated: StudentRecord, silent?: boolean) => void;
  onOpenStudent?: (student: ProcessedStudent) => void;
}

type FocusColumn = "CLASS_EXAM" | `COMP:${string}`;

export function QuickGradebook({
  students,
  settings,
  onUpdateStudent,
  onOpenStudent,
}: QuickGradebookProps) {
  const isMockExam = settings.examType === "MOCK";
  const maxClassScore = settings.classScoreMax;
  const maxExamScore = settings.examScoreMax;

  const availableSubjects = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const addSubjectName = (name: string) => {
      if (name && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    };

    (settings.defaultSubjects || []).forEach(addSubjectName);
    students.forEach((student) => student.subjects.forEach((sub) => addSubjectName(sub.name)));
    return ordered;
  }, [settings.defaultSubjects, students]);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const activeSubject = availableSubjects.includes(selectedSubject)
    ? selectedSubject
    : (availableSubjects[0] ?? "");

  const [focusColumn, setFocusColumn] = useState<FocusColumn>("CLASS_EXAM");
  const [examDrafts, setExamDrafts] = useState<Record<string, { baseScore: number; raw: string }>>(
    {},
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Discover SBA tasks attached to this subject across the class
  const sbaTaskOptions = useMemo(() => {
    if (isMockExam || !activeSubject) return [] as Array<{ name: string; maxScore: number }>;
    const byName = new Map<string, number>();
    students.forEach((student) => {
      const subject = student.subjects.find((sub) => sub.name === activeSubject);
      subject?.classScoreComponents?.forEach((comp) => {
        if (!byName.has(comp.name)) {
          byName.set(comp.name, comp.maxScore);
        }
      });
    });
    return Array.from(byName.entries()).map(([name, maxScore]) => ({ name, maxScore }));
  }, [isMockExam, activeSubject, students]);

  const activeFocusColumn: FocusColumn =
    focusColumn.startsWith("COMP:") &&
    sbaTaskOptions.some((task) => `COMP:${task.name}` === focusColumn)
      ? focusColumn
      : "CLASS_EXAM";

  const activeComponentName = activeFocusColumn.startsWith("COMP:")
    ? activeFocusColumn.slice("COMP:".length)
    : null;

  const scoredCount = useMemo(() => {
    if (!activeSubject) return 0;
    return students.filter((student) => {
      const subject = student.subjects.find((sub) => sub.name === activeSubject);
      if (!subject) return false;
      if (isMockExam) return subject.examScore > 0;
      return subject.classScore > 0 || subject.examScore > 0;
    }).length;
  }, [activeSubject, isMockExam, students]);

  const focusNextStudentInput = (field: "class" | "exam" | "comp", currentIndex: number) => {
    for (let nextIndex = currentIndex + 1; nextIndex < students.length; nextIndex++) {
      const nextInput = inputRefs.current[`${field}:${students[nextIndex].id}`];
      if (nextInput && !nextInput.disabled) {
        nextInput.focus();
        nextInput.select();
        return;
      }
    }
  };

  const commitSubjectUpdate = (student: ProcessedStudent, updatedSubject: SavedSubject) => {
    const updatedSubjects = student.subjects.map((sub) =>
      sub.id === updatedSubject.id ? updatedSubject : sub,
    );
    onUpdateStudent({ ...student, subjects: updatedSubjects }, true);
  };

  const handleAddSubjectToStudent = (student: ProcessedStudent) => {
    if (!activeSubject) return;
    const configuredTasks = settings.subjectComponentMap?.[activeSubject];
    const newSubject: SavedSubject = {
      id: crypto.randomUUID(),
      name: activeSubject,
      classScore: 0,
      examScore: 0,
      classScoreComponents: configuredTasks?.map((task, idx) => ({
        id: `${Date.now()}-${idx}-${task.name}`,
        name: task.name,
        maxScore: task.maxScore,
        score: 0,
      })),
    };
    onUpdateStudent({ ...student, subjects: [...student.subjects, newSubject] }, true);
  };

  if (availableSubjects.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-gray-400" />
        <h3 className="text-main text-base font-bold" data-record="true">
          No Subjects Configured
        </h3>
        <p className="text-muted mt-1 text-sm" data-record="true">
          Add default subjects in Settings to use Quick Gradebook entry.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header Controls */}
      <div className="border-b border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TableProperties className="text-primary h-5 w-5" />
              <h2 className="text-main text-lg font-bold" data-record="true">
                Quick Gradebook
              </h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {scoredCount}/{students.length} scored
              </span>
            </div>
            <p className="text-muted mt-0.5 text-xs" data-record="true">
              Enter scores subject-by-subject. Press Next or Enter to advance to the next student.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Gradebook subject"
              value={activeSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {availableSubjects.map((subjectName) => (
                <option key={subjectName} value={subjectName}>
                  {subjectName}
                </option>
              ))}
            </select>

            {sbaTaskOptions.length > 0 && (
              <select
                aria-label="Gradebook score column"
                value={activeFocusColumn}
                onChange={(e) => setFocusColumn(e.target.value as FocusColumn)}
                className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800 shadow-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 sm:text-sm"
              >
                <option value="CLASS_EXAM">Class &amp; Exam (/100)</option>
                {sbaTaskOptions.map((task) => (
                  <option key={task.name} value={`COMP:${task.name}`}>
                    SBA: {task.name} (/{task.maxScore})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Gradebook Rows */}
      <div className="divide-y divide-gray-100">
        {students.map((student, index) => {
          const subject = student.subjects.find((sub) => sub.name === activeSubject);

          if (!subject) {
            return (
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-main truncate text-sm font-bold">
                    {index + 1}. {student.name}
                  </p>
                  <p className="text-muted text-xs">Missing {activeSubject}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSubjectToStudent(student)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add Subject</span>
                </button>
              </div>
            );
          }

          const hasComponents =
            !isMockExam && Boolean(subject.classScoreComponents?.length);
          const total = (subject.classScore || 0) + (subject.examScore || 0);
          const { grade } = calculateGrade(total, settings.level);

          const draftKey = `${student.id}:${subject.id}`;
          const draft = examDrafts[draftKey];
          const examRawValue =
            draft !== undefined && draft.baseScore === subject.examScore
              ? draft.raw
              : formatExamWeightedAsRaw(subject.examScore, maxExamScore);

          const activeComponent = activeComponentName
            ? subject.classScoreComponents?.find((comp) => comp.name === activeComponentName)
            : undefined;

          return (
            <div
              key={student.id}
              className="flex flex-col gap-2.5 px-4 py-3 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              {/* Student Identity */}
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-main truncate text-sm font-bold">
                    {index + 1}. {student.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-600">{total} total</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        total < 50 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {grade}
                    </span>
                    {!isMockExam && hasComponents && (
                      <span className="text-[11px] font-medium text-purple-700">
                        Class: {subject.classScore}/{maxClassScore}
                      </span>
                    )}
                  </div>
                </div>

                {onOpenStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenStudent(student)}
                    aria-label={`Open ${student.name} details`}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
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
                    <label className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-purple-700 uppercase">
                        {activeComponent.name} (/{activeComponent.maxScore})
                      </span>
                      <input
                        ref={(el) => {
                          inputRefs.current[`comp:${student.id}`] = el;
                        }}
                        type="number"
                        inputMode="numeric"
                        enterKeyHint="next"
                        min={0}
                        max={activeComponent.maxScore}
                        aria-label={`${student.name} ${activeComponent.name} Score`}
                        value={activeComponent.score === 0 ? "" : activeComponent.score}
                        placeholder={`/${activeComponent.maxScore}`}
                        onChange={(e) => {
                          if (!subject.classScoreComponents) return;
                          const rawScore = e.target.value === "" ? 0 : Number(e.target.value);
                          const { updatedComponents, classScore } =
                            updateComponentAndRecalculateClassScore(
                              subject.classScoreComponents,
                              activeComponent.id,
                              rawScore,
                              maxClassScore,
                            );
                          commitSubjectUpdate(student, {
                            ...subject,
                            classScoreComponents: updatedComponents,
                            classScore,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusNextStudentInput("comp", index);
                          }
                        }}
                        className="w-24 rounded-lg border border-purple-300 bg-white px-2 py-2 text-center text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />
                    </label>
                  ) : (
                    <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      Not configured
                    </span>
                  )
                ) : (
                  <>
                    {!isMockExam && !hasComponents && (
                      <label className="flex flex-col items-center gap-0.5">
                        <span
                          className="text-[10px] font-bold text-gray-500 uppercase"
                          data-record="true"
                        >
                          Class (/{maxClassScore})
                        </span>
                        <input
                          ref={(el) => {
                            inputRefs.current[`class:${student.id}`] = el;
                          }}
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          min={0}
                          max={maxClassScore}
                          aria-label={`${student.name} Class Score`}
                          value={subject.classScore === 0 ? "" : subject.classScore}
                          placeholder={`/${maxClassScore}`}
                          onChange={(e) => {
                            if (e.target.value === "") {
                              commitSubjectUpdate(student, { ...subject, classScore: 0 });
                              return;
                            }
                            const { score } = clampDirectClassScore(
                              Number(e.target.value),
                              maxClassScore,
                            );
                            commitSubjectUpdate(student, { ...subject, classScore: score });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              focusNextStudentInput("class", index);
                            }
                          }}
                          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    )}

                    <label className="flex flex-col items-center gap-0.5">
                      <span
                        className="text-[10px] font-bold text-gray-500 uppercase"
                        data-record="true"
                      >
                        {isMockExam ? "Score (/100)" : "Exam (/100)"}
                      </span>
                      <input
                        ref={(el) => {
                          inputRefs.current[`exam:${student.id}`] = el;
                        }}
                        type="number"
                        inputMode="numeric"
                        enterKeyHint="next"
                        min={0}
                        max={100}
                        aria-label={`${student.name} Exam Score`}
                        value={examRawValue}
                        placeholder="/100"
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setExamDrafts((prev) => ({
                              ...prev,
                              [draftKey]: { baseScore: 0, raw: "" },
                            }));
                            commitSubjectUpdate(student, { ...subject, examScore: 0 });
                            return;
                          }

                          const { clampedRaw, wasClamped, weightedScore } = convertExamRawToWeighted(
                            Number(raw),
                            maxExamScore,
                          );
                          setExamDrafts((prev) => ({
                            ...prev,
                            [draftKey]: {
                              baseScore: weightedScore,
                              raw: wasClamped ? String(clampedRaw) : raw,
                            },
                          }));
                          commitSubjectUpdate(student, { ...subject, examScore: weightedScore });
                        }}
                        onBlur={() => {
                          setExamDrafts((prev) => {
                            if (!(draftKey in prev)) return prev;
                            const next = { ...prev };
                            delete next[draftKey];
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusNextStudentInput("exam", index);
                          }
                        }}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
