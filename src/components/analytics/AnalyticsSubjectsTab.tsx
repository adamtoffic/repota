import {
  Activity,
  AlertTriangle,
  BookOpen,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type {
  SubjectPerformance,
  calculateSbaCategoryMastery,
  calculateSbaVsExamAnalysis,
  calculateSubjectGenderComparison,
  calculateSubjectInsights,
  calculateSubjectVariance,
} from "../../utils/analyticsCalculator";
import { BarChart } from "../charts/BarChart";
import { ComposedChart } from "../charts/ComposedChart";
import { RadarChart } from "../charts/RadarChart";
import { Card } from "../ui/Card";
import { ChartCard } from "./ChartCard";
import { InsightCard } from "./InsightCard";

interface AnalyticsSubjectsTabProps {
  subjectPerformance: SubjectPerformance[];
  subjectGenderComparison: ReturnType<typeof calculateSubjectGenderComparison>;
  sbaVsExam: ReturnType<typeof calculateSbaVsExamAnalysis>;
  sbaCategoryMastery: ReturnType<typeof calculateSbaCategoryMastery>;
  subjectInsights: ReturnType<typeof calculateSubjectInsights>;
  subjectVariance: ReturnType<typeof calculateSubjectVariance>;
}

export function AnalyticsSubjectsTab({
  subjectPerformance,
  subjectGenderComparison,
  sbaVsExam,
  sbaCategoryMastery,
  subjectInsights,
  subjectVariance,
}: AnalyticsSubjectsTabProps) {
  return (
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
        <InsightCard
          title="Strongest Subjects"
          icon={TrendingUp}
          variant="success"
          items={subjectInsights.strongest.map((subject) => ({
            name: subject.subjectName,
            value: `${subject.averageScore}%`,
          }))}
        />

        <InsightCard
          title="Needs Improvement"
          icon={TrendingDown}
          variant="danger"
          items={subjectInsights.weakest.map((subject) => ({
            name: subject.subjectName,
            value: `${subject.averageScore}%`,
          }))}
        />

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
          <h3 data-record="true" className="text-main mb-4 text-base font-bold sm:text-lg">
            Subject Performance Consistency
          </h3>
          <p data-record="true" className="text-muted mb-4 text-sm">
            Measures how consistent student scores are within each subject. Low variance = students
            perform similarly. High variance = wide performance gap.
          </p>
          <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
            <table className="w-full min-w-150">
              <thead className="bg-subtle">
                <tr className="border-border border-b">
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
                  <tr
                    key={index}
                    className="border-border hover:bg-subtle/60 border-b transition-colors"
                  >
                    <td className="text-main px-4 py-2 text-sm font-bold sm:py-3">
                      {item.subject}
                    </td>
                    <td className="px-4 py-2 text-center text-sm sm:py-3">{item.stdDev}</td>
                    <td className="px-4 py-2 text-center sm:py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          item.consistency === "High"
                            ? "bg-green-100 text-green-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : item.consistency === "Medium"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
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
        <h3 data-record="true" className="text-main mb-4 text-base font-bold sm:text-lg">
          Detailed Subject Statistics
        </h3>
        <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
          <table className="w-full min-w-150">
            <thead className="bg-subtle">
              <tr className="border-border border-b">
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
                <tr
                  key={index}
                  className="border-border hover:bg-subtle/60 border-b transition-colors"
                >
                  <td className="text-main px-4 py-2 text-sm font-bold sm:py-3">
                    {subject.subjectName}
                  </td>
                  <td className="px-4 py-2 text-center sm:py-3">
                    <span className="text-primary-text text-sm font-bold">
                      {subject.averageScore}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-green-600 sm:py-3 dark:text-emerald-400">
                    {subject.highestScore}
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-red-600 sm:py-3 dark:text-red-400">
                    {subject.lowestScore}
                  </td>
                  <td className="px-4 py-2 text-center sm:py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        subject.passRate >= 70
                          ? "bg-green-100 text-green-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : subject.passRate >= 50
                            ? "bg-yellow-100 text-yellow-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
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
  );
}
