import { useState } from "react";
import { Save, RefreshCw, Wand2 } from "lucide-react";
import type { ProcessedStudent, StudentRecord } from "../../types";
import { useSchoolData } from "../../hooks/useSchoolData";
import {
  generateTeacherRemark,
  getRandomConductTrait,
  getRandomInterest,
} from "../../utils/remarkGenerator";
import { ImageUploader } from "../ImageUploader";
import { Input } from "../ui";

interface Props {
  student: ProcessedStudent;
  onUpdate: (updatedRecord: StudentRecord) => void;
}

export function DetailsTab({ student, onUpdate }: Props) {
  const { settings } = useSchoolData();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState({
    name: student.name,
    className: student.className,
    dateOfBirth: student.dateOfBirth || "",
    gender: student.gender || "",
    attendancePresent: student.attendancePresent || 0,
    conduct: student.conduct || "",
    interest: student.interest || "",
    teacherRemark: student.teacherRemark || "",
    promotionStatus: student.promotionStatus || "",
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
      gender: formData.gender as "Male" | "Female",
      attendancePresent: formData.attendancePresent,
      conduct: formData.conduct,
      interest: formData.interest,
      teacherRemark: formData.teacherRemark,
      promotionStatus: formData.promotionStatus,
      pictureUrl: formData.pictureUrl,
    };

    onUpdate(updatedRecord);
    setHasUnsavedChanges(false);
  };

  const handleFormChange = (updates: Partial<typeof formData>) => {
    setFormData({ ...formData, ...updates });
    setHasUnsavedChanges(true);
  };

  // Auto-save gender changes immediately
  const handleGenderChange = (gender: "Male" | "Female") => {
    const updatedRecord: StudentRecord = {
      ...student,
      subjects: student.subjects,
      name: formData.name,
      className: formData.className,
      dateOfBirth: formData.dateOfBirth,
      gender: gender,
      attendancePresent: formData.attendancePresent,
      conduct: formData.conduct,
      interest: formData.interest,
      teacherRemark: formData.teacherRemark,
      promotionStatus: formData.promotionStatus,
      pictureUrl: formData.pictureUrl,
    };

    setFormData({ ...formData, gender });
    onUpdate(updatedRecord);
    // Don't mark as unsaved since we auto-saved
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* 1. IDENTITY CARD (Photo + Basic Info Combined) */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* PHOTO COLUMN (Left on Desktop, Top on Mobile) */}
          <div className="flex flex-col items-center gap-2 sm:w-1/3">
            <div className="w-32 sm:w-full">
              <ImageUploader
                label="Student Photo"
                value={formData.pictureUrl}
                onChange={(val) => handleFormChange({ pictureUrl: val || "" })}
                maxHeight="h-32 sm:h-40"
              />
            </div>
          </div>

          {/* DETAILS COLUMN (Right on Desktop) */}
          <div className="flex-1 space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange({ name: e.target.value })}
              className="text-main font-bold"
              placeholder="e.g. Kwame Mensah"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleFormChange({ dateOfBirth: e.target.value })}
              />

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
                  Gender
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenderChange("Male")}
                    className={`flex-1 rounded-lg border-2 px-2 py-2 text-xs font-semibold transition-all sm:px-3 sm:py-2.5 sm:text-sm ${
                      formData.gender === "Male"
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                        : "border-gray-300 bg-white text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    👦 Male
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderChange("Female")}
                    className={`flex-1 rounded-lg border-2 px-2 py-2 text-xs font-semibold transition-all sm:px-3 sm:py-2.5 sm:text-sm ${
                      formData.gender === "Female"
                        ? "border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-200"
                        : "border-gray-300 bg-white text-gray-600 hover:border-pink-300"
                    }`}
                  >
                    👧 Female
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Auto-saved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACADEMIC STATUS */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
          📚 Academic Status
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-muted mb-1 block text-xs font-bold">Days Present</label>
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max={settings.totalAttendanceDays || 60}
                value={formData.attendancePresent === 0 ? "" : formData.attendancePresent}
                onChange={(e) =>
                  handleFormChange({ attendancePresent: Number(e.target.value) || 0 })
                }
                className="pr-16 font-mono font-bold sm:pr-16"
                placeholder="0"
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
              onChange={(e) => handleFormChange({ promotionStatus: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:p-2"
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
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
          💬 Qualitative Assessment
        </h3>
        <div className="space-y-4">
          {/* CONDUCT */}
          <Input
            label={
              <span className="flex justify-between">
                <span>Conduct / Character</span>
                <button
                  type="button"
                  onClick={() => handleFormChange({ conduct: getRandomConductTrait() })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 active:scale-95 sm:px-0 sm:py-0 sm:hover:bg-transparent sm:hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Shuffle
                </button>
              </span>
            }
            type="text"
            placeholder="e.g. Respectful and neat"
            value={formData.conduct}
            onChange={(e) => handleFormChange({ conduct: e.target.value })}
          />

          {/* INTEREST */}
          <Input
            label={
              <span className="flex justify-between">
                <span>Interest / Talent</span>
                <button
                  type="button"
                  onClick={() => handleFormChange({ interest: getRandomInterest() })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 active:scale-95 sm:px-0 sm:py-0 sm:hover:bg-transparent sm:hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Shuffle
                </button>
              </span>
            }
            type="text"
            placeholder="e.g. Football"
            value={formData.interest}
            onChange={(e) => handleFormChange({ interest: e.target.value })}
          />

          {/* TEACHER REMARK */}
          <div>
            <label className="text-muted mb-1 flex justify-between text-xs font-bold">
              <span>Teacher's Remark</span>
              <button
                type="button"
                onClick={() =>
                  handleFormChange({
                    teacherRemark: generateTeacherRemark(
                      student,
                      formData.attendancePresent,
                      settings.totalAttendanceDays || 60,
                      settings.level,
                    ),
                  })
                }
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-purple-600 hover:bg-purple-50 active:scale-95 sm:px-0 sm:py-0 sm:hover:bg-transparent sm:hover:underline"
              >
                <Wand2 className="h-3 w-3" /> Smart Generate
              </button>
            </label>
            <textarea
              rows={2}
              placeholder="Write a custom remark..."
              value={formData.teacherRemark}
              onChange={(e) => handleFormChange({ teacherRemark: e.target.value })}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Sticky Save Bar - Mobile Optimized */}
      <div className="sticky bottom-0 -mx-4 mt-4 -mb-4 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:-mx-6 sm:mt-6 sm:-mb-6">
        {hasUnsavedChanges && (
          <p className="mb-2 flex items-center justify-center gap-1.5 text-xs text-orange-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500"></span>
            <span className="font-medium">You have unsaved changes</span>
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white shadow-md transition-all active:scale-95 ${
            hasUnsavedChanges ? "bg-primary hover:bg-primary/90" : "cursor-not-allowed bg-gray-300"
          }`}
        >
          <Save className="h-5 w-5" />
          {hasUnsavedChanges ? "Save Student Details" : "All Changes Saved"}
        </button>
      </div>
    </div>
  );
}
