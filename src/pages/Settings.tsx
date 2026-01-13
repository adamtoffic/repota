import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Save,
  Plus,
  AlertCircle,
  School,
  BookOpen,
  Users,
  Briefcase,
  X,
} from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { ImageUploader } from "../components/ImageUploader"; // ✅ Imported
import { DataBackup } from "../components/DataBackup"; // ✅ Imported
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { CLASS_OPTIONS } from "../constants/classes";
import type { SchoolLevel, SchoolSettings, AcademicPeriod } from "../types";

export function Settings() {
  const { settings, setSettings, updateClassNameForAll, students } = useSchoolData();
  const { showToast } = useToast();
  const navigate = useNavigate({ from: "/settings" });

  // Form State
  const [formData, setFormData] = useState<SchoolSettings>(settings);
  const [newSubject, setNewSubject] = useState("");
  const [showClassUpdateModal, setShowClassUpdateModal] = useState(false);

  // --- SMART LOGIC: LEVEL CHANGE ---
  const handleLevelChange = (newLevel: SchoolLevel) => {
    const defaultSubs = DEFAULT_SUBJECTS[newLevel] || [];
    const defaultClass = CLASS_OPTIONS[newLevel]?.[0] || "";

    setFormData((prev) => ({
      ...prev,
      level: newLevel,
      defaultSubjects: defaultSubs,
      className: defaultClass, // Auto-suggest class name
    }));

    showToast(`Loaded presets for ${newLevel}`, "info");
  };

  // --- SUBJECT LIST MANAGEMENT ---
  const addSubject = () => {
    if (newSubject.trim() && !(formData.defaultSubjects || []).includes(newSubject.trim())) {
      setFormData((prev) => ({
        ...prev,
        defaultSubjects: [...(prev.defaultSubjects || []), newSubject.trim()],
      }));
      setNewSubject("");
    }
  };

  const removeSubject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      defaultSubjects: prev.defaultSubjects?.filter((_, i) => i !== index),
    }));
  };

  // --- SAVE LOGIC ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for Class Name Ripple Effect
    if (formData.className !== settings.className && students.length > 0) {
      setShowClassUpdateModal(true);
      return;
    }

    finalizeSave();
  };

  const finalizeSave = (shouldUpdateStudents = false) => {
    setSettings(formData);

    if (shouldUpdateStudents) {
      updateClassNameForAll(formData.className || "");
      showToast(`Updated class name for ${students.length} students`, "success");
    }

    showToast("Configuration saved successfully!", "success");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* HEADER */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="rounded-full p-2 text-gray-600 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">School Configuration</h1>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
          >
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* CARD 1: IDENTITY (Restored Logo & Details) */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <School className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">School Identity</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-[150px_1fr]">
            {/* ✅ Logo Uploader Restored */}
            <ImageUploader
              label="School Crest"
              value={formData.logoUrl}
              onChange={(val) => setFormData({ ...formData, logoUrl: val })}
            />

            <div className="space-y-4">
              {/* School Name */}
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full rounded-lg border p-2 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Royal International School"
                />
              </div>

              {/* School Motto */}
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                  School Motto
                </label>
                <input
                  type="text"
                  value={formData.schoolMotto || ""}
                  onChange={(e) => setFormData({ ...formData, schoolMotto: e.target.value })}
                  className="w-full rounded-lg border p-2 text-sm italic"
                  placeholder="e.g. Knowledge is Power"
                />
              </div>

              {/* Address (Full Width) */}
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                  Address / Location
                </label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border p-2 text-sm"
                  placeholder="e.g. Kumasi, Ashanti Region"
                />
              </div>

              {/* Phone & Email (Side by Side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber || ""}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full rounded-lg border p-2 text-sm"
                    placeholder="024 123 4567"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border p-2 text-sm"
                    placeholder="school@gmail.com"
                  />
                </div>

                {/* School Type Toggle */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                    School Curriculum Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="schoolType"
                        checked={formData.schoolType === "STANDARD"}
                        onChange={() => setFormData({ ...formData, schoolType: "STANDARD" })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-bold">Standard (GES)</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="schoolType"
                        checked={formData.schoolType === "ISLAMIC"}
                        onChange={() => setFormData({ ...formData, schoolType: "ISLAMIC" })}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-bold">Islamic / Arabic</span>
                    </label>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    * Selecting 'Islamic' enables Arabic font support on reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: ACADEMIC SESSION (Restored Attendance & Smart Level) */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <BookOpen className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Academic Session</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* LEVEL SELECTOR (Smart) */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                School Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["KG", "PRIMARY", "JHS", "SHS"] as SchoolLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleLevelChange(lvl)}
                    className={`rounded-lg border px-1 py-2 text-xs font-bold transition-all ${
                      formData.level === lvl
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Context Hint */}
              <div className="mt-2 flex gap-2 rounded border border-gray-100 bg-gray-50 p-2 text-[10px] text-gray-500">
                <AlertCircle className="h-3 w-3 shrink-0 text-blue-500" />
                <p>
                  {formData.level === "KG" &&
                    "Kindergarten uses developmental grading (Gold, Silver, Bronze)."}
                  {formData.level === "PRIMARY" && "Primary uses Descriptive Grading (1-5)."}
                  {formData.level === "JHS" && "JHS uses Aggregate System (Core 4 + Best 2)."}
                  {formData.level === "SHS" && "SHS uses WASSCE Grading (A1 - F9)."}
                </p>
              </div>
            </div>

            {/* CLASS NAME */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                Class Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.className || ""}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full rounded-lg border p-2 pl-9 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Users className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* ✅ TOTAL ATTENDANCE (Restored) */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                Total Attendance Days
              </label>
              <input
                type="number"
                value={formData.totalAttendanceDays || ""}
                onChange={(e) =>
                  setFormData({ ...formData, totalAttendanceDays: Number(e.target.value) })
                }
                className="w-full rounded-lg border p-2 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 60"
              />
            </div>

            {/* YEAR & TERM */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                Academic Year
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full rounded-lg border p-2 font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Term</label>
              <select
                value={formData.term}
                onChange={(e) =>
                  setFormData({ ...formData, term: e.target.value as AcademicPeriod })
                }
                className="w-full rounded-lg border bg-white p-2 font-bold"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
            {/* NEXT TERM STARTS */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                Next Term Begins
              </label>
              <input
                type="date"
                value={formData.nextTermStarts || ""}
                onChange={(e) => setFormData({ ...formData, nextTermStarts: e.target.value })}
                className="w-full rounded-lg border p-2 font-bold"
              />
            </div>

            {/* ... inside Card 2: Academic Session ... */}

            {/* ✅ NEW: Grading Configuration */}
            <div className="col-span-2 grid grid-cols-2 gap-4 rounded-lg border border-yellow-100 bg-yellow-50 p-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
                  Class Score Limit (e.g. 30)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={formData.classScoreMax ?? 30}
                  onChange={(e) =>
                    setFormData({ ...formData, classScoreMax: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border p-2 text-center font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
                  Exam Score Limit (e.g. 70)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={formData.examScoreMax ?? 70}
                  onChange={(e) =>
                    setFormData({ ...formData, examScoreMax: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border p-2 text-center font-bold"
                />
              </div>
              <p className="col-span-2 text-center text-[10px] text-gray-500">
                * Changing this will enforce validation on all new score entries.
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: STAFF & SIGNATURES (Restored) */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Staff Details</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Head Teacher */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                  Head Teacher Name
                </label>
                <input
                  type="text"
                  value={formData.headTeacherName || ""}
                  onChange={(e) => setFormData({ ...formData, headTeacherName: e.target.value })}
                  className="w-full rounded-lg border p-2 text-sm"
                />
              </div>
              <ImageUploader
                label="Head Teacher Signature"
                value={formData.headTeacherSignature}
                onChange={(val) => setFormData({ ...formData, headTeacherSignature: val })}
                maxHeight="h-20"
              />
            </div>

            {/* Class Teacher */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                  Class Teacher Name
                </label>
                <input
                  type="text"
                  value={formData.classTeacherName || ""}
                  onChange={(e) => setFormData({ ...formData, classTeacherName: e.target.value })}
                  className="w-full rounded-lg border p-2 text-sm"
                />
              </div>
              <ImageUploader
                label="Class Teacher Signature"
                value={formData.teacherSignature}
                onChange={(val) => setFormData({ ...formData, teacherSignature: val })}
                maxHeight="h-20"
              />
            </div>
          </div>
        </div>

        {/* CARD 4: DEFAULT SUBJECTS */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
              Class Subjects
            </h2>
            <p className="text-xs text-gray-500">New students automatically get this list.</p>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
              className="flex-1 rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add custom subject..."
            />
            <button
              type="button"
              onClick={addSubject}
              className="rounded-lg bg-blue-100 px-4 font-bold text-blue-700 hover:bg-blue-200"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(formData.defaultSubjects || []).map((sub, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
              >
                {sub}
                <button
                  type="button"
                  onClick={() => removeSubject(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* BACKUP SECTION (Restored) */}
        <DataBackup />

        {/* ... Inside Settings.tsx, after the "Danger Zone" card ... */}

        {/* ✅ ABOUT THE DEVELOPER CARD */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <span>👨‍💻</span> About the Developer
          </h2>

          <div className="prose prose-sm text-gray-600">
            <p>
              Hi, I'm <strong>[Your Name]</strong>, a Level 200 IT student passionate about solving
              real-world problems with code.
            </p>
            <p className="mt-2">
              I built <strong>ClassSync</strong> to help Ghanaian teachers save time and reduce
              errors. This is an open-source project designed specifically for our local education
              system.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 border-t pt-4">
            <a
              href="https://wa.me/233XXXXXXXXX"
              target="_blank"
              className="flex items-center gap-2 text-xs font-bold text-green-600 hover:underline"
            >
              <span>💬 WhatsApp Me</span>
            </a>
            <a
              href="mailto:your@email.com"
              className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
            >
              <span>📧 Email Support</span>
            </a>
            <a
              href="https://github.com/yourusername"
              target="_blank"
              className="flex items-center gap-2 text-xs font-bold text-gray-800 hover:underline"
            >
              <span>🐙 GitHub Profile</span>
            </a>
          </div>

          <div className="mt-4 text-center text-[10px] text-gray-400">
            Version 1.0.0 • Built with ❤️ in Ghana
          </div>
        </div>
      </main>

      {/* CONFIRMATION MODAL (For Ripple Effect) */}
      <ConfirmModal
        isOpen={showClassUpdateModal}
        title="Update Class Name Everywhere?"
        message={`You changed the class to "${formData.className}". Do you want to update this for all ${students.length} existing students?`}
        confirmText="Yes, Update Everyone"
        cancelText="No, Keep Old Name"
        onClose={() => setShowClassUpdateModal(false)}
        onConfirm={() => {
          setShowClassUpdateModal(false);
          finalizeSave(true);
        }}
      />
    </div>
  );
}
