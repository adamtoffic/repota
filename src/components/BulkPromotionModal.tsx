import { useState } from "react";
import { GraduationCap, X } from "lucide-react";
import { useSchoolActions, useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import { captureEvent } from "../utils/analytics";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkPromotionModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;
  return <BulkPromotionModalContent onClose={onClose} />;
}

function BulkPromotionModalContent({ onClose }: { onClose: () => void }) {
  const students = useSchoolStudents();
  const settings = useSchoolSettings();
  const { updateStudent, batchUpdateStudents } = useSchoolActions();
  const { showToast } = useToast();

  const [threshold, setThreshold] = useState(50);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const getSuggestedStatus = (avgScore: number, className: string) =>
    avgScore >= threshold ? "Promoted to Next Class" : `Repeated ${className}`;

  const getEffectiveStatus = (studentId: string, avgScore: number, className: string, current?: string) =>
    overrides[studentId] ?? (current || getSuggestedStatus(avgScore, className));

  const handleAutoAssignAll = () => {
    const next: Record<string, string> = {};
    students.forEach((s) => {
      next[s.id] = getSuggestedStatus(s.averageScore, s.className);
    });
    setOverrides(next);
  };

  const handleApply = () => {
    const patchesById = new Map<string, string>();
    students.forEach((student) => {
      const nextStatus = getEffectiveStatus(
        student.id,
        student.averageScore,
        student.className,
        student.promotionStatus,
      );
      if (nextStatus !== student.promotionStatus) {
        patchesById.set(student.id, nextStatus);
      }
    });

    const updated = patchesById.size;
    if (updated > 0) {
      if (batchUpdateStudents) {
        batchUpdateStudents(
          (prev) =>
            prev.map((student) =>
              patchesById.has(student.id)
                ? { ...student, promotionStatus: patchesById.get(student.id)! }
                : student,
            ),
          { silent: true },
        );
      } else {
        students.forEach((student) => {
          const nextStatus = patchesById.get(student.id);
          if (nextStatus !== undefined) {
            updateStudent({ ...student, promotionStatus: nextStatus }, true);
          }
        });
      }
    }

    showToast(
      updated > 0
        ? `Updated promotion status for ${updated} student${updated > 1 ? "s" : ""}!`
        : "No promotion changes needed.",
      updated > 0 ? "success" : "info",
    );
    if (updated > 0) {
      captureEvent("Class_Tool_Used", {
        tool: "bulk_promotion",
        students_count: updated,
        school_level: settings.level || "unknown",
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      closeOnBackdrop={false}
      ariaLabelledBy="bulk-promotion-modal-title"
      className="max-w-2xl"
    >
      <div className="flex max-h-[88dvh] flex-col overflow-hidden">
        <div className="border-border-subtle flex shrink-0 items-center justify-between border-b p-4">
          <h3
            id="bulk-promotion-modal-title"
            className="text-main flex items-center gap-2 text-lg font-bold"
            data-record="true"
          >
            <GraduationCap className="text-primary-text h-5 w-5" />
            Bulk Promotion Status
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-muted hover:bg-subtle hover:text-main rounded-lg p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {settings.term !== "Third Term" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              Note: Promotion status is printed on report cards during <strong>Third Term</strong>{" "}
              (currently set to {settings.term}).
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-800/60 dark:bg-indigo-950/40">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
              <span>Pass Mark Threshold:</span>
              <input
                type="number"
                min={0}
                max={100}
                aria-label="Pass Mark Threshold"
                value={threshold}
                onChange={(e) => setThreshold(Math.min(Math.max(Number(e.target.value) || 0, 0), 100))}
                className="bg-input text-main focus:border-primary-text w-16 rounded-lg border border-indigo-200 px-2 py-1 text-center font-bold outline-none dark:border-indigo-700"
              />
              <span>%</span>
            </div>
            <button
              type="button"
              onClick={handleAutoAssignAll}
              className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
            >
              Auto-Assign by Average
            </button>
          </div>

          <div className="divide-border-subtle border-border max-h-72 divide-y overflow-y-auto rounded-lg border">
            {students.map((student, idx) => {
              const effective = getEffectiveStatus(
                student.id,
                student.averageScore,
                student.className,
                student.promotionStatus,
              );
              return (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-main truncate text-sm font-bold">
                      {idx + 1}. {student.name}
                    </p>
                    <p className="text-muted text-xs">Average: {student.averageScore}%</p>
                  </div>
                  <select
                    aria-label={`${student.name} Promotion Status`}
                    value={effective}
                    onChange={(e) =>
                      setOverrides((prev) => ({ ...prev, [student.id]: e.target.value }))
                    }
                    className="border-border-strong bg-input text-main focus:border-primary-text h-10 w-full rounded-lg border px-2.5 text-xs font-semibold outline-none sm:h-9 sm:w-44"
                  >
                    <option value="Promoted to Next Class">Promoted</option>
                    <option value={`Repeated ${student.className}`}>Repeated</option>
                    <option value="Promoted on Probation">Probation</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-border-subtle flex shrink-0 gap-3 border-t px-4 py-3 sm:px-5">
          <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="md" className="flex-1" onClick={handleApply}>
            Apply Promotion Status
          </Button>
        </div>
      </div>
    </Modal>
  );
}
