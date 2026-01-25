// Shared Report Header Component
import type { SchoolSettings } from "../../types";

interface Props {
  settings: SchoolSettings;
  isIslamic?: boolean;
}

export function ReportHeader({ settings, isIslamic = false }: Props) {
  return (
    <header className="border-b-[3px] border-blue-950 pb-2">
      {isIslamic && (
        <div className="mb-1 text-center">
          <p className="font-arabic text-main text-sm font-bold">بسم الله الرحمن الرحيم</p>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:gap-4">
        {/* Logo */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center sm:h-24 sm:w-24">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-full w-full object-contain mix-blend-multiply"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center border-2 border-dashed border-slate-300 text-[8px] font-bold text-slate-400 sm:h-16 sm:w-16 sm:text-[10px]">
              LOGO
            </div>
          )}
        </div>

        {/* School Details */}
        <div className="flex-1 text-center">
          <h1 className="text-main font-serif text-xl leading-none font-black tracking-wide uppercase sm:text-2xl md:text-3xl">
            {settings.schoolName || "SCHOOL NAME"}
          </h1>
          {settings.address && (
            <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-600 uppercase">
              {settings.address}
            </p>
          )}
          {settings.schoolMotto && (
            <p className="mt-1 text-xs font-semibold text-blue-900 italic">
              "{settings.schoolMotto}"
            </p>
          )}

          {/* Contact Information */}
          {(settings.phoneNumber || settings.email) && (
            <div className="mt-1 flex justify-center gap-3 text-[9px] font-semibold text-slate-600">
              {settings.phoneNumber && <span>Tel: {settings.phoneNumber}</span>}
              {settings.phoneNumber && settings.email && <span>•</span>}
              {settings.email && <span>{settings.email}</span>}
            </div>
          )}

          <div className="mt-2 flex justify-center gap-6 border-t-2 border-blue-950 pt-1 text-xs font-bold tracking-wider text-slate-800 uppercase">
            <span>{settings.academicYear}</span>
            <span>•</span>
            <span>{settings.term}</span>
          </div>
        </div>

        {/* GES Logo */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center sm:h-24 sm:w-24">
          <img
            src="/assets/ges-logo.png"
            alt="GES"
            className="h-full w-full object-contain mix-blend-multiply"
          />
        </div>
      </div>

      {/* Badge */}
      <div className="mt-2 text-center">
        <span className="bg-primary inline-block rounded-sm px-8 py-1.5 text-[11px] font-black tracking-[0.25em] text-white uppercase shadow-sm print:bg-black">
          {settings.term} REPORT
        </span>
      </div>
    </header>
  );
}
