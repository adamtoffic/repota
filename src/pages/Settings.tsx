// src/pages/Settings.tsx
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import { useSchoolData } from "../hooks/useSchoolData";
import type { SchoolSettings, SchoolLevel, AcademicPeriod } from "../types";

// We define this key to match what is in your useSchoolData hook
const STORAGE_KEYS = { SETTINGS: "ges_v1_settings" };

interface Props {
  onBack: () => void;
}

export function Settings({ onBack }: Props) {
  const { settings, setSettings } = useSchoolData();
  const [formData, setFormData] = useState<SchoolSettings>(settings);

  const handleChange = <K extends keyof SchoolSettings>(field: K, value: SchoolSettings[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ STEP 1: Force Save to LocalStorage immediately
    // This ensures data is on the disk before the component unmounts
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(formData));

    // ✅ STEP 2: Update React State
    setSettings(formData);

    // ✅ STEP 3: Give Feedback
    alert("Configuration Saved Successfully!");

    // ✅ STEP 4: Go Back
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <button
              onClick={onBack}
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">School Configuration</h1>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* School Details */}
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Address / Location
                </label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Academic Session */}
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
                  placeholder="e.g. 2025/2026"
                  value={formData.academicYear}
                  onChange={(e) => handleChange("academicYear", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Current Term</label>
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
                <label className="mb-1 block text-sm font-medium text-gray-700">School Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => handleChange("level", e.target.value as SchoolLevel)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2"
                >
                  <option value="KG">KG / Nursery</option>
                  <option value="Primary">Primary</option>
                  <option value="JHS">JHS</option>
                  <option value="SHS">SHS</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Next Term Begins
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jan 15, 2026"
                  value={formData.nextTermStarts || ""}
                  onChange={(e) => handleChange("nextTermStarts", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Save className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
