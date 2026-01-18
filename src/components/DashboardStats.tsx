import { Users, Clock, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import type { ProcessedStudent } from "../types";

interface Props {
  students: ProcessedStudent[];
}

export function DashboardStats({ students }: Props) {
  const stats = useMemo(() => {
    const total = students.length;

    // 1. Calculate Pending (Exact same logic as the Filter)
    const pendingStudents = students.filter((s) => {
      const hasMissingSubjects = s.subjects.length === 0;
      const hasIncompleteScores = s.subjects.some(
        (sub) => sub.classScore === 0 || sub.examScore === 0,
      );
      return hasMissingSubjects || hasIncompleteScores;
    });

    // 2. Calculate Completed Students (The inverse of Pending)
    const completedStudents = students.filter((s) => !pendingStudents.includes(s));

    // 3. Calculate Failing (Only count students who have actually been graded)
    const failingCount = completedStudents.filter((s) => s.averageScore < 50).length;

    // 4. Calculate Pass Rate (Percentage of COMPLETED students who passed)
    const passCount = completedStudents.length - failingCount;
    const passRate =
      completedStudents.length > 0 ? Math.round((passCount / completedStudents.length) * 100) : 0;

    // 5. Calculate Overall Class Average (Excluding pending students)
    const totalAverage = completedStudents.reduce((acc, s) => acc + s.averageScore, 0);
    const classAverage =
      completedStudents.length > 0 ? Math.round(totalAverage / completedStudents.length) : 0;

    return {
      total,
      pending: pendingStudents.length,
      failing: failingCount,
      passRate,
      classAverage,
    };
  }, [students]);

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {/* CARD 1: TOTAL STUDENTS */}
      <StatCard
        label="Total Students"
        value={stats.total}
        icon={<Users className="text-primary h-5 w-5" />}
        colorClass="bg-blue-50/50 border-blue-100"
      />

      {/* CARD 2: PENDING ENTRY (Actionable) */}
      <StatCard
        label="Pending Entry"
        value={stats.pending}
        icon={<Clock className="h-5 w-5 text-orange-600" />}
        colorClass="bg-orange-50/50 border-orange-100"
        alert={stats.pending > 0}
      />

      {/* CARD 3: CLASS AVERAGE (Performance) */}
      <StatCard
        label="Class Average"
        value={`${stats.classAverage}%`}
        icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
        colorClass="bg-purple-50/50 border-purple-100"
      />

      {/* CARD 4: PASS RATE (Success Metric) */}
      <StatCard
        label="Pass Rate"
        value={`${stats.passRate}%`}
        icon={
          stats.passRate >= 50 ? (
            <TrendingUp className="text-success h-5 w-5" />
          ) : (
            <AlertTriangle className="text-danger h-5 w-5" />
          )
        }
        colorClass={
          stats.passRate >= 50 ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
        }
      />
    </div>
  );
}

// Sub-component for clean UI
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  alert?: boolean;
}

function StatCard({ label, value, icon, colorClass, alert }: StatCardProps) {
  return (
    <div
      className={`group flex items-center justify-between rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${colorClass}`}
    >
      <div className="flex-1">
        <p className="text-muted text-xs font-bold tracking-wide uppercase">{label}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <h3 className="text-main text-2xl font-black">{value}</h3>
          {alert && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
            </span>
          )}
        </div>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white shadow-sm transition-transform group-hover:scale-105">
        {icon}
      </div>
    </div>
  );
}
