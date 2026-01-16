import { useState } from "react";
import { Save, RefreshCw, Wand2 } from "lucide-react";
import type { ProcessedStudent, StudentRecord } from "../../types";
import { useSchoolData } from "../../hooks/useSchoolData";
import {
  generateTeacherRemark,
  getRandomConductTrait,
  getRandomInterest,
} from "../../utils/remarkGenerator";
import { useToast } from "../../hooks/useToast";
import { ImageUploader } from "../ImageUploader";

interface Props {
  student: ProcessedStudent;
  onUpdate: (updatedRecord: StudentRecord) => void;
}

export function DetailsTab({ student, onUpdate }: Props) {
  const { settings } = useSchoolData();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: student.name,
    className: student.className,
    dateOfBirth: student.dateOfBirth || "",
    attendancePresent: student.attendancePresent || 0,
    conduct: student.conduct || "",
    interest: student.interest || "",
    teacherRemark: student.teacherRemark || "",
    promotionStatus: student.promotionStatus || "",
    numberOnRoll: student.numberOnRoll || 0,
    pictureUrl: student.pictureUrl || "",
  });

  const handleSave = () => {
    const updatedRecord: StudentRecord = {
      ...student,
      // Preserve subjects array (don't map/clone unnecessarily unless changing)
      subjects: student.subjects,
      name: formData.name,
      className: formData.className,
      dateOfBirth: formData.dateOfBirth,
      attendancePresent: formData.attendancePresent,
      conduct: formData.conduct,
      interest: formData.interest,
      teacherRemark: formData.teacherRemark,
      promotionStatus: formData.promotionStatus,
      numberOnRoll: formData.numberOnRoll,
      pictureUrl: formData.pictureUrl,
    };

    onUpdate(updatedRecord);
    showToast(`Details for "${formData.name}" saved successfully!`, "success");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 1. IDENTITY CARD (Photo + Basic Info Combined) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* PHOTO COLUMN (Left on Desktop, Top on Mobile) */}
          <div className="flex flex-col items-center gap-2 sm:w-1/3">
            <div className="w-32 sm:w-full">
              <ImageUploader
                label="Student Photo"
                value={formData.pictureUrl}
                onChange={(val) => setFormData({ ...formData, pictureUrl: val || "" })}
                maxHeight="h-32 sm:h-40"
              />
            </div>
            <p className="text-center font-mono text-[10px] text-gray-400">
              ID: {student.id.slice(-6)}
            </p>
          </div>

          {/* DETAILS COLUMN (Right on Desktop) */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-muted mb-1 block text-xs font-bold uppercase">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-main w-full rounded-lg border border-gray-300 p-2.5 font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Kwame Mensah"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted mb-1 block text-xs font-bold uppercase">
                  Roll No.
                </label>
                <input
                  type="number"
                  value={formData.numberOnRoll}
                  onChange={(e) =>
                    setFormData({ ...formData, numberOnRoll: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-muted mb-1 block text-xs font-bold uppercase">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACADEMIC STATUS */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-muted mb-4 text-xs font-bold tracking-wider uppercase">
          Academic Status
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-muted mb-1 block text-xs font-bold">Days Present</label>
            <div className="relative">
              <input
                type="number"
                value={formData.attendancePresent}
                onChange={(e) =>
                  setFormData({ ...formData, attendancePresent: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-gray-300 p-2 pr-16 font-mono font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <span className="pointer-events-none absolute top-2.5 right-3 text-xs text-gray-400">
                / {settings.totalAttendanceDays || 60}
              </span>
            </div>
          </div>
          <div>
            <label className="text-muted mb-1 block text-xs font-bold">Promotion</label>
            <select
              value={formData.promotionStatus}
              onChange={(e) => setFormData({ ...formData, promotionStatus: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">-- Select Status --</option>
              <option value="Promoted to Next Class">Promoted</option>
              <option value={`Repeated ${student.className}`}>Repeated</option>
              <option value="Promoted on Probation">Probation</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. QUALITATIVE ASSESSMENT (Remarks) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-muted mb-4 text-xs font-bold tracking-wider uppercase">
          Qualitative Assessment
        </h3>
        <div className="space-y-4">
          {/* CONDUCT */}
          <div>
            <label className="text-muted mb-1 flex justify-between text-xs font-bold">
              <span>Conduct / Character</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, conduct: getRandomConductTrait() })}
                className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Shuffle
              </button>
            </label>
            <input
              type="text"
              placeholder="e.g. Respectful and neat"
              value={formData.conduct}
              onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* INTEREST */}
          <div>
            <label className="text-muted mb-1 flex justify-between text-xs font-bold">
              <span>Interest / Talent</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, interest: getRandomInterest() })}
                className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Shuffle
              </button>
            </label>
            <input
              type="text"
              placeholder="e.g. Football"
              value={formData.interest}
              onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* TEACHER REMARK */}
          <div>
            <label className="text-muted mb-1 flex justify-between text-xs font-bold">
              <span>Teacher's Remark</span>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    teacherRemark: generateTeacherRemark(
                      student,
                      formData.attendancePresent,
                      settings.totalAttendanceDays || 60,
                      settings.level,
                    ),
                  })
                }
                className="flex items-center gap-1 text-[10px] text-purple-600 hover:underline"
              >
                <Wand2 className="h-3 w-3" /> Smart Generate
              </button>
            </label>
            <textarea
              rows={2}
              placeholder="Write a custom remark..."
              value={formData.teacherRemark}
              onChange={(e) => setFormData({ ...formData, teacherRemark: e.target.value })}
              className="w-full resize-none rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="bg-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white shadow-md transition-all active:scale-95"
      >
        <Save className="h-5 w-5" /> Save Student Details
      </button>
    </div>
  );
}
