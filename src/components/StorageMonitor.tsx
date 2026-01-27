import { useState } from "react";
import { HardDrive, Trash2, Database } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { ConfirmModal } from "./ConfirmModal";
import { getStorageType } from "../utils/idbStorage";

/**
 * Storage info card for Settings page
 * Shows storage type and cleanup options
 */
export function StorageMonitor() {
  const { students, removeAllStudentPhotos } = useSchoolData();
  const [showClearPhotosConfirm, setShowClearPhotosConfirm] = useState(false);

  const storageType = getStorageType();
  const studentsWithPhotos = students.filter((s) => s.pictureUrl).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">Storage Information</h3>
        <Database className="h-5 w-5 text-blue-600" />
      </div>

      {/* Storage Type */}
      <div className="mb-4 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {storageType === "indexeddb" ? "IndexedDB" : "LocalStorage"}
            </p>
            <p className="text-xs text-blue-700">
              {storageType === "indexeddb"
                ? "✅ Using IndexedDB - 50MB+ capacity"
                : "⚠️ Fallback mode - Limited to 5-10MB"}
            </p>
          </div>
        </div>
      </div>

      {/* Student Photos Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Current Usage</h4>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Students with Photos</span>
          <span className="font-medium text-gray-900">{studentsWithPhotos}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Students</span>
          <span className="font-medium text-gray-900">{students.length}</span>
        </div>
      </div>

      {/* Cleanup Action */}
      {studentsWithPhotos > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowClearPhotosConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200"
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
