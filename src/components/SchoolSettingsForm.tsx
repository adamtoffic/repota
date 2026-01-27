import { useState } from "react";
import type { SchoolSettings } from "../types";
import { School, Save, Plus, X } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";

interface Props {
  initialSettings: SchoolSettings;
  onSave: (settings: SchoolSettings) => void;
}

export function SchoolSettingsForm({ initialSettings, onSave }: Props) {
  const [formData, setFormData] = useState<SchoolSettings>(initialSettings);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentMax, setNewComponentMax] = useState("");

  const handleChange = (field: keyof SchoolSettings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof SchoolSettings, value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    setFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleAddComponent = () => {
    const trimmed = newComponentName.trim();
    if (!trimmed) return;

    const current = formData.componentLibrary || [];
    if (current.some((c) => c.name === trimmed)) {
      alert("This component already exists!");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      componentLibrary: [
        ...current,
        { name: trimmed, maxScore: parseFloat(newComponentMax) || 10 },
      ],
    }));
    setNewComponentName("");
    setNewComponentMax("");
  };

  const handleRemoveComponent = (componentName: string) => {
    setFormData((prev) => ({
      ...prev,
      componentLibrary: (prev.componentLibrary || []).filter(
        (config) => config.name !== componentName,
      ),
    }));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center gap-2 text-blue-700">
        <School className="h-6 w-6" />
        <h2 className="text-xl font-bold">School Configuration</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">School Name</label>
          <input
            type="text"
            value={formData.schoolName}
            onChange={(e) => handleChange("schoolName", e.target.value)}
            className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Anglican PRIMARY"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700"> Academic Year</label>
          <input
            type="text"
            value={formData.academicYear}
            onChange={(e) => handleChange("academicYear", e.target.value)}
            className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 2025/2026"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            Class Size (Number on Roll)
            <Tooltip content="Total number of students in your class - used for position ranking" />
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="200"
            value={formData.classSize || ""}
            onChange={(e) => handleChange("classSize", e.target.value)}
            className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 30"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Term</label>
          <select
            value={formData.term}
            onChange={(e) => handleChange("term", e.target.value)}
            className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>First Term</option>
            <option value={2}>Second Term</option>
            <option value={3}>Third Term</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">School Level</label>

          <div className="mt-2 flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={formData.level === "KG"}
                onChange={() => handleChange("level", "KG")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm">KG (1-2)</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={formData.level === "PRIMARY"}
                onChange={() => handleChange("level", "PRIMARY")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm">PRIMARY (1-6)</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={formData.level === "JHS"}
                onChange={() => handleChange("level", "JHS")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm">JHS (1-3)</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={formData.level === "SHS"}
                onChange={() => handleChange("level", "SHS")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm">SHS (1-3)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            School Type
            <Tooltip content="Choose school type to customize report card format and available fields" />
          </label>

          <div className="mt-2 flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={formData.schoolType === "STANDARD"}
                onChange={() => handleChange("schoolType", "STANDARD")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm">Standard</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={formData.schoolType === "ISLAMIC"}
                onChange={() => handleChange("schoolType", "ISLAMIC")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm">Islamic</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={formData.schoolType === "PRIVATE"}
                onChange={() => handleChange("schoolType", "PRIVATE")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm">Private</span>
            </label>
          </div>
        </div>
      </div>

      {/* Fees Section for Private Schools */}
      {formData.schoolType === "PRIVATE" && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-blue-900">Termly Fees (GH₵)</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">School Gift</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={formData.schoolGift || ""}
                onChange={(e) => handleNumberChange("schoolGift", e.target.value)}
                className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 5.00"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Canteen Fees</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={formData.canteenFees || ""}
                onChange={(e) => handleNumberChange("canteenFees", e.target.value)}
                className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 10.00"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">First Aid Fees</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={formData.firstAidFees || ""}
                onChange={(e) => handleNumberChange("firstAidFees", e.target.value)}
                className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 5.00"
              />
            </div>
          </div>
        </div>
      )}

      {/* Class Score Components Section */}
      <div className="mt-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-purple-900">
          Class Score Components (Optional)
          <Tooltip content="Break down class scores into components like 'Class Test', 'Project', 'Assignment'" />
        </h3>
        <p className="mb-4 text-xs text-purple-700">
          Add components like "Class Test", "Project", "Assignment" to break down class scores.
          Teachers will enter raw scores (0-100) for each component, which will auto-calculate to
          the class score percentage.
        </p>

        {/* Add Component Input */}
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newComponentName}
            onChange={(e) => setNewComponentName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddComponent();
              }
            }}
            className="flex-1 rounded border border-purple-300 p-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g. Class Test, Project, Assignment"
          />
          <input
            type="number"
            value={newComponentMax}
            onChange={(e) => setNewComponentMax(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddComponent();
              }
            }}
            className="w-20 rounded border border-purple-300 p-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Max"
            min="1"
            max="100"
          />
          <button
            onClick={handleAddComponent}
            className="flex items-center gap-1 rounded bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {/* Component List */}
        {(formData.componentLibrary || []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-purple-800">
              {(formData.componentLibrary || []).length} Component
              {(formData.componentLibrary || []).length !== 1 ? "s" : ""}:
            </p>
            <div className="flex flex-wrap gap-2">
              {(formData.componentLibrary || []).map((config) => (
                <div
                  key={config.name}
                  className="flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-gray-700">
                    {config.name} ({config.maxScore})
                  </span>
                  <button
                    onClick={() => handleRemoveComponent(config.name)}
                    className="rounded p-0.5 text-purple-500 hover:bg-purple-100 hover:text-purple-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(formData.componentLibrary || []).length === 0 && (
          <div className="rounded border-2 border-dashed border-purple-200 bg-white p-4 text-center text-xs text-purple-400">
            No components added. Class score will be entered directly.
          </div>
        )}
      </div>

      <button
        onClick={() => onSave(formData)}
        className="bg-primary hover:bg-primary/90 mt-6 flex w-full items-center justify-center gap-2 rounded px-4 py-2 text-white transition-colors"
      >
        <Save className="h-4 w-4" />
        Save Configuration
      </button>
    </div>
  );
}
