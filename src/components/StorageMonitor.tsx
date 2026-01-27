import { useMemo } from "react";
import { HardDrive, AlertTriangle, TrendingUp, Image, Users } from "lucide-react";
import {
  getStorageStats,
  getStorageWarningLevel,
  calculateRemainingCapacity,
  formatBytes,
} from "../utils/storageMonitor";

/**
 * Storage monitoring card for Settings page
 * Shows current usage, warns when approaching limits, provides cleanup suggestions
 */
export function StorageMonitor() {
  const stats = useMemo(() => getStorageStats(), []);
  const warningLevel = useMemo(() => getStorageWarningLevel(), []);
  const capacity = useMemo(() => calculateRemainingCapacity(), []);

  const getWarningColor = () => {
    if (warningLevel === "critical") return "text-red-600 bg-red-50 border-red-200";
    if (warningLevel === "warning") return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getWarningIcon = () => {
    if (warningLevel === "critical") return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (warningLevel === "warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    return <HardDrive className="h-5 w-5 text-green-600" />;
  };

  const getWarningMessage = () => {
    if (warningLevel === "critical")
      return "⚠️ Storage almost full! Please export and clear old data.";
    if (warningLevel === "warning")
      return "Storage usage is high. Consider removing old photos or exporting data.";
    return "Storage is healthy. You have plenty of space.";
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">Storage Usage</h3>
        {getWarningIcon()}
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {stats.usedMB} MB / {stats.totalEstimatedMB} MB
          </span>
          <span className="font-bold text-gray-900">{stats.usagePercent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all ${
              warningLevel === "critical"
                ? "bg-red-500"
                : warningLevel === "warning"
                  ? "bg-amber-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${Math.min(stats.usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Warning Message */}
      <div className={`mb-4 rounded-lg border p-3 text-sm ${getWarningColor()}`}>
        {getWarningMessage()}
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Storage Breakdown</h4>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600">Student Photos</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatBytes(stats.breakdown.studentPhotos)}
            <span className="ml-1 text-xs text-gray-500">({stats.studentsWithPhotos} photos)</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span className="text-gray-600">Student Data</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatBytes(stats.breakdown.students - stats.breakdown.studentPhotos)}
            <span className="ml-1 text-xs text-gray-500">({stats.studentCount} students)</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-green-500" />
            <span className="text-gray-600">Logo & Signatures</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatBytes(stats.breakdown.logoAndSignatures)}
          </span>
        </div>

        {stats.averagePhotoSize > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-gray-600">Avg Photo Size</span>
            </div>
            <span className="font-medium text-gray-900">{stats.averagePhotoSize} KB</span>
          </div>
        )}
      </div>

      {/* Remaining Capacity */}
      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="mb-2 text-xs font-semibold text-gray-600 uppercase">Remaining Capacity</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600">With Photos</p>
            <p className="text-lg font-bold text-gray-900">
              ~{capacity.estimatedStudentsWithPhotos} students
            </p>
          </div>
          <div>
            <p className="text-gray-600">Without Photos</p>
            <p className="text-lg font-bold text-gray-900">
              ~{capacity.estimatedStudentsWithoutPhotos}+ students
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      {warningLevel !== "safe" && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          <p className="mb-1 font-semibold">💡 Storage Tips:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Export old term data and delete students you no longer need</li>
            <li>Remove photos from students who have already graduated</li>
            <li>Compress photos before uploading (already auto-compressed to ~70KB)</li>
            <li>Regular backups let you safely clear old data</li>
          </ul>
        </div>
      )}
    </div>
  );
}
