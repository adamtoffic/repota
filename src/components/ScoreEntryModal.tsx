// src/components/ScoreEntryModal.tsx
import { X, Save, AlertCircle } from "lucide-react"; // Added AlertCircle
import { SubjectRow } from "./SubjectRow";
import type { ProcessedStudent, SavedSubject, SchoolLevel } from "../types";
import { useSchoolData } from "../hooks/useSchoolData"; // We need this to read the Global Settings

interface Props {
  student: ProcessedStudent;
  level: SchoolLevel;
  isOpen: boolean;
  onClose: () => void;
  onUpdateScores: (id: string, subjects: SavedSubject[]) => void;
}

export function ScoreEntryModal({ student, level, isOpen, onClose, onUpdateScores }: Props) {
  // 1. Get the Global Settings to see what subjects SHOULD exist
  const { settings } = useSchoolData();
  const masterList = settings.defaultSubjects || [];

  if (!isOpen) return null;

  // 2. Identify Missing Subjects
  // "Which subjects are in the Master List but NOT in this student's record?"
  const missingSubjects = masterList.filter(
    (masterName) => !student.subjects.some((sub) => sub.name === masterName),
  );

  const handleSubjectChange = (updatedSubject: SavedSubject) => {
    const newSubjects = student.subjects.map((s) =>
      s.id === updatedSubject.id ? updatedSubject : s,
    );
    onUpdateScores(student.id, newSubjects);
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (confirm("Are you sure you want to remove this subject?")) {
      const newSubjects = student.subjects.filter((s) => s.id !== subjectId);
      onUpdateScores(student.id, newSubjects);
    }
  };

  // 3. The Sync Function: Adds missing subjects instantly
  const handleAddMissing = () => {
    const newSubjectsToAdd = missingSubjects.map((name) => ({
      id: crypto.randomUUID(),
      name: name,
      classScore: 0,
      examScore: 0,
    }));

    // Combine Old + New
    onUpdateScores(student.id, [...student.subjects, ...newSubjectsToAdd]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
            <p className="text-sm text-gray-500">
              {level} • {student.className}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ✅ THE SMART SYNC BUTTON (Only shows if needed) */}
          {missingSubjects.length > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900">Missing Class Subjects</h4>
                  <p className="mt-1 text-xs text-blue-700">
                    This student is missing <strong>{missingSubjects.length}</strong> subjects from
                    your settings:
                    <span className="italic opacity-80">
                      {" "}
                      {missingSubjects.slice(0, 3).join(", ")}
                      {missingSubjects.length > 3 && "..."}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleAddMissing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Add All Missing
              </button>
            </div>
          )}

          {/* SUBJECT LIST */}
          <div className="space-y-3">
            {student.subjects.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                <p className="font-medium text-gray-400">No subjects assigned yet.</p>
                {/* Fallback button if they have no subjects at all */}
                <button
                  onClick={handleAddMissing}
                  className="mt-2 font-bold text-blue-600 hover:underline"
                >
                  Load Default Subjects
                </button>
              </div>
            ) : (
              student.subjects.map((subject) => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  level={level}
                  onChange={handleSubjectChange}
                  onDelete={() => handleDeleteSubject(subject.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end rounded-b-xl border-t border-gray-100 bg-gray-50 p-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-8 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Save className="h-4 w-4" /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
