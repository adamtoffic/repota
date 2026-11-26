import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calculator,
  ChevronRight,
  LayoutTemplate,
  Monitor,
  Moon,
  School,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { SettingsFormProvider } from "../../context/SettingsFormContext";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { useTheme } from "../../hooks/useTheme";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsStatusBanners } from "../../components/settings/SettingsStatusBanners";
import { TEMPLATE_REGISTRY } from "../../templates/registry";
import { getTimeSinceBackup } from "../../utils/dataProtection";
import { isPinConfigured } from "../../utils/pinSecurity";
import { resolvePositionVisibility } from "../../utils/privateSchoolFees";
import { deriveLibraryFromSubjectMap } from "../../utils/sbaReconciliation";

const APPEARANCE_OPTIONS = [
  { value: "system" as const, label: "System", icon: Monitor },
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
];

export function SettingsHub() {
  return (
    <SettingsFormProvider>
      <SettingsHubContent />
    </SettingsFormProvider>
  );
}

function SettingsHubContent() {
  const { formData, committedSchoolName } = useSettingsForm();
  const { preference, resolvedTheme, setTheme } = useTheme();

  const currentTemplateName =
    TEMPLATE_REGISTRY.find((t) => t.id === (formData.templateId || "original_v1"))?.name ||
    "Original";
  const pinActive = isPinConfigured();
  const lastBackupLabel = typeof getTimeSinceBackup === "function" ? getTimeSinceBackup() : null;
  const { showClassPositionHeader, showSubjectPosition } = resolvePositionVisibility(formData);
  const positionsHidden = !showClassPositionHeader && !showSubjectPosition;
  const reportStyleMeta = [
    currentTemplateName,
    formData.useCustomTemplateColor ? "Custom Colors" : null,
    positionsHidden ? "Ranks Hidden" : null,
  ]
    .filter(Boolean)
    .join(" • ");
  const securityMeta = `${pinActive ? "PIN On" : "PIN Off"} • ${
    lastBackupLabel ? `Backed up ${lastBackupLabel}` : "No backup yet"
  }`;

  const sections = [
    {
      to: "/settings/school" as const,
      title: "School & Staff",
      description: "School identity, crest logo, fee schedule, and head/class teacher signatures.",
      icon: School,
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
      meta: formData.schoolType || "STANDARD",
    },
    {
      to: "/settings/academic" as const,
      title: "Class & Subjects",
      description: "School level, class name, term dates, exam mode, and learning areas.",
      icon: BookOpen,
      iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
      meta: `${formData.level} • ${(formData.defaultSubjects || []).length} subjects`,
    },
    {
      to: "/sba" as const,
      title: "SBA & Grading",
      description:
        "Open the SBA Markbook to record continuous assessment tasks, presets, and grading weights.",
      icon: Calculator,
      iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400",
      meta:
        formData.examType === "MOCK"
          ? "Mock (0/100)"
          : (() => {
              const sbaTasks = deriveLibraryFromSubjectMap(
                formData.subjectComponentMap ?? {},
                formData.componentLibrary,
              );
              return sbaTasks.length > 0
                ? `${formData.classScoreMax}/${formData.examScoreMax} • ${sbaTasks.length} tasks`
                : `${formData.classScoreMax}/${formData.examScoreMax} • Direct`;
            })(),
    },
    {
      to: "/settings/templates" as const,
      title: "Report Style",
      description: "Choose the visual layout used when printing student report cards.",
      icon: LayoutTemplate,
      iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
      meta: reportStyleMeta,
    },
    {
      to: "/settings/security" as const,
      title: "Security & Backup",
      description: "PIN lock, device biometrics, storage usage, backups, and reset options.",
      icon: ShieldCheck,
      iconBg: "bg-green-100 text-green-600 dark:bg-emerald-950/60 dark:text-emerald-400",
      meta: securityMeta,
    },
  ];

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader schoolName={committedSchoolName} />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 focus:outline-none"
      >
        <SettingsStatusBanners />

        <div>
          <h1 className="text-main text-2xl font-black tracking-tight" data-record="true">
            Settings
          </h1>
          <p className="text-muted mt-1 text-sm">
            Configure your school identity, class session, grading, report design, and device
            security.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const spanClass = index === sections.length - 1 ? "lg:col-span-2" : "";
            return (
              <Link
                key={section.to}
                to={section.to}
                className={`group border-border bg-surface flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.99] sm:p-5 dark:hover:border-blue-500/60 ${spanClass}`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${section.iconBg}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-main text-base font-bold" data-record="true">
                      {section.title}
                    </h2>
                    <span className="bg-subtle text-secondary rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                      {section.meta}
                    </span>
                  </div>
                  <p className="text-muted mt-1 text-xs leading-relaxed">{section.description}</p>
                </div>
                <ChevronRight className="text-muted group-hover:text-primary-text h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>

        <section
          aria-labelledby="appearance-heading"
          className="border-border bg-surface rounded-xl border p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {resolvedTheme === "dark" ? (
                  <Moon className="h-6 w-6" />
                ) : (
                  <Sun className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="appearance-heading"
                    className="text-main text-base font-bold"
                    data-record="true"
                  >
                    Appearance
                  </h2>
                  <span className="bg-subtle text-secondary rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize">
                    {preference === "system" ? `Auto (${resolvedTheme})` : preference}
                  </span>
                </div>
                <p className="text-muted mt-1 text-xs leading-relaxed">
                  Saved on this device only. Printed report cards always stay light paper.
                </p>
              </div>
            </div>

            <div
              role="group"
              aria-label="Appearance theme"
              className="bg-subtle border-border grid grid-cols-3 gap-1 rounded-xl border p-1 sm:w-64"
            >
              {APPEARANCE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = preference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-surface text-primary-text shadow-xs"
                        : "text-muted hover:text-main"
                    }`}
                    data-record="true"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SettingsHub;
