// src/pages/Dashboard.tsx
import { useState, useMemo } from "react";
import { Search, Filter, Settings as SettingsIcon } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { StudentList } from "../components/StudentList";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { DashboardStats } from "../components/DashboardStats";
// ✅ NEW PROP: We ask the parent to handle the switching
interface DashboardProps {
  onOpenSettings: () => void;
}

export function Dashboard({ onOpenSettings }: DashboardProps) {
  const { students, settings, addStudent, deleteStudent, updateStudentScores } = useSchoolData();

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "FAILING">("ALL");

  // --- FILTER LOGIC ---
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;

      // ✅ LOGIC FIX:
      // A student is "Pending" if they have subjects but their average is 0
      // (or if they have no subjects at all).
      const isPending = student.subjects.length === 0 || student.averageScore === 0;

      if (activeFilter === "PENDING") {
        matchesFilter = isPending;
      } else if (activeFilter === "FAILING") {
        // Only show failing if they have actually been graded (Average > 0)
        matchesFilter = student.averageScore > 0 && student.averageScore < 50;
      }

      return matchesSearch && matchesFilter;
    });
  }, [students, searchQuery, activeFilter]);

  const editingStudent = students.find((s) => s.id === editingStudentId);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* TOP NAVIGATION BAR */}
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
              {/* ✅ SWITCHING BUTTON: Calls the prop instead of opening a modal */}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 1. STATS RIBBON */}
        <DashboardStats students={students} />

        {/* 2. ACTION BAR */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-10 transition-all outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex w-full gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                activeFilter === "ALL"
                  ? "bg-gray-900 text-white shadow-md"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              All Students
            </button>
            <button
              onClick={() => setActiveFilter("PENDING")}
              className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                activeFilter === "PENDING"
                  ? "bg-orange-500 text-white shadow-md"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-orange-50"
              }`}
            >
              <Filter className="h-3 w-3" /> Pending Entry
            </button>
            <button
              onClick={() => setActiveFilter("FAILING")}
              className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                activeFilter === "FAILING"
                  ? "bg-red-500 text-white shadow-md"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-red-50"
              }`}
            >
              Needs Attention
            </button>
          </div>
        </div>

        {/* 3. STUDENT LIST */}
        <StudentList
          students={filteredStudents}
          settings={settings}
          onAddStudent={addStudent}
          onDeleteStudent={deleteStudent}
          onEditStudent={(s) => setEditingStudentId(s.id)}
        />
      </main>

      {/* SCORE ENTRY MODAL (Still needed) */}
      {editingStudent && (
        <ScoreEntryModal
          student={editingStudent}
          level={settings.level}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudentId(null)}
          onUpdateScores={updateStudentScores}
        />
      )}
    </div>
  );
}
