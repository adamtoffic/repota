import { useState } from "react";
import { HardDrive, Trash2, Database } from "lucide-react";
import { useSchoolActions, useSchoolStudents } from "../hooks/useSchoolData";
import { ConfirmModal } from "./ConfirmModal";
import { getStorageType } from "../utils/idbStorage";

/**
 * Storage info card for Settings page
 * Shows storage type and cleanup options
 */
export function StorageMonitor() {
  const students = useSchoolStudents();
  const { removeAllStudentPhotos } = useSchoolActions();
  const [showClearPhotosConfirm, setShowClearPhotosConfirm] = useState(false);

  const storageType = getStorageType();
  const studentsWithPhotos = students.filter((s) => s.pictureUrl).length;

  return (
    <div className="border-border bg-surface rounded-xl border p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-main text-lg font-bold">Storage Information</h3>
        <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Storage Type */}
      <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:border dark:border-blue-800/70 dark:bg-blue-950/45">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              {storageType === "indexeddb"
                ? "Device Storage (Offline-First)"
                : "Limited Storage Mode"}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {storageType === "indexeddb"
                ? "✅ All data stays on your device • Works offline • 50MB+ capacity"
                : "⚠️ Using fallback storage • Limited capacity • Consider using Chrome/Edge"}
            </p>
          </div>
        </div>
      </div>

      {/* Student Photos Info */}
      <div className="space-y-3">
        <h4 className="text-secondary text-sm font-semibold">Current Usage</h4>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Students with Photos</span>
          <span className="text-main font-medium">{studentsWithPhotos}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Total Students</span>
          <span className="text-main font-medium">{students.length}</span>
        </div>
      </div>

      {/* Cleanup Action */}
      {studentsWithPhotos > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowClearPhotosConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200 dark:border dark:border-red-800/70 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950/90"
          >
            <Trash2 className="h-4 w-4" />
            Remove All Student Photos ({studentsWithPhotos})
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearPhotosConfirm}
        onClose={() => setShowClearPhotosConfirm(false)}
        onConfirm={() => {
          removeAllStudentPhotos();
          setShowClearPhotosConfirm(false);
        }}
        title="Remove All Student Photos?"
        message={`This will remove ${studentsWithPhotos} student photos. This action cannot be undone.`}
        confirmText="Remove Photos"
        isDangerous={true}
      />
    </div>
  );
}
