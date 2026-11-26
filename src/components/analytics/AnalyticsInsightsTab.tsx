import { Activity, AlertTriangle, Brain, Check, Copy, Sparkles, Target } from "lucide-react";
import type {
  ClassPerformanceMetrics,
  GenderAnalysis,
  calculateAtRiskStudents,
  calculateAttendanceInsights,
  calculateBorderlineStudents,
  calculatePerformanceQuartiles,
  calculateSbaVsExamAnalysis,
  calculateSubjectInsights,
} from "../../utils/analyticsCalculator";
import type { generateClassStory } from "../../utils/classStoryGenerator";
import { Card } from "../ui/Card";

interface AnalyticsInsightsTabProps {
  classStory: ReturnType<typeof generateClassStory> | null;
  copiedBrief: boolean;
  onCopyStaffBrief: () => void;
  onInspectSubject: (subjectName: string) => void;
  borderlineStudents: ReturnType<typeof calculateBorderlineStudents>;
  sbaVsExam: ReturnType<typeof calculateSbaVsExamAnalysis>;
  atRiskStudents: ReturnType<typeof calculateAtRiskStudents>;
  onReviewStudents: () => void;
  performanceQuartiles: ReturnType<typeof calculatePerformanceQuartiles>;
  attendanceInsights: ReturnType<typeof calculateAttendanceInsights>;
  classMetrics: ClassPerformanceMetrics;
  subjectInsights: ReturnType<typeof calculateSubjectInsights>;
  genderAnalysis: GenderAnalysis;
}

