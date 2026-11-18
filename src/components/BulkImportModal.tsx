import { useState } from "react";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type { StudentRecord } from "../types";
import posthog from "posthog-js";
import {
  buildDefaultSubjectsForStudent,
  buildRosterTemplateCsv,
  downloadCsvFile,
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

export function BulkImportModal({ isOpen, onClose }: Props) {
  const settings = useSchoolSettings();
  const students = useSchoolStudents();
  const { addStudent, updateStudent } = useSchoolActions();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedRosterRow[]>([]);
  const [hasMissingGender, setHasMissingGender] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  if (!isOpen) return null;

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
    let addedCount = 0;
    let updatedCount = 0;
    const studentById = new Map(students.map((s) => [s.id, s]));

    preview.forEach((row, index) => {
      if (row.matchedExistingId && studentById.has(row.matchedExistingId)) {
        const existing = studentById.get(row.matchedExistingId)!;
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
        updateStudent(updatedRecord, true);
        updatedCount++;
        return;
      }

      const newStudent: StudentRecord = {
        id: `${Date.now()}-${index}`,
        name: row.name,
        gender: row.gender,
        className: settings.className || "Class",
        subjects: buildDefaultSubjectsForStudent(settings),
        attendancePresent: row.attendancePresent ?? 0,
        ...(row.dateOfBirth ? { dateOfBirth: row.dateOfBirth } : {}),
        ...(row.conduct ? { conduct: row.conduct } : {}),
        ...(row.interest ? { interest: row.interest } : {}),
        ...(row.admissionNumber ? { admissionNumber: row.admissionNumber } : {}),
        ...(row.feeStatus ? { feeStatus: row.feeStatus } : {}),
        ...(row.feeArrears !== undefined ? { feeArrears: row.feeArrears } : {}),
        ...(row.guardianPhone ? { guardianPhone: row.guardianPhone } : {}),
      };

      addStudent(newStudent, true);
      addedCount++;
    });

    const totalTouched = addedCount + updatedCount;
    if (totalTouched > 0) {
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`${addedCount} added`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      showToast(`Successfully imported ${totalTouched} student${totalTouched > 1 ? "s" : ""} (${parts.join(", ")})!`, "success");
      posthog.capture("Bulk_Import_Success", {
        students_imported: addedCount,
        students_updated: updatedCount,
      });
    }

    onClose();
    setText("");
    setIsPreviewing(false);
    setPreview([]);
    setHasMissingGender(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} className="max-w-2xl">
      <div className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-main flex items-center gap-2 text-lg font-bold" data-record="true">
            <Upload className="text-primary h-5 w-5" />
            Bulk Import &amp; Setup Students
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {!isPreviewing ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-blue-900">
                  <p className="font-bold">Power-user tip: Paste from Excel/Sheets or upload CSV</p>
                  <p className="mt-0.5 text-blue-700">
                    Supports plain names or columns:{" "}
                    <code className="font-mono">Name, Gender, DateOfBirth, AttendancePresent</code>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Template (CSV)
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
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

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
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
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>
                  Ready to import <strong>{preview.length}</strong> student
                  {preview.length === 1 ? "" : "s"}.
                </span>
              </div>

              {hasMissingGender && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>
                    Some rows didn&apos;t specify gender and defaulted to <strong>Male</strong>. Tap
                    any gender badge below to flip it so Gender Analytics stay accurate!
                  </p>
                </div>
              )}

              <div className="bg-background max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Gender</th>
                      <th className="px-3 py-2">DOB / Att.</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-gray-800">{row.name}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRowGender(i)}
                            title="Click to toggle Male / Female"
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
                              row.gender === "Female"
                                ? "bg-pink-100 text-pink-700 hover:bg-pink-200"
                                : row.genderExplicit
                                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  : "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            }`}
                          >
                            {row.gender}
                            {!row.genderExplicit ? " *" : ""}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {[row.dateOfBirth, row.attendancePresent !== undefined && `${row.attendancePresent}d`]
                            .filter(Boolean)
                            .join(" • ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {row.matchedExistingId ? (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              Update existing
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
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
