import {
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type {
  ClassPerformanceMetrics,
  GenderAnalysis,
  ScoreDistribution,
  TopPerformer,
  calculateCoreVsElectiveStats,
  calculateGradeDistribution,
  calculatePrivateFeeSummary,
} from "../../utils/analyticsCalculator";
import { BarChart } from "../charts/BarChart";
import { PieChart } from "../charts/PieChart";
import { Card } from "../ui/Card";
import { ChartCard } from "./ChartCard";
import { StatCard } from "./StatCard";
import { GRADE_COLORS } from "./analyticsShared";

interface AnalyticsOverviewTabProps {
  classPulseHeadline: string | null;
  classMetrics: ClassPerformanceMetrics;
  scoreDistribution: ScoreDistribution[];
  gradeDistribution: ReturnType<typeof calculateGradeDistribution>;
  genderAnalysis: GenderAnalysis;
  topPerformers: TopPerformer[];
  coreVsElective: ReturnType<typeof calculateCoreVsElectiveStats>;
  privateFeeSummary: ReturnType<typeof calculatePrivateFeeSummary> | null;
  onOpenInsights: () => void;
}

export function AnalyticsOverviewTab({
  classPulseHeadline,
  classMetrics,
  scoreDistribution,
  gradeDistribution,
  genderAnalysis,
  topPerformers,
  coreVsElective,
  privateFeeSummary,
  onOpenInsights,
}: AnalyticsOverviewTabProps) {
  return (
    <>
      {/* Class Pulse Story Banner */}
      {classPulseHeadline && (
        <div className="rounded-xl border border-indigo-200 bg-linear-to-r from-indigo-50 via-blue-50 to-purple-50 p-4 shadow-sm sm:p-5 dark:border-indigo-800/70 dark:from-indigo-950/60 dark:via-blue-950/50 dark:to-purple-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p
                data-record="true"
                className="flex items-center gap-1.5 text-xs font-black tracking-wider text-indigo-700 uppercase dark:text-indigo-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Class Pulse Story
              </p>
              <p className="text-main mt-1 text-sm leading-relaxed font-semibold">
                {classPulseHeadline}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenInsights}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700"
              data-record="true"
            >
              Full AI Story &amp; Plan →
            </button>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
                data={gradeDistribution.map((item) => ({
                  label: `${item.grade} (${item.percentage}%)`,
                  value: item.count,
                  color: GRADE_COLORS[item.grade] || "#6b7280",
                }))}
                size={200}
                showLegend={true}
              />
              <div className="text-muted mt-4 text-center text-xs">
                Total: {gradeDistribution.reduce((sum, g) => sum + g.count, 0)} students
              </div>
            </>
          ) : (
            <div className="text-muted flex h-50 items-center justify-center text-sm">
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
              <div className="border-border mt-4 space-y-2 border-t pt-4">
                {genderAnalysis.maleCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span data-record="true" className="text-secondary">
                      Male Average:
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {genderAnalysis.maleAverage}%
                    </span>
                  </div>
                )}
                {genderAnalysis.femaleCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span data-record="true" className="text-secondary">
                      Female Average:
                    </span>
                    <span className="font-semibold text-pink-600 dark:text-pink-400">
                      {genderAnalysis.femaleAverage}%
                    </span>
                  </div>
                )}
                {genderAnalysis.maleCount > 0 && genderAnalysis.femaleCount > 0 && (
                  <div className="flex justify-between text-sm font-bold">
                    <span data-record="true" className="text-main">
                      Performance Gap:
                    </span>
                    <span
                      className={
                        Math.abs(genderAnalysis.maleAverage - genderAnalysis.femaleAverage) > 5
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-green-700 dark:text-emerald-400"
                      }
                    >
                      {Math.abs(genderAnalysis.maleAverage - genderAnalysis.femaleAverage).toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-muted flex h-45 items-center justify-center text-sm">
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
                className="from-subtle to-surface border-border-subtle flex items-center gap-2 rounded-lg border bg-linear-to-r p-2 sm:gap-3 sm:p-3"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:h-8 sm:w-8 ${
                    index === 0
                      ? "bg-linear-to-br from-amber-600 to-amber-800"
                      : index === 1
                        ? "bg-linear-to-br from-slate-600 to-slate-800"
                        : index === 2
                          ? "bg-linear-to-br from-orange-700 to-orange-800"
                          : "bg-linear-to-br from-blue-600 to-blue-800"
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
                  <p className="text-primary-text text-sm font-black sm:text-base">
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
            <h2
              data-record="true"
              className="text-main mb-3 flex items-center gap-2 text-base font-bold"
            >
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Core vs. Elective Health
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-800/70 dark:bg-blue-950/50">
                <p
                  className="text-[11px] font-bold text-blue-700 uppercase dark:text-blue-300"
                  data-record="true"
                >
                  Core Subjects
                </p>
                <p className="mt-1 text-2xl font-black text-blue-950 dark:text-blue-100">
                  {coreVsElective.coreAverage}%
                </p>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {coreVsElective.corePassRate}% pass rate
                </p>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50/70 p-3 dark:border-purple-800/70 dark:bg-purple-950/50">
                <p
                  className="text-[11px] font-bold text-purple-700 uppercase dark:text-purple-300"
                  data-record="true"
                >
                  Electives
                </p>
                <p className="mt-1 text-2xl font-black text-purple-950 dark:text-purple-100">
                  {coreVsElective.electiveAverage}%
                </p>
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  {coreVsElective.electivePassRate}% pass rate
                </p>
              </div>
            </div>
          </Card>

          {coreVsElective.aggregateBands.length > 0 && (
            <Card>
              <h2
                data-record="true"
                className="text-main mb-3 flex items-center gap-2 text-base font-bold"
              >
                <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Aggregate Distribution Bands
              </h2>
              <div className="space-y-2">
                {coreVsElective.aggregateBands.map((band) => (
                  <div key={band.band} className="flex items-center justify-between text-xs">
                    <span className="text-secondary font-semibold">{band.band}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-main font-bold">{band.count} students</span>
                      <span className="bg-subtle text-secondary rounded px-1.5 py-0.5 font-mono text-[11px]">
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
              <h2
                data-record="true"
                className="text-main flex items-center gap-2 text-base font-bold"
              >
                <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Private School Fee Tracking
              </h2>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800 dark:bg-red-950/60 dark:text-red-300">
                Total Arrears: GH₵{privateFeeSummary.totalArrears.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-emerald-50 p-3 text-center dark:border dark:border-emerald-800/70 dark:bg-emerald-950/50">
                <p className="text-[10px] font-bold text-emerald-700 uppercase dark:text-emerald-300">
                  Paid
                </p>
                <p className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                  {privateFeeSummary.paidCount}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center dark:border dark:border-amber-800/70 dark:bg-amber-950/50">
                <p className="text-[10px] font-bold text-amber-700 uppercase dark:text-amber-300">
                  Part-Paid
                </p>
                <p className="text-xl font-black text-amber-900 dark:text-amber-200">
                  {privateFeeSummary.partPaidCount}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center dark:border dark:border-red-800/70 dark:bg-red-950/50">
                <p className="text-[10px] font-bold text-red-700 uppercase dark:text-red-300">
                  Owing
                </p>
                <p className="text-xl font-black text-red-900 dark:text-red-200">
                  {privateFeeSummary.owingCount}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center dark:border dark:border-blue-800/70 dark:bg-blue-950/50">
                <p className="text-[10px] font-bold text-blue-700 uppercase dark:text-blue-300">
                  Scholarship
                </p>
                <p className="text-xl font-black text-blue-900 dark:text-blue-200">
                  {privateFeeSummary.scholarshipCount}
                </p>
              </div>
            </div>
          </Card>
        )}
    </>
  );
}
