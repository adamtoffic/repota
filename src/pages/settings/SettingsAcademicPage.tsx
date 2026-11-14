import { SettingsSubPageLayout } from "./SettingsSubPageLayout";
import { AcademicSessionSection } from "../../components/settings/AcademicSessionSection";
import { ScrollButton } from "../../components/ScrollButton";
import { useSettingsForm } from "../../hooks/useSettingsForm";

export function SettingsAcademicPage() {
  return (
    <SettingsSubPageLayout
      title="Class & Subjects"
      subtitle="Configure school level, class details, term dates, exam mode, and subjects."
    >
      <AcademicContent />
    </SettingsSubPageLayout>
  );
}

function AcademicContent() {
  const { formData } = useSettingsForm();
  return (
    <>
      <AcademicSessionSection />
      {(formData.defaultSubjects?.length ?? 0) >= 8 && <ScrollButton />}
    </>
  );
}

export default SettingsAcademicPage;
