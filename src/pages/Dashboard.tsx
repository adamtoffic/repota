import { LayoutDashboard } from "lucide-react";
import { StudentList } from "../components/StudentList";
import type { ProcessedStudent, SavedSubject, SchoolSettings, StudentRecord } from "../types";
import { useState } from "react";
import { ScoreEntryModal } from "../components/ScoreEntryModal";

interface Props {
  students: ProcessedStudent[];
  settings: SchoolSettings;
  onAddStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateScores: (id: string, subjects: SavedSubject[]) => void;
}

export function Dashboard({
  students,
  settings,
  onAddStudent,
  onDeleteStudent,
  onUpdateScores,
}: Props) {
  const [editingStudent, setEditingStudent] = useState<ProcessedStudent | null>(null);
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-300">
      <StudentList
        students={students}
        onAddStudent={onAddStudent}
        onDeleteStudent={onDeleteStudent}
        onEditStudent={(s) => setEditingStudent(s)}
      />
      {/* The Modal (Only renders if editingStudent is not null) */}
      {editingStudent && (
        <ScoreEntryModal
          key={editingStudent.id}
          student={editingStudent}
          level={settings.level}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onUpdateScores={onUpdateScores}
        />
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="rounded-full bg-blue-100 p-3 text-blue-600">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-2xl font-bold">{students.length}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Current Level</p>
          <p className="text-xl font-bold text-blue-900">{settings.level}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Academic Term</p>
          <p className="text-lg font-bold text-gray-700">{settings.term}</p>
        </div>
      </div>

      {/* Student List */}
    </div>
  );
}
