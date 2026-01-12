// src/pages/Dashboard.tsx
import { useState, useMemo } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { StudentList } from "../components/StudentList";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { DashboardStats } from "../components/DashboardStats";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { Link } from "@tanstack/react-router";
// ✅ 1. Import EmptyState
import { EmptyState } from "../components/EmptyState";
import type { StudentRecord } from "../types"; // Import type for safety
import { Footer } from "../components/Footer";

export function Dashboard() {
  const { students, settings, addStudent, deleteStudent, updateStudent, loadDemoData } =
    useSchoolData();

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "FAILING">("ALL");

  // Logic for filtering (Keep existing logic)
  const filteredStudents = useMemo(() => {
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

  // ✅ 2. HELPER: Create a blank student and open the modal
  const handleAddNew = () => {
    const newId = Date.now().toString(); // Simple unique ID
    const newStudent: StudentRecord = {
      id: newId,
      name: "New Student", // Placeholder name
      className: settings.level || "Class",
      subjects: [],
      attendancePresent: 0,
    };

    addStudent(newStudent); // Add to database
    setEditingStudentId(newId); // Immediately open modal to edit details
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-sans">
      {/* NAV (Keep exactly as is) */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                GES
              </div>
              <div>
                <h1 className="text-lg leading-tight font-bold text-gray-900">
                  {settings.schoolName}
                </h1>
                <p className="text-xs text-gray-500">
                  {settings.term} • {settings.level}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Only show Print button if we actually have students */}
              {students.length > 0 && (
                <Link
                  to="/print"
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Print Reports
                </Link>
              )}

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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* ✅ 3. CONDITIONAL RENDERING: Empty vs Content */}
        {students.length === 0 ? (
          <EmptyState onAddStudent={handleAddNew} onLoadDemo={loadDemoData} />
        ) : (
          <>
            {/* 1. STATS */}
            <DashboardStats students={students} />

            {/* 2. TOOLBAR */}
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
          </>
        )}
      </main>
      <Footer />

      {/* MODAL (Keep as is) */}
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
