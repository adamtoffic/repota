import { useState, useMemo } from "react";
import { HelpCircle, X, Printer, Settings as SettingsIcon } from "lucide-react";
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

import { triggerHaptic } from "../utils/iosInteraction";

export function Dashboard() {
  const {
    students,
    settings,
    addStudent,
    deleteStudent,
    updateStudent,
    loadDemoData,
    deletePendingStudents,
    autoGenerateRemarks,
    clearAllScores,
  } = useSchoolData();

  // Welcome Banner State
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("classSync_welcome_seen");
  });

  const [confirmCleanModal, setConfirmCleanModal] = useState(false);
  const [confirmClearScoresModal, setConfirmClearScoresModal] = useState(false);
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
    const newId = crypto.randomUUID();
    const newStudent: StudentRecord = {
      id: newId,
      name: "New Student", // Placeholder
      className: settings.className || "Class",
      subjects: [], // Will be populated by Modal logic
      attendancePresent: 0,
    };

    addStudent(newStudent); // Create it
    setEditingStudentId(newId); // Open modal immediately for editing
  };

  const handleDismiss = () => {
    setShowWelcome(false);
    localStorage.setItem("classSync_welcome_seen", "true");
  };

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            {/* LEFT SIDE: Brand Identity (SaaS Style) */}
            <div className="flex items-center gap-3 overflow-hidden">
              {/* 1. Fixed Repota Logo */}
              <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform hover:scale-105">
                <img src="/logo.svg" alt="Repota" className="h-full w-full p-1" />
              </div>

              {/* 2. App Name + School Context */}
              <div className="min-w-0 flex-1">
                <h1 className="text-main text-lg leading-none font-black tracking-tight">REPOTA</h1>
                <p className="text-muted truncate text-xs font-medium">
                  {settings.schoolName || "No School Selected"}
                </p>
              </div>
            </div>

            {/* RIGHT SIDE: Buttons (Icon only on Mobile) */}
            <div className="flex items-center gap-2 pl-2">
              {students.length > 0 && (
                <Link
                  to="/print"
                  className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-white shadow-sm transition-all active:scale-95 sm:px-4"
                >
                  <Printer className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="hidden text-sm font-medium sm:inline">Print</span>
                </Link>
              )}
              <Link
                to="/settings"
                className="bg-background text-muted flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-all hover:bg-gray-100 active:scale-95 sm:px-4"
              >
                <SettingsIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden text-sm font-medium sm:inline">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* WELCOME BANNER */}
        {showWelcome ? (
          <div className="animate-in fade-in slide-in-from-top-4 bg-primary relative mb-6 overflow-hidden rounded-xl p-6 text-white shadow-lg duration-300">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 rounded-full p-1.5 transition-colors hover:bg-white/20 active:scale-95"
            >
              <X size={18} className="text-white" />
            </button>
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Welcome to Repota! 🚀</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50">
                  New here? Watch this quick 2-minute video to learn how to generate error-free
                  reports instantly, or chat with us if you need help.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="YOUR_YOUTUBE_LINK"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-95"
                  >
                    ▶ Watch Tutorial
                  </a>

                  <a
                    href="https://wa.me/233248140806?text=Hi!%20I%20am%20new%20to%20Repota"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-foreground hover:bg-primary-foreground/10 inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold backdrop-blur-sm transition-all active:scale-95"
                  >
                    💬 Chat Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Quick Help Card - Shows for first-time users */
          students.length === 0 && (
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-main font-bold">Ready to start?</h3>
                  <p className="text-muted mt-1 text-sm leading-relaxed">
                    You don't have any students yet. Add your first student or chat with us if
                    you're stuck.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href="https://wa.me/233248140806?text=Hi!%20I%20need%20help%20starting"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success hover:text-success/80 inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:underline"
                    >
                      💬 Ask for help on WhatsApp →
                    </a>
                    <a
                      href="https://youtu.be/..."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-all active:scale-95"
                    >
                      ▶ Watch Video
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* MAIN CONTENT AREA */}
        {students.length === 0 ? (
          <EmptyState onAddStudent={handleAddNew} onLoadDemo={() => setShowDemoModal(true)} />
        ) : (
          <>
            <DashboardStats students={students} settings={settings} />

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
                onAutoRemarks={() => autoGenerateRemarks()}
                onClearScores={() => setConfirmClearScoresModal(true)}
                onExportStudentList={() => {
                  // Export simple student names list as text file
                  const studentList = students.map((s, i) => `${i + 1}. ${s.name}`).join("\n");
                  const blob = new Blob([studentList], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${settings.className || "Class"}_Students_${new Date().toISOString().split("T")[0]}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
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
                <div className="bg-background mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                  <X className="text-muted h-7 w-7" />
                </div>
                <h3 className="text-main text-lg font-bold">No students found</h3>
                <p className="text-muted mt-1 text-sm">
                  No results for "{searchQuery}" in{" "}
                  {activeFilter === "ALL" ? "all students" : activeFilter.toLowerCase()}.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("ALL");
                  }}
                  className="text-primary hover:text-primary/80 mt-4 text-sm font-bold transition-colors hover:underline"
                >
                  Clear Search & Filters
                </button>
              </div>
            ) : (
              <StudentList
                students={filteredStudents}
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
          triggerHaptic("heavy");
          deletePendingStudents();
          setConfirmCleanModal(false);
        }}
      />

      {/* ✅ CONFIRM CLEAR SCORES MODAL */}
      <ConfirmModal
        isOpen={confirmClearScoresModal}
        title="Clear All Student Scores?"
        message={`This will reset ALL class and exam scores to 0 for all ${students.length} students. Student names and details will be preserved. This action cannot be undone.`}
        confirmText="Yes, Clear All Scores"
        isDangerous={true}
        onClose={() => setConfirmClearScoresModal(false)}
        onConfirm={() => {
          triggerHaptic("heavy");
          clearAllScores();
          setConfirmClearScoresModal(false);
        }}
      />
    </div>
  );
}
