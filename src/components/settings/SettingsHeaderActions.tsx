import { Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useSettingsForm } from "../../hooks/useSettingsForm";

interface SettingsHeaderActionsProps {
  backTo?: string;
  backLabel?: string;
  showBack?: boolean;
}

export function SettingsHeaderActions({
  backTo = "/",
  backLabel = "Back",
  showBack = true,
}: SettingsHeaderActionsProps) {
  const { hasUnsavedChanges, isPersistenceSuspended, openResetModal, handleResetMouseDown } =
    useSettingsForm();

  return (
    <div className="flex items-center gap-2">
      {hasUnsavedChanges && (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-2 py-2 sm:hidden">
            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500"></span>
          </div>
          <button
            disabled={isPersistenceSuspended}
            onClick={openResetModal}
            onMouseDown={handleResetMouseDown}
            className="hidden items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 transition-all hover:bg-orange-100 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:flex"
            title="Discard unsaved changes"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </>
      )}
      {showBack && (
        <Link
          to={backTo}
          className="bg-background text-muted flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-all hover:bg-gray-100 active:scale-95 sm:px-4"
        >
          <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden text-sm font-medium sm:inline">{backLabel}</span>
        </Link>
      )}
    </div>
  );
}
