// src/pages/Analytics.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  TrendingUp,
  Users,
  Award,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  BookOpen,
  AlertTriangle,
  TrendingDown,
  Zap,
  Brain,
  Download,
  FileText,
  Filter,
  Copy,
  Check,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { StatCard } from "../components/analytics/StatCard";
import { FilterPanel } from "../components/analytics/FilterPanel";
import type { AnalyticsFilters } from "../components/analytics/FilterPanel";
import { Card } from "../components/ui/Card";
import { ChartCard } from "../components/analytics/ChartCard";
import { InsightCard } from "../components/analytics/InsightCard";
import { ScrollButton } from "../components/ScrollButton";
import { PdfExportModal } from "../components/PdfExportModal";
import { PageHeader } from "../components/ui/PageHeader";
import { usePdfShareFlow } from "../hooks/usePdfShareFlow";

import { BarChart } from "../components/charts/BarChart";
import { PieChart } from "../components/charts/PieChart";
import { RadarChart } from "../components/charts/RadarChart";
import { ComposedChart } from "../components/charts/ComposedChart";
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
import { generateClassStory } from "../utils/classStoryGenerator";
import { processStudent } from "../utils/gradeCalculator";
import { exportAnalyticsAsPDF, exportAnalyticsData } from "../utils/analyticsExport";
import { buildAnalyticsPdfFilename, generateBlocksPdfFile } from "../utils/pdfPrint";
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
  const [activeView, setActiveView] = useState<
    "overview" | "subjects" | "demographics" | "insights"
  >("overview");
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

      // Gender filter
      if (filters.gender && filters.gender !== "All") {
        if (student.gender !== filters.gender) return false;
      }

      // Performance level filter
      if (filters.performanceLevel && filters.performanceLevel !== "All") {
        if (filters.performanceLevel === "Excellence" && avgScore < 80) return false;
        if (filters.performanceLevel === "Pass" && (avgScore < 50 || avgScore >= 80)) return false;
        if (filters.performanceLevel === "Fail" && avgScore >= 50) return false;
      }

      // Score range filter
      if (filters.scoreRange) {
        if (avgScore < filters.scoreRange.min || avgScore > filters.scoreRange.max) return false;
      }

      // Subject filter
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

  const classStory = useMemo(
    () =>
      activeView === "overview" || activeView === "insights"
        ? generateClassStory(filteredStudents, settings)
        : null,
    [activeView, filteredStudents, settings],
  );

  const handleCopyStaffBrief = async () => {
    if (!classStory) return;
    try {
      await navigator.clipboard.writeText(classStory.plainTextBrief);
      setCopiedBrief(true);
      showToast("Staff meeting brief copied to clipboard!", "success");
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
  });

  // Export handlers
  const handleExportPDF = () => {
    try {
      markPrintStarted();
      runPrintOrPdfFallback(() => {
        exportAnalyticsAsPDF();
        showToast("Analytics exported as PDF", "success");
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

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Card padding="lg" className="text-center">
            <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
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
              Go to Dashboard
            </button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      {/* NAV */}
      <PageHeader schoolName={settings.schoolName} variant="transparent" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div ref={analyticsHeaderRef} className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2.5">
                <BarChart3 className="text-primary h-5 w-5" />
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
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 sm:gap-2 sm:text-sm sm:font-medium"
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
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "subjects", label: "Subjects", icon: BookOpen },
              { id: "demographics", label: "Demographics", icon: Users },
              { id: "insights", label: "AI Insights", icon: Brain },
            ].map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  data-record="true"
                  onClick={() =>
                    setActiveView(view.id as "overview" | "subjects" | "demographics" | "insights")
                  }
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                    activeView === view.id
                      ? "bg-primary text-white shadow-md"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50"
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
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                <span>
                  Analyzing <strong>{gradedStudents.length}</strong> graded student
                  {gradedStudents.length === 1 ? "" : "s"} ({ungradedStudents.length} ungraded
                  excluded from averages).
                </span>
              </div>
            )}

            {/* Overview Tab */}
            {activeView === "overview" && (
              <>
                {/* Class Pulse Story Banner */}
                {classStory && (
                  <div className="rounded-xl border border-indigo-200 bg-linear-to-r from-indigo-50 via-blue-50 to-purple-50 p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p
                          data-record="true"
                          className="flex items-center gap-1.5 text-xs font-black tracking-wider text-indigo-700 uppercase"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Class Pulse Story
                        </p>
                        <p className="mt-1 text-sm leading-relaxed font-semibold text-gray-800">
                          {classStory.headline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveView("insights")}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700"
                        data-record="true"
                      >
                        Full AI Story &amp; Plan →
                      </button>
                    </div>
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                  <StatCard
                    title="Total Students"
                    value={classMetrics.totalStudents}
                    icon={Users}
                    color="blue"
                  />
                  <StatCard
                    title="Class Average"
                    value={`${classMetrics.averageScore}%`}
                    icon={TrendingUp}
                    color="green"
                    subtitle={`Median: ${classMetrics.medianScore}%`}
                  />
                  <StatCard
                    title="Pass Rate"
                    value={`${classMetrics.passRate}%`}
                    icon={Target}
                    color="amber"
                    subtitle={`${Math.round((classMetrics.passRate / 100) * classMetrics.totalStudents)} students`}
                  />
                  <StatCard
                    title="Excellence"
                    value={`${classMetrics.excellenceRate}%`}
                    icon={Award}
                    color="purple"
                    subtitle={`${Math.round((classMetrics.excellenceRate / 100) * classMetrics.totalStudents)} students`}
                  />
                </div>

                {/* Score & Grade Distribution */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                  <ChartCard title="Score Distribution" icon={BarChart3}>
                    <BarChart
                      data={scoreDistribution.map((item) => ({
                        label: item.range.split(" ")[0],
                        value: item.count,
                      }))}
                      height={280}
                      showValues={true}
                      gradient={true}
                    />
                  </ChartCard>

                  <ChartCard title="Grade Distribution" icon={PieChartIcon}>
                    {gradeDistribution.length > 0 ? (
                      <>
                        <PieChart
                          data={gradeDistribution.map((item) => {
                            // Color grades from best (green) to worst (red)
                            const gradeColors: Record<string, string> = {
                              // KG grades
                              GOLD: "#10b981",
                              SILVER: "#94a3b8",
                              BRONZE: "#f59e0b",
                              // PRIMARY grades
                              "1": "#10b981",
                              "2": "#3b82f6",
                              "3": "#f59e0b",
                              "4": "#f97316",
                              "5": "#ef4444",
                              // JHS grades
                              "6": "#dc2626",
                              "7": "#991b1b",
                              "8": "#7f1d1d",
                              "9": "#450a0a",
                              // SHS grades
                              A1: "#10b981",
                              B2: "#059669",
                              B3: "#3b82f6",
                              C4: "#2563eb",
                              C5: "#f59e0b",
                              C6: "#d97706",
                              D7: "#f97316",
                              E8: "#ef4444",
                              F9: "#dc2626",
                            };
                            return {
                              label: `${item.grade} (${item.percentage}%)`,
                              value: item.count,
                              color: gradeColors[item.grade] || "#6b7280",
                            };
                          })}
                          size={200}
                          showLegend={true}
                        />
                        <div className="mt-4 text-center text-xs text-gray-500">
                          Total: {gradeDistribution.reduce((sum, g) => sum + g.count, 0)} students
                        </div>
                      </>
                    ) : (
                      <div className="flex h-50 items-center justify-center text-sm text-gray-400">
                        No grade data available
                      </div>
                    )}
                  </ChartCard>
                </div>

                {/* Gender Analysis & Top Performers */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                  {/* Gender Analysis */}
                  <ChartCard title="Gender Distribution" icon={PieChartIcon}>
                    {genderAnalysis.totalCount > 0 ? (
                      <>
                        <PieChart
                          data={[
                            {
                              label: `Male (${Math.round((genderAnalysis.maleCount / genderAnalysis.totalCount) * 100)}%)`,
                              value: genderAnalysis.maleCount,
                              color: "#3b82f6",
                            },
                            {
                              label: `Female (${Math.round((genderAnalysis.femaleCount / genderAnalysis.totalCount) * 100)}%)`,
                              value: genderAnalysis.femaleCount,
                              color: "#ec4899",
                            },
                          ].filter((item) => item.value > 0)}
                          size={180}
                          showLegend={true}
                        />
                        <div className="mt-4 space-y-2 border-t pt-4">
                          {genderAnalysis.maleCount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span data-record="true" className="text-gray-600">
                                Male Average:
                              </span>
                              <span className="font-semibold text-blue-600">
                                {genderAnalysis.maleAverage}%
                              </span>
                            </div>
                          )}
                          {genderAnalysis.femaleCount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span data-record="true" className="text-gray-600">
                                Female Average:
                              </span>
                              <span className="font-semibold text-pink-600">
                                {genderAnalysis.femaleAverage}%
                              </span>
                            </div>
                          )}
                          {genderAnalysis.maleCount > 0 && genderAnalysis.femaleCount > 0 && (
                            <div className="flex justify-between text-sm font-bold">
                              <span data-record="true" className="text-gray-700">
                                Performance Gap:
                              </span>
                              <span
                                className={
                                  Math.abs(
                                    genderAnalysis.maleAverage - genderAnalysis.femaleAverage,
                                  ) > 5
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }
                              >
                                {Math.abs(
                                  genderAnalysis.maleAverage - genderAnalysis.femaleAverage,
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-45 items-center justify-center text-sm text-gray-400">
                        No gender data available
                      </div>
                    )}
                  </ChartCard>

                  {/* Top Performers */}
                  <ChartCard title="Top 5 Performers" icon={Award}>
                    <div className="space-y-3">
                      {topPerformers.slice(0, 5).map((student, index) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-2 rounded-lg bg-linear-to-r from-gray-50 to-white p-2 sm:gap-3 sm:p-3"
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:h-8 sm:w-8 ${
                              index === 0
                                ? "bg-linear-to-br from-yellow-400 to-yellow-600"
                                : index === 1
                                  ? "bg-linear-to-br from-gray-300 to-gray-500"
                                  : index === 2
                                    ? "bg-linear-to-br from-orange-400 to-orange-600"
                                    : "bg-linear-to-br from-blue-400 to-blue-600"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-main truncate text-sm font-bold sm:text-base">
                              {student.name}
                            </p>
                            <p className="text-muted text-xs">{student.gender || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-primary text-sm font-black sm:text-base">
                              {student.averageScore}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                </div>

                {/* Core vs Elective & Aggregate Bands */}
                {(coreVsElective.coreAverage > 0 || coreVsElective.aggregateBands.length > 0) && (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                    <Card>
                      <h3
                        data-record="true"
                        className="text-main mb-3 flex items-center gap-2 text-base font-bold"
                      >
                        <Target className="h-4 w-4 text-blue-600" />
                        Core vs. Elective Health
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                          <p className="text-[11px] font-bold text-blue-700 uppercase" data-record="true">
                            Core Subjects
                          </p>
                          <p className="mt-1 text-2xl font-black text-blue-950">
                            {coreVsElective.coreAverage}%
                          </p>
                          <p className="text-xs font-semibold text-blue-700">
                            {coreVsElective.corePassRate}% pass rate
                          </p>
                        </div>
                        <div className="rounded-lg border border-purple-100 bg-purple-50/70 p-3">
                          <p className="text-[11px] font-bold text-purple-700 uppercase" data-record="true">
                            Electives
                          </p>
                          <p className="mt-1 text-2xl font-black text-purple-950">
                            {coreVsElective.electiveAverage}%
                          </p>
                          <p className="text-xs font-semibold text-purple-700">
                            {coreVsElective.electivePassRate}% pass rate
                          </p>
                        </div>
                      </div>
                    </Card>

                    {coreVsElective.aggregateBands.length > 0 && (
                      <Card>
                        <h3
                          data-record="true"
                          className="text-main mb-3 flex items-center gap-2 text-base font-bold"
                        >
                          <Award className="h-4 w-4 text-amber-600" />
                          Aggregate Distribution Bands
                        </h3>
                        <div className="space-y-2">
                          {coreVsElective.aggregateBands.map((band) => (
                            <div key={band.band} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-700">{band.band}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{band.count} students</span>
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
                                  {band.percentage}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* Private School Fee & Arrears Overview */}
                {privateFeeSummary &&
                  (privateFeeSummary.trackedCount > 0 || privateFeeSummary.totalArrears > 0) && (
                    <Card>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3
                          data-record="true"
                          className="text-main flex items-center gap-2 text-base font-bold"
                        >
                          <Wallet className="h-4 w-4 text-purple-600" />
                          Private School Fee Tracking
                        </h3>
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                          Total Arrears: GH₵{privateFeeSummary.totalArrears.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg bg-emerald-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase">Paid</p>
                          <p className="text-xl font-black text-emerald-900">
                            {privateFeeSummary.paidCount}
                          </p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-amber-700 uppercase">Part-Paid</p>
                          <p className="text-xl font-black text-amber-900">
                            {privateFeeSummary.partPaidCount}
                          </p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-red-700 uppercase">Owing</p>
                          <p className="text-xl font-black text-red-900">
                            {privateFeeSummary.owingCount}
                          </p>
                        </div>
                        <div className="rounded-lg bg-blue-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-blue-700 uppercase">
                            Scholarship
                          </p>
                          <p className="text-xl font-black text-blue-900">
                            {privateFeeSummary.scholarshipCount}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
              </>
            )}

            {/* Subject Analysis Tab */}
            {activeView === "subjects" && (
              <>
                {/* Subject Performance Radar */}
                <ChartCard title="Subject Performance Overview" icon={Zap}>
                  <RadarChart
                    data={subjectPerformance.slice(0, 8).map((s) => ({
                      subject: s.subjectName,
                      score: s.averageScore,
                    }))}
                    height={350}
                    color="#3b82f6"
                  />
                </ChartCard>

                {/* Subject Comparison Bar */}
                <ChartCard title="Subject Performance Comparison" icon={BookOpen}>
                  <BarChart
                    data={subjectPerformance.map((subject) => ({
                      label: subject.subjectName,
                      value: subject.averageScore,
                    }))}
                    height={320}
                    showValues={true}
                    gradient={true}
                  />
                </ChartCard>

                {/* Gender Performance by Subject */}
                {subjectGenderComparison.length > 0 && (
                  <ChartCard title="Gender Performance by Subject" icon={Users}>
                    <ComposedChart
                      data={subjectGenderComparison.slice(0, 10).map((item) => ({
                        name: item.subject,
                        Male: item.maleAvg,
                        Female: item.femaleAvg,
                      }))}
                      barKeys={[
                        { key: "Male", color: "#3b82f6", name: "Male Avg" },
                        { key: "Female", color: "#ec4899", name: "Female Avg" },
                      ]}
                      height={320}
                    />
                  </ChartCard>
                )}

                {/* SBA Classwork vs Exam Comparison by Subject */}
                {sbaVsExam.available && sbaVsExam.subjectBreakdown.length > 0 && (
                  <ChartCard title="SBA Classwork vs. Exam Score (%)" icon={Activity}>
                    <ComposedChart
                      data={sbaVsExam.subjectBreakdown.slice(0, 10).map((item) => ({
                        name: item.subject,
                        SBA: item.sbaPercent,
                        Exam: item.examPercent,
                      }))}
                      barKeys={[
                        { key: "SBA", color: "#8b5cf6", name: "SBA Avg (%)" },
                        { key: "Exam", color: "#0ea5e9", name: "Exam Avg (%)" },
                      ]}
                      height={320}
                    />
                  </ChartCard>
                )}

                {/* SBA Category Mastery */}
                {sbaCategoryMastery.length > 0 && (
                  <ChartCard title="SBA Task Category Mastery (%)" icon={Zap}>
                    <BarChart
                      data={sbaCategoryMastery.map((cat) => ({
                        label: cat.label,
                        value: cat.averagePercent,
                      }))}
                      height={260}
                      showValues={true}
                      gradient={true}
                    />
                  </ChartCard>
                )}

                {/* Subject Insights Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                  {/* Strongest Subjects */}
                  <InsightCard
                    title="Strongest Subjects"
                    icon={TrendingUp}
                    variant="success"
                    items={subjectInsights.strongest.map((subject) => ({
                      name: subject.subjectName,
                      value: `${subject.averageScore}%`,
                    }))}
                  />

                  {/* Weakest Subjects */}
                  <InsightCard
                    title="Needs Improvement"
                    icon={TrendingDown}
                    variant="danger"
                    items={subjectInsights.weakest.map((subject) => ({
                      name: subject.subjectName,
                      value: `${subject.averageScore}%`,
                    }))}
                  />

                  {/* Attention Required */}
                  <InsightCard
                    title="Low Pass Rate"
                    icon={AlertTriangle}
                    variant="warning"
                    items={subjectInsights.needsAttention.slice(0, 3).map((subject) => ({
                      name: subject.subjectName,
                      value: `${subject.passRate}%`,
                    }))}
                    emptyMessage="All subjects have good pass rates!"
                  />
                </div>

                {/* Subject Variance/Consistency Analysis */}
                {subjectVariance.length > 0 && (
                  <Card>
                    <h3
                      data-record="true"
                      className="text-main mb-4 text-base font-bold sm:text-lg"
                    >
                      Subject Performance Consistency
                    </h3>
                    <p data-record="true" className="text-muted mb-4 text-sm">
                      Measures how consistent student scores are within each subject. Low variance =
                      students perform similarly. High variance = wide performance gap.
                    </p>
                    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
                      <table className="w-full min-w-150">
                        <thead className="bg-gray-50">
                          <tr className="border-b">
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-left text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Subject
                            </th>
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Std. Deviation
                            </th>
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Consistency
                            </th>
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Interpretation
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectVariance.map((item, index) => (
                            <tr key={index} className="border-b transition-colors hover:bg-gray-50">
                              <td className="text-main px-4 py-2 text-sm font-bold sm:py-3">
                                {item.subject}
                              </td>
                              <td className="px-4 py-2 text-center text-sm sm:py-3">
                                {item.stdDev}
                              </td>
                              <td className="px-4 py-2 text-center sm:py-3">
                                <span
                                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                                    item.consistency === "High"
                                      ? "bg-green-100 text-green-700"
                                      : item.consistency === "Medium"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {item.consistency}
                                </span>
                              </td>
                              <td className="text-muted px-4 py-2 text-center text-xs sm:py-3">
                                {item.consistency === "High"
                                  ? "Students perform similarly"
                                  : item.consistency === "Medium"
                                    ? "Moderate performance gap"
                                    : "Wide performance variation"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Subject Details Table */}
                <Card>
                  <h3
                    data-record="true"
                    className="text-main mb-4 text-base font-bold sm:text-lg"
                  >
                    Detailed Subject Statistics
                  </h3>
                  <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
                    <table className="w-full min-w-150">
                      <thead className="bg-gray-50">
                        <tr className="border-b">
                          <th
                            data-record="true"
                            className="text-main px-4 py-2 text-left text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                          >
                            Subject
                          </th>
                          <th
                            data-record="true"
                            className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                          >
                            Average
                          </th>
                          <th
                            data-record="true"
                            className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                          >
                            High
                          </th>
                          <th
                            data-record="true"
                            className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                          >
                            Low
                          </th>
                          <th
                            data-record="true"
                            className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                          >
                            Pass Rate
                          </th>
                          <th
                            data-record="true"
                            className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                          >
                            Students
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectPerformance.map((subject, index) => (
                          <tr key={index} className="border-b transition-colors hover:bg-gray-50">
                            <td className="text-main px-4 py-2 text-sm font-bold sm:py-3">
                              {subject.subjectName}
                            </td>
                            <td className="px-4 py-2 text-center sm:py-3">
                              <span className="text-primary text-sm font-bold">
                                {subject.averageScore}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center text-sm text-green-600 sm:py-3">
                              {subject.highestScore}
                            </td>
                            <td className="px-4 py-2 text-center text-sm text-red-600 sm:py-3">
                              {subject.lowestScore}
                            </td>
                            <td className="px-4 py-2 text-center sm:py-3">
                              <span
                                className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                                  subject.passRate >= 70
                                    ? "bg-green-100 text-green-700"
                                    : subject.passRate >= 50
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {subject.passRate}%
                              </span>
                            </td>
                            <td className="text-muted px-4 py-2 text-center text-sm sm:py-3">
                              {subject.studentCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}

            {/* Demographics Tab */}
            {activeView === "demographics" && (
              <>
                {/* Demographic Stats */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                  <StatCard
                    title="Male Students"
                    value={genderAnalysis.maleCount}
                    icon={Users}
                    color="blue"
                    subtitle={`Avg: ${genderAnalysis.maleAverage}%`}
                  />
                  <StatCard
                    title="Female Students"
                    value={genderAnalysis.femaleCount}
                    icon={Users}
                    color="purple"
                    subtitle={`Avg: ${genderAnalysis.femaleAverage}%`}
                  />
                  <StatCard
                    title="Avg Attendance"
                    value={attendanceInsights.averageAttendance}
                    icon={Activity}
                    color="green"
                    subtitle={`of ${settings.totalAttendanceDays || "N/A"} days`}
                  />
                </div>

                {/* Attendance Rate by Gender */}
                {attendanceByGender.attendanceRanges.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                    <ChartCard title="Attendance Rate Breakdown" icon={Activity}>
                      <ComposedChart
                        data={attendanceByGender.attendanceRanges.map((item) => ({
                          name: item.range,
                          Male: item.maleCount,
                          Female: item.femaleCount,
                        }))}
                        barKeys={[
                          { key: "Male", color: "#3b82f6", name: "Male" },
                          { key: "Female", color: "#ec4899", name: "Female" },
                        ]}
                        height={280}
                      />
                      <div className="mt-4 flex justify-around border-t pt-4">
                        <div className="text-center">
                          <p data-record="true" className="text-xs text-gray-600">
                            Male Avg Rate
                          </p>
                          <p className="text-lg font-black text-blue-600">
                            {attendanceByGender.maleAttendanceRate}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p data-record="true" className="text-xs text-gray-600">
                            Female Avg Rate
                          </p>
                          <p className="text-lg font-black text-pink-600">
                            {attendanceByGender.femaleAttendanceRate}%
                          </p>
                        </div>
                      </div>
                    </ChartCard>

                    {/* Performance by Age */}
                    {performanceByAge.length > 0 && (
                      <ChartCard title="Performance by Age Group" icon={Users}>
                        <BarChart
                          data={performanceByAge.map((item) => ({
                            label: item.ageRange,
                            value: item.avgScore,
                          }))}
                          height={280}
                          showValues={true}
                          gradient={true}
                        />
                        <div className="mt-4 border-t pt-3">
                          <p className="text-center text-xs text-gray-600">
                            Age groups with sample sizes from{" "}
                            {Math.min(...performanceByAge.map((a) => a.count))} to{" "}
                            {Math.max(...performanceByAge.map((a) => a.count))} students
                          </p>
                        </div>
                      </ChartCard>
                    )}
                  </div>
                )}

                {/* Age Distribution */}
                {ageDistribution.length > 0 && (
                  <ChartCard title="Age Distribution" icon={Activity}>
                    <BarChart
                      data={ageDistribution.map((item) => ({
                        label: item.category,
                        value: item.total,
                      }))}
                      height={280}
                      showValues={true}
                      gradient={true}
                    />
                  </ChartCard>
                )}

                {/* Gender Breakdown Table */}
                {ageDistribution.length > 0 && (
                  <Card>
                    <h3
                      data-record="true"
                      className="text-main mb-4 text-base font-bold sm:text-lg"
                    >
                      Gender Breakdown by Age
                    </h3>
                    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
                      <table className="w-full min-w-100">
                        <thead className="bg-gray-50">
                          <tr className="border-b">
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-left text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Age Range
                            </th>
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Male
                            </th>
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Female
                            </th>
                            <th
                              data-record="true"
                              className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm"
                            >
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ageDistribution.map((item, index) => (
                            <tr key={index} className="border-b transition-colors hover:bg-gray-50">
                              <td className="text-main px-4 py-2 text-sm font-bold sm:py-3">
                                {item.category}
                              </td>
                              <td className="px-4 py-2 text-center text-sm text-blue-600 sm:py-3">
                                {item.male}
                              </td>
                              <td className="px-4 py-2 text-center text-sm text-pink-600 sm:py-3">
                                {item.female}
                              </td>
                              <td className="px-4 py-2 text-center text-sm font-bold sm:py-3">
                                {item.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* AI Insights Tab */}
            {activeView === "insights" && (
              <>
                {/* Class Story Hero Card */}
                {classStory && (
                  <div className="rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50 via-white to-purple-50 p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3
                          data-record="true"
                          className="text-main flex items-center gap-2 text-lg font-black"
                        >
                          <Sparkles className="h-5 w-5 text-indigo-600" />
                          AI Class Story &amp; Intervention Brief
                        </h3>
                        <p className="mt-1 text-sm font-bold text-indigo-950">
                          {classStory.headline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyStaffBrief}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-xs transition-colors hover:bg-indigo-50"
                        data-record="true"
                      >
                        {copiedBrief ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedBrief ? "Copied!" : "Copy Staff Brief"}</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-sm leading-relaxed text-gray-700">
                      {classStory.narrativeParagraphs.map((para, idx) => (
                        <p key={idx}>{para}</p>
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                        <h4
                          data-record="true"
                          className="mb-2 text-xs font-black tracking-wider text-emerald-900 uppercase"
                        >
                          What&apos;s Working
                        </h4>
                        <ul className="space-y-1.5 text-xs text-emerald-950">
                          {classStory.strengths.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span>•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                        <h4
                          data-record="true"
                          className="mb-2 text-xs font-black tracking-wider text-amber-900 uppercase"
                        >
                          Watchouts
                        </h4>
                        {classStory.watchouts.length > 0 ? (
                          <ul className="space-y-1.5 text-xs text-amber-950">
                            {classStory.watchouts.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span>•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-amber-900">No major warning signals detected.</p>
                        )}
                      </div>
                    </div>

                    {/* Prioritized Next-Week Action Plan */}
                    <div className="mt-5 space-y-2.5">
                      <h4
                        data-record="true"
                        className="text-xs font-black tracking-wider text-gray-600 uppercase"
                      >
                        Prioritized Teacher Action Plan
                      </h4>
                      {classStory.actionPlan.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                                  step.priority === "HIGH"
                                    ? "bg-red-100 text-red-700"
                                    : step.priority === "MEDIUM"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {step.priority}
                              </span>
                              <p className="text-sm font-bold text-gray-900">{step.title}</p>
                            </div>
                            <p className="mt-1 text-xs text-gray-600">{step.detail}</p>
                          </div>
                          {step.targetSubject && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, subjectFilter: step.targetSubject }));
                                setActiveView("subjects");
                              }}
                              className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                            >
                              Inspect Subject →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Borderline "One Push Away" Cohort */}
                {borderlineStudents.length > 0 && (
                  <Card>
                    <h3
                      data-record="true"
                      className="text-main mb-2 flex items-center gap-2 text-base font-bold sm:text-lg"
                    >
                      <Target className="h-5 w-5 text-amber-600" />
                      Borderline Cohort (42%–54%): Highest Coaching ROI
                    </h3>
                    <p className="text-muted mb-4 text-xs">
                      Students sitting right near the 50% pass threshold and their lowest subjects.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {borderlineStudents.slice(0, 6).map((stu) => (
                        <div
                          key={stu.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">{stu.name}</p>
                            <p className="truncate text-xs text-gray-600">
                              Focus:{" "}
                              {stu.weakestSubjects
                                .map((w) => `${w.name} (${w.score})`)
                                .join(", ")}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900">
                            {stu.averageScore}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* SBA vs Exam Discrepancy Spotlight */}
                {sbaVsExam.available &&
                  (sbaVsExam.examUnderperformers.length > 0 ||
                    sbaVsExam.lowClassworkStudents.length > 0) && (
                    <Card>
                      <h3
                        data-record="true"
                        className="text-main mb-2 flex items-center gap-2 text-base font-bold sm:text-lg"
                      >
                        <Activity className="h-5 w-5 text-purple-600" />
                        SBA Classwork vs. Exam Discrepancy Spotlight
                      </h3>
                      <p className="text-muted mb-4 text-xs">
                        Detects students whose classwork performance differs sharply (18+ pts) from
                        their exam scores.
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {sbaVsExam.examUnderperformers.length > 0 && (
                          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5">
                            <p className="mb-2 text-xs font-bold text-purple-900 uppercase">
                              Strong SBA, Low Exam (Exam Technique / Anxiety)
                            </p>
                            <div className="space-y-2">
                              {sbaVsExam.examUnderperformers.slice(0, 5).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs"
                                >
                                  <span className="font-bold text-gray-800">{item.name}</span>
                                  <span className="font-mono text-purple-700">
                                    SBA {item.sbaPercent}% vs Exam {item.examPercent}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {sbaVsExam.lowClassworkStudents.length > 0 && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5">
                            <p className="mb-2 text-xs font-bold text-blue-900 uppercase">
                              Low SBA, Strong Exam (Missing Classwork)
                            </p>
                            <div className="space-y-2">
                              {sbaVsExam.lowClassworkStudents.slice(0, 5).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs"
                                >
                                  <span className="font-bold text-gray-800">{item.name}</span>
                                  <span className="font-mono text-blue-700">
                                    SBA {item.sbaPercent}% vs Exam {item.examPercent}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                {/* At-Risk Students - Priority Alert */}
                {atRiskStudents.length > 0 && (
                  <Card>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3
                        data-record="true"
                        className="text-main flex items-center gap-2 text-base font-bold sm:text-lg"
                      >
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Students Requiring Immediate Attention
                      </h3>
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/" })}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
                        data-record="true"
                      >
                        Review Students on Dashboard
                      </button>
                    </div>
                    <p data-record="true" className="text-muted mb-4 text-sm">
                      Students identified based on low performance, poor attendance, or multiple
                      failed subjects. Prioritized by risk level.
                    </p>
                    <div className="space-y-3">
                      {atRiskStudents.slice(0, 10).map((student) => (
                        <div
                          key={student.id}
                          className="rounded-lg border-l-4 border-red-500 bg-red-50/50 p-4 transition-all hover:bg-red-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">{student.name}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {student.riskFactors.map((factor, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block rounded-full bg-red-200 px-2.5 py-0.5 text-xs font-medium text-red-800"
                                  >
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="ml-4 text-right">
                              <p className="text-xs text-gray-600">Average</p>
                              <p className="text-lg font-black text-red-600">
                                {student.averageScore}%
                              </p>
                              <p className="text-xs text-gray-600">
                                {student.attendanceRecorded
                                  ? `${student.attendanceRate}% attendance`
                                  : "Attendance N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {atRiskStudents.length > 10 && (
                      <p className="text-muted mt-4 text-center text-sm">
                        Showing top 10 of {atRiskStudents.length} at-risk students
                      </p>
                    )}
                  </Card>
                )}

                {/* Performance Quartiles */}
                <Card>
                  <h3
                    data-record="true"
                    className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg"
                  >
                    <Brain className="h-5 w-5" />
                    Performance Distribution Analysis
                  </h3>
                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-green-50 p-4 text-center">
                      <p data-record="true" className="text-xs font-bold text-green-700 uppercase">
                        Top 25%
                      </p>
                      <p className="mt-2 text-2xl font-black text-green-900">
                        {performanceQuartiles.q3}%+
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p data-record="true" className="text-xs font-bold text-blue-700 uppercase">
                        Median
                      </p>
                      <p className="mt-2 text-2xl font-black text-blue-900">
                        {performanceQuartiles.q2}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-4 text-center">
                      <p data-record="true" className="text-xs font-bold text-amber-700 uppercase">
                        Bottom 25%
                      </p>
                      <p className="mt-2 text-2xl font-black text-amber-900">
                        {performanceQuartiles.q1}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-4 text-center">
                      <p data-record="true" className="text-xs font-bold text-purple-700 uppercase">
                        Top Quartile
                      </p>
                      <p className="mt-2 text-2xl font-black text-purple-900">
                        {performanceQuartiles.q4Count}
                      </p>
                    </div>
                  </div>

                  {/* Struggling Students */}
                  {performanceQuartiles.strugglingStudents.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <h4
                        data-record="true"
                        className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Students Needing Support
                      </h4>
                      <div className="space-y-2">
                        {performanceQuartiles.strugglingStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between rounded-lg bg-white p-2"
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-900">{student.name}</p>
                              <p className="text-xs text-gray-600">{student.gender || "N/A"}</p>
                            </div>
                            <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-900">
                              {student.averageScore}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Attendance Insights */}
                <Card>
                  <h3
                    data-record="true"
                    className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg"
                  >
                    <Activity className="h-5 w-5" />
                    Attendance & Performance Correlation
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-50 p-4">
                      <p data-record="true" className="text-xs font-bold text-green-700 uppercase">
                        Perfect Attendance
                      </p>
                      <p className="mt-2 text-2xl font-black text-green-900">
                        {attendanceInsights.perfectAttendance}
                      </p>
                      <p data-record="true" className="mt-1 text-xs text-green-600">
                        students
                      </p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-4">
                      <p data-record="true" className="text-xs font-bold text-red-700 uppercase">
                        Poor Attendance
                      </p>
                      <p className="mt-2 text-2xl font-black text-red-900">
                        {attendanceInsights.poorAttendance}
                      </p>
                      <p data-record="true" className="mt-1 text-xs text-red-600">
                        students &lt;70%
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p data-record="true" className="text-xs font-bold text-blue-700 uppercase">
                        Correlation
                      </p>
                      <p className="mt-2 text-2xl font-black text-blue-900">
                        {attendanceInsights.correlationWithPerformance === "positive"
                          ? "Positive ↑"
                          : attendanceInsights.correlationWithPerformance === "negative"
                            ? "Negative ↓"
                            : "Neutral →"}
                      </p>
                      <p data-record="true" className="mt-1 text-xs text-blue-600">
                        Pearson r = {attendanceInsights.correlationCoefficient}
                      </p>
                    </div>
                  </div>
                  {attendanceInsights.correlationWithPerformance === "positive" && (
                    <div className="mt-4 rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-800">
                        <strong>Insight:</strong> Better attendance correlates with higher scores.
                        Encourage regular attendance for improved performance.
                      </p>
                    </div>
                  )}
                </Card>

                {/* Key Recommendations */}
                <div className="rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-purple-50 p-6 shadow-sm">
                  <h3
                    data-record="true"
                    className="text-main mb-4 flex items-center gap-2 text-lg font-bold"
                  >
                    <Brain className="h-6 w-6 text-blue-600" />
                    AI-Powered Recommendations
                  </h3>
                  <div className="space-y-3">
                    {classMetrics.passRate < 70 && (
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-bold text-red-600">⚠️ Low Pass Rate</p>
                        <p className="text-sm text-gray-700">
                          Only {classMetrics.passRate}% of students are passing. Consider additional
                          tutoring sessions and remedial classes.
                        </p>
                      </div>
                    )}
                    {subjectInsights.needsAttention.length > 0 && (
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-bold text-amber-600">
                          📚 Subjects Need Attention
                        </p>
                        <p className="text-sm text-gray-700">
                          Focus on{" "}
                          {subjectInsights.needsAttention.map((s) => s.subjectName).join(", ")} -
                          these subjects have pass rates below 60%.
                        </p>
                      </div>
                    )}
                    {genderAnalysis.maleAverage > genderAnalysis.femaleAverage + 5 && (
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-bold text-purple-600">
                          ⚖️ Gender Performance Gap
                        </p>
                        <p className="text-sm text-gray-700">
                          Male students are outperforming female students by{" "}
                          {(genderAnalysis.maleAverage - genderAnalysis.femaleAverage).toFixed(1)}%.
                          Consider targeted support for female students.
                        </p>
                      </div>
                    )}
                    {genderAnalysis.femaleAverage > genderAnalysis.maleAverage + 5 && (
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-bold text-purple-600">
                          ⚖️ Gender Performance Gap
                        </p>
                        <p className="text-sm text-gray-700">
                          Female students are outperforming male students by{" "}
                          {(genderAnalysis.femaleAverage - genderAnalysis.maleAverage).toFixed(1)}%.
                          Consider targeted support for male students.
                        </p>
                      </div>
                    )}
                    {classMetrics.excellenceRate > 30 && (
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-bold text-green-600">🌟 Excellence Rate</p>
                        <p className="text-sm text-gray-700">
                          Excellent work! {classMetrics.excellenceRate}% of students are scoring
                          80%+. Continue current teaching strategies.
                        </p>
                      </div>
                    )}
                    {performanceQuartiles.strugglingStudents.length > 5 && (
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-bold text-red-600">
                          👥 Struggling Students
                        </p>
                        <p className="text-sm text-gray-700">
                          {performanceQuartiles.strugglingStudents.length} students are in the
                          bottom quartile. Implement one-on-one interventions.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ✅ SCROLL BUTTON - Show when there's analytics data to navigate */}
      {filteredStudents.length > 0 && <ScrollButton />}

      <PdfExportModal {...pdfModalProps} />
    </div>
  );
};

export default Analytics;
