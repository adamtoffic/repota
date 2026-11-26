import { useState } from "react";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type { StudentRecord } from "../types";
import { captureEvent } from "../utils/analytics";
import {
  buildDefaultSubjectsForStudent,
  buildRosterTemplateCsv,
  downloadCsvFile,
  normalizeStudentNameKey,
  parseRosterImport,
  type ParsedRosterRow,
} from "../utils/csvImport";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Textarea } from "./ui/Textarea";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal(props: Props) {
  if (!props.isOpen) return null;
  return <BulkImportModalContent {...props} />;
}

function BulkImportModalContent({ isOpen, onClose }: Props) {
  const settings = useSchoolSettings();
  const students = useSchoolStudents();
  const { addStudent, updateStudent, batchUpdateStudents } = useSchoolActions();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedRosterRow[]>([]);
  const [hasMissingGender, setHasMissingGender] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [importSource, setImportSource] = useState<"paste" | "file">("paste");

  const handlePreview = (inputText = text) => {
    if (!inputText.trim()) return;
    const result = parseRosterImport(inputText, students);
    setPreview(result.rows);
    setHasMissingGender(result.hasMissingGender);
    setIsPreviewing(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setImportSource("file");
    setText(content);
    handlePreview(content);
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const csv = buildRosterTemplateCsv(students, settings);
    downloadCsvFile(
      csv,
      `${settings.className || "Class"}_Roster_Template_${new Date().toISOString().split("T")[0]}.csv`,
    );
    showToast("Roster template downloaded!", "success");
  };

  const handleToggleRowGender = (idx: number) => {
    setPreview((prev) =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              gender: row.gender === "Male" ? "Female" : "Male",
              genderExplicit: true,
            }
          : row,
      ),
    );
  };

  const handleImport = () => {
    const updatedRecords = new Map<string, StudentRecord>();
    const newRecordsByKey = new Map<string, StudentRecord>();
    const studentById = new Map(students.map((s) => [s.id, s]));

    preview.forEach((row, index) => {
      if (row.matchedExistingId && studentById.has(row.matchedExistingId)) {
        const existing = updatedRecords.get(row.matchedExistingId) ?? studentById.get(row.matchedExistingId)!;
        const updatedRecord: StudentRecord = {
          ...existing,
          name: row.name,
          gender: row.genderExplicit ? row.gender : existing.gender,
          dateOfBirth: row.dateOfBirth ?? existing.dateOfBirth,
          attendancePresent: row.attendancePresent ?? existing.attendancePresent,
          conduct: row.conduct ?? existing.conduct,
          interest: row.interest ?? existing.interest,
          admissionNumber: row.admissionNumber ?? existing.admissionNumber,
          feeStatus: row.feeStatus ?? existing.feeStatus,
          feeArrears: row.feeArrears ?? existing.feeArrears,
          guardianPhone: row.guardianPhone ?? existing.guardianPhone,
        };
        updatedRecords.set(updatedRecord.id, updatedRecord);
        return;
      }

      const nameKey = normalizeStudentNameKey(row.name);
      const existingNew = newRecordsByKey.get(nameKey);
      if (existingNew) {
        newRecordsByKey.set(nameKey, {
          ...existingNew,
          name: row.name,
          gender: row.genderExplicit ? row.gender : existingNew.gender,
          dateOfBirth: row.dateOfBirth ?? existingNew.dateOfBirth,
          attendancePresent: row.attendancePresent ?? existingNew.attendancePresent,
          conduct: row.conduct ?? existingNew.conduct,
          interest: row.interest ?? existingNew.interest,
          admissionNumber: row.admissionNumber ?? existingNew.admissionNumber,
          feeStatus: row.feeStatus ?? existingNew.feeStatus,
          feeArrears: row.feeArrears ?? existingNew.feeArrears,
          guardianPhone: row.guardianPhone ?? existingNew.guardianPhone,
        });
        return;
      }

      const newStudent: StudentRecord = {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        name: row.name,
        gender: row.gender,
        className: settings.className || "Class",
        subjects: buildDefaultSubjectsForStudent(settings),
        ...(row.attendancePresent !== undefined ? { attendancePresent: row.attendancePresent } : {}),
        ...(row.dateOfBirth ? { dateOfBirth: row.dateOfBirth } : {}),
        ...(row.conduct ? { conduct: row.conduct } : {}),
        ...(row.interest ? { interest: row.interest } : {}),
        ...(row.admissionNumber ? { admissionNumber: row.admissionNumber } : {}),
        ...(row.feeStatus ? { feeStatus: row.feeStatus } : {}),
        ...(row.feeArrears !== undefined ? { feeArrears: row.feeArrears } : {}),
        ...(row.guardianPhone ? { guardianPhone: row.guardianPhone } : {}),
      };

      newRecordsByKey.set(nameKey, newStudent);
    });

    const newRecords = Array.from(newRecordsByKey.values());
    const addedCount = newRecords.length;
    const updatedCount = updatedRecords.size;

    if (addedCount + updatedCount > 0) {
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

    const totalTouched = addedCount + updatedCount;
    if (totalTouched > 0) {
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`${addedCount} added`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      showToast(`Successfully imported ${totalTouched} student${totalTouched > 1 ? "s" : ""} (${parts.join(", ")})!`, "success");
      captureEvent("Bulk_Import_Success", {
        students_imported: addedCount,
        students_updated: updatedCount,
        import_source: importSource,
        school_level: settings.level || "unknown",
        school_type: settings.schoolType || "unknown",
        had_missing_gender: hasMissingGender,
      });
    }

    handleClose();
  };

  const handleClose = () => {
    setText("");
    setIsPreviewing(false);
    setPreview([]);
    setHasMissingGender(false);
    setImportSource("paste");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdrop={false}
      ariaLabelledBy="bulk-import-modal-title"
      className="max-w-2xl"
    >
      <div className="flex max-h-[88dvh] flex-col overflow-hidden">
        {/* Header */}
        <div className="border-border-subtle flex shrink-0 items-center justify-between border-b p-4">
          <h3
            id="bulk-import-modal-title"
            className="text-main flex items-center gap-2 text-lg font-bold"
            data-record="true"
          >
            <Upload className="text-primary-text h-5 w-5" />
            Bulk Import &amp; Setup Students
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="text-muted hover:bg-subtle hover:text-main rounded-lg p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!isPreviewing ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-blue-800/60 dark:bg-blue-950/35">
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-bold">Power-user tip: Paste from Excel/Sheets or upload CSV</p>
                  <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                    Supports plain names or columns:{" "}
                    <code className="font-mono">Name, Gender, DateOfBirth, AttendancePresent</code>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="bg-surface inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Template (CSV)
                  </button>
                  <label className="bg-primary hover:bg-primary/90 focus-within:ring-primary-text focus-within:ring-offset-surface inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus-within:ring-2 focus-within:ring-offset-2">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt,text/csv"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <Textarea
                aria-label="Paste student list or CSV rows"
                value={text}
                onChange={(e) => {
                  setImportSource("paste");
                  setText(e.target.value);
                }}
                placeholder={
                  "Kwame Mensah, Male, 2015-03-14, 65\nAma Serwaa, Female, 2015-07-22, 68\nAiman Adam"
                }
                className="h-56 font-mono text-sm"
              />
              <Button
                onClick={() => handlePreview()}
                disabled={!text.trim()}
                variant="primary"
                size="md"
                fullWidth
                data-record="true"
              >
                Preview List
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:border dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-200">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>
                  Ready to import <strong>{preview.length}</strong> student
                  {preview.length === 1 ? "" : "s"}.
                </span>
              </div>

              {hasMissingGender && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p>
                    Some rows didn&apos;t specify gender and defaulted to <strong>Male</strong>. Tap
                    any gender badge below to flip it so Gender Analytics stay accurate!
                  </p>
                </div>
              )}

              <div className="bg-background border-border max-h-64 overflow-x-auto overflow-y-auto rounded-lg border">
                <table className="w-full min-w-[460px] text-left text-xs">
                  <thead className="bg-subtle text-secondary sticky top-0 text-[10px] font-bold uppercase">
                    <tr>
                      <th scope="col" className="px-3 py-2">#</th>
                      <th scope="col" className="px-3 py-2">Name</th>
                      <th scope="col" className="px-3 py-2">Gender</th>
                      <th scope="col" className="px-3 py-2">DOB / Att.</th>
                      <th scope="col" className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border bg-surface divide-y">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td className="text-muted px-3 py-2">{i + 1}</td>
                        <td className="text-main px-3 py-2 font-bold">{row.name}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRowGender(i)}
                            title="Click to toggle Male / Female"
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
                              row.gender === "Female"
                                ? "bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:hover:bg-pink-900/60"
                                : row.genderExplicit
                                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                                  : "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60"
                            }`}
                          >
                            {row.gender}
                            {!row.genderExplicit ? " *" : ""}
                          </button>
                        </td>
                        <td className="text-secondary px-3 py-2">
                          {[row.dateOfBirth, row.attendancePresent !== undefined && `${row.attendancePresent}d`]
                            .filter(Boolean)
                            .join(" • ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {row.matchedExistingId ? (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              Update existing
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              New
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setIsPreviewing(false)}
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  data-record="true"
                >
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  variant="primary"
                  size="md"
                  className="flex-1"
                  data-record="true"
                >
                  Import All
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
