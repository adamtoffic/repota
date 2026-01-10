// src/pages/Settings.tsx
import { ArrowLeft, Save, Upload, Image as ImageIcon, X } from "lucide-react";
import { useState, useRef } from "react";
import { useSchoolData } from "../hooks/useSchoolData";
import type { SchoolSettings, SchoolLevel, AcademicPeriod } from "../types";
import { useNavigate, Link } from "@tanstack/react-router";
import { DataBackup } from "../components/DataBackup";
import { useToast } from "../hooks/useToast";
// --- HELPER COMPONENT: IMAGE UPLOADER ---
// This handles the complexity of file reading and previews
interface ImageUploaderProps {
  label: string;
  value?: string;
  onChange: (base64: string | undefined) => void;
  maxHeight?: string; // Allows us to style signatures (short) vs logos (tall)
}

function ImageUploader({ label, value, onChange, maxHeight = "h-32" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Size Check (Limit to 500KB to save LocalStorage space)
    if (file.size > 500000) {
      alert("File is too large! Please use an image under 500KB.");
      return;
    }

    // 2. Convert to Base64 String
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>

      <div
        onClick={() => inputRef.current?.click()}
        className={`w-full ${maxHeight} group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-400`}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain p-2" />
        ) : (
          <div className="p-4 text-center">
            <ImageIcon className="mx-auto mb-1 h-6 w-6 text-gray-300" />
            <span className="text-xs font-medium text-gray-400">Click to Upload</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Upload className="h-6 w-6 text-white" />
        </div>
      </div>

      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/png, image/jpeg"
        onChange={handleUpload}
      />

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the upload click
            onChange(undefined);
          }}
          className="self-start text-xs font-bold text-red-500 hover:underline"
        >
          Remove Image
        </button>
      )}
    </div>
  );
}

// --- MAIN SETTINGS COMPONENT ---

export function Settings() {
  const { settings, setSettings } = useSchoolData();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<SchoolSettings>({
    ...settings,
    defaultSubjects: settings.defaultSubjects || [],
  });

  const handleChange = <K extends keyof SchoolSettings>(field: K, value: SchoolSettings[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper for adding subject to list
  const addSubject = () => {
    const input = document.getElementById("subjectInput") as HTMLInputElement;
    const val = input.value.trim();
    if (val && !(formData.defaultSubjects || []).includes(val)) {
      handleChange("defaultSubjects", [...(formData.defaultSubjects || []), val]);
      input.value = "";
    }
  };
  const navigate = useNavigate({ from: "/settings" });
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formData);
    showToast("Settings saved successfully!", "success");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Link to="/" className="rounded-full p-2 text-gray-600 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">School Configuration</h1>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. SCHOOL IDENTITY & LOGO */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold tracking-wide text-gray-800 uppercase">
              School Identity
            </h2>

            <div className="grid gap-6 sm:grid-cols-[150px_1fr]">
              {/* Logo Upload */}
              <ImageUploader
                label="School Crest"
                value={formData.logoUrl}
                onChange={(val) => handleChange("logoUrl", val)}
              />

              {/* Text Fields */}
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    School Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Royal International School"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address / Location
                  </label>
                  <input
                    type="text"
                    value={formData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Kumasi, Ashanti Region"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email / Contact
                  </label>
                  <input
                    type="text"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. info@yourschool.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. ACADEMIC SESSION */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold tracking-wide text-gray-800 uppercase">
              Academic Session
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => handleChange("academicYear", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Term</label>
                <select
                  value={formData.term}
                  onChange={(e) => handleChange("term", e.target.value as AcademicPeriod)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => handleChange("level", e.target.value as SchoolLevel)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2"
                >
                  <option value="KG">KG</option>
                  <option value="PRIMARY">PRIMARY</option>
                  <option value="JHS">JHS</option>
                  <option value="SHS">SHS</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. REPORT CARD DETAILS & SIGNATURES */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold tracking-wide text-gray-800 uppercase">
              Report Card Details
            </h2>

            {/* Staff Names */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Head Teacher's Name
                </label>
                <input
                  type="text"
                  value={formData.headTeacherName || ""}
                  onChange={(e) => handleChange("headTeacherName", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none"
                  placeholder="e.g. Mrs. A. Mensah"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Class Teacher's Name
                </label>
                <input
                  type="text"
                  value={formData.classTeacherName || ""}
                  onChange={(e) => handleChange("classTeacherName", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none"
                  placeholder="e.g. Mr. John Doe"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Total Attendance Days
                </label>
                <input
                  type="number"
                  value={formData.totalAttendanceDays || ""}
                  onChange={(e) => handleChange("totalAttendanceDays", Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Next Term Begins
                </label>
                <input
                  type="date"
                  value={formData.nextTermStarts || ""}
                  onChange={(e) => handleChange("nextTermStarts", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none"
                />
              </div>
            </div>

            {/* Signatures */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="mb-3 text-sm font-bold text-gray-800">
                Digital Signatures (Optional)
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <ImageUploader
                  label="Head Teacher Signature"
                  value={formData.headTeacherSignature}
                  onChange={(val) => handleChange("headTeacherSignature", val)}
                  maxHeight="h-24" // Shorter box for signatures
                />
                <ImageUploader
                  label="Class Teacher Signature"
                  value={formData.teacherSignature}
                  onChange={(val) => handleChange("teacherSignature", val)}
                  maxHeight="h-24"
                />
              </div>
            </div>
          </div>

          {/* 4. SUBJECT PRESETS */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
                  Class Subjects
                </h2>
                <p className="text-sm text-gray-500">New students automatically get this list.</p>
              </div>
              {(formData.defaultSubjects || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure? This removes all default subjects.")) {
                      handleChange("defaultSubjects", []);
                    }
                  }}
                  className="rounded px-2 py-1 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="mb-4 flex gap-2">
              <input
                id="subjectInput"
                type="text"
                placeholder="e.g. Mathematics"
                className="flex-1 rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
              />
              <button
                type="button"
                onClick={addSubject}
                className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 font-bold text-blue-700 transition-colors hover:bg-blue-200"
              >
                <ArrowLeft className="h-4 w-4 rotate-180" /> Add
              </button>
            </div>

            <div className="flex min-h-10 flex-wrap gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              {(!formData.defaultSubjects || formData.defaultSubjects.length === 0) && (
                <span className="text-sm text-gray-400 italic">
                  No subjects added yet. Type above to start.
                </span>
              )}
              {(formData.defaultSubjects || []).map((sub) => (
                <span
                  key={sub}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(
                        "defaultSubjects",
                        (formData.defaultSubjects || []).filter((s) => s !== sub),
                      )
                    }
                    className="rounded-full p-0.5 transition-colors hover:bg-red-100 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <DataBackup />

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {/* ✅ UPDATED: Cancel Button */}
            <Link
              to="/"
              className="items-center justify-center rounded-lg px-6 py-2 font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 font-bold text-blue-700 transition-colors hover:bg-blue-200"
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
