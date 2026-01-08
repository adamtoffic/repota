// src/pages/Dashboard.tsx
import { useState, useMemo } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { StudentList } from "../components/StudentList";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { DashboardStats } from "../components/DashboardStats";
import { DashboardToolbar } from "../components/DashboardToolbar"; // ✅ Import new component
import { Link } from "@tanstack/react-router";
// ... imports ...

export function Dashboard() {
  const { students, settings, addStudent, deleteStudent, updateStudent } = useSchoolData();

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "FAILING">("ALL");

  // Logic (The new smart logic we wrote above)
  const filteredStudents = useMemo(() => {
    // ... Paste the new logic from Step 1 here ...
    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());

      const hasMissingSubjects = student.subjects.length === 0;
      const hasIncompleteScores = student.subjects.some(
        (sub) => sub.classScore === 0 || sub.examScore === 0,
      );
      const isPending = hasMissingSubjects || hasIncompleteScores;
      const isFailing = !isPending && student.averageScore < 50;

      if (activeFilter === "PENDING") return matchesSearch && isPending;
      if (activeFilter === "FAILING") return matchesSearch && isFailing;
      return matchesSearch;
    });
  }, [students, searchQuery, activeFilter]);

  const editingStudent = students.find((s) => s.id === editingStudentId);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* NAV (Keep as is) */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                GES
              </div>
              <div>
                <h1 className="text-lg leading-tight font-bold text-gray-900">{settings.name}</h1>
                <p className="text-xs text-gray-500">
                  {settings.term} • {settings.level}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* ✅ NEW: Link to Print */}
              <Link
                to="/print"
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Print Reports
              </Link>

              {/* ✅ UPDATED: Link to Settings */}
              <Link
                to="/settings"
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <SettingsIcon className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 1. STATS */}
        <DashboardStats students={students} />

        {/* 2. TOOLBAR (Refactored!) */}
        <DashboardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* 3. LIST */}
        <StudentList
          students={filteredStudents}
          settings={settings}
          onAddStudent={addStudent}
          onDeleteStudent={deleteStudent}
          onEditStudent={(s) => setEditingStudentId(s.id)}
        />
      </main>

      {/* MODAL */}
      {editingStudent && (
        <ScoreEntryModal
          student={editingStudent}
          level={settings.level}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudentId(null)}
          onUpdateStudent={updateStudent}
        />
      )}
    </div>
  );
}
