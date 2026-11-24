import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, LayoutTemplate, School, ShieldCheck } from "lucide-react";
import { SettingsFormProvider } from "../../context/SettingsFormContext";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsStatusBanners } from "../../components/settings/SettingsStatusBanners";

const MOBILE_SETTINGS_TABS = [
  { to: "/settings/school" as const, label: "School", icon: School },
  { to: "/settings/academic" as const, label: "Class", icon: BookOpen },
  { to: "/settings/templates" as const, label: "Report Style", icon: LayoutTemplate },
  { to: "/settings/security" as const, label: "Security", icon: ShieldCheck },
];

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
  const { committedSchoolName } = useSettingsForm();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeTab = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (!activeTab) return;
    const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const targetScrollLeft =
      activeTab.offsetLeft - (nav.clientWidth - activeTab.clientWidth) / 2;
    nav.scrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));
  }, [pathname]);

  return (
    <div className="bg-background flex min-h-screen flex-col font-sans">
      <PageHeader schoolName={committedSchoolName} />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
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

          <nav
            ref={navRef}
            aria-label="Settings sections"
            className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 md:hidden"
          >
            {MOBILE_SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.to;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "border-border bg-surface text-secondary hover:bg-subtle border"
                  }`}
                  data-record="true"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <SettingsStatusBanners />
        {children}
      </main>
    </div>
  );
}
