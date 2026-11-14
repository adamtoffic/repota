import { SettingsFormProvider } from "../context/SettingsFormContext";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { ScrollButton } from "../components/ScrollButton";
import { PageHeader } from "../components/ui/PageHeader";
import { SettingsStatusBanners } from "../components/settings/SettingsStatusBanners";
import { SettingsHeaderActions } from "../components/settings/SettingsHeaderActions";
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
  const { formData, committedSchoolName } = useSettingsForm();

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader schoolName={committedSchoolName} actions={<SettingsHeaderActions />} />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        <SettingsStatusBanners />
        <SchoolIdentitySection />
        <AcademicSessionSection />
        <SbaAssessmentSection />
        <ReportTemplateSection />
        <SecurityBackupSection />
      </main>

      {((formData.defaultSubjects?.length ?? 0) >= 8 ||
        (formData.componentLibrary?.length ?? 0) >= 3) && <ScrollButton />}
    </div>
  );
}

export default Settings;
