import { AlertTriangle } from "lucide-react";
import { useSettingsForm } from "../../hooks/useSettingsForm";

export function SettingsStatusBanners() {
  const { isPersistenceSuspended } = useSettingsForm();

  if (!isPersistenceSuspended) {
    return null;
  }

  return (
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
  );
}
