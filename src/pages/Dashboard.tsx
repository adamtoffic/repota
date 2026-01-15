import { useState, useMemo } from "react";
import { X, Printer, Settings as SettingsIcon } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { StudentList } from "../components/StudentList";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { DashboardStats } from "../components/DashboardStats";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { Link } from "@tanstack/react-router";
import { EmptyState } from "../components/EmptyState";
import type { StudentRecord } from "../types";
import { Footer } from "../components/Footer";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useDebounce } from "../hooks/useDebounce";
import { exportToCSV } from "../utils/export";
import { BulkImportModal } from "../components/BulkImportModal";

export function Dashboard() {
  const {
    students,
    settings,
    addStudent,
    deleteStudent,
    updateStudent,
    loadDemoData,
    deletePendingStudents,
  } = useSchoolData();

  // Welcome Banner State
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("classSync_welcome_seen");
  });

  const [confirmCleanModal, setConfirmCleanModal] = useState(false);

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "FAILING">("ALL");

  // Debounce Search Logic
  const debounceSearch = useDebounce(searchQuery, 300);
  const isSearching = searchQuery !== "" && debounceSearch !== searchQuery;

  // Filter Logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(debounceSearch.toLowerCase());
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
  }, [students, debounceSearch, activeFilter]);

  const editingStudent = students.find((s) => s.id === editingStudentId);

  // ✅ CLEAN ADD HANDLER (No Prompts, No Checks)
  const handleAddNew = () => {
    const newId = Date.now().toString();
    const newStudent: StudentRecord = {
      id: newId,
      name: "New Student", // Placeholder
      className: settings.className || "Class",
      subjects: [], // Will be populated by Modal logic
      attendancePresent: 0,
      numberOnRoll: students.length + 1,
    };

    addStudent(newStudent); // Create it
    setEditingStudentId(newId); // Open modal immediately for editing
  };

  const schoolInitials = settings.schoolName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDismiss = () => {
    setShowWelcome(false);
    localStorage.setItem("classSync_welcome_seen", "true");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            {/* LEFT SIDE: Logo & Name */}
            <div className="flex items-center gap-3 overflow-hidden">
              {" "}
              {/* Added overflow-hidden */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <span>{schoolInitials || "GH"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {" "}
                {/* min-w-0 is CRITICAL for text truncation in flex */}
                <h1 className="truncate text-base leading-tight font-bold text-gray-900 sm:text-lg">
                  {settings.schoolName || "My School"}
                </h1>
                <p className="truncate text-xs text-gray-500">
                  {settings.term} • {settings.level}
                </p>
              </div>
            </div>

            {/* RIGHT SIDE: Buttons (Icon only on Mobile) */}
            <div className="flex items-center gap-2 pl-2">
              {students.length > 0 && (
                <Link
                  to="/print"
                  className="flex items-center justify-center rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 sm:px-4 sm:py-2"
                >
                  <Printer className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" /> {/* Icon only on mobile */}
                  <span className="hidden text-sm font-medium sm:inline">Print</span>
                </Link>
              )}
              <Link
                to="/settings"
                className="flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 sm:px-4 sm:py-2"
              >
                <SettingsIcon className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden text-sm font-medium sm:inline">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* WELCOME BANNER */}
        {showWelcome && (
          <div className="animate-in fade-in slide-in-from-top-4 relative mb-6 rounded-xl bg-linear-to-r from-blue-900 to-blue-700 p-6 text-white shadow-lg">
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

        {/* MAIN CONTENT AREA */}
        {students.length === 0 ? (
          <EmptyState onAddStudent={handleAddNew} onLoadDemo={() => setShowDemoModal(true)} />
        ) : (
          <>
            <DashboardStats students={students} />

            <div className="relative">
              <DashboardToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onExport={() =>
                  exportToCSV(
                    students,
                    `Class_Broadsheet_${new Date().toISOString().split("T")[0]}`,
                  )
                }
                onDeletePending={() => setConfirmCleanModal(true)}
                onImport={() => setShowImportModal(true)}
              />

              {/* ✅ SPINNER: Positioned correctly in search bar area */}
              {isSearching && (
                <div className="absolute top-2 left-80 z-10 hidden md:block">
                  <LoadingSpinner size={20} className="text-blue-500" />
                </div>
              )}
            </div>

            {/* ✅ LOGIC: If filtered list is empty, show "No Results", else show List */}
            {filteredStudents.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <X className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No students found</h3>
                <p className="text-gray-500">
                  No results for "{searchQuery}" in{" "}
                  {activeFilter === "ALL" ? "all students" : activeFilter.toLowerCase()}.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("ALL");
                  }}
                  className="mt-4 text-sm font-bold text-blue-600 hover:underline"
                >
                  Clear Search & Filters
                </button>
              </div>
            ) : (
              <StudentList
                students={filteredStudents}
                settings={settings}
                onAddStudent={addStudent}
                onDeleteStudent={deleteStudent}
                onEditStudent={(s) => setEditingStudentId(s.id)}
              />
            )}
          </>
        )}
      </main>

      <Footer />

      {/* DEMO MODAL */}
      <ConfirmModal
        isOpen={showDemoModal}
        title="Load Demo Data?"
        message="This will add sample students to your database..."
        confirmText="Load Samples"
        onConfirm={() => {
          loadDemoData();
          setShowDemoModal(false);
        }}
        onClose={() => setShowDemoModal(false)}
      />

      {/* EDIT MODAL */}
      {editingStudent && (
        <ScoreEntryModal
          student={editingStudent}
          level={settings.level}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudentId(null)}
          onUpdateStudent={updateStudent}
        />
      )}

      {/* ✅ BULK IMPORT MODAL */}
      <BulkImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      {/* ✅ CONFIRM CLEAN MODAL */}
      <ConfirmModal
        isOpen={confirmCleanModal}
        title="Delete Incomplete Students?"
        message="This will remove all students who have NO SUBJECTS or ZERO SCORES. This is useful for cleaning up 'New Student' entries."
        confirmText="Yes, Clean Up"
        isDangerous={true}
        onClose={() => setConfirmCleanModal(false)}
        onConfirm={() => {
          deletePendingStudents();
          setConfirmCleanModal(false);
        }}
      />
    </div>
  );
}
