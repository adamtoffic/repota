// src/components/ScoreEntryModal.tsx
import { useState } from "react"; // No useEffect needed anymore!
import { X, Plus, Save, RefreshCw } from "lucide-react";
import type { ProcessedStudent, SavedSubject, SchoolLevel } from "../types";
import { SUBJECT_PRESETS } from "../constants/subjects";
import { SubjectRow } from "./SubjectRow";

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  isOpen: boolean; // We can technically remove this now, but keeping it is fine
  onClose: () => void;
  onUpdateScores: (studentId: string, subjects: SavedSubject[]) => void;
}

export function ScoreEntryModal({ student, level, onClose, onUpdateScores }: Props) {
  // 1. HELPER: Generate the default list (Moved outside the effect)
  const getPresets = (): SavedSubject[] => {
    const presets = SUBJECT_PRESETS[level] || [];
    return presets.map((name) => ({
      id: crypto.randomUUID(),
      name,
      classScore: 0,
      examScore: 0,
    }));
  };

  // 2. STATE: Initialize Logic (Runs only once on mount)
  const [subjects, setSubjects] = useState<SavedSubject[]>(() => {
    // If the student already has subjects, use them.
    if (student.subjects && student.subjects.length > 0) {
      return student.subjects;
    }
    // Otherwise, generate the presets immediately.
    return getPresets();
  });

  // 3. ACTIONS
  // We keep this function for the "Reset" button
  const handleResetPresets = () => {
    if (confirm("This will erase current scores. Continue?")) {
      setSubjects(getPresets());
    }
  };

  const updateSubject = (index: number, updated: SavedSubject) => {
    const newList = [...subjects];
    newList[index] = updated;
    setSubjects(newList);
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const addEmptySubject = () => {
    setSubjects([...subjects, { id: crypto.randomUUID(), name: "", classScore: 0, examScore: 0 }]);
  };

  // ... The Return block (JSX) stays mostly the same
  // Just update the Reset Button onClick:
  // <button onClick={handleResetPresets} ... >

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Edit Scores</h2>
            <p className="text-sm text-gray-500">
              {student.name} • {student.className} •{" "}
              <span className="font-bold text-blue-600">{level}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-3">
          <div className="grid w-full grid-cols-12 gap-4 pl-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
            <div className="col-span-4">Subject</div>
            <div className="col-span-2 text-center">Class (30)</div>
            <div className="col-span-2 text-center">Exam (70)</div>
            <div className="col-span-3 text-center">Result</div>
            <div className="col-span-1"></div>
          </div>
        </div>

        {/* BODY (The List) */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/50 p-4">
          {subjects.length === 0 && (
            <div className="py-10 text-center text-gray-400">
              No subjects yet. Click "Load Presets" or "Add Subject".
            </div>
          )}

          {subjects.map((sub, index) => (
            <SubjectRow
              key={sub.id} // CRITICAL: Use ID, not index
              subject={sub}
              level={level}
              onChange={(updated) => updateSubject(index, updated)}
              onDelete={() => removeSubject(index)}
            />
          ))}

          <div className="mt-4 flex gap-4 border-t border-dashed pt-4">
            <button
              onClick={addEmptySubject}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" /> Add Custom Subject
            </button>
            <button
              onClick={handleResetPresets}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              <RefreshCw className="h-4 w-4" /> Reset to {level} Presets
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 rounded-b-xl border-t border-gray-100 bg-white p-6">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onUpdateScores(student.id, subjects);
              onClose();
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
          >
            <Save className="h-4 w-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
