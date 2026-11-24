import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, User, X } from "lucide-react";
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

export function AddStudentModal(props: AddStudentModalProps) {
  if (!props.isOpen) return null;
  return <AddStudentModalContent {...props} />;
}

function AddStudentModalContent({
  onClose,
  onAddStudent,
  settings,
}: AddStudentModalProps) {
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState<"Male" | "Female">("Male");
  const [addedCount, setAddedCount] = useState(0);
  const nameInputId = useId();

  const configuredClass = (settings.className ?? "").trim();

  const saveCurrentStudent = (): boolean => {
    const trimmedName = newName.trim();
    if (!trimmedName) return false;

    const startingSubjects = buildDefaultSubjectsForStudent(settings);

    onAddStudent({
      id: crypto.randomUUID(),
      name: trimmedName,
      gender: newGender,
      className: configuredClass || "Class",
      subjects: startingSubjects,
    });
    return true;
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!saveCurrentStudent()) return;
    onClose();
  };

  const handleSaveAndAddAnother = () => {
    if (!saveCurrentStudent()) return;
    setAddedCount((prev) => prev + 1);
    setNewName("");
    document.getElementById(nameInputId)?.focus();
  };

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-sm">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="add-student-modal-title"
                className="text-main text-lg font-bold"
                data-record="true"
              >
                Add New Student
              </h3>
              {addedCount > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  +{addedCount} added
                </span>
              )}
            </div>
            {configuredClass && (
              <p className="text-muted mt-0.5 truncate text-xs">
                Adding to <span className="text-secondary font-semibold">{configuredClass}</span>
                {settings.level ? ` · ${settings.level}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-muted hover:bg-subtle hover:text-main shrink-0 rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!configuredClass && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
            <span data-record="true">No class name set yet.</span>
            <Link
              to="/settings/academic"
              onClick={onClose}
              className="shrink-0 font-bold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
              data-record="true"
            >
              Set class name →
            </Link>
          </div>
        )}

        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            id={nameInputId}
            label="Full Name"
            autoFocus
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="text-base sm:text-sm"
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
                aria-pressed={newGender === "Male"}
                onClick={() => setNewGender("Male")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  newGender === "Male"
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800/60"
                    : "border-border-strong bg-surface text-secondary hover:border-blue-300 dark:hover:border-blue-500"
                }`}
                data-record="true"
              >
                <User className="h-4 w-4" />
                <span>Male</span>
              </button>
              <button
                type="button"
                aria-pressed={newGender === "Female"}
                onClick={() => setNewGender("Female")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  newGender === "Female"
                    ? "border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:ring-pink-800/60"
                    : "border-border-strong bg-surface text-secondary hover:border-pink-300 dark:hover:border-pink-500"
                }`}
                data-record="true"
              >
                <User className="h-4 w-4" />
                <span>Female</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!newName.trim()}
              data-record="true"
            >
              Save Student
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              disabled={!newName.trim()}
              onClick={handleSaveAndAddAnother}
              data-record="true"
            >
              <Plus className="h-4 w-4" />
              <span>Save &amp; Add Another</span>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
