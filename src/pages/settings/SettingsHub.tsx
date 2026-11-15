import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calculator,
  ChevronRight,
  LayoutTemplate,
  School,
  ShieldCheck,
} from "lucide-react";
import { SettingsFormProvider } from "../../context/SettingsFormContext";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsHeaderActions } from "../../components/settings/SettingsHeaderActions";
import { SettingsStatusBanners } from "../../components/settings/SettingsStatusBanners";
import { TEMPLATE_REGISTRY } from "../../templates/registry";
import { isPinConfigured } from "../../utils/pinSecurity";

export function SettingsHub() {
  return (
    <SettingsFormProvider>
      <SettingsHubContent />
    </SettingsFormProvider>
  );
}

function SettingsHubContent() {
  const { formData, committedSchoolName } = useSettingsForm();

  const currentTemplateName =
    TEMPLATE_REGISTRY.find((t) => t.id === (formData.templateId || "original_v1"))?.name ||
    "Original";
  const pinActive = isPinConfigured();

  const sections = [
    {
      to: "/settings/school" as const,
      title: "School & Staff",
      description: "School identity, crest logo, fee schedule, and head/class teacher signatures.",
      icon: School,
      iconBg: "bg-blue-100 text-blue-600",
      meta: formData.schoolType || "STANDARD",
    },
    {
      to: "/settings/academic" as const,
      title: "Class & Subjects",
      description: "School level, class name, term dates, exam mode, and learning areas.",
      icon: BookOpen,
      iconBg: "bg-orange-100 text-orange-600",
      meta: `${formData.level} • ${(formData.defaultSubjects || []).length} subjects`,
    },
    {
      to: "/sba" as const,
      title: "SBA & Grading",
      description: "Continuous assessment weights, SBA task library, and subject task mapping.",
      icon: Calculator,
      iconBg: "bg-purple-100 text-purple-600",
      meta:
        formData.examType === "MOCK"
          ? "Mock (0/100)"
          : `${formData.classScoreMax}/${formData.examScoreMax} • ${(formData.componentLibrary || []).length} tasks`,
    },
    {
      to: "/settings/templates" as const,
      title: "Report Style",
      description: "Choose the visual layout used when printing student report cards.",
      icon: LayoutTemplate,
      iconBg: "bg-indigo-100 text-indigo-600",
      meta: currentTemplateName,
    },
    {
      to: "/settings/security" as const,
      title: "Security & Backup",
      description: "PIN lock, device biometrics, storage usage, backups, and factory reset.",
      icon: ShieldCheck,
      iconBg: "bg-green-100 text-green-600",
      meta: pinActive ? "PIN Enabled" : "PIN Off",
    },
  ];

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader
        schoolName={committedSchoolName}
        actions={<SettingsHeaderActions showBack={false} />}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
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

        <div className="grid grid-cols-1 gap-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.to}
                to={section.to}
                className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.99] sm:p-5"
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
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                      {section.meta}
                    </span>
                  </div>
                  <p className="text-muted mt-1 text-xs leading-relaxed">{section.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default SettingsHub;
