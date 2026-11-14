import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SettingsFormProvider } from "../../context/SettingsFormContext";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { PageHeader } from "../../components/ui/PageHeader";
import { AutoSaveIndicator } from "../../components/AutoSaveIndicator";
import { SettingsHeaderActions } from "../../components/settings/SettingsHeaderActions";
import { SettingsStatusBanners } from "../../components/settings/SettingsStatusBanners";

interface SettingsSubPageLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function SettingsSubPageLayout({ title, subtitle, children }: SettingsSubPageLayoutProps) {
  return (
    <SettingsFormProvider>
      <SettingsSubPageLayoutInner title={title} subtitle={subtitle}>
        {children}
      </SettingsSubPageLayoutInner>
    </SettingsFormProvider>
  );
}

function SettingsSubPageLayoutInner({ title, subtitle, children }: SettingsSubPageLayoutProps) {
  const { committedSchoolName, isSaving, lastSaved } = useSettingsForm();

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader
        schoolName={committedSchoolName}
        actions={<SettingsHeaderActions backTo="/settings" backLabel="Settings" />}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        <div>
          <Link
            to="/settings"
            className="text-muted hover:text-main mb-2 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
            data-record="true"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Settings
          </Link>
          <h1 className="text-main text-2xl font-black tracking-tight" data-record="true">
            {title}
          </h1>
          <p className="text-muted mt-1 text-sm">{subtitle}</p>
        </div>

        <SettingsStatusBanners />
        {children}
      </main>

      <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
    </div>
  );
}
