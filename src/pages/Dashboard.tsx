import { LayoutDashboard } from "lucide-react";
import { StudentList } from "../components/StudentList";
import type { ProcessedStudent, SchoolSettings, StudentRecord } from "../types";

interface Props {
  students: ProcessedStudent[];
  settings: SchoolSettings;
  onAddStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string) => void;
}

export function Dashboard({ students, settings, onAddStudent, onDeleteStudent }: Props) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-300">
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
      <StudentList
        students={students}
        onAddStudent={onAddStudent}
        onDeleteStudent={onDeleteStudent}
        onEditStudent={(s) => alert(`Edit scores for ${s.name} (Coming Soon!)`)}
      />
    </div>
  );
}
