import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Calculator, Download, RefreshCw, Upload } from "lucide-react";
import { SettingsFormProvider } from "../context/SettingsFormContext";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { useSchoolData } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import { exportToCSV } from "../utils/export";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui";
import { ScoreImportModal } from "../components/ScoreImportModal";
import { SettingsHeaderActions } from "../components/settings/SettingsHeaderActions";
import { SettingsStatusBanners } from "../components/settings/SettingsStatusBanners";
import { SbaAssessmentSection } from "../components/settings/SbaAssessmentSection";

export function SbaPage() {
  return (
    <SettingsFormProvider>
      <SbaPageContent />
    </SettingsFormProvider>
  );
}

function SbaPageContent() {
  const {
    formData,
    committedSchoolName,
    isPersistenceSuspended,
    flushPendingSave,
    syncCommittedSettings,
  } = useSettingsForm();
  const { students, detectComponentMismatches, syncSubjectComponentsFromSettings } =
    useSchoolData();
  const { showToast } = useToast();
  const [showScoreImport, setShowScoreImport] = useState(false);

  const mismatch = detectComponentMismatches();
  const hasMismatches = mismatch.hasOutdated || mismatch.hasMissing;

  const handleExportScores = () => {
    try {
      exportToCSV(students, `Class_Broadsheet_${new Date().toISOString().split("T")[0]}`);
      showToast("Class scores exported successfully!", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast(
        error instanceof Error ? error.message : "Export failed. Please try again.",
        "error",
      );
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader
        schoolName={committedSchoolName}
        actions={<SettingsHeaderActions showBack={false} />}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-100 p-2.5">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-main text-xl font-bold" data-record="true">
                  SBA &amp; Continuous Assessment
                </h1>
                <p className="text-muted mt-1 text-xs leading-relaxed">
                  Configure class score weights, manage your SBA task library, and assign tasks to
                  subjects.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isPersistenceSuspended}
                onClick={() => {
                  flushPendingSave();
                  setShowScoreImport(true);
                }}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                <span>Import Scores (CSV)</span>
              </Button>
              {students.length > 0 && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant={hasMismatches ? "primary" : "secondary"}
                    disabled={isPersistenceSuspended}
                    onClick={syncSubjectComponentsFromSettings}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Sync Tasks to Students</span>
                    {hasMismatches && (
                      <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                        Outdated
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleExportScores}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Scores (CSV)</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <SettingsStatusBanners />

        {hasMismatches && formData.examType !== "MOCK" && students.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold" data-record="true">
                  Student SBA tasks are out of sync
                </p>
                <p className="mt-0.5 text-xs text-amber-800" data-record="true">
                  Click "Sync Tasks to Students" above so existing student score sheets match your
                  updated subject task configuration.
                </p>
              </div>
            </div>
          </div>
        )}

        {formData.examType === "MOCK" && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Mock Exam mode is currently active</p>
                <p className="mt-0.5 text-xs text-amber-800">
                  Mock Exam mode uses 100% examination scores (0% class score) and hides SBA
                  weights and task creation.
                </p>
              </div>
            </div>
            <Link
              to="/settings/academic"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100"
            >
              Change Exam Type
            </Link>
          </div>
        )}

        <SbaAssessmentSection />
      </main>

      <ScoreImportModal
        isOpen={showScoreImport}
        onClose={() => setShowScoreImport(false)}
        onSettingsUpdated={syncCommittedSettings}
      />
    </div>
  );
}

export default SbaPage;
