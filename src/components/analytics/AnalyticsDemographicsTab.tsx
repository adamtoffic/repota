import { Activity, Users } from "lucide-react";
import type {
  DemographicBreakdown,
  GenderAnalysis,
  calculateAttendanceByGender,
  calculateAttendanceInsights,
  calculatePerformanceByAge,
} from "../../utils/analyticsCalculator";
import { BarChart } from "../charts/BarChart";
import { ComposedChart } from "../charts/ComposedChart";
import { Card } from "../ui/Card";
import { ChartCard } from "./ChartCard";
import { StatCard } from "./StatCard";

interface AnalyticsDemographicsTabProps {
  genderAnalysis: GenderAnalysis;
  attendanceInsights: ReturnType<typeof calculateAttendanceInsights>;
  totalAttendanceDays?: number;
  attendanceByGender: ReturnType<typeof calculateAttendanceByGender>;
  performanceByAge: ReturnType<typeof calculatePerformanceByAge>;
  ageDistribution: DemographicBreakdown[];
}

export function AnalyticsDemographicsTab({
  genderAnalysis,
  attendanceInsights,
  totalAttendanceDays,
  attendanceByGender,
  performanceByAge,
  ageDistribution,
}: AnalyticsDemographicsTabProps) {
  return (
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
          subtitle={`of ${totalAttendanceDays || "N/A"} days`}
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
            <div className="border-border mt-4 flex justify-around border-t pt-4">
              <div className="text-center">
                <p data-record="true" className="text-muted text-xs">
                  Male Avg Rate
                </p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {attendanceByGender.maleAttendanceRate}%
                </p>
              </div>
              <div className="text-center">
                <p data-record="true" className="text-muted text-xs">
                  Female Avg Rate
                </p>
                <p className="text-lg font-black text-pink-600 dark:text-pink-400">
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
              <div className="border-border mt-4 border-t pt-3">
                <p className="text-muted text-center text-xs">
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
          <h3 data-record="true" className="text-main mb-4 text-base font-bold sm:text-lg">
            Gender Breakdown by Age
          </h3>
          <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg">
            <table className="w-full min-w-100">
              <thead className="bg-subtle">
                <tr className="border-border border-b">
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
                  <tr
                    key={index}
                    className="border-border hover:bg-subtle/60 border-b transition-colors"
                  >
                    <td className="text-main px-4 py-2 text-sm font-bold sm:py-3">
                      {item.category}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-blue-600 sm:py-3 dark:text-blue-400">
                      {item.male}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-pink-600 sm:py-3 dark:text-pink-400">
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
  );
}
