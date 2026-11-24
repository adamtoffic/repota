import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SettingsFormProvider } from "../context/SettingsFormContext";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { ScrollButton } from "../components/ScrollButton";
import { PageHeader } from "../components/ui/PageHeader";
import { SettingsStatusBanners } from "../components/settings/SettingsStatusBanners";
import { SchoolIdentitySection } from "../components/settings/SchoolIdentitySection";
import { AcademicSessionSection } from "../components/settings/AcademicSessionSection";
import { SbaAssessmentSection } from "../components/settings/SbaAssessmentSection";
import { ReportTemplateSection } from "../components/settings/ReportTemplateSection";
import { SecurityBackupSection } from "../components/settings/SecurityBackupSection";

export function Settings() {
  return (
    <SettingsFormProvider>
      <SettingsContent />
    </SettingsFormProvider>
  );
}

function SettingsContent() {
  const { formData, committedSchoolName, isSaving, lastSaved } = useSettingsForm();

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader
        schoolName={committedSchoolName}
        actions={
          <Link
            to="/"
            className="bg-background text-muted border-border hover:bg-subtle flex items-center justify-center gap-2 rounded-lg border px-3 py-2 transition-all active:scale-95 sm:px-4"
          >
            <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden text-sm font-medium sm:inline">Back</span>
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
        <SettingsStatusBanners />
        <SchoolIdentitySection />
        <AcademicSessionSection />
        <SbaAssessmentSection />
        <ReportTemplateSection />
        <SecurityBackupSection />
      </main>

      {((formData.defaultSubjects?.length ?? 0) >= 8 ||
        (formData.componentLibrary?.length ?? 0) >= 3) && <ScrollButton />}

      <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
    </div>
  );
}

export default Settings;
