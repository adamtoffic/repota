import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, FileText, Image, X } from "lucide-react";
import type { SchoolSettings, StudentRecord } from "../types";
import {
  type DashboardFilter,
  hasMissingPhoto,
  hasNoScoresEntered,
  hasPartialScores,
} from "../utils/studentValidation";

const PHOTO_WARNING_DISMISSED_KEY = "repota_dismiss_photo_warning";

interface ValidationWarningsProps {
  students: StudentRecord[];
  settings: SchoolSettings;
  activeFilter?: DashboardFilter;
  onFilterChange?: (filter: DashboardFilter) => void;
  onReviewPending?: () => void;
}

export function ValidationWarnings({
  students,
  settings,
  activeFilter = "ALL",
  onFilterChange,
  onReviewPending,
}: ValidationWarningsProps) {
  const [photoWarningDismissed, setPhotoWarningDismissed] = useState(
    () => sessionStorage.getItem(PHOTO_WARNING_DISMISSED_KEY) === "true",
  );

  // Calculate validation issues using shared dashboard predicates
  const { studentsWithNoScores, studentsWithMissingPhotos, studentsWithIncompleteScores } =
    useMemo(
      () => ({
        studentsWithNoScores: students.filter(hasNoScoresEntered),
        studentsWithMissingPhotos: students.filter(hasMissingPhoto),
        studentsWithIncompleteScores: students.filter((student) =>
          hasPartialScores(student, settings),
        ),
      }),
      [students, settings],
    );

  const warnings: Array<{
    key: DashboardFilter;
    icon: typeof FileText;
    color: "red" | "yellow" | "orange";
    message: string;
    subtitle?: string;
    dismissible?: boolean;
  }> = [];

  if (studentsWithNoScores.length > 0) {
    warnings.push({
      key: "NO_SCORES",
      icon: FileText,
      color: "red",
      message: `${studentsWithNoScores.length} student${studentsWithNoScores.length === 1 ? "" : "s"} ${studentsWithNoScores.length === 1 ? "has" : "have"} no scores entered`,
      subtitle: "Please enter scores before generating report cards.",
    });
  }

  if (
    studentsWithMissingPhotos.length > 0 &&
    (!photoWarningDismissed || activeFilter === "MISSING_PHOTOS")
  ) {
    warnings.push({
      key: "MISSING_PHOTOS",
      icon: Image,
      color: "yellow",
      message: `${studentsWithMissingPhotos.length} student${studentsWithMissingPhotos.length === 1 ? "" : "s"} missing photo${studentsWithMissingPhotos.length === 1 ? "" : "s"}`,
      dismissible: true,
    });
  }

  if (studentsWithIncompleteScores.length > 0) {
    warnings.push({
      key: "PARTIAL_SCORES",
      icon: AlertCircle,
      color: "orange",
      message: `${studentsWithIncompleteScores.length} student${studentsWithIncompleteScores.length === 1 ? "" : "s"} with incomplete scores`,
    });
  }

  if (warnings.length === 0) return null;

  const handleWarningClick = (filterKey: DashboardFilter) => {
    if (onFilterChange) {
      onFilterChange(activeFilter === filterKey ? "ALL" : filterKey);
      return;
    }
    if (filterKey !== "MISSING_PHOTOS") {
      onReviewPending?.();
    }
  };

  const handleDismissPhotoWarning = () => {
    sessionStorage.setItem(PHOTO_WARNING_DISMISSED_KEY, "true");
    setPhotoWarningDismissed(true);
    if (activeFilter === "MISSING_PHOTOS") {
      onFilterChange?.("ALL");
    }
  };

  return (
    <div className="mb-4 space-y-2">
      {warnings.map((warning) => {
        const Icon = warning.icon;
        const isActive = activeFilter === warning.key;
        const isInteractive =
          Boolean(onFilterChange) || (Boolean(onReviewPending) && warning.key !== "MISSING_PHOTOS");

        const colorStyles =
          warning.color === "red"
            ? {
                card: isActive
                  ? "border-red-400 bg-red-100/80 ring-2 ring-red-400/50"
                  : "border-red-200 bg-red-50 hover:bg-red-100/60",
                text: "text-red-800",
                icon: "text-red-600",
                pill: isActive
                  ? "bg-red-700 text-white"
                  : "bg-red-100 text-red-700 group-hover:bg-red-200",
              }
            : warning.color === "yellow"
              ? {
                  card: isActive
                    ? "border-yellow-400 bg-yellow-100/80 ring-2 ring-yellow-400/50"
                    : "border-yellow-200 bg-yellow-50 hover:bg-yellow-100/60",
                  text: "text-yellow-900",
                  icon: "text-yellow-600",
                  pill: isActive
                    ? "bg-yellow-700 text-white"
                    : "bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200",
                }
              : {
                  card: isActive
                    ? "border-orange-400 bg-orange-100/80 ring-2 ring-orange-400/50"
                    : "border-orange-200 bg-orange-50 hover:bg-orange-100/60",
                  text: "text-orange-800",
                  icon: "text-orange-600",
                  pill: isActive
                    ? "bg-orange-700 text-white"
                    : "bg-orange-100 text-orange-700 group-hover:bg-orange-200",
                };

        return (
          <div
            key={warning.key}
            className={`flex items-stretch overflow-hidden rounded-xl border shadow-xs transition-all ${colorStyles.card}`}
          >
            <button
              type="button"
              onClick={() => isInteractive && handleWarningClick(warning.key)}
              disabled={!isInteractive}
              aria-pressed={isActive}
              className={`group flex flex-1 items-center justify-between gap-3 p-3.5 text-left transition-colors ${
                isInteractive ? "cursor-pointer active:scale-[0.995]" : "cursor-default"
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${colorStyles.icon}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${colorStyles.text}`}>
                    ⚠️ {warning.message}
                  </p>
                  {warning.subtitle && (
                    <p className="text-muted mt-0.5 text-xs" data-record="true">
                      {warning.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {isInteractive && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${colorStyles.pill}`}
                  data-record="true"
                >
                  {isActive ? (
                    <>
                      Filtering • Show all <X className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Filter <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </span>
              )}
            </button>

            {warning.dismissible && (
              <button
                type="button"
                onClick={handleDismissPhotoWarning}
                aria-label="Dismiss missing photos warning"
                title="Dismiss for this session"
                className="flex shrink-0 items-center justify-center border-l border-yellow-200/80 px-3 text-xs font-medium text-yellow-800/80 transition-colors hover:bg-yellow-200/50 hover:text-yellow-950"
                data-record="true"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
