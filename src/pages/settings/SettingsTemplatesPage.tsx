import { SettingsSubPageLayout } from "./SettingsSubPageLayout";
import { ReportTemplateSection } from "../../components/settings/ReportTemplateSection";

export function SettingsTemplatesPage() {
  return (
    <SettingsSubPageLayout
      title="Report Style"
      subtitle="Select the visual layout used when printing student report cards."
    >
      <ReportTemplateSection />
    </SettingsSubPageLayout>
  );
}

export default SettingsTemplatesPage;
