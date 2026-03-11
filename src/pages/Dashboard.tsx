import { useState, useMemo } from "react";
import { HelpCircle, X, Printer, Settings as SettingsIcon, BarChart3 } from "lucide-react";
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
import { ScrollButton } from "../components/ScrollButton";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { WelcomeTour } from "../components/WelcomeTour";
import { ValidationWarnings } from "../components/ValidationWarnings";
import { ProgressModal } from "../components/ProgressModal";
import { useToast } from "../hooks/useToast";

import { triggerHaptic } from "../utils/iosInteraction";
import { PageHeader } from "../components/ui/PageHeader";

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
    isSaving,
    lastSaved,
  } = useSchoolData();

  const { showToast } = useToast();

  const [confirmCleanModal, setConfirmCleanModal] = useState(false);
  const [confirmClearScoresModal, setConfirmClearScoresModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [remarksProgress, setRemarksProgress] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
  }>({ isOpen: false, current: 0, total: 0 });

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
      gender: "Male", // Default - will be changed in modal
      className: settings.className || "Class",
      subjects: [], // Will be populated by Modal logic
      attendancePresent: 0,
    };

    addStudent(newStudent); // Create it
    setEditingStudentId(newId); // Open modal immediately for editing
  };

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      {/* NAV */}
      <PageHeader
        schoolName={settings.schoolName}
        actions={
          students.length > 0 ? (
            <>
              <Link
                to="/analytics"
                className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-white shadow-sm transition-all hover:bg-purple-700 active:scale-95 sm:px-4"
              >
                <BarChart3 className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden text-sm font-medium sm:inline">Analytics</span>
              </Link>
              <Link
                to="/print"
                className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-white shadow-sm transition-all active:scale-95 sm:px-4"
              >
                <Printer className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden text-sm font-medium sm:inline">Print</span>
              </Link>
              <Link
                to="/settings"
                className="bg-background text-muted flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-all hover:bg-gray-100 active:scale-95 sm:px-4"
              >
                <SettingsIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden text-sm font-medium sm:inline">Settings</span>
              </Link>
            </>
          ) : (
            <Link
              to="/settings"
              className="bg-background text-muted flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-all hover:bg-gray-100 active:scale-95 sm:px-4"
            >
              <SettingsIcon className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden text-sm font-medium sm:inline">Settings</span>
            </Link>
          )
        }
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* MAIN CONTENT AREA */}
        {students.length === 0 && (
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-main font-bold">Need help getting started?</h3>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  Add your first student or reach out on WhatsApp if you're stuck.
                </p>
                <div className="mt-3">
                  <a
                    href="https://wa.me/233248140806?text=Hi!%20I%20need%20help%20starting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-success hover:text-success/80 inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:underline"
                  >
                    💬 Ask for help on WhatsApp →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        {students.length === 0 ? (
          <EmptyState onAddStudent={handleAddNew} onLoadDemo={() => setShowDemoModal(true)} />
        ) : (
          <>
            <DashboardStats students={students} settings={settings} />

            {/* VALIDATION WARNINGS */}
            <ValidationWarnings students={students} settings={settings} />

            <div className="relative">
              <DashboardToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onExport={() => {
                  try {
                    exportToCSV(
                      students,
                      `Class_Broadsheet_${new Date().toISOString().split("T")[0]}`,
                    );
                    showToast("Class list exported successfully!", "success");
                  } catch (error) {
                    console.error("Export failed:", error);
                    showToast(
                      error instanceof Error ? error.message : "Export failed. Please try again.",
                      "error",
                    );
                  }
                }}
                onDeletePending={() => setConfirmCleanModal(true)}
                onImport={() => setShowImportModal(true)}
                onAutoRemarks={() => {
                  setRemarksProgress({ isOpen: true, current: 0, total: students.length });
                  // Use setTimeout to allow modal to render first
                  setTimeout(() => {
                    autoGenerateRemarks((current, total) => {
                      setRemarksProgress({ isOpen: true, current, total });

                      // Close modal when complete
                      if (current === total) {
                        setTimeout(() => {
                          setRemarksProgress({ isOpen: false, current: 0, total: 0 });
                        }, 800);
                      }
                    });
                  }, 100);
                }}
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
          allStudents={filteredStudents}
          onNavigate={setEditingStudentId}
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

      {/* ✅ SCROLL TO TOP/BOTTOM BUTTON */}
      {students.length >= 10 && <ScrollButton />}

      {/* ✅ AUTO-SAVE INDICATOR */}
      <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />

      {/* ✅ WELCOME TOUR for first-time users */}
      <WelcomeTour
        steps={[
          {
            title: "Welcome to Repota! 🇬🇭",
            description:
              "We're so glad you're here! Repota helps you create beautiful GES report cards in minutes. Everything works offline - no internet needed once loaded. Let's show you around!",
          },
          {
            title: "Step 1: Configure Your School ⚙️",
            description:
              "Before adding students, click the 'Settings' button (⚙️) at the top to set up your school details. Enter your school name, academic year, term, class name, and choose your subjects. This only takes a minute and everything will be ready!",
          },
          {
            title: "Step 2: Add Your Students 👨‍🎓",
            description:
              "Now click the 'Add Student' button to start building your class list. Type their names one by one, or use 'Bulk Import' if you have a list ready. You can also try 'Load Demo Data' to see how everything works first.",
          },
          {
            title: "Step 3: Enter Scores & Watch the Magic ✨",
            description:
              "Click on any student's name to enter their class and exam scores. Repota automatically calculates their total marks, grades (A, B, C...), class position, and even writes teacher remarks for you! No more manual calculations.",
          },
          {
            title: "Step 4: View Class Analytics 📊",
            description:
              "Click the 'Analytics' button to see beautiful charts and insights about your class performance. See top performers, subject averages, pass rates, and trends - all updated in real-time as you enter scores.",
          },
          {
            title: "Step 5: Print Report Cards 🖨️",
            description:
              "When you're done, click 'Print Reports' to generate professional GES-compliant report cards for all students at once. You can print them directly or save as PDF. Each report looks perfect and ready to hand out!",
          },
          {
            title: "Your Work is Safe! 💚",
            description:
              "Don't worry - everything you type is saved automatically every few seconds. Even if your phone dies or you close the app, your work is safe on your device. You'll see 'Saved just now' at the bottom-left. No internet required!",
          },
        ]}
        onComplete={() => {}}
        storageKey="repota_welcome_tour_v2"
      />

      {/* PROGRESS MODAL FOR BULK OPERATIONS */}
      <ProgressModal
        isOpen={remarksProgress.isOpen}
        title="Generating Remarks"
        message="Please wait while we generate personalized remarks for all students..."
        current={remarksProgress.current}
        total={remarksProgress.total}
      />
    </div>
  );
}
