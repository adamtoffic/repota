import { SettingsSubPageLayout } from "./SettingsSubPageLayout";
import { SecurityBackupSection } from "../../components/settings/SecurityBackupSection";

export function SettingsSecurityPage() {
  return (
    <SettingsSubPageLayout
      title="Security & Backup"
      subtitle="Protect student data with a PIN, monitor storage, and export or restore backups."
    >
      <SecurityBackupSection />
    </SettingsSubPageLayout>
  );
}

export default SettingsSecurityPage;
