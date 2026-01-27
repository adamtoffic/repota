// src/components/StudentList.tsx
import { Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Edit2, Trash2, Printer, UserPlus, X } from "lucide-react";
import type { ProcessedStudent, StudentRecord, SavedSubject } from "../types";
import { DEFAULT_SUBJECTS } from "../constants/defaultSubjects";
import { ConfirmModal } from "./ConfirmModal";
import { useSchoolData } from "../hooks/useSchoolData";
import { triggerHaptic } from "../utils/iosInteraction";

interface Props {
  students: ProcessedStudent[];
  onAddStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string) => void;
  onEditStudent: (student: ProcessedStudent) => void;
}

export function StudentList({ students, onAddStudent, onDeleteStudent, onEditStudent }: Props) {
  // STATE
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const { settings } = useSchoolData();

  // Virtual scrolling setup
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-compiler/react-compiler
  const rowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above/below viewport for smooth scrolling
  });

  // ✅ FIX: No useEffect. We set defaults when the user clicks "Open".
  const handleOpenModal = () => {
    setIsAddOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. DETERMINE THE SUBJECT LIST
    // Priority 1: Use the Custom List from Settings
    // Priority 2: Use the Hardcoded Default for the current level
    let subjectNames = settings.defaultSubjects || [];

    if (subjectNames.length === 0) {
      subjectNames = DEFAULT_SUBJECTS[settings.level] || [];
    }

    // 2. Create the subject objects - components are added per-subject by user
    const startingSubjects = subjectNames.map((subName) => {
      const subject: SavedSubject = {
        id: crypto.randomUUID(),
        name: subName,
        classScore: 0,
        examScore: 0,
        // Don't auto-add components - let user choose per subject
      };

      return subject;
    });

    // 3. Add Student
    onAddStudent({
      id: crypto.randomUUID(),
      name: newName,
      className: settings.className || "Class",
      subjects: startingSubjects,
    });

    setNewName("");
    setIsAddOpen(false);
  };

  return (
    // Removed 'overflow-hidden' to prevent any CSS clipping issues with modals
    <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="bg-background flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <h2 className="text-lg font-bold text-gray-800">Student Records</h2>

        <button
          onClick={handleOpenModal}
          className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-bold text-white shadow-sm transition-colors sm:py-2"
          aria-label="Add new student"
        >
          <UserPlus className="h-4 w-4" /> Add Student
        </button>
      </div>

      {/* TABLE */}
      <div
        ref={parentRef}
        className="w-full overflow-x-auto"
        style={{
          maxHeight: "600px",
          overflow: "auto",
        }}
      >
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-bold text-gray-600 uppercase shadow-sm">
            <tr>
              <th className="px-4 py-3 sm:px-6 sm:py-4">Name</th>
              <th className="px-4 py-3 sm:px-6 sm:py-4">Class</th>
              <th className="px-4 py-3 sm:px-6 sm:py-4">Subjects</th>
              <th className="px-4 py-3 sm:px-6 sm:py-4">Avg. Score</th>
              <th className="px-4 py-3 sm:px-6 sm:py-4">Position</th>
              <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400 sm:px-6">
                  No students found. Click "Add Student" to start.
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer for virtual scroll positioning */}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
                )}

                {/* Only render visible rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const student = students[virtualRow.index];
                  return (
                    <tr
                      key={student.id}
                      className="group transition-colors hover:bg-blue-50/50"
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                    >
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <p className="text-main font-bold">{student.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 sm:px-6 sm:py-4">
                        {student.className}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {student.subjects.length} Subjects
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800 sm:px-6 sm:py-4">
                        {student.averageScore > 0 ? `${student.averageScore}%` : "-"}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        {student.classPosition !== "Pending..." && (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100 text-xs font-bold text-yellow-700">
                            {student.classPosition}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6 sm:py-4">
                        <div className="flex justify-end gap-1.5 opacity-100 transition-opacity sm:gap-2 md:opacity-0 md:group-hover:opacity-100">
                          <button
                            onClick={() => onEditStudent(student)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                            title="Edit Student"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {student.subjects.length > 0 && (
                            <Link
                              to="/print"
                              search={{ id: student.id }}
                              className="rounded-lg p-2 text-purple-600 hover:bg-purple-100"
                              title="Print Report"
                            >
                              <Printer className="h-4 w-4" />
                            </Link>
                          )}

                          <button
                            onClick={() => setStudentToDelete(student.id)}
                            className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Bottom spacer for virtual scroll */}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr
                    style={{
                      height: `${
                        rowVirtualizer.getTotalSize() -
                        (rowVirtualizer.getVirtualItems()[
                          rowVirtualizer.getVirtualItems().length - 1
                        ]?.end || 0)
                      }px`,
                    }}
                  />
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Delete Student?"
        message="This action cannot be undone. All grades and remarks for this student will be permanently lost."
        confirmText="Yes, Delete Student"
        isDangerous={true}
        onClose={() => setStudentToDelete(null)}
        onConfirm={() => {
          if (studentToDelete) {
            triggerHaptic("heavy"); // Haptic feedback for destructive action
            onDeleteStudent(studentToDelete);
          }
        }}
      />

      {/* MODAL */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Add New Student</h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="text-muted h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="text-muted mb-1 block text-xs font-bold uppercase">
                  Full Name
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Kwame Mensah"
                />
              </div>

              {/* Class Dropdown */}
              <div>
                <label className="text-muted mb-1 block text-xs font-bold uppercase">Class</label>
                <p className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500">
                  {settings.className}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  Based on School Level: {settings.level}
                </p>
              </div>

              <button
                type="submit"
                className="bg-primary hover:bg-primary/90 w-full rounded-lg py-2 font-bold text-white"
              >
                Save Student
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
