import { useRef, useState } from "react";
import { CalendarCheck, X } from "lucide-react";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import { captureEvent } from "../utils/analytics";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkAttendanceModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;
  return <BulkAttendanceModalContent onClose={onClose} />;
}

function BulkAttendanceModalContent({ onClose }: { onClose: () => void }) {
  const students = useSchoolStudents();
  const settings = useSchoolSettings();
  const { updateStudent, batchUpdateStudents } = useSchoolActions();
  const { showToast } = useToast();

  const maxDays = settings.totalAttendanceDays || 70;
  const [drafts, setDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.attendancePresent ?? 0])),
  );
  const [fillValue, setFillValue] = useState(String(maxDays));
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getValue = (id: string, fallback = 0) => drafts[id] ?? fallback;

  const handleSetAll = () => {
    const parsed = Math.min(Math.max(Number(fillValue) || 0, 0), maxDays);
    const next: Record<string, number> = {};
    students.forEach((s) => {
      next[s.id] = parsed;
    });
    setDrafts(next);
  };

  const handleSaveAll = () => {
    const patchesById = new Map<string, number>();
    students.forEach((student) => {
      const nextDays = Math.min(
        Math.max(Math.round(getValue(student.id, student.attendancePresent ?? 0)), 0),
        maxDays,
      );
      if (nextDays !== (student.attendancePresent ?? 0)) {
        patchesById.set(student.id, nextDays);
      }
    });

    const updatedCount = patchesById.size;
    if (updatedCount > 0) {
      if (batchUpdateStudents) {
        batchUpdateStudents(
          (prev) =>
            prev.map((student) =>
              patchesById.has(student.id)
                ? { ...student, attendancePresent: patchesById.get(student.id)! }
                : student,
            ),
          { silent: true },
        );
      } else {
        students.forEach((student) => {
          const nextDays = patchesById.get(student.id);
          if (nextDays !== undefined) {
            updateStudent({ ...student, attendancePresent: nextDays }, true);
          }
        });
      }
    }

    showToast(
      updatedCount > 0
        ? `Updated attendance for ${updatedCount} student${updatedCount > 1 ? "s" : ""}!`
        : "Attendance is already up to date.",
      updatedCount > 0 ? "success" : "info",
    );
    if (updatedCount > 0) {
      captureEvent("Class_Tool_Used", {
        tool: "bulk_attendance",
        students_count: updatedCount,
        school_level: settings.level || "unknown",
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} closeOnBackdrop={false} className="max-w-xl">
      <div className="overflow-hidden">
        <div className="border-border-subtle flex items-center justify-between border-b p-4">
          <h3 className="text-main flex items-center gap-2 text-lg font-bold" data-record="true">
            <CalendarCheck className="text-primary-text h-5 w-5" />
            Bulk Attendance Entry
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-muted hover:bg-subtle hover:text-main rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-800/60 dark:bg-blue-950/35">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
              Total Term Days: {maxDays}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maxDays}
                aria-label="Set all attendance days"
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                className="bg-input text-main w-20 rounded-lg border border-blue-200 px-2 py-1 text-center text-xs font-bold dark:border-blue-700"
              />
              <button
                type="button"
                onClick={handleSetAll}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Set All
              </button>
            </div>
          </div>

          <div className="divide-border-subtle border-border max-h-72 divide-y overflow-y-auto rounded-lg border">
            {students.map((student, idx) => {
              const current = getValue(student.id, student.attendancePresent ?? 0);
              return (
                <div
                  key={student.id}
                  className="hover:bg-subtle flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <span className="text-main min-w-0 flex-1 truncate text-sm font-semibold">
                    {idx + 1}. {student.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={(el) => {
                        inputRefs.current[student.id] = el;
                      }}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={maxDays}
                      aria-label={`${student.name} Attendance`}
                      value={current === 0 ? "" : current}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        setDrafts((prev) => ({
                          ...prev,
                          [student.id]: Math.min(Math.max(val, 0), maxDays),
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && idx + 1 < students.length) {
                          e.preventDefault();
                          const next = inputRefs.current[students[idx + 1].id];
                          next?.focus();
                          next?.select();
                        }
                      }}
                      className="border-border-strong bg-input text-main w-20 rounded-lg border px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-blue-500"
                    />
                    <span className="text-muted text-xs font-medium">/ {maxDays}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="md" className="flex-1" onClick={handleSaveAll}>
              Save Attendance
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
