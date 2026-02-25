import { useState } from "react";
import type { AssessmentCategory, SchoolSettings } from "../types";
import { School, Save, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import {
  addToLibrary,
  removeFromLibrary,
  toggleComponentForSubject,
} from "../utils/componentRegistry";

interface Props {
  initialSettings: SchoolSettings;
  onSave: (settings: SchoolSettings) => void;
}

export function SchoolSettingsForm({ initialSettings, onSave }: Props) {
  const [formData, setFormData] = useState<SchoolSettings>(initialSettings);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentMax, setNewComponentMax] = useState("");
  const [newComponentCategory, setNewComponentCategory] = useState<AssessmentCategory | "">("");
  const [componentError, setComponentError] = useState<string | null>(null);
  const [showSubjectMap, setShowSubjectMap] = useState(false);

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

    const current = formData.componentLibrary ?? [];
    const config = {
      name: trimmed,
      maxScore: parseFloat(newComponentMax) || 10,
      ...(newComponentCategory ? { category: newComponentCategory as AssessmentCategory } : {}),
    };

    const { library, error } = addToLibrary(current, config);
    if (error) {
      setComponentError(error);
      setTimeout(() => setComponentError(null), 3000);
      return;
    }

    setFormData((prev) => ({ ...prev, componentLibrary: library }));
    setNewComponentName("");
    setNewComponentMax("");
    setNewComponentCategory("");
    setComponentError(null);
  };

  const handleRemoveComponent = (componentName: string) => {
    const library = formData.componentLibrary ?? [];
    const map = formData.subjectComponentMap ?? {};
    const { library: updatedLibrary, subjectComponentMap: updatedMap } = removeFromLibrary(
      library,
      map,
      componentName,
    );
    setFormData((prev) => ({
      ...prev,
      componentLibrary: updatedLibrary,
      subjectComponentMap: updatedMap,
    }));
  };

  const handleToggleSubjectComponent = (subjectName: string, componentName: string) => {
    const library = formData.componentLibrary ?? [];
    const config = library.find((c) => c.name === componentName);
    if (!config) return;
    const map = formData.subjectComponentMap ?? {};
    const updatedMap = toggleComponentForSubject(map, subjectName, config);
    setFormData((prev) => ({ ...prev, subjectComponentMap: updatedMap }));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center gap-2 text-blue-700">
        <School className="h-6 w-6" />
        <h2 className="text-xl font-bold">School Configuration</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="School Name"
          type="text"
          value={formData.schoolName}
          onChange={(e) => handleChange("schoolName", e.target.value)}
          placeholder="e.g. Anglican PRIMARY"
        />

        <Input
          label="Academic Year"
          type="text"
          value={formData.academicYear}
          onChange={(e) => handleChange("academicYear", e.target.value)}
          className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. 2025/2026"
        />

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
        <Select
          label="Term"
          value={formData.term}
          onChange={(e) => handleChange("term", e.target.value)}
        >
          <option value={1}>First Term</option>
          <option value={2}>Second Term</option>
          <option value={3}>Third Term</option>
        </Select>
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
          SBA Task Library (Optional)
          <Tooltip content="Define reusable assessment tasks (Class Test, Project, etc.) that can be assigned to specific subjects." />
        </h3>
        <p className="mb-4 text-xs text-purple-700">
          Add tasks like "CAT 1 /15", "Group Work /30". Each task can optionally have a category.
          Teachers enter raw scores which auto-calculate to the class score percentage.
        </p>

        {/* Add Component Input */}
        <div className="mb-3 grid grid-cols-[1fr_auto_auto_auto] gap-2">
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
            className="rounded border border-purple-300 p-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g. CAT 1, Group Work, Project"
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
          <select
            value={newComponentCategory}
            onChange={(e) => setNewComponentCategory(e.target.value as AssessmentCategory | "")}
            className="rounded border border-purple-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Category</option>
            <option value="CAT">CAT</option>
            <option value="GROUP">Group</option>
            <option value="PROJECT">Project</option>
            <option value="HOMEWORK">Homework</option>
          </select>
          <button
            onClick={handleAddComponent}
            className="flex items-center gap-1 rounded bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {componentError && (
          <p className="mb-2 rounded bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
            ⚠️ {componentError}
          </p>
        )}

        {/* Component List */}
        {(formData.componentLibrary ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-purple-800">
              {(formData.componentLibrary ?? []).length} Component
              {(formData.componentLibrary ?? []).length !== 1 ? "s" : ""}:
            </p>
            <div className="flex flex-wrap gap-2">
              {(formData.componentLibrary ?? []).map((config) => (
                <div
                  key={config.name}
                  className="flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-gray-700">
                    {config.name}
                    <span className="ml-1 text-purple-500">/{config.maxScore}</span>
                  </span>
                  {config.category && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 uppercase">
                      {config.category}
                    </span>
                  )}
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

        {(formData.componentLibrary ?? []).length === 0 && (
          <div className="rounded border-2 border-dashed border-purple-200 bg-white p-4 text-center text-xs text-purple-400">
            No components added. Class score will be entered directly.
          </div>
        )}
      </div>

      {/* Subject-Component Assignment (only shown when library + subjects both exist) */}
      {(formData.componentLibrary ?? []).length > 0 &&
        (formData.defaultSubjects ?? []).length > 0 && (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <button
              onClick={() => setShowSubjectMap((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-bold text-indigo-900"
            >
              <span className="flex items-center gap-1.5">
                Subject Assessment Config
                <Tooltip content="Assign SBA tasks from your library to individual subjects. Only assigned tasks will appear in the score entry screen." />
              </span>
              {showSubjectMap ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showSubjectMap && (
              <div className="mt-3 space-y-3">
                {(formData.defaultSubjects ?? []).map((subject) => {
                  const assigned = (formData.subjectComponentMap ?? {})[subject] ?? [];
                  return (
                    <div key={subject} className="rounded-lg border border-indigo-200 bg-white p-3">
                      <p className="mb-2 text-xs font-bold text-indigo-800 uppercase">{subject}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(formData.componentLibrary ?? []).map((config) => {
                          const isOn = assigned.some((c) => c.name === config.name);
                          return (
                            <button
                              key={config.name}
                              onClick={() => handleToggleSubjectComponent(subject, config.name)}
                              className={`rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                                isOn
                                  ? "bg-indigo-600 text-white"
                                  : "border border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50"
                              }`}
                            >
                              {config.name} /{config.maxScore}
                            </button>
                          );
                        })}
                      </div>
                      {assigned.length === 0 && (
                        <p className="mt-1 text-[10px] text-indigo-400">
                          No tasks assigned — class score entered directly.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
