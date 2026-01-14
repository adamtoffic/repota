// src/pages/Dashboard.tsx
import { useState, useMemo } from "react";
import { X, Settings as SettingsIcon } from "lucide-react";
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
import { ConfirmModal } from "../components/ConfirmModal";

export function Dashboard() {
  const { students, settings, addStudent, deleteStudent, updateStudent, loadDemoData } =
    useSchoolData();

  // 1. State to control visibility
  const [showWelcome, setShowWelcome] = useState(() => {
    // Return TRUE only if the key does NOT exist
    const hasSeen = localStorage.getItem("classSync_welcome_seen");
    return !hasSeen;
  });

  const [showDemoModal, setShowDemoModal] = useState(false);

  // 3. Handle Dismiss
  const handleDismiss = () => {
    setShowWelcome(false);
    // Save to storage so it never comes back
    localStorage.setItem("classSync_welcome_seen", "true");
  };

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

  // 2. The Execution (called directly OR after confirming duplicate)

  // 1. The Trigger
  const handleAddNew = () => {
    const newId = Date.now().toString();

    const newStudent: StudentRecord = {
      id: newId,
      name: "New Student", // Placeholder
      className: settings.className || "Class",
      subjects: [], // Will be filled by ScoreEntryModal based on settings
      attendancePresent: 0,
      numberOnRoll: students.length + 1,
    };

    addStudent(newStudent); // 1. Create it
    setEditingStudentId(newId); // 2. Open it immediately for editing
  };

  const schoolInitials = settings.schoolName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-sans">
      {/* NAV (Keep exactly as is) */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <span>{schoolInitials || "GH"}</span> // Default to "GH" if no name set
                )}
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
        {/* ... Inside Dashboard ... */}

        {/* ✅ TUTORIAL CARD */}
        {/* CONDITIONAL RENDER: Only show if true */}
        {showWelcome && (
          <div className="animate-in fade-in slide-in-from-top-4 relative mb-6 rounded-xl bg-linear-to-r from-blue-900 to-blue-700 p-6 text-white shadow-lg">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 rounded-full p-1 transition hover:bg-white/20"
            >
              <X size={20} className="text-white" />
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  Welcome to {settings.schoolName || "ClassSync"}! 🚀
                </h2>
                <p className="mt-1 max-w-xl text-blue-100">
                  New here? Watch this quick 2-minute video to learn how to generate error-free
                  reports instantly.
                </p>
                <div className="mt-4">
                  <a
                    href="YOUR_YOUTUBE_LINK"
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-gray-100"
                  >
                    ▶ Watch Tutorial
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ 3. CONDITIONAL RENDERING: Empty vs Content */}
        {students.length === 0 ? (
          <EmptyState onAddStudent={handleAddNew} onLoadDemo={() => setShowDemoModal(true)} />
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

      {/* ✅ DEMO DATA CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={showDemoModal}
        title="Load Demo Data?"
        message="This will add sample students to your database so you can test the report generation. You can delete them later."
        confirmText="Load Samples"
        onConfirm={() => {
          loadDemoData();
          setShowDemoModal(false);
        }}
        onClose={() => setShowDemoModal(false)}
      />

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
