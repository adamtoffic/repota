import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type { ClassScoreComponent, SavedSubject, StudentRecord } from "../types";
import {
  buildDefaultSubjectsForStudent,
  buildSbaScoreTemplateCsv,
  downloadCsvFile,
  parseSbaScoreImport,
  resolveSubjectSbaTasks,
} from "../utils/csvImport";
import { updateComponentAndRecalculateClassScore } from "../utils/scoreConversion";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Textarea } from "./ui/Textarea";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
}

export function ScoreImportModal({ isOpen, onClose, initialSubject }: Props) {
  const settings = useSchoolSettings();
  const students = useSchoolStudents();
  const { addStudent, updateStudent } = useSchoolActions();
  const { showToast } = useToast();

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

  const [rawText, setRawText] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [createUnmatched, setCreateUnmatched] = useState(true);

  const activeTasks = useMemo(
    () => (activeSubject ? resolveSubjectSbaTasks(activeSubject, students, settings) : []),
    [activeSubject, students, settings],
  );

  const parsedResult = useMemo(() => {
    if (!isPreviewing || !activeSubject || !rawText.trim()) return null;
    return parseSbaScoreImport({
      rawText,
      subjectName: activeSubject,
      existingStudents: students,
      settings,
    });
  }, [isPreviewing, activeSubject, rawText, students, settings]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    if (!activeSubject) return;
    const csv = buildSbaScoreTemplateCsv(activeSubject, students, settings);
    downloadCsvFile(
      csv,
      `${activeSubject.replace(/\s+/g, "_")}_SBA_Template_${new Date().toISOString().split("T")[0]}.csv`,
    );
    showToast(`Downloaded ${activeSubject} SBA template!`, "success");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setRawText(content);
    setIsPreviewing(true);
    e.target.value = "";
  };

  const applyScoreRowToSubject = (
    existingSubject: SavedSubject | undefined,
    row: NonNullable<typeof parsedResult>["rows"][number],
    tasks: NonNullable<typeof parsedResult>["tasks"],
  ): SavedSubject => {
    const baseSubject: SavedSubject = existingSubject ?? {
      id: crypto.randomUUID(),
      name: activeSubject,
      classScore: 0,
      examScore: 0,
    };

    let nextComponents: ClassScoreComponent[] | undefined = baseSubject.classScoreComponents
      ? baseSubject.classScoreComponents.map((c) => ({ ...c }))
      : tasks.length > 0
        ? tasks.map((t) => ({
            id: crypto.randomUUID(),
            name: t.name,
            score: 0,
            maxScore: t.maxScore,
            category: t.category,
          }))
        : undefined;

    let nextClassScore = baseSubject.classScore;

    if (row.componentScores.length > 0 && nextComponents) {
      for (const compPatch of row.componentScores) {
        let target = nextComponents.find((c) => c.name === compPatch.name);
        if (!target) {
          target = {
            id: crypto.randomUUID(),
            name: compPatch.name,
            score: 0,
            maxScore: compPatch.maxScore,
          };
          nextComponents.push(target);
        }
        const res = updateComponentAndRecalculateClassScore(
          nextComponents,
          target.id,
          compPatch.score,
          settings.classScoreMax,
        );
        nextComponents = res.updatedComponents;
        nextClassScore = res.classScore;
      }
    } else if (row.directClassScore) {
      nextClassScore = row.directClassScore.score;
    }

    const nextExamScore =
      row.examRawScore !== undefined ? row.examRawScore.weighted : baseSubject.examScore;

    return {
      ...baseSubject,
      classScore: nextClassScore,
      examScore: nextExamScore,
      ...(nextComponents ? { classScoreComponents: nextComponents } : {}),
    };
  };

  const handleApplyScores = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;

    const studentMap = new Map(students.map((s) => [s.id, s]));
    let updatedCount = 0;
    let createdCount = 0;

    parsedResult.rows.forEach((row, idx) => {
      if (row.matchedStudentId && studentMap.has(row.matchedStudentId)) {
        const student = studentMap.get(row.matchedStudentId)!;
        const existingSub = student.subjects.find((s) => s.name === activeSubject);
        const updatedSub = applyScoreRowToSubject(existingSub, row, parsedResult.tasks);
        const nextSubjects = existingSub
          ? student.subjects.map((s) => (s.id === existingSub.id ? updatedSub : s))
          : [...student.subjects, updatedSub];

        updateStudent({ ...student, subjects: nextSubjects }, true);
        updatedCount++;
        return;
      }

      if (createUnmatched && row.isNewStudent) {
        const defaultSubs = buildDefaultSubjectsForStudent(settings);
        const targetExisting = defaultSubs.find((s) => s.name === activeSubject);
        const updatedSub = applyScoreRowToSubject(targetExisting, row, parsedResult.tasks);
        const nextSubjects = targetExisting
          ? defaultSubs.map((s) => (s.id === targetExisting.id ? updatedSub : s))
          : [...defaultSubs, updatedSub];

        const newStudent: StudentRecord = {
          id: `${Date.now()}-${idx}`,
          name: row.studentName,
          gender: "Male",
          className: settings.className || "Class",
          subjects: nextSubjects,
          attendancePresent: 0,
        };
        addStudent(newStudent, true);
        createdCount++;
      }
    });

    const summary: string[] = [];
    if (updatedCount > 0) summary.push(`${updatedCount} updated`);
    if (createdCount > 0) summary.push(`${createdCount} added`);
    showToast(
      summary.length > 0
        ? `Imported ${activeSubject} scores (${summary.join(", ")})!`
        : "No scores were applied.",
      summary.length > 0 ? "success" : "info",
    );

    setRawText("");
    setIsPreviewing(false);
    onClose();
  };

  const resetAndClose = () => {
    setRawText("");
    setIsPreviewing(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} closeOnBackdrop={false} className="max-w-3xl">
      <div className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-main flex items-center gap-2 text-lg font-bold" data-record="true">
            <Upload className="text-primary h-5 w-5" />
            Import Scored SBA &amp; Exam Sheet
          </h3>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {availableSubjects.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Add at least one subject in Settings before importing scores.
            </div>
          ) : (
            <>
              {/* Subject Selector + Template Download */}
              <div className="flex flex-col gap-3 rounded-xl border border-purple-200 bg-purple-50/70 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="sba-import-subject"
                    className="mb-1 block text-xs font-bold tracking-wider text-purple-900 uppercase"
                  >
                    Target Subject
                  </label>
                  <select
                    id="sba-import-subject"
                    value={activeSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
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
                  <p className="mt-1.5 text-[11px] text-purple-800">
                    Expected columns:{" "}
                    <strong>
                      Name
                      {settings.examType === "MOCK"
                        ? ", Score (/100)"
                        : activeTasks.length > 0
                          ? `, ${activeTasks.map((t) => `${t.name} (/${t.maxScore})`).join(", ")}, Exam (/100)`
                          : `, Class Score (/${settings.classScoreMax}), Exam (/100)`}
                    </strong>
                  </p>
                </div>

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

              {!isPreviewing ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    Paste rows directly from Excel or Google Sheets (include the header row), or
                    upload a completed CSV template above.
                  </p>
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Name\t${activeTasks[0]?.name || "Class Score"}\tExam\nKwame Mensah\t12\t78\nAma Serwaa\t14\t85`}
                    className="h-52 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={!rawText.trim()}
                    onClick={() => setIsPreviewing(true)}
                  >
                    Preview &amp; Validate Scores
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {parsedResult && parsedResult.rows.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-900">
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                          <span>
                            Parsed <strong>{parsedResult.rows.length}</strong> row
                            {parsedResult.rows.length === 1 ? "" : "s"} • Mapped:{" "}
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

                      {parsedResult.rows.some((r) => r.hasWarnings) && (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>
                            Some scores exceeded column maximums and were clamped safely to valid
                            limits.
                          </span>
                        </div>
                      )}

                      <div className="max-h-60 overflow-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                            <tr>
                              <th className="px-3 py-2">Student</th>
                              <th className="px-3 py-2">Match</th>
                              <th className="px-3 py-2 text-center">Class (/{settings.classScoreMax})</th>
                              <th className="px-3 py-2 text-center">Exam (/{settings.examScoreMax})</th>
                              <th className="px-3 py-2 text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {parsedResult.rows.map((row, idx) => {
                              const examWeighted = row.examRawScore?.weighted ?? 0;
                              const total = row.computedClassScore + examWeighted;
                              return (
                                <tr key={idx}>
                                  <td className="px-3 py-2 font-bold text-gray-800">
                                    {row.studentName}
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
                                  <td className="px-3 py-2 text-center font-mono font-bold">
                                    {row.computedClassScore}
                                    {row.hasWarnings && (
                                      <span className="ml-1 text-[10px] text-amber-600">*</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center font-mono font-bold">
                                    {row.examRawScore ? `${examWeighted} (${row.examRawScore.raw}%)` : "—"}
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
                      <code>Name, Exam</code> or SBA task names.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="flex-1"
                      onClick={() => setIsPreviewing(false)}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      className="flex-1"
                      disabled={!parsedResult || parsedResult.rows.length === 0}
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
