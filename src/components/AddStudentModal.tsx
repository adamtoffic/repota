import { useState } from "react";
import { X } from "lucide-react";
import type { SchoolSettings, StudentRecord } from "../types";
import { buildDefaultSubjectsForStudent } from "../utils/csvImport";
import { Button, Input } from "./ui";
import { Modal } from "./ui/Modal";

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

  const handleClose = () => {
    setNewName("");
    setNewGender("Male");
    onClose();
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const startingSubjects = buildDefaultSubjectsForStudent(settings);

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
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-sm">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 id="add-student-modal-title" className="text-main text-lg font-bold" data-record="true">
            Add New Student
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="text-muted hover:bg-subtle hover:text-main rounded-lg p-1"
          >
            <X className="h-5 w-5" />
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
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800/60"
                    : "border-border-strong bg-surface text-secondary hover:border-blue-300 dark:hover:border-blue-500"
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
                    ? "border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:ring-pink-800/60"
                    : "border-border-strong bg-surface text-secondary hover:border-pink-300 dark:hover:border-pink-500"
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
            <p className="border-border bg-subtle text-secondary w-full rounded-lg border px-3 py-2 text-sm font-medium">
              {settings.className || "Not configured"}
            </p>
            <p className="text-muted mt-1 text-[10px]" data-record="true">
              Based on School Level: {settings.level}
            </p>
          </div>

          <Button type="submit" variant="primary" size="md" fullWidth data-record="true">
            Save Student
          </Button>
        </form>
      </div>
    </Modal>
  );
}
