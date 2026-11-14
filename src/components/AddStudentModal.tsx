import { useState } from "react";
import { X } from "lucide-react";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import type { SavedSubject, SchoolSettings, StudentRecord } from "../types";
import { Button, Input } from "./ui";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (student: StudentRecord) => void;
  settings: SchoolSettings;
}

export function AddStudentModal({
  isOpen,
  onClose,
  onAddStudent,
  settings,
}: AddStudentModalProps) {
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState<"Male" | "Female">("Male");

  if (!isOpen) return null;

  const handleClose = () => {
    setNewName("");
    setNewGender("Male");
    onClose();
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const subjectNames =
      settings.defaultSubjects && settings.defaultSubjects.length > 0
        ? settings.defaultSubjects
        : DEFAULT_SUBJECTS[settings.level] || [];

    const startingSubjects: SavedSubject[] = subjectNames.map((subName) => ({
      id: crypto.randomUUID(),
      name: subName,
      classScore: 0,
      examScore: 0,
    }));

    onAddStudent({
      id: crypto.randomUUID(),
      name: trimmedName,
      gender: newGender,
      className: settings.className || "Class",
      subjects: startingSubjects,
    });

    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-modal-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="add-student-modal-title" className="text-lg font-bold text-gray-800" data-record="true">
            Add New Student
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="text-muted h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Full Name"
            autoFocus
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Kwame Mensah"
          />

          <div>
            <label
              className="text-muted mb-1 block text-xs font-bold uppercase"
              data-record="true"
            >
              Gender *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNewGender("Male")}
                className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  newGender === "Male"
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                    : "border-gray-300 bg-white text-gray-600 hover:border-blue-300"
                }`}
                data-record="true"
              >
                👦 Male
              </button>
              <button
                type="button"
                onClick={() => setNewGender("Female")}
                className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  newGender === "Female"
                    ? "border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-200"
                    : "border-gray-300 bg-white text-gray-600 hover:border-pink-300"
                }`}
                data-record="true"
              >
                👧 Female
              </button>
            </div>
          </div>

          <div>
            <label
              className="text-muted mb-1 block text-xs font-bold uppercase"
              data-record="true"
            >
              Class
            </label>
            <p className="w-full rounded-lg border border-gray-300 p-2 outline-none">
              {settings.className}
            </p>
            <p className="mt-1 text-[10px] text-gray-400" data-record="true">
              Based on School Level: {settings.level}
            </p>
          </div>

          <Button type="submit" variant="primary" size="md" fullWidth data-record="true">
            Save Student
          </Button>
        </form>
      </div>
    </div>
  );
}
