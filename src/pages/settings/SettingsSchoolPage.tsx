import { SettingsSubPageLayout } from "./SettingsSubPageLayout";
import { SchoolIdentitySection } from "../../components/settings/SchoolIdentitySection";

export function SettingsSchoolPage() {
  return (
    <SettingsSubPageLayout
      title="School & Staff"
      subtitle="Manage school branding, contact info, fee schedule, and staff signatures."
    >
      <SchoolIdentitySection />
    </SettingsSubPageLayout>
  );
}

export default SettingsSchoolPage;
