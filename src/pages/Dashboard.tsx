import { useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, X, Printer, Plus, List, TableProperties, Upload } from "lucide-react";
import type { ProcessedStudent } from "../types";
import {
  useSchoolActions,
  useSchoolSettings,
  useSchoolStudents,
} from "../hooks/useSchoolData";
import { AddStudentModal } from "../components/AddStudentModal";
import { StudentList } from "../components/StudentList";
import { QuickGradebook } from "../components/QuickGradebook";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import { DashboardStats } from "../components/DashboardStats";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { Link } from "@tanstack/react-router";
import { EmptyState } from "../components/EmptyState";
import { Footer } from "../components/Footer";
import { ConfirmModal } from "../components/ConfirmModal";
import { useDebounce } from "../hooks/useDebounce";
import { captureEvent } from "../utils/analytics";
import { exportDetailedBroadsheetCSV, exportToCSV } from "../utils/export";
import { BulkAttendanceModal } from "../components/BulkAttendanceModal";
import { BulkImportModal } from "../components/BulkImportModal";
import { BulkPromotionModal } from "../components/BulkPromotionModal";
import { ScoreImportModal } from "../components/ScoreImportModal";
import { ScrollButton } from "../components/ScrollButton";
import { WelcomeTour } from "../components/WelcomeTour";
import { ValidationWarnings } from "../components/ValidationWarnings";
import { ProgressModal } from "../components/ProgressModal";
import { useToast } from "../hooks/useToast";

import { triggerHaptic } from "../utils/iosInteraction";
import { PageHeader } from "../components/ui/PageHeader";
import {
  type DashboardFilter,
  type StudentSortOption,
  hasMissingPhoto,
  hasNoScoresEntered,
  hasPartialScores,
  isStudentFailing,
  isStudentPending,
  sortStudents,
} from "../utils/studentValidation";

