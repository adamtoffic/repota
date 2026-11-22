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
  const { updateStudent } = useSchoolActions();
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
    let updated = 0;
    students.forEach((student) => {
      const nextStatus = getEffectiveStatus(
        student.id,
        student.averageScore,
        student.className,
        student.promotionStatus,
      );
      if (nextStatus !== student.promotionStatus) {
        updateStudent({ ...student, promotionStatus: nextStatus }, true);
        updated++;
      }
    });

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
    <Modal isOpen={true} onClose={onClose} closeOnBackdrop={false} className="max-w-2xl">
      <div className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-main flex items-center gap-2 text-lg font-bold" data-record="true">
            <GraduationCap className="text-primary h-5 w-5" />
            Bulk Promotion Status
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

        <div className="space-y-4 p-5">
          {settings.term !== "Third Term" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Note: Promotion status is printed on report cards during <strong>Third Term</strong>{" "}
              (currently set to {settings.term}).
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
              <span>Pass Mark Threshold:</span>
              <input
                type="number"
                min={0}
                max={100}
                aria-label="Pass Mark Threshold"
                value={threshold}
                onChange={(e) => setThreshold(Math.min(Math.max(Number(e.target.value) || 0, 0), 100))}
                className="w-16 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-center font-bold"
              />
              <span>%</span>
            </div>
            <button
              type="button"
              onClick={handleAutoAssignAll}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Auto-Assign by Average
            </button>
          </div>

          <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
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
                    <p className="truncate text-sm font-bold text-gray-800">
                      {idx + 1}. {student.name}
                    </p>
                    <p className="text-xs text-gray-500">Average: {student.averageScore}%</p>
                  </div>
                  <select
                    aria-label={`${student.name} Promotion Status`}
                    value={effective}
                    onChange={(e) =>
                      setOverrides((prev) => ({ ...prev, [student.id]: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
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

          <div className="flex gap-3">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="md" className="flex-1" onClick={handleApply}>
              Apply Promotion Status
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
