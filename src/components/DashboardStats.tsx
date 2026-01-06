// src/components/DashboardStats.tsx
import { Users, BookOpen, AlertCircle, TrendingUp } from "lucide-react";
import type { ProcessedStudent } from "../types";

interface Props {
  students: ProcessedStudent[];
}

export function DashboardStats({ students }: Props) {
  const totalStudents = students.length;

  // 1. Calculate Class Average
  const classAverage =
    totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + s.averageScore, 0) / totalStudents)
      : 0;

  // 2. Calculate Pass Rate (Students with > 50% Average)
  const passedCount = students.filter((s) => s.averageScore >= 50).length;
  const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;

  // 3. Calculate "Pending" (Students with 0 subjects entered)
  const pendingCount = students.filter((s) => s.subjects.length === 0).length;

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      {/* CARD 1: TOTAL STUDENTS */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-start justify-between">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          {totalStudents > 0 && (
            <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-600">
              +100%
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Total Students</p>
          <h3 className="text-2xl font-bold text-gray-800">{totalStudents}</h3>
        </div>
      </div>

      {/* CARD 2: CLASS AVERAGE */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-start justify-between">
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Class Average</p>
          <h3 className="text-2xl font-bold text-gray-800">{classAverage}%</h3>
        </div>
      </div>

      {/* CARD 3: PASS RATE */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-start justify-between">
          <div className="rounded-lg bg-green-50 p-2 text-green-600">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Pass Rate</p>
          <h3 className="text-2xl font-bold text-gray-800">{passRate}%</h3>
        </div>
      </div>

      {/* CARD 4: PENDING REPORTS (The Action Item) */}
      <div
        className={`flex flex-col justify-between rounded-xl border p-4 shadow-sm ${pendingCount > 0 ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}
      >
        <div className="mb-2 flex items-start justify-between">
          <div
            className={`rounded-lg p-2 ${pendingCount > 0 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"}`}
          >
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
        <div>
          <p
            className={`text-sm font-medium ${pendingCount > 0 ? "text-orange-800" : "text-gray-500"}`}
          >
            Pending Entry
          </p>
          <h3
            className={`text-2xl font-bold ${pendingCount > 0 ? "text-orange-900" : "text-gray-800"}`}
          >
            {pendingCount} <span className="text-opacity-70 text-sm font-normal">Students</span>
          </h3>
        </div>
      </div>
    </div>
  );
}
