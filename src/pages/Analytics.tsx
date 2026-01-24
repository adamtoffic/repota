// src/pages/Analytics.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
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
} from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { StatCard } from "../components/analytics/StatCard";
import { FilterPanel } from "../components/analytics/FilterPanel";
import type { AnalyticsFilters } from "../components/analytics/FilterPanel";
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
} from "../utils/analyticsCalculator";
import { processStudent } from "../utils/gradeCalculator";

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { students, settings } = useSchoolData();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    gender: "All",
    performanceLevel: "All",
    subjectFilter: "All",
    scoreRange: { min: 0, max: 100 },
  });
  const [activeView, setActiveView] = useState<
    "overview" | "subjects" | "demographics" | "insights"
  >("overview");

  // Filter students based on selected filters
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const processed = processStudent(student, settings.level);

      // Gender filter
      if (filters.gender && filters.gender !== "All") {
        if (student.gender !== filters.gender) return false;
      }

      // Performance level filter
      if (filters.performanceLevel && filters.performanceLevel !== "All") {
        const avgScore = processed.averageScore;
        if (filters.performanceLevel === "Excellence" && avgScore < 80) return false;
        if (filters.performanceLevel === "Pass" && (avgScore < 50 || avgScore >= 80)) return false;
        if (filters.performanceLevel === "Fail" && avgScore >= 50) return false;
      }

      // Score range filter
      if (filters.scoreRange) {
        const avgScore = processed.averageScore;
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

  // Calculate analytics data
  const classMetrics = useMemo(
    () => calculateClassMetrics(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const subjectPerformance = useMemo(
    () => calculateSubjectPerformance(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const scoreDistribution = useMemo(
    () => calculateScoreDistribution(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const genderAnalysis = useMemo(
    () => calculateGenderAnalysis(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const topPerformers = useMemo(
    () => getTopPerformers(filteredStudents, settings, 5),
    [filteredStudents, settings],
  );

  const ageDistribution = useMemo(
    () => calculateAgeDistribution(filteredStudents),
    [filteredStudents],
  );

  const subjectGenderComparison = useMemo(
    () => calculateSubjectGenderComparison(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const subjectInsights = useMemo(
    () => calculateSubjectInsights(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const performanceQuartiles = useMemo(
    () => calculatePerformanceQuartiles(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const gradeDistribution = useMemo(
    () => calculateGradeDistribution(filteredStudents, settings),
    [filteredStudents, settings],
  );

  const attendanceInsights = useMemo(
    () => calculateAttendanceInsights(filteredStudents, settings),
    [filteredStudents, settings],
  );

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
        <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm">
                  <img src="/logo.svg" alt="Repota" className="h-full w-full p-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-main text-lg leading-none font-black tracking-tight">
                    REPOTA
                  </h1>
                  <p className="text-muted truncate text-xs font-medium">
                    {settings.schoolName || "No School Selected"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-muted hover:text-main mb-4 flex items-center gap-2 text-sm font-medium transition-colors sm:mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-main mb-2 text-lg font-bold sm:text-xl">No Data Available</h3>
            <p className="text-muted text-sm sm:text-base">
              Add students and their scores to view advanced analytics
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm">
                <img src="/logo.svg" alt="Repota" className="h-full w-full p-1" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-main text-lg leading-none font-black tracking-tight">REPOTA</h1>
                <p className="text-muted truncate text-xs font-medium">
                  {settings.schoolName || "No School Selected"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-muted hover:text-main mb-3 flex items-center gap-2 text-sm font-medium transition-colors sm:mb-4"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-main text-2xl font-black tracking-tight sm:text-3xl">
                📊 Advanced Analytics
              </h1>
              <p className="text-muted mt-1 text-sm">
                Deep insights for {settings.className || "your class"} • {filteredStudents.length}{" "}
                of {students.length} students
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-left sm:text-right">
                <p className="text-muted text-xs font-medium tracking-wide uppercase">
                  Academic Year
                </p>
                <p className="text-main text-sm font-bold">
                  {settings.academicYear} • {settings.term}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1 sm:mb-6">
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
                onClick={() => setActiveView(view.id as any)}
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

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <div className="order-2 lg:order-1 lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              availableSubjects={availableSubjects}
            />
          </div>

          {/* Main Content */}
          <div className="order-1 space-y-4 sm:space-y-6 lg:order-2 lg:col-span-3">
            {/* Overview Tab */}
            {activeView === "overview" && (
              <>
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
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                      <BarChart3 className="h-5 w-5" />
                      Score Distribution
                    </h3>
                    <BarChart
                      data={scoreDistribution.map((item) => ({
                        label: item.range.split(" ")[0],
                        value: item.count,
                      }))}
                      height={280}
                      showValues={true}
                      gradient={true}
                    />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                      <PieChartIcon className="h-5 w-5" />
                      Grade Distribution
                    </h3>
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
                      <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                        No grade data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Gender Analysis & Top Performers */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                  {/* Gender Analysis */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                      <PieChartIcon className="h-5 w-5" />
                      Gender Distribution
                    </h3>
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
                              <span className="text-gray-600">Male Average:</span>
                              <span className="font-semibold text-blue-600">
                                {genderAnalysis.maleAverage}%
                              </span>
                            </div>
                          )}
                          {genderAnalysis.femaleCount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Female Average:</span>
                              <span className="font-semibold text-pink-600">
                                {genderAnalysis.femaleAverage}%
                              </span>
                            </div>
                          )}
                          {genderAnalysis.maleCount > 0 && genderAnalysis.femaleCount > 0 && (
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-gray-700">Performance Gap:</span>
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
                      <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">
                        No gender data available
                      </div>
                    )}
                  </div>

                  {/* Top Performers */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                      <Award className="h-5 w-5" />
                      Top 5 Performers
                    </h3>
                    <div className="space-y-3">
                      {topPerformers.slice(0, 5).map((student, index) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gray-50 to-white p-2 sm:gap-3 sm:p-3"
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:h-8 sm:w-8 ${
                              index === 0
                                ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                : index === 1
                                  ? "bg-gradient-to-br from-gray-300 to-gray-500"
                                  : index === 2
                                    ? "bg-gradient-to-br from-orange-400 to-orange-600"
                                    : "bg-gradient-to-br from-blue-400 to-blue-600"
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
                  </div>
                </div>
              </>
            )}

            {/* Subject Analysis Tab */}
            {activeView === "subjects" && (
              <>
                {/* Subject Performance Radar */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                  <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                    <Zap className="h-5 w-5" />
                    Subject Performance Overview
                  </h3>
                  <RadarChart
                    data={subjectPerformance.slice(0, 8).map((s) => ({
                      subject: s.subjectName,
                      score: s.averageScore,
                    }))}
                    height={350}
                    color="#3b82f6"
                  />
                </div>

                {/* Subject Comparison Bar */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                  <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                    <BookOpen className="h-5 w-5" />
                    Subject Performance Comparison
                  </h3>
                  <BarChart
                    data={subjectPerformance.map((subject) => ({
                      label: subject.subjectName,
                      value: subject.averageScore,
                    }))}
                    height={320}
                    showValues={true}
                    gradient={true}
                  />
                </div>

                {/* Gender Performance by Subject */}
                {subjectGenderComparison.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                      <Users className="h-5 w-5" />
                      Gender Performance by Subject
                    </h3>
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
                  </div>
                )}

                {/* Subject Insights Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                  {/* Strongest Subjects */}
                  <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm sm:p-6">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-900">
                      <TrendingUp className="h-4 w-4" />
                      Strongest Subjects
                    </h4>
                    <div className="space-y-2">
                      {subjectInsights.strongest.map((subject, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium text-green-800">{subject.subjectName}</span>
                          <span className="font-bold text-green-600">{subject.averageScore}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weakest Subjects */}
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm sm:p-6">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-900">
                      <TrendingDown className="h-4 w-4" />
                      Needs Improvement
                    </h4>
                    <div className="space-y-2">
                      {subjectInsights.weakest.map((subject, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium text-red-800">{subject.subjectName}</span>
                          <span className="font-bold text-red-600">{subject.averageScore}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attention Required */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm sm:p-6">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900">
                      <AlertTriangle className="h-4 w-4" />
                      Low Pass Rate
                    </h4>
                    <div className="space-y-2">
                      {subjectInsights.needsAttention.slice(0, 3).map((subject, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium text-amber-800">{subject.subjectName}</span>
                          <span className="font-bold text-amber-600">{subject.passRate}%</span>
                        </div>
                      ))}
                      {subjectInsights.needsAttention.length === 0 && (
                        <p className="text-xs text-amber-700">All subjects have good pass rates!</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject Details Table */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                  <h3 className="text-main mb-4 text-base font-bold sm:text-lg">
                    Detailed Subject Statistics
                  </h3>
                  <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50">
                        <tr className="border-b">
                          <th className="text-main px-4 py-2 text-left text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                            Subject
                          </th>
                          <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                            Average
                          </th>
                          <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                            High
                          </th>
                          <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                            Low
                          </th>
                          <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                            Pass Rate
                          </th>
                          <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
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
                </div>
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

                {/* Age Distribution */}
                {ageDistribution.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                      <Activity className="h-5 w-5" />
                      Age Distribution
                    </h3>
                    <BarChart
                      data={ageDistribution.map((item) => ({
                        label: item.category,
                        value: item.total,
                      }))}
                      height={280}
                      showValues={true}
                      gradient={true}
                    />
                  </div>
                )}

                {/* Gender Breakdown Table */}
                {ageDistribution.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <h3 className="text-main mb-4 text-base font-bold sm:text-lg">
                      Gender Breakdown by Age
                    </h3>
                    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
                      <table className="w-full min-w-[400px]">
                        <thead className="bg-gray-50">
                          <tr className="border-b">
                            <th className="text-main px-4 py-2 text-left text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                              Age Range
                            </th>
                            <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                              Male
                            </th>
                            <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
                              Female
                            </th>
                            <th className="text-main px-4 py-2 text-center text-xs font-bold tracking-wide uppercase sm:py-3 sm:text-sm">
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
                  </div>
                )}
              </>
            )}

            {/* AI Insights Tab */}
            {activeView === "insights" && (
              <>
                {/* Performance Quartiles */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                  <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                    <Brain className="h-5 w-5" />
                    Performance Distribution Analysis
                  </h3>
                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-green-50 p-4 text-center">
                      <p className="text-xs font-bold text-green-700 uppercase">Top 25%</p>
                      <p className="mt-2 text-2xl font-black text-green-900">
                        {performanceQuartiles.q3}%+
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="text-xs font-bold text-blue-700 uppercase">Median</p>
                      <p className="mt-2 text-2xl font-black text-blue-900">
                        {performanceQuartiles.q2}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-4 text-center">
                      <p className="text-xs font-bold text-amber-700 uppercase">Bottom 25%</p>
                      <p className="mt-2 text-2xl font-black text-amber-900">
                        {performanceQuartiles.q1}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-4 text-center">
                      <p className="text-xs font-bold text-purple-700 uppercase">Top Quartile</p>
                      <p className="mt-2 text-2xl font-black text-purple-900">
                        {performanceQuartiles.q4Count}
                      </p>
                    </div>
                  </div>

                  {/* Struggling Students */}
                  {performanceQuartiles.strugglingStudents.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900">
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
                </div>

                {/* Attendance Insights */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                  <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
                    <Activity className="h-5 w-5" />
                    Attendance & Performance Correlation
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-50 p-4">
                      <p className="text-xs font-bold text-green-700 uppercase">
                        Perfect Attendance
                      </p>
                      <p className="mt-2 text-2xl font-black text-green-900">
                        {attendanceInsights.perfectAttendance}
                      </p>
                      <p className="mt-1 text-xs text-green-600">students</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-4">
                      <p className="text-xs font-bold text-red-700 uppercase">Poor Attendance</p>
                      <p className="mt-2 text-2xl font-black text-red-900">
                        {attendanceInsights.poorAttendance}
                      </p>
                      <p className="mt-1 text-xs text-red-600">students &lt;70%</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-bold text-blue-700 uppercase">Correlation</p>
                      <p className="mt-2 text-2xl font-black text-blue-900">
                        {attendanceInsights.correlationWithPerformance === "positive"
                          ? "Positive ↑"
                          : attendanceInsights.correlationWithPerformance === "negative"
                            ? "Negative ↓"
                            : "Neutral →"}
                      </p>
                      <p className="mt-1 text-xs text-blue-600">with performance</p>
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
                </div>

                {/* Key Recommendations */}
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-sm">
                  <h3 className="text-main mb-4 flex items-center gap-2 text-lg font-bold">
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
    </div>
  );
};

export default Analytics;