export function AnalyticsInsightsTab({
  classStory,
  copiedBrief,
  onCopyStaffBrief,
  onInspectSubject,
  borderlineStudents,
  sbaVsExam,
  atRiskStudents,
  onReviewStudents,
  performanceQuartiles,
  attendanceInsights,
  classMetrics,
  subjectInsights,
  genderAnalysis,
}: AnalyticsInsightsTabProps) {
  return (
    <>
      {/* Class Story Hero Card */}
      {classStory && (
        <div className="rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50 via-white to-purple-50 p-5 shadow-sm sm:p-6 dark:border-indigo-800/70 dark:from-indigo-950/60 dark:via-slate-900 dark:to-purple-950/50">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 data-record="true" className="text-main flex items-center gap-2 text-lg font-black">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                AI Class Story &amp; Intervention Brief
              </h2>
              <p className="mt-1 text-sm font-bold text-indigo-950 dark:text-indigo-200">
                {classStory.headline}
              </p>
            </div>
            <button
              type="button"
              onClick={onCopyStaffBrief}
              className="dark:bg-elevated inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-xs transition-colors hover:bg-indigo-50 dark:border-indigo-700/70 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
              data-record="true"
            >
              {copiedBrief ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedBrief ? "Copied!" : "Copy Staff Brief"}</span>
            </button>
          </div>

          <div className="text-secondary space-y-2 text-sm leading-relaxed">
            {classStory.narrativeParagraphs.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800/70 dark:bg-emerald-950/40">
              <h3
                data-record="true"
                className="mb-2 text-xs font-black tracking-wider text-emerald-900 uppercase dark:text-emerald-200"
              >
                What&apos;s Working
              </h3>
              <ul className="space-y-1.5 text-xs text-emerald-950 dark:text-emerald-200/90">
                {classStory.strengths.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/70 dark:bg-amber-950/40">
              <h3
                data-record="true"
                className="mb-2 text-xs font-black tracking-wider text-amber-900 uppercase dark:text-amber-200"
              >
                Watchouts
              </h3>
              {classStory.watchouts.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-amber-950 dark:text-amber-200/90">
                  {classStory.watchouts.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  No major warning signals detected.
                </p>
              )}
            </div>
          </div>

          {/* Prioritized Next-Week Action Plan */}
          <div className="mt-5 space-y-2.5">
            <h3
              data-record="true"
              className="text-muted text-xs font-black tracking-wider uppercase"
            >
              Prioritized Teacher Action Plan
            </h3>
            {classStory.actionPlan.map((step, idx) => (
              <div
                key={idx}
                className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                        step.priority === "HIGH"
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                          : step.priority === "MEDIUM"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {step.priority}
                    </span>
                    <p className="text-main text-sm font-bold">{step.title}</p>
                  </div>
                  <p className="text-muted mt-1 text-xs">{step.detail}</p>
                </div>
                {step.targetSubject && (
                  <button
                    type="button"
                    onClick={() => onInspectSubject(step.targetSubject!)}
                    className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700/70 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950/90"
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
          <h2
            data-record="true"
            className="text-main mb-2 flex items-center gap-2 text-base font-bold sm:text-lg"
          >
            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Borderline Cohort (42%–54%): Highest Coaching ROI
          </h2>
          <p className="text-muted mb-4 text-xs">
            Students sitting right near the 50% pass threshold and their lowest subjects.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {borderlineStudents.slice(0, 6).map((stu) => (
              <div
                key={stu.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-800/70 dark:bg-amber-950/40"
              >
                <div className="min-w-0">
                  <p className="text-main truncate text-sm font-bold">{stu.name}</p>
                  <p className="text-muted truncate text-xs">
                    Focus: {stu.weakestSubjects.map((w) => `${w.name} (${w.score})`).join(", ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                  {stu.averageScore}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SBA vs Exam Discrepancy Spotlight */}
      {sbaVsExam.available &&
        (sbaVsExam.examUnderperformers.length > 0 || sbaVsExam.lowClassworkStudents.length > 0) && (
          <Card>
            <h2
              data-record="true"
              className="text-main mb-2 flex items-center gap-2 text-base font-bold sm:text-lg"
            >
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              SBA Classwork vs. Exam Discrepancy Spotlight
            </h2>
            <p className="text-muted mb-4 text-xs">
              Detects students whose classwork performance differs sharply (18+ pts) from their exam
              scores.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sbaVsExam.examUnderperformers.length > 0 && (
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5 dark:border-purple-800/70 dark:bg-purple-950/40">
                  <p className="mb-2 text-xs font-bold text-purple-900 uppercase dark:text-purple-200">
                    Strong SBA, Low Exam (Exam Technique / Anxiety)
                  </p>
                  <div className="space-y-2">
                    {sbaVsExam.examUnderperformers.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="bg-surface flex items-center justify-between rounded px-2.5 py-1.5 text-xs"
                      >
                        <span className="text-main font-bold">{item.name}</span>
                        <span className="font-mono text-purple-700 dark:text-purple-300">
                          SBA {item.sbaPercent}% vs Exam {item.examPercent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sbaVsExam.lowClassworkStudents.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-800/70 dark:bg-blue-950/40">
                  <p className="mb-2 text-xs font-bold text-blue-900 uppercase dark:text-blue-200">
                    Low SBA, Strong Exam (Missing Classwork)
                  </p>
                  <div className="space-y-2">
                    {sbaVsExam.lowClassworkStudents.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="bg-surface flex items-center justify-between rounded px-2.5 py-1.5 text-xs"
                      >
                        <span className="text-main font-bold">{item.name}</span>
                        <span className="font-mono text-blue-700 dark:text-blue-300">
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
            <h2
              data-record="true"
              className="text-main flex items-center gap-2 text-base font-bold sm:text-lg"
            >
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              Students Requiring Immediate Attention
            </h2>
            <button
              type="button"
              onClick={onReviewStudents}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/80"
              data-record="true"
            >
              Review Students
            </button>
          </div>
          <p data-record="true" className="text-muted mb-4 text-sm">
            Students identified based on low performance, poor attendance, or multiple failed
            subjects. Prioritized by risk level.
          </p>
          <div className="space-y-3">
            {atRiskStudents.slice(0, 10).map((student) => (
              <div
                key={student.id}
                className="rounded-lg border-l-4 border-red-500 bg-red-50/50 p-4 transition-all hover:bg-red-50 dark:bg-red-950/35 dark:hover:bg-red-950/55"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-main text-sm font-bold">{student.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {student.riskFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="inline-block rounded-full bg-red-200 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/70 dark:text-red-200"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-muted text-xs">Average</p>
                    <p className="text-lg font-black text-red-600 dark:text-red-400">
                      {student.averageScore}%
                    </p>
                    <p className="text-muted text-xs">
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
        <h2
          data-record="true"
          className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg"
        >
          <Brain className="h-5 w-5" />
          Performance Distribution Analysis
        </h2>
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-4 text-center dark:border dark:border-emerald-800/70 dark:bg-emerald-950/50">
            <p
              data-record="true"
              className="text-xs font-bold text-green-700 uppercase dark:text-emerald-300"
            >
              Top 25%
            </p>
            <p className="mt-2 text-2xl font-black text-green-900 dark:text-emerald-200">
              {performanceQuartiles.q3}%+
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center dark:border dark:border-blue-800/70 dark:bg-blue-950/50">
            <p
              data-record="true"
              className="text-xs font-bold text-blue-700 uppercase dark:text-blue-300"
            >
              Median
            </p>
            <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
              {performanceQuartiles.q2}%
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-center dark:border dark:border-amber-800/70 dark:bg-amber-950/50">
            <p
              data-record="true"
              className="text-xs font-bold text-amber-700 uppercase dark:text-amber-300"
            >
              Bottom 25%
            </p>
            <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
              {performanceQuartiles.q1}%
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center dark:border dark:border-purple-800/70 dark:bg-purple-950/50">
            <p
              data-record="true"
              className="text-xs font-bold text-purple-700 uppercase dark:text-purple-300"
            >
              Top Quartile
            </p>
            <p className="mt-2 text-2xl font-black text-purple-900 dark:text-purple-200">
              {performanceQuartiles.q4Count}
            </p>
          </div>
        </div>

        {/* Struggling Students */}
        {performanceQuartiles.strugglingStudents.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/70 dark:bg-amber-950/35">
            <h3
              data-record="true"
              className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="h-4 w-4" />
              Students Needing Support
            </h3>
            <div className="space-y-2">
              {performanceQuartiles.strugglingStudents.map((student) => (
                <div
                  key={student.id}
                  className="bg-surface flex items-center justify-between rounded-lg p-2"
                >
                  <div>
                    <p className="text-main text-sm font-bold">{student.name}</p>
                    <p className="text-muted text-xs">{student.gender || "N/A"}</p>
                  </div>
                  <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-900 dark:bg-amber-900/70 dark:text-amber-200">
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
        <h2
          data-record="true"
          className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg"
        >
          <Activity className="h-5 w-5" />
          Attendance &amp; Performance Correlation
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4 dark:border dark:border-emerald-800/70 dark:bg-emerald-950/50">
            <p
              data-record="true"
              className="text-xs font-bold text-green-700 uppercase dark:text-emerald-300"
            >
              Perfect Attendance
            </p>
            <p className="mt-2 text-2xl font-black text-green-900 dark:text-emerald-200">
              {attendanceInsights.perfectAttendance}
            </p>
            <p data-record="true" className="mt-1 text-xs text-green-600 dark:text-emerald-400">
              students
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 dark:border dark:border-red-800/70 dark:bg-red-950/50">
            <p
              data-record="true"
              className="text-xs font-bold text-red-700 uppercase dark:text-red-300"
            >
              Poor Attendance
            </p>
            <p className="mt-2 text-2xl font-black text-red-900 dark:text-red-200">
              {attendanceInsights.poorAttendance}
            </p>
            <p data-record="true" className="mt-1 text-xs text-red-600 dark:text-red-400">
              students &lt;70%
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 dark:border dark:border-blue-800/70 dark:bg-blue-950/50">
            <p
              data-record="true"
              className="text-xs font-bold text-blue-700 uppercase dark:text-blue-300"
            >
              Correlation
            </p>
            <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
              {attendanceInsights.correlationWithPerformance === "positive"
                ? "Positive ↑"
                : attendanceInsights.correlationWithPerformance === "negative"
                  ? "Negative ↓"
                  : "Neutral →"}
            </p>
            <p data-record="true" className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              Pearson r = {attendanceInsights.correlationCoefficient}
            </p>
          </div>
        </div>
        {attendanceInsights.correlationWithPerformance === "positive" && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:border dark:border-blue-800/70 dark:bg-blue-950/50">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Insight:</strong> Better attendance correlates with higher scores. Encourage
              regular attendance for improved performance.
            </p>
          </div>
        )}
      </Card>

      {/* Key Recommendations */}
      <div className="rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-purple-50 p-6 shadow-sm dark:border-blue-800/70 dark:from-blue-950/50 dark:to-purple-950/50">
        <h2
          data-record="true"
          className="text-main mb-4 flex items-center gap-2 text-lg font-bold"
        >
          <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          AI-Powered Recommendations
        </h2>
        <div className="space-y-3">
          {classMetrics.passRate < 70 && (
            <div className="bg-surface border-border rounded-lg border p-4 shadow-sm">
              <p className="mb-1 text-sm font-bold text-red-600 dark:text-red-400">
                ⚠️ Low Pass Rate
              </p>
              <p className="text-secondary text-sm">
                Only {classMetrics.passRate}% of students are passing. Consider additional tutoring
                sessions and remedial classes.
              </p>
            </div>
          )}
          {subjectInsights.needsAttention.length > 0 && (
            <div className="bg-surface border-border rounded-lg border p-4 shadow-sm">
              <p className="mb-1 text-sm font-bold text-amber-700 dark:text-amber-400">
                📚 Subjects Need Attention
              </p>
              <p className="text-secondary text-sm">
                Focus on {subjectInsights.needsAttention.map((s) => s.subjectName).join(", ")} -
                these subjects have pass rates below 60%.
              </p>
            </div>
          )}
          {genderAnalysis.maleAverage > genderAnalysis.femaleAverage + 5 && (
            <div className="bg-surface border-border rounded-lg border p-4 shadow-sm">
              <p className="mb-1 text-sm font-bold text-purple-600 dark:text-purple-400">
                ⚖️ Gender Performance Gap
              </p>
              <p className="text-secondary text-sm">
                Male students are outperforming female students by{" "}
                {(genderAnalysis.maleAverage - genderAnalysis.femaleAverage).toFixed(1)}%. Consider
                targeted support for female students.
              </p>
            </div>
          )}
          {genderAnalysis.femaleAverage > genderAnalysis.maleAverage + 5 && (
            <div className="bg-surface border-border rounded-lg border p-4 shadow-sm">
              <p className="mb-1 text-sm font-bold text-purple-600 dark:text-purple-400">
                ⚖️ Gender Performance Gap
              </p>
              <p className="text-secondary text-sm">
                Female students are outperforming male students by{" "}
                {(genderAnalysis.femaleAverage - genderAnalysis.maleAverage).toFixed(1)}%. Consider
                targeted support for male students.
              </p>
            </div>
          )}
          {classMetrics.excellenceRate > 30 && (
            <div className="bg-surface border-border rounded-lg border p-4 shadow-sm">
              <p className="mb-1 text-sm font-bold text-green-600 dark:text-emerald-400">
                🌟 Excellence Rate
              </p>
              <p className="text-secondary text-sm">
                Excellent work! {classMetrics.excellenceRate}% of students are scoring 80%+. Continue
                current teaching strategies.
              </p>
            </div>
          )}
          {performanceQuartiles.strugglingStudents.length > 5 && (
            <div className="bg-surface border-border rounded-lg border p-4 shadow-sm">
              <p className="mb-1 text-sm font-bold text-red-600 dark:text-red-400">
                👥 Struggling Students
              </p>
              <p className="text-secondary text-sm">
                {performanceQuartiles.strugglingStudents.length} students are in the bottom
                quartile. Implement one-on-one interventions.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
