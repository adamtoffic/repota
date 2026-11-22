import { Users, Clock, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import type { ProcessedStudent, SchoolSettings } from "../types";
import { type DashboardFilter, isStudentPending } from "../utils/studentValidation";

interface Props {
  students: ProcessedStudent[];
  settings: SchoolSettings;
  activeFilter?: DashboardFilter;
  onFilterChange?: (filter: DashboardFilter) => void;
}

export function DashboardStats({ students, settings, activeFilter, onFilterChange }: Props) {
  const stats = useMemo(() => {
    const total = students.length;
    const classSize = settings.classSize || 0;
    const isOverCapacity = classSize > 0 && total > classSize;

    // 1. Calculate Pending (Shared predicate matching Dashboard filter)
    const pendingStudents = students.filter((s) => isStudentPending(s, settings));

    // 2. Calculate Completed Students (The inverse of Pending)
    const pendingSet = new Set(pendingStudents);
    const completedStudents = students.filter((s) => !pendingSet.has(s));

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
      classSize,
      isOverCapacity,
      pending: pendingStudents.length,
      failing: failingCount,
      passRate,
      classAverage,
    };
  }, [students, settings]);

  return (
    <>
      {/* OVER CAPACITY WARNING BANNER */}
      {stats.isOverCapacity && (
        <div className="animate-slide-in-down mb-4 flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-800/70 dark:bg-red-950/50">
          <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/60">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-bold text-red-900 dark:text-red-200">
              <span data-record="true">Class Over Capacity</span> ({stats.total} / {stats.classSize})
            </h3>
            <p className="text-xs leading-relaxed text-red-700 dark:text-red-300">
              You have {stats.total - stats.classSize} more student
              {stats.total - stats.classSize > 1 ? "s" : ""}{" "}
              <span data-record="true">
                than your set class size. Consider updating the class size in Settings or reviewing your enrollment.
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 xl:grid-cols-4">
        {/* CARD 1: TOTAL STUDENTS (with Class Size Alert) */}
        <StatCard
          label="Total Students"
          value={stats.classSize > 0 ? `${stats.total} / ${stats.classSize}` : stats.total}
          icon={
            <Users
              className={
                stats.isOverCapacity
                  ? "h-5 w-5 text-red-600 dark:text-red-400"
                  : "text-primary-text h-5 w-5"
              }
            />
          }
          colorClass={
            stats.isOverCapacity
              ? "bg-red-50/70 border-red-300 ring-1 ring-red-200 dark:bg-red-950/35 dark:border-red-500/45 dark:ring-red-500/30"
              : "bg-blue-50/50 border-blue-100 dark:bg-surface dark:border-border dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          }
          iconWellClass={
            stats.isOverCapacity
              ? "bg-red-100/80 border-red-200 dark:bg-red-500/15 dark:border-red-500/25"
              : "bg-surface/80 border-border/60 dark:bg-blue-500/12 dark:border-blue-500/20"
          }
          alert={stats.isOverCapacity}
          alertColor="red"
        />

        {/* CARD 2: PENDING ENTRY (Actionable) */}
        <StatCard
          label="Pending Entry"
          value={stats.pending}
          icon={<Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          colorClass="bg-orange-50/50 border-orange-100 dark:bg-surface dark:border-border dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          iconWellClass="bg-surface/80 border-border/60 dark:bg-orange-500/12 dark:border-orange-500/20"
          alert={stats.pending > 0}
          alertColor="orange"
          isActive={activeFilter === "PENDING"}
          onClick={
            onFilterChange && stats.pending > 0
              ? () => onFilterChange(activeFilter === "PENDING" ? "ALL" : "PENDING")
              : undefined
          }
        />

        {/* CARD 3: CLASS AVERAGE (Performance) */}
        <StatCard
          label="Class Average"
          value={`${stats.classAverage}%`}
          icon={<BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
          colorClass="bg-purple-50/50 border-purple-100 dark:bg-surface dark:border-border dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          iconWellClass="bg-surface/80 border-border/60 dark:bg-purple-500/12 dark:border-purple-500/20"
        />

        {/* CARD 4: PASS RATE (Success Metric / Actionable Failing Filter) */}
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
            stats.passRate >= 50
              ? "bg-green-50/50 border-green-100 dark:bg-surface dark:border-border dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              : "bg-red-50/50 border-red-100 dark:bg-red-950/30 dark:border-red-500/40"
          }
          iconWellClass={
            stats.passRate >= 50
              ? "bg-surface/80 border-border/60 dark:bg-emerald-500/12 dark:border-emerald-500/20"
              : "bg-red-100/80 border-red-200 dark:bg-red-500/15 dark:border-red-500/25"
          }
          alert={stats.failing > 0}
          alertColor="red"
          isActive={activeFilter === "FAILING"}
          onClick={
            onFilterChange && stats.failing > 0
              ? () => onFilterChange(activeFilter === "FAILING" ? "ALL" : "FAILING")
              : undefined
          }
        />
      </div>
    </>
  );
}

// Sub-component for clean UI
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  iconWellClass?: string;
  alert?: boolean;
  alertColor?: "orange" | "red";
  isActive?: boolean;
  onClick?: () => void;
}

function StatCard({
  label,
  value,
  icon,
  colorClass,
  iconWellClass = "bg-surface/80 border-border/60",
  alert,
  alertColor = "orange",
  isActive = false,
  onClick,
}: StatCardProps) {
  const alertColors = {
    orange: {
      ping: "bg-orange-400",
      dot: "bg-orange-500",
    },
    red: {
      ping: "bg-red-400",
      dot: "bg-red-500",
    },
  };

  const colors = alertColors[alertColor];
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-muted text-[11px] font-bold tracking-wide uppercase sm:text-xs" data-record="true">
          {label}
        </p>
        <div className="mt-1 flex items-center gap-2 sm:mt-1.5">
          <h3 className="text-main text-xl font-black tabular-nums sm:text-2xl">{value}</h3>
          {alert && (
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colors.ping}`}
              ></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${colors.dot}`}></span>
            </span>
          )}
        </div>
      </div>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border sm:h-12 sm:w-12 ${iconWellClass}`}
      >
        {icon}
      </div>
    </>
  );

  if (onClick) {
    const hoverRingClass =
      alertColor === "red" ? "hover:ring-red-300" : "hover:ring-orange-300";
    const activeRingClass =
      alertColor === "red" ? "ring-2 ring-red-500" : "ring-2 ring-orange-500";
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isActive}
        className={`animate-fade-in flex w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left shadow-sm transition-all hover:ring-2 active:scale-[0.99] sm:p-4 ${hoverRingClass} ${
          isActive ? activeRingClass : ""
        } ${colorClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`animate-fade-in flex items-center justify-between rounded-xl border p-3 shadow-sm sm:p-4 ${colorClass}`}
    >
      {content}
    </div>
  );
}
