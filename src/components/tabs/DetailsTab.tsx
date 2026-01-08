// src/components/tabs/DetailsTab.tsx
import { useState } from "react";
import { Save } from "lucide-react";
import type { ProcessedStudent, StudentRecord } from "../../types";
import { useSchoolData } from "../../hooks/useSchoolData";

interface Props {
  student: ProcessedStudent;
  onUpdate: (updatedRecord: StudentRecord) => void;
}

export function DetailsTab({ student, onUpdate }: Props) {
  const { settings } = useSchoolData();

  // Initialize state with new fields
  const [formData, setFormData] = useState({
    name: student.name,
    className: student.className,
    dateOfBirth: student.dateOfBirth || "", // ✅ NEW
    attendancePresent: student.attendancePresent || 0, // ✅ UPDATED
    conduct: student.conduct || "",
    interest: student.interest || "",
    teacherRemark: student.teacherRemark || "",
    promotionStatus: student.promotionStatus || "", // ✅ NEW
  });

  const handleSave = () => {
    const updatedRecord: StudentRecord = {
      ...student,
      // Strip processed subject data
      subjects: student.subjects.map((s) => ({
        id: s.id,
        name: s.name,
        classScore: s.classScore,
        examScore: s.examScore,
      })),

      // ✅ Save new fields
      name: formData.name,
      className: formData.className,
      dateOfBirth: formData.dateOfBirth,
      attendancePresent: formData.attendancePresent,
      conduct: formData.conduct,
      interest: formData.interest,
      teacherRemark: formData.teacherRemark,
      promotionStatus: formData.promotionStatus,
    };

    onUpdate(updatedRecord);
    alert("Details Saved Successfully");
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* 1. PROFILE SECTION */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold tracking-wide text-gray-800 uppercase">
          Personal Details
        </h3>
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded border p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Class</label>
              <input
                type="text"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                className="w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full rounded border p-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. ATTENDANCE & PROMOTION */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold tracking-wide text-gray-800 uppercase">Status</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Attendance: Only asking for Present days now */}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">Days Present</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.attendancePresent}
                onChange={(e) =>
                  setFormData({ ...formData, attendancePresent: Number(e.target.value) })
                }
                className="w-full rounded border p-2"
              />
              <span className="text-xs whitespace-nowrap text-gray-400">
                / {settings.totalAttendanceDays || 60} Total
              </span>
            </div>
          </div>

          {/* Promotion: Only useful for 3rd term, but always editable for now */}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">Promotion Status</label>
            <select
              value={formData.promotionStatus}
              onChange={(e) => setFormData({ ...formData, promotionStatus: e.target.value })}
              className="w-full rounded border bg-white p-2"
            >
              <option value="">-- Select Status --</option>
              <option value={`Promoted to Next Class`}>Promoted</option>
              <option value={`Repeated ${student.className}`}>Repeated</option>
              <option value="Promoted on Probation">Probation</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. REMARKS */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold tracking-wide text-gray-800 uppercase">Remarks</h3>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500">Conduct / Character</label>
          <input
            type="text"
            placeholder="e.g. Respectful and neat"
            value={formData.conduct}
            onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500">Interest / Talent</label>
          <input
            type="text"
            placeholder="e.g. Football, Reading"
            value={formData.interest}
            onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500">Teacher's Remark</label>
          <textarea
            rows={2}
            placeholder="Write a custom remark..."
            value={formData.teacherRemark}
            onChange={(e) => setFormData({ ...formData, teacherRemark: e.target.value })}
            className="w-full resize-none rounded border p-2"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-bold text-white shadow-sm hover:bg-blue-700"
      >
        <Save className="h-4 w-4" /> Save Details
      </button>
    </div>
  );
}
