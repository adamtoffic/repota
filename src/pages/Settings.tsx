// src/pages/Settings.tsx
import { ArrowLeft, Save, Plus, X } from "lucide-react"; // Added icons
import { useState } from "react";
import { useSchoolData } from "../hooks/useSchoolData";
import type { SchoolSettings, SchoolLevel, AcademicPeriod } from "../types";

const STORAGE_KEYS = { SETTINGS: "ges_v1_settings" };

interface Props {
  onBack: () => void;
}

export function Settings({ onBack }: Props) {
  const { settings, setSettings } = useSchoolData();

  // Initialize with current settings, ensuring defaultSubjects is at least an empty array
  const [formData, setFormData] = useState<SchoolSettings>({
    ...settings,
    defaultSubjects: settings.defaultSubjects || [],
  });

  // Helper for text inputs
  const handleChange = <K extends keyof SchoolSettings>(field: K, value: SchoolSettings[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper for adding a subject to the list
  const addSubject = () => {
    const input = document.getElementById("subjectInput") as HTMLInputElement;
    const val = input.value.trim();
    if (val && !formData.defaultSubjects.includes(val)) {
      handleChange("defaultSubjects", [...formData.defaultSubjects, val]);
      input.value = ""; // Clear input
    }
  };

  // Helper for removing a subject
  const removeSubject = (subjectToRemove: string) => {
    handleChange(
      "defaultSubjects",
      formData.defaultSubjects.filter((s) => s !== subjectToRemove),
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(formData));
    setSettings(formData);
    alert("Configuration Saved Successfully!");
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <button onClick={onBack} className="rounded-full p-2 text-gray-600 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">School Configuration</h1>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. SCHOOL DETAILS (Keep your existing inputs) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold tracking-wide text-gray-800 uppercase">
              School Details
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">School Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 2. ACADEMIC SESSION (Keep existing) */}
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
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* 3. ✅ NEW: SUBJECT PRESETS MANAGER */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* 👇 REPLACE THIS HEADER SECTION 👇 */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
                  Class Subjects
                </h2>
                <p className="text-sm text-gray-500">New students automatically get this list.</p>
              </div>

              {/* ✅ THE CLEAR BUTTON IS HERE */}
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

            {/* Input Row */}
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
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>

            {/* Tags List */}
            <div className="flex min-h-10 flex-wrap gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              {formData.defaultSubjects.length === 0 && (
                <span className="text-sm text-gray-400 italic">
                  No subjects added yet. Type above to start.
                </span>
              )}
              {formData.defaultSubjects.map((sub) => (
                <span
                  key={sub}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() => removeSubject(sub)}
                    className="rounded-full p-0.5 transition-colors hover:bg-red-100 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg px-6 py-2 font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Save className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