export function Dashboard() {
  const students = useSchoolStudents();
  const settings = useSchoolSettings();
  const {
    addStudent,
    deleteStudent,
    updateStudent,
    batchUpdateStudents,
    loadDemoData,
    deletePendingStudents,
    autoGenerateRemarks,
    clearAllScores,
    syncSubjectComponentsFromSettings,
    syncClassSubjectsAndSba,
  } = useSchoolActions();

  const { showToast } = useToast();

  const [confirmCleanModal, setConfirmCleanModal] = useState(false);
  const [confirmClearScoresModal, setConfirmClearScoresModal] = useState(false);
  const [confirmAutoRemarksModal, setConfirmAutoRemarksModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [modalStudentQueueIds, setModalStudentQueueIds] = useState<string[] | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showScoreImportModal, setShowScoreImportModal] = useState(false);
  const [scoreImportPreset, setScoreImportPreset] = useState<{
    subject?: string;
    taskName?: string;
  }>({});
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [showBulkPromotionModal, setShowBulkPromotionModal] = useState(false);
  const [remarksProgress, setRemarksProgress] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
  }>({ isOpen: false, current: 0, total: 0 });

  // Search, Filter, Sort & Entry Mode State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("ALL");
  const [sortBy, setSortBy] = useState<StudentSortOption>("DEFAULT");
  const [entryViewMode, setEntryViewMode] = useState<"LIST" | "GRADEBOOK">("LIST");

  // Debounce Search Logic
  const debounceSearch = useDebounce(searchQuery, 300);
  const isSearching = searchQuery !== "" && debounceSearch !== searchQuery;

  const filterCounts = useMemo(() => {
    let noScores = 0;
    let partialScores = 0;
    let pending = 0;
    let missingPhotos = 0;
    let failing = 0;

    for (const s of students) {
      if (hasNoScoresEntered(s)) noScores += 1;
      if (hasPartialScores(s, settings)) partialScores += 1;
      if (isStudentPending(s, settings)) pending += 1;
      if (hasMissingPhoto(s)) missingPhotos += 1;
      if (isStudentFailing(s, settings)) failing += 1;
    }

    return {
      all: students.length,
      pending,
      noScores,
      partialScores,
      missingPhotos,
      failing,
    };
  }, [students, settings]);

  // Filter & Sort Logic (uses shared validation predicates)
  const filteredStudents = useMemo(() => {
    const normalizedSearch = debounceSearch.toLowerCase();
    const matched = students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;

      switch (activeFilter) {
        case "PENDING":
          return isStudentPending(student, settings);
        case "NO_SCORES":
          return hasNoScoresEntered(student);
        case "PARTIAL_SCORES":
          return hasPartialScores(student, settings);
        case "MISSING_PHOTOS":
          return hasMissingPhoto(student);
        case "FAILING":
          return isStudentFailing(student, settings);
        case "ALL":
        default:
          return true;
      }
    });
    return sortStudents(matched, sortBy, settings);
  }, [students, settings, debounceSearch, activeFilter, sortBy]);

  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const modalNavigationStudents = useMemo(() => {
    if (!modalStudentQueueIds) return filteredStudents;
    const resolved: ProcessedStudent[] = [];
    for (const id of modalStudentQueueIds) {
      const latest = studentsById.get(id);
      if (latest) resolved.push(latest);
    }
    return resolved;
  }, [modalStudentQueueIds, studentsById, filteredStudents]);

  const editingStudent = editingStudentId ? studentsById.get(editingStudentId) : undefined;
  const gradebookSessionKey = `${debounceSearch}|${activeFilter}|${sortBy}`;
  const mobileSavedScrollYRef = useRef<number | null>(null);
  const isScoreModalOpen = Boolean(editingStudent);

  useEffect(() => {
    if (!isScoreModalOpen && mobileSavedScrollYRef.current !== null) {
      const savedY = mobileSavedScrollYRef.current;
      mobileSavedScrollYRef.current = null;
      requestAnimationFrame(() => window.scrollTo?.(0, savedY));
    }
  }, [isScoreModalOpen]);

  const handleOpenStudentModal = (
    student: ProcessedStudent,
    orderedQueue?: ProcessedStudent[],
  ) => {
    if (window.matchMedia?.("(max-width: 639px)")?.matches) {
      mobileSavedScrollYRef.current = window.scrollY;
    }
    const queue = orderedQueue ?? filteredStudents;
    const ids = queue.map((item) => item.id);
    if (!ids.includes(student.id)) {
      ids.unshift(student.id);
    }
    setModalStudentQueueIds(ids);
    setEditingStudentId(student.id);
  };

  const handleCloseStudentModal = () => {
    setEditingStudentId(null);
    setModalStudentQueueIds(null);
  };

  const handleOpenAddStudent = () => {
    setIsAddModalOpen(true);
  };

  const handleExportFullData = () => {
    try {
      exportToCSV(students, `Class_Broadsheet_${new Date().toISOString().split("T")[0]}`);
      showToast("Class list exported successfully!", "success");
      captureEvent("Class_Tool_Used", {
        tool: "broadsheet_csv_export",
        students_count: students.length,
        school_level: settings.level || "unknown",
      });
    } catch (error) {
      console.error("Export failed:", error);
      showToast(
        error instanceof Error ? error.message : "Export failed. Please try again.",
        "error",
      );
    }
  };

  const handleExportDetailedBroadsheet = () => {
    try {
      exportDetailedBroadsheetCSV(
        students,
        settings,
        `Detailed_Broadsheet_${new Date().toISOString().split("T")[0]}`,
      );
      showToast("Detailed broadsheet exported!", "success");
      captureEvent("Class_Tool_Used", {
        tool: "detailed_broadsheet_csv_export",
        students_count: students.length,
        school_level: settings.level || "unknown",
      });
    } catch (error) {
      console.error("Detailed export failed:", error);
      showToast(
        error instanceof Error ? error.message : "Export failed. Please try again.",
        "error",
      );
    }
  };

  const handleSyncClassSubjectsAndTasks = () => {
    if (syncClassSubjectsAndSba) {
      syncClassSubjectsAndSba();
      return;
    }

    const masterList = settings.defaultSubjects || [];
    let addedSubjectsCount = 0;

    students.forEach((student) => {
      const missing = masterList.filter(
        (name) => !student.subjects.some((sub) => sub.name === name),
      );
      if (missing.length > 0) {
        const additions = missing.map((name) => ({
          id: crypto.randomUUID(),
          name,
          classScore: 0,
          examScore: 0,
          ...(settings.examType !== "MOCK" && settings.subjectComponentMap?.[name]?.length
            ? {
                classScoreComponents: settings.subjectComponentMap[name].map((task) => ({
                  id: crypto.randomUUID(),
                  name: task.name,
                  score: 0,
                  maxScore: task.maxScore,
                  category: task.category,
                })),
              }
            : {}),
        }));
        updateStudent({ ...student, subjects: [...student.subjects, ...additions] }, true);
        addedSubjectsCount += missing.length;
      }
    });

    syncSubjectComponentsFromSettings();
    if (addedSubjectsCount > 0) {
      showToast(`Added ${addedSubjectsCount} missing subject entries across the class.`, "success");
    }
  };

  const studentsWithExistingRemarksCount = useMemo(
    () => students.filter((s) => Boolean(s.teacherRemark?.trim())).length,
    [students],
  );

  const handleAutoFillRemarks = () => {
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
  };

  const handleAutoRemarksAction = () => {
    if (studentsWithExistingRemarksCount > 0) {
      setConfirmAutoRemarksModal(true);
      return;
    }
    handleAutoFillRemarks();
  };

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <div
        data-testid="dashboard-background-shell"
        className={editingStudent ? "flex flex-1 flex-col max-sm:hidden" : "flex flex-1 flex-col"}
      >
        {/* NAV */}
        <PageHeader
        hideOnDesktop
        sticky={entryViewMode !== "GRADEBOOK"}
        schoolName={settings.schoolName}
        actions={
          students.length > 0 ? (
            <Link
              to="/print"
              className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-white shadow-sm transition-all active:scale-95 sm:px-4"
              data-record="true"
            >
              <Printer className="h-4 w-4" />
              <span className="text-sm font-medium">Print</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddStudent}
              className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-white shadow-sm transition-all active:scale-95 sm:px-4"
              data-record="true"
            >
              <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden text-sm font-medium sm:inline">Add Student</span>
            </button>
          )
        }
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* MAIN CONTENT AREA */}
        {students.length === 0 ? (
          <>
            <EmptyState
              onAddStudent={handleOpenAddStudent}
              onImport={() => setShowImportModal(true)}
              onLoadDemo={() => setShowDemoModal(true)}
            />
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm dark:border-blue-800/70 dark:bg-blue-950/40">
              <div className="flex items-start gap-4">
                <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-main font-bold" data-record="true">
                    Need help getting started?
                  </h3>
                  <p className="text-muted mt-1 text-sm leading-relaxed" data-record="true">
                    Add your first student or reach out on WhatsApp if you&apos;re stuck.
                  </p>
                  <div className="mt-3">
                    <a
                      href="https://wa.me/233248140806?text=Hi!%20I%20need%20help%20starting"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success hover:text-success/80 inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:underline"
                      data-record="true"
                    >
                      💬 Ask for help on WhatsApp →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* DESKTOP CONTEXT HEADER */}
            <div className="mb-5 hidden items-center justify-between gap-4 md:flex">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-main truncate text-2xl font-black tracking-tight" data-record="true">
                    {settings.className || "My Class"}
                  </h1>
                  {settings.examType === "MOCK" ? (
                    <Link
                      to="/settings/academic"
                      className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-950/90"
                      title="Change exam mode in Settings"
                    >
                      Mock Exam (0/100)
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/60 dark:text-blue-300">
                      Termly ({settings.classScoreMax}/{settings.examScoreMax})
                    </span>
                  )}
                </div>
                <p className="text-muted mt-0.5 text-sm">
                  {settings.term} &bull; {settings.academicYear} &bull;{" "}
                  {(settings.defaultSubjects || []).length} subjects
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScoreImportPreset({});
                    setShowScoreImportModal(true);
                  }}
                  className="border-border bg-surface text-secondary hover:bg-subtle inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-xs transition-colors active:scale-95"
                  data-record="true"
                >
                  <Upload className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>Import Scores</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddStudent}
                  aria-label="Quick add student"
                  className="bg-primary hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                  data-record="true"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            <DashboardStats
              students={students}
              settings={settings}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            {/* VALIDATION WARNINGS (suppressed in Quick Gradebook to prevent above-table layout shifts mid-entry) */}
            {entryViewMode !== "GRADEBOOK" && (
              <ValidationWarnings
                students={students}
                settings={settings}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onReviewPending={() => setActiveFilter("PENDING")}
              />
            )}

            <DashboardToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isSearching={isSearching}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              counts={filterCounts}
              onExport={handleExportFullData}
              onExportDetailed={handleExportDetailedBroadsheet}
              onImport={() => setShowImportModal(true)}
              onImportScores={() => setShowScoreImportModal(true)}
              onBulkAttendance={() => setShowBulkAttendanceModal(true)}
              onSyncClassSubjects={handleSyncClassSubjectsAndTasks}
              onBulkPromotion={() => setShowBulkPromotionModal(true)}
              onDeletePending={() => setConfirmCleanModal(true)}
              onAutoRemarks={handleAutoRemarksAction}
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

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div
                  role="group"
                  aria-label="Workspace entry view"
                  className="border-border bg-subtle inline-flex rounded-xl border p-1 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setEntryViewMode("LIST")}
                    aria-pressed={entryViewMode === "LIST"}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      entryViewMode === "LIST"
                        ? "bg-surface text-main dark:bg-elevated dark:text-main shadow-xs ring-1 ring-black/5 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] dark:ring-white/10"
                        : "text-secondary hover:bg-surface/60 hover:text-main dark:hover:bg-surface/60"
                    }`}
                    data-record="true"
                  >
                    <List
                      className={`h-3.5 w-3.5 ${entryViewMode === "LIST" ? "text-primary-text" : ""}`}
                    />
                    <span>Student List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryViewMode("GRADEBOOK")}
                    aria-pressed={entryViewMode === "GRADEBOOK"}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      entryViewMode === "GRADEBOOK"
                        ? "bg-surface text-main dark:bg-elevated dark:text-main shadow-xs ring-1 ring-black/5 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] dark:ring-white/10"
                        : "text-secondary hover:bg-surface/60 hover:text-main dark:hover:bg-surface/60"
                    }`}
                    data-record="true"
                  >
                    <TableProperties
                      className={`h-3.5 w-3.5 ${entryViewMode === "GRADEBOOK" ? "text-primary-text" : ""}`}
                    />
                    <span>Quick Gradebook</span>
                  </button>
                </div>
              </div>

              {entryViewMode === "GRADEBOOK" ? (
                <QuickGradebook
                  students={filteredStudents}
                  allStudents={students}
                  sessionKey={gradebookSessionKey}
                  settings={settings}
                  onUpdateStudent={updateStudent}
                  onBatchUpdateStudents={batchUpdateStudents}
                  onOpenStudent={(s, ordered) => handleOpenStudentModal(s, ordered)}
                  onOpenScoreImport={(subject, taskName) => {
                    setScoreImportPreset({ subject, taskName });
                    setShowScoreImportModal(true);
                  }}
                  onClearParentFilters={() => {
                    setSearchQuery("");
                    setActiveFilter("ALL");
                  }}
                />
              ) : filteredStudents.length === 0 ? (
                <div className="border-border bg-surface rounded-xl border py-16 text-center shadow-sm">
                  <div className="bg-subtle mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                    <X className="text-muted h-7 w-7" />
                  </div>
                  <h3 className="text-main text-lg font-bold" data-record="true">
                    No students found
                  </h3>
                  <p className="text-muted mt-1 text-sm">
                    No results for "{searchQuery}" in{" "}
                    {activeFilter === "ALL"
                      ? "all students"
                      : activeFilter.toLowerCase().replace(/_/g, " ")}
                    .
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setActiveFilter("ALL");
                    }}
                    className="text-primary-text hover:text-primary-text/80 mt-4 text-sm font-bold transition-colors hover:underline"
                    data-record="true"
                  >
                    Clear Search & Filters
                  </button>
                </div>
              ) : (
                <StudentList
                  students={filteredStudents}
                  onAddStudent={addStudent}
                  onDeleteStudent={deleteStudent}
                  onEditStudent={(s) => handleOpenStudentModal(s)}
                  onImport={() => setShowImportModal(true)}
                  isAddModalOpen={isAddModalOpen}
                  onOpenAddModalChange={setIsAddModalOpen}
                />
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
      </div>

      {(students.length === 0 || filteredStudents.length === 0 || entryViewMode === "GRADEBOOK") && (
        <AddStudentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddStudent={addStudent}
          settings={settings}
        />
      )}

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
          onClose={handleCloseStudentModal}
          onUpdateStudent={updateStudent}
          allStudents={modalNavigationStudents}
          onNavigate={setEditingStudentId}
          initialTab={activeFilter === "MISSING_PHOTOS" ? "DETAILS" : "ACADEMIC"}
          renderPrintAction={(studentId) => (
            <Link
              to="/print"
              search={{ id: studentId }}
              onClick={handleCloseStudentModal}
              aria-label="Print student report"
              title="Print student report"
              className="border-border-strong bg-surface text-secondary hover:bg-subtle hover:text-main inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors"
              data-record="true"
            >
              <Printer className="text-primary-text h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Link>
          )}
          renderSbaSetupLink={() => (
            <Link
              to="/sba"
              onClick={handleCloseStudentModal}
              className="text-primary-text hover:text-primary-text/80 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              data-record="true"
            >
              SBA Markbook
            </Link>
          )}
        />
      )}

      {/* ✅ BULK IMPORT MODAL */}
      <BulkImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      {/* ✅ SCORE IMPORT MODAL */}
      <ScoreImportModal
        key={`${scoreImportPreset.subject ?? ""}:${scoreImportPreset.taskName ?? ""}`}
        isOpen={showScoreImportModal}
        onClose={() => {
          setShowScoreImportModal(false);
          setScoreImportPreset({});
        }}
        initialSubject={scoreImportPreset.subject}
        initialMode={scoreImportPreset.taskName ? "SINGLE_COMPONENT" : undefined}
        initialTaskName={scoreImportPreset.taskName}
      />

      {/* ✅ BULK ATTENDANCE MODAL */}
      <BulkAttendanceModal
        isOpen={showBulkAttendanceModal}
        onClose={() => setShowBulkAttendanceModal(false)}
      />

      {/* ✅ BULK PROMOTION MODAL */}
      <BulkPromotionModal
        isOpen={showBulkPromotionModal}
        onClose={() => setShowBulkPromotionModal(false)}
      />

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

      {/* CONFIRM AUTO-REMARKS OVERWRITE MODAL */}
      <ConfirmModal
        isOpen={confirmAutoRemarksModal}
        title="Overwrite Existing Remarks?"
        message={`${studentsWithExistingRemarksCount} student${studentsWithExistingRemarksCount === 1 ? " already has a" : "s already have"} teacher remark entered. Generating new remarks will replace existing teacher remarks across the class.`}
        confirmText="Yes, Overwrite Remarks"
        isDangerous={true}
        onClose={() => setConfirmAutoRemarksModal(false)}
        onConfirm={() => {
          triggerHaptic("heavy");
          setConfirmAutoRemarksModal(false);
          handleAutoFillRemarks();
        }}
      />

      {/* ✅ SCROLL TO TOP/BOTTOM BUTTON */}
      {students.length >= 10 && !editingStudent && (
        <ScrollButton scrollTargetSelector='[data-scroll-region="student-list"]' />
      )}

      {/* ✅ WELCOME TOUR for first-time users */}
      <WelcomeTour
        steps={[
          {
            title: "Welcome to Repota! 🇬🇭",
            description:
              "We're so glad you're here! Repota helps you create beautiful GES report cards in minutes. Everything works offline - no internet needed once loaded. Let's show you around!",
          },
          {
            title: "Step 1: Configure Your School & SBA ⚙️",
            description:
              "Before adding students, use the Settings tab in the navigation bar to set up your school details, academic year, term, class name, and subjects — and use the SBA Markbook tab to configure Continuous Assessment tasks.",
          },
          {
            title: "Step 2: Add Your Students 👨‍🎓",
            description:
              "Now click 'Add Student' to start building your class list. Type their names one by one, or use 'Bulk Import' if you have a list ready. You can also try 'Load Demo Data' to see how everything works first.",
          },
          {
            title: "Step 3: Enter Scores & Watch the Magic ✨",
            description:
              "Click on any student's name to enter their class and exam scores. Repota automatically calculates their total marks, grades (A, B, C...), class position, and even writes teacher remarks for you! No more manual calculations.",
          },
          {
            title: "Step 4: View Class Analytics 📊",
            description:
              "Tap the Analytics tab in the navigation bar to see beautiful charts and insights about your class performance. See top performers, subject averages, pass rates, and trends — all updated in real-time as you enter scores.",
          },
          {
            title: "Step 5: Print Report Cards 🖨️",
            description:
              "When you're done, tap 'Print' in the top bar or sidebar to generate professional GES-compliant report cards for all students at once. You can print them directly or save as PDF. Each report looks perfect and ready to hand out!",
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
