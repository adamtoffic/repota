// src/pages/Analytics.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BarChart3, Download, FileText, Filter, X } from "lucide-react";
import { useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { AnalyticsDemographicsTab } from "../components/analytics/AnalyticsDemographicsTab";
import { AnalyticsInsightsTab } from "../components/analytics/AnalyticsInsightsTab";
import { AnalyticsOverviewTab } from "../components/analytics/AnalyticsOverviewTab";
import { AnalyticsSubjectsTab } from "../components/analytics/AnalyticsSubjectsTab";
import { ANALYTICS_VIEWS, type AnalyticsViewId } from "../components/analytics/analyticsShared";
import { FilterPanel } from "../components/analytics/FilterPanel";
import type { AnalyticsFilters } from "../components/analytics/FilterPanel";
import { Card } from "../components/ui/Card";
import { ScrollButton } from "../components/ScrollButton";
import { PdfExportModal } from "../components/PdfExportModal";
import { PageHeader } from "../components/ui/PageHeader";
import { usePdfShareFlow } from "../hooks/usePdfShareFlow";
import {
  calculateClassMetrics,
  calculateSubjectPerformance,
  calculateScoreDistribution,
  calculateGenderAnalysis,
  getTopPerformers,
  calculateAgeDistribution,
  calculateSubjectGenderComparison,
  calculateSubjectInsights,
  calculatePerformanceQuartiles,
  calculateGradeDistribution,
  calculateAttendanceInsights,
  calculateAtRiskStudents,
  calculatePerformanceByAge,
  calculateSubjectVariance,
  calculateAttendanceByGender,
  partitionGradedStudents,
  calculateSbaVsExamAnalysis,
  calculateSbaCategoryMastery,
  calculateBorderlineStudents,
  calculateCoreVsElectiveStats,
  calculatePrivateFeeSummary,
} from "../utils/analyticsCalculator";
import {
  generateClassPulseHeadline,
  generateClassStory,
} from "../utils/classStoryGenerator";
import { processStudent } from "../utils/gradeCalculator";
import { exportAnalyticsAsPDF, exportAnalyticsData } from "../utils/analyticsExport";
import { buildAnalyticsPdfFilename, generateBlocksPdfFile } from "../utils/pdfPrint";
import { captureEvent } from "../utils/analytics";
import { markPrintStarted } from "../utils/printHandler";
import { useToast } from "../hooks/useToast";

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const students = useSchoolStudents();
  const settings = useSchoolSettings();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    gender: "All",
    performanceLevel: "All",
    subjectFilter: "All",
    scoreRange: { min: 0, max: 100 },
  });
  const [activeView, setActiveView] = useState<AnalyticsViewId>("overview");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const analyticsHeaderRef = useRef<HTMLDivElement>(null);
  const analyticsContentRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = [
    filters.gender !== "All",
    filters.performanceLevel !== "All",
    filters.subjectFilter !== "All",
    Boolean(filters.scoreRange && (filters.scoreRange.min > 0 || filters.scoreRange.max < 100)),
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const handleResetFilters = () => {
    setFilters({
      gender: "All",
      performanceLevel: "All",
      subjectFilter: "All",
      scoreRange: { min: 0, max: 100 },
    });
  };

  // Filter students based on selected filters (reuse ProcessedStudent averageScore when available)
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const needsScoreCheck =
        (filters.performanceLevel && filters.performanceLevel !== "All") ||
        Boolean(filters.scoreRange);

      const avgScore = needsScoreCheck
        ? "averageScore" in student && typeof student.averageScore === "number"
          ? student.averageScore
          : processStudent(student, settings.level).averageScore
        : 0;

      if (filters.gender && filters.gender !== "All") {
        if (student.gender !== filters.gender) return false;
      }

      if (filters.performanceLevel && filters.performanceLevel !== "All") {
        if (filters.performanceLevel === "Excellence" && avgScore < 80) return false;
        if (filters.performanceLevel === "Pass" && (avgScore < 50 || avgScore >= 80)) return false;
        if (filters.performanceLevel === "Fail" && avgScore >= 50) return false;
      }

      if (filters.scoreRange) {
        if (avgScore < filters.scoreRange.min || avgScore > filters.scoreRange.max) return false;
      }

      if (filters.subjectFilter && filters.subjectFilter !== "All") {
        const hasSubject = student.subjects.some((s) => s.name === filters.subjectFilter);
        if (!hasSubject) return false;
      }

      return true;
    });
  }, [students, filters, settings]);

  const { graded: gradedStudents, ungraded: ungradedStudents } = useMemo(
    () => partitionGradedStudents(filteredStudents),
    [filteredStudents],
  );
  const analysisStudents = gradedStudents.length > 0 ? gradedStudents : filteredStudents;

  // Calculate analytics data only for the active sub-tab
  const classMetrics = useMemo(
    () =>
      activeView === "overview" || activeView === "insights"
        ? calculateClassMetrics(analysisStudents, settings)
        : {
            totalStudents: 0,
            averageScore: 0,
            medianScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passRate: 0,
            excellenceRate: 0,
            averageAttendance: 0,
          },
    [activeView, analysisStudents, settings],
  );

  const subjectPerformance = useMemo(
    () =>
      activeView === "subjects" ? calculateSubjectPerformance(analysisStudents, settings) : [],
    [activeView, analysisStudents, settings],
  );

  const scoreDistribution = useMemo(
    () => (activeView === "overview" ? calculateScoreDistribution(analysisStudents, settings) : []),
    [activeView, analysisStudents, settings],
  );

  const genderAnalysis = useMemo(
    () =>
      activeView === "overview" || activeView === "demographics" || activeView === "insights"
        ? calculateGenderAnalysis(analysisStudents, settings)
        : { maleCount: 0, femaleCount: 0, maleAverage: 0, femaleAverage: 0, totalCount: 0 },
    [activeView, analysisStudents, settings],
  );

  const topPerformers = useMemo(
    () => (activeView === "overview" ? getTopPerformers(analysisStudents, settings, 5) : []),
    [activeView, analysisStudents, settings],
  );

  const ageDistribution = useMemo(
    () => (activeView === "demographics" ? calculateAgeDistribution(filteredStudents) : []),
    [activeView, filteredStudents],
  );

  const subjectGenderComparison = useMemo(
    () =>
      activeView === "subjects" ? calculateSubjectGenderComparison(analysisStudents, settings) : [],
    [activeView, analysisStudents, settings],
  );

  const subjectInsights = useMemo(
    () =>
      activeView === "subjects" || activeView === "insights"
        ? calculateSubjectInsights(analysisStudents, settings)
        : { strongest: [], weakest: [], needsAttention: [] },
    [activeView, analysisStudents, settings],
  );

  const performanceQuartiles = useMemo(
    () =>
      activeView === "insights"
        ? calculatePerformanceQuartiles(analysisStudents, settings)
        : { q1: 0, q2: 0, q3: 0, q4Count: 0, strugglingStudents: [] },
    [activeView, analysisStudents, settings],
  );

  const gradeDistribution = useMemo(
    () => (activeView === "overview" ? calculateGradeDistribution(analysisStudents, settings) : []),
    [activeView, analysisStudents, settings],
  );

  const attendanceInsights = useMemo(
    () =>
      activeView === "demographics" || activeView === "insights"
        ? calculateAttendanceInsights(analysisStudents, settings)
        : {
            averageAttendance: 0,
            perfectAttendance: 0,
            poorAttendance: 0,
            correlationWithPerformance: "neutral" as const,
            correlationCoefficient: 0,
          },
    [activeView, analysisStudents, settings],
  );

  const atRiskStudents = useMemo(
    () => (activeView === "insights" ? calculateAtRiskStudents(analysisStudents, settings) : []),
    [activeView, analysisStudents, settings],
  );

  const performanceByAge = useMemo(
    () => (activeView === "demographics" ? calculatePerformanceByAge(analysisStudents, settings) : []),
    [activeView, analysisStudents, settings],
  );

  const subjectVariance = useMemo(
    () => (activeView === "subjects" ? calculateSubjectVariance(analysisStudents, settings) : []),
    [activeView, analysisStudents, settings],
  );

  const attendanceByGender = useMemo(
    () =>
      activeView === "demographics"
        ? calculateAttendanceByGender(filteredStudents, settings)
        : { maleAttendanceRate: 0, femaleAttendanceRate: 0, attendanceRanges: [] },
    [activeView, filteredStudents, settings],
  );

  const sbaVsExam = useMemo(
    () =>
      activeView === "subjects" || activeView === "insights"
        ? calculateSbaVsExamAnalysis(analysisStudents, settings)
        : {
            available: false,
            classSbaAvgPercent: 0,
            classExamAvgPercent: 0,
            examUnderperformers: [],
            lowClassworkStudents: [],
            subjectBreakdown: [],
          },
    [activeView, analysisStudents, settings],
  );

  const sbaCategoryMastery = useMemo(
    () => (activeView === "subjects" ? calculateSbaCategoryMastery(analysisStudents) : []),
    [activeView, analysisStudents],
  );

  const borderlineStudents = useMemo(
    () => (activeView === "insights" ? calculateBorderlineStudents(analysisStudents, settings) : []),
    [activeView, analysisStudents, settings],
  );

  const coreVsElective = useMemo(
    () =>
      activeView === "overview"
        ? calculateCoreVsElectiveStats(analysisStudents, settings)
        : { coreAverage: 0, corePassRate: 0, electiveAverage: 0, electivePassRate: 0, aggregateBands: [] },
    [activeView, analysisStudents, settings],
  );

  const privateFeeSummary = useMemo(
    () =>
      activeView === "overview" && settings.schoolType === "PRIVATE"
        ? calculatePrivateFeeSummary(filteredStudents)
        : null,
    [activeView, filteredStudents, settings.schoolType],
  );

  const classPulseHeadline = useMemo(
    () =>
      activeView === "overview"
        ? generateClassPulseHeadline(filteredStudents, settings, classMetrics)
        : null,
    [activeView, filteredStudents, settings, classMetrics],
  );

  const classStory = useMemo(
    () => (activeView === "insights" ? generateClassStory(filteredStudents, settings) : null),
    [activeView, filteredStudents, settings],
  );

  const handleCopyStaffBrief = async () => {
    if (!classStory) return;
    try {
      await navigator.clipboard.writeText(classStory.plainTextBrief);
      setCopiedBrief(true);
      showToast("Staff meeting brief copied to clipboard!", "success");
      captureEvent("Class_Tool_Used", {
        tool: "class_story_copied",
        students_count: filteredStudents.length,
        school_level: settings.level || "unknown",
      });
      setTimeout(() => setCopiedBrief(false), 2000);
    } catch {
      showToast("Could not copy automatically. Please select and copy the text.", "info");
    }
  };

  const analyticsPdfKey = useMemo(
    () =>
      `${activeView}|${settings.className || ""}|${JSON.stringify(filters)}|${filteredStudents
        .map((s) => `${s.id}:${s.totalScore ?? 0}`)
        .join(",")}`,
    [activeView, settings.className, filters, filteredStudents],
  );

  const buildAnalyticsPdf = useCallback(
    ({
      onProgress,
      signal,
    }: {
      onProgress: (p: { current: number; total: number }) => void;
      signal: AbortSignal;
    }) => {
      const blocks: HTMLElement[] = [];
      if (analyticsHeaderRef.current) {
        blocks.push(analyticsHeaderRef.current);
      }
      if (analyticsContentRef.current) {
        Array.from(analyticsContentRef.current.children).forEach((child) => {
          if (child instanceof HTMLElement) blocks.push(child);
        });
      }
      return generateBlocksPdfFile(blocks, {
        filename: buildAnalyticsPdfFilename(settings.className, activeView),
        onProgress,
        signal,
      });
    },
    [settings.className, activeView],
  );

  const { modalProps: pdfModalProps, runPrintOrPdfFallback } = usePdfShareFlow({
    cacheKey: analyticsPdfKey,
    totalCount: 4,
    itemLabel: "analytics section",
    buildPdf: buildAnalyticsPdf,
    analyticsSource: "analytics",
  });

  const handleExportPDF = () => {
    try {
      markPrintStarted();
      runPrintOrPdfFallback(() => {
        exportAnalyticsAsPDF();
        showToast("Analytics exported as PDF", "success");
      });
      captureEvent("Class_Tool_Used", {
        tool: "analytics_pdf_export",
        students_count: filteredStudents.length,
        school_level: settings.level || "unknown",
      });
    } catch (err) {
      console.error("Export PDF failed:", err);
      showToast("Failed to export PDF", "error");
    }
  };

  const handleExportData = () => {
    try {
      const exportData = filteredStudents.map((student) => {
        const processed = processStudent(student, settings.level);
        return {
          Name: student.name,
          Class: student.className,
          Gender: student.gender || "N/A",
          Average: processed.averageScore.toFixed(1),
          "Total Subjects": student.subjects.length,
          Attendance: student.attendancePresent || 0,
        };
      });

      const filename = `Analytics_${settings.className || "Class"}_${new Date().toISOString().split("T")[0]}.csv`;
      exportAnalyticsData(exportData, filename);
      showToast(`Exported data for ${exportData.length} students`, "success");
      captureEvent("Class_Tool_Used", {
        tool: "analytics_csv_export",
        students_count: exportData.length,
        school_level: settings.level || "unknown",
      });
    } catch (err) {
      console.error("Export data failed:", err);
      showToast("Failed to export data", "error");
    }
  };

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    students.forEach((student) => {
      student.subjects.forEach((subject) => subjects.add(subject.name));
    });
    return Array.from(subjects).sort();
  }, [students]);

  if (students.length === 0) {
    return (
      <div className="bg-background flex min-h-screen flex-col font-sans">
        <PageHeader schoolName={settings.schoolName} />

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:px-8"
        >
          <h1 className="sr-only">Advanced Analytics</h1>
          <Card padding="lg" className="text-center">
            <BarChart3 size={48} className="text-muted mx-auto mb-4" />
            <h3 data-record="true" className="text-main mb-2 text-lg font-bold sm:text-xl">
              No Data Available
            </h3>
            <p data-record="true" className="text-muted text-sm sm:text-base">
              Add students and their scores to view advanced analytics
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="bg-primary hover:bg-primary/90 mt-5 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95"
              data-record="true"
            >
              Go to Home
            </button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader schoolName={settings.schoolName} />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:px-8"
      >
        {/* Header */}
        <div ref={analyticsHeaderRef} className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-950/60">
                <BarChart3 className="text-primary-text h-5 w-5" />
              </div>
              <div>
                <h1
                  data-record="true"
                  className="text-main text-2xl font-black tracking-tight sm:text-3xl"
                >
                  Advanced Analytics
                </h1>
                <p className="text-muted mt-0.5 text-sm">
                  Deep insights for {settings.className || "your class"} • {filteredStudents.length}{" "}
                  of {students.length} students
                </p>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2" data-no-print="true">
              <button
                type="button"
                onClick={handleExportData}
                data-record="true"
                className="border-border-strong bg-surface text-secondary hover:bg-subtle flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all active:scale-95 sm:gap-2 sm:text-sm sm:font-medium"
                title="Export analytics data as CSV"
              >
                <FileText size={16} />
                <span className="sm:hidden">CSV</span>
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                data-record="true"
                className="bg-primary hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 sm:gap-2 sm:text-sm sm:font-medium"
                title="Export analytics as PDF"
              >
                <Download size={16} />
                <span className="sm:hidden">PDF</span>
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Toggle & Mobile Filter Button */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {ANALYTICS_VIEWS.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  type="button"
                  data-record="true"
                  onClick={() => setActiveView(view.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                    activeView === view.id
                      ? "bg-primary text-white shadow-md"
                      : "border-border bg-surface text-secondary hover:bg-subtle border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {view.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileFilters((prev) => !prev)}
              aria-expanded={showMobileFilters}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                showMobileFilters || hasActiveFilters
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  : "border-border bg-surface text-secondary hover:bg-subtle"
              }`}
              data-record="true"
            >
              <Filter className="h-4 w-4" />
              <span>{showMobileFilters ? "Hide Filters" : "Filters"}</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                aria-label="Clear active filters"
                className="border-border bg-surface text-secondary hover:bg-subtle inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-bold transition-colors"
                data-record="true"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <div className={`${showMobileFilters ? "block" : "hidden"} lg:col-span-1 lg:block`}>
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              availableSubjects={availableSubjects}
            />
          </div>

          {/* Main Content */}
          <div ref={analyticsContentRef} className="space-y-4 sm:space-y-6 lg:col-span-3">
            {ungradedStudents.length > 0 && gradedStudents.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200">
                <span>
                  Analyzing <strong>{gradedStudents.length}</strong> graded student
                  {gradedStudents.length === 1 ? "" : "s"} ({ungradedStudents.length} ungraded
                  excluded from averages).
                </span>
              </div>
            )}

            {activeView === "overview" && (
              <AnalyticsOverviewTab
                classPulseHeadline={classPulseHeadline}
                classMetrics={classMetrics}
                scoreDistribution={scoreDistribution}
                gradeDistribution={gradeDistribution}
                genderAnalysis={genderAnalysis}
                topPerformers={topPerformers}
                coreVsElective={coreVsElective}
                privateFeeSummary={privateFeeSummary}
                onOpenInsights={() => setActiveView("insights")}
              />
            )}

            {activeView === "subjects" && (
              <AnalyticsSubjectsTab
                subjectPerformance={subjectPerformance}
                subjectGenderComparison={subjectGenderComparison}
                sbaVsExam={sbaVsExam}
                sbaCategoryMastery={sbaCategoryMastery}
                subjectInsights={subjectInsights}
                subjectVariance={subjectVariance}
              />
            )}

            {activeView === "demographics" && (
              <AnalyticsDemographicsTab
                genderAnalysis={genderAnalysis}
                attendanceInsights={attendanceInsights}
                totalAttendanceDays={settings.totalAttendanceDays}
                attendanceByGender={attendanceByGender}
                performanceByAge={performanceByAge}
                ageDistribution={ageDistribution}
              />
            )}

            {activeView === "insights" && (
              <AnalyticsInsightsTab
                classStory={classStory}
                copiedBrief={copiedBrief}
                onCopyStaffBrief={handleCopyStaffBrief}
                onInspectSubject={(subjectName) => {
                  setFilters((prev) => ({ ...prev, subjectFilter: subjectName }));
                  setActiveView("subjects");
                }}
                borderlineStudents={borderlineStudents}
                sbaVsExam={sbaVsExam}
                atRiskStudents={atRiskStudents}
                onReviewStudents={() => navigate({ to: "/" })}
                performanceQuartiles={performanceQuartiles}
                attendanceInsights={attendanceInsights}
                classMetrics={classMetrics}
                subjectInsights={subjectInsights}
                genderAnalysis={genderAnalysis}
              />
            )}
          </div>
        </div>
      </main>

      {filteredStudents.length > 0 && <ScrollButton />}

      <PdfExportModal {...pdfModalProps} />
    </div>
  );
};

export default Analytics;
