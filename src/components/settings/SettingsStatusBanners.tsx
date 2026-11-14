import { AlertCircle, AlertTriangle } from "lucide-react";
import { useSettingsForm } from "../../hooks/useSettingsForm";

export function SettingsStatusBanners() {
  const { isPersistenceSuspended } = useSettingsForm();

  return (
    <>
      {isPersistenceSuspended && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">
              Persistence is suspended due to an incomplete recovery or storage error.
            </p>
            <p className="mt-1 text-xs text-red-700">
              Settings modifications are disabled to protect data integrity. Please restore a valid
              backup below or reload the page.
            </p>
          </div>
        </div>
      )}

      {/* Auto-Save Info */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div>
          <p className="font-medium">
            Settings auto-save as you type{" "}
            <span className="hidden sm:inline">• No need to scroll for a save button</span>
          </p>
        </div>
      </div>
    </>
  );
}
