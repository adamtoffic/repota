import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Award, LayoutTemplate, Palette, Printer, RotateCcw } from "lucide-react";
import type { ComponentType } from "react";
import type { ProcessedStudent, PrintMode, ReportTemplateProps, SchoolSettings } from "../../types";
import { captureEvent } from "../../utils/analytics";
import { TEMPLATE_REGISTRY } from "../../templates/registry";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { resolvePositionVisibility } from "../../utils/privateSchoolFees";
import {
  getReportPalette,
  isValidHexColor,
  SCHOOL_COLOR_PRESETS,
} from "../../utils/reportTheme";
import {
  buildTemplatePreviewSettings,
  buildTemplatePreviewStudent,
} from "../../utils/templatePreviewData";

const A4_WIDTH_PX = 794;

const ScaledTemplatePreview = memo(function ScaledTemplatePreview({
  TemplateComponent,
  previewStudent,
  previewSettings,
  printMode,
}: {
  TemplateComponent: ComponentType<ReportTemplateProps>;
  previewStudent: ProcessedStudent;
  previewSettings: SchoolSettings;
  printMode: PrintMode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(260);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const initialWidth = el.clientWidth;
    if (initialWidth > 0) {
      setContainerWidth(initialWidth);
    }

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? el.clientWidth;
      if (measured > 0) {
        setContainerWidth(measured);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = containerWidth / A4_WIDTH_PX;

  return (
    <div
      ref={containerRef}
      data-paper-surface="true"
      aria-hidden="true"
      className="pointer-events-none relative mb-3 aspect-[210/297] w-full overflow-hidden rounded-lg border border-black/15 bg-white shadow-xs select-none"
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: `${A4_WIDTH_PX}px`,
          transform: `scale(${scale})`,
        }}
      >
        <TemplateComponent
          student={previewStudent}
          settings={previewSettings}
          printMode={printMode}
        />
      </div>
    </div>
  );
});

export function ReportTemplateSection() {
  const { formData, setFormData, isPersistenceSuspended } = useSettingsForm();
  const [primaryHexDraft, setPrimaryHexDraft] = useState<string | null>(null);
  const [accentHexDraft, setAccentHexDraft] = useState<string | null>(null);
  const [previewPrintMode, setPreviewPrintMode] = useState<PrintMode>("color");
  const railRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLButtonElement>(null);

  const activeTemplateId = formData.templateId || "original_v1";
  const activeTemplateName =
    TEMPLATE_REGISTRY.find((t) => t.id === activeTemplateId)?.name || "Repota Original";

  useEffect(() => {
    const rail = railRef.current;
    const card = activeCardRef.current;
    if (!rail || !card) return;
    if (rail.scrollWidth > rail.clientWidth) {
      rail.scrollLeft = Math.max(0, card.offsetLeft - 8);
    }
  }, []);

  const { showClassPositionHeader, showSubjectPosition } = resolvePositionVisibility(formData);
  const useCustomColor = Boolean(formData.useCustomTemplateColor);
  const activePrimary = isValidHexColor(formData.primaryColor)
    ? formData.primaryColor
    : "#1e3a8a";
  const activeAccent = isValidHexColor(formData.accentColor)
    ? formData.accentColor
    : "#d97706";

  const previewSettings = useMemo(
    () => buildTemplatePreviewSettings(formData),
    // Rebuild preview settings only when fields that affect report visuals change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      formData.useCustomTemplateColor,
      formData.primaryColor,
      formData.accentColor,
      formData.showClassPosition,
      formData.showSubjectPosition,
      formData.examType,
      formData.level,
      formData.schoolType,
      formData.classScoreMax,
      formData.examScoreMax,
      formData.logoUrl,
      formData.schoolName,
      formData.schoolMotto,
      formData.address,
      formData.academicYear,
      formData.term,
      formData.className,
      formData.classSize,
      formData.totalAttendanceDays,
      formData.showFeeSchedule,
      formData.privateFeeItems,
      formData.feePaymentNote,
    ],
  );
  const previewStudent = useMemo(
    () => buildTemplatePreviewStudent(previewSettings),
    [previewSettings],
  );
  const deferredPreviewSettings = useDeferredValue(previewSettings);
  const deferredPreviewStudent = useDeferredValue(previewStudent);
  const deferredPreviewPrintMode = useDeferredValue(previewPrintMode);

  const previewPalette = getReportPalette({
    settings: {
      useCustomTemplateColor: true,
      primaryColor: activePrimary,
      accentColor: activeAccent,
    },
    printMode: previewPrintMode,
    defaultPrimary: "#1e3a8a",
    defaultAccent: "#d97706",
  });

  return (
    <div className="space-y-6">
      <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 space-y-6 border-0 p-0">
      {/* CARD 1: REPORT DESIGN TEMPLATE */}
      <div className="border-border bg-surface rounded-xl border p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-950/60">
              <LayoutTemplate className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-main text-lg font-bold" data-record="true">
                Report Card Design
              </h2>
              <p className="text-muted text-xs">
                Live scaled previews of your actual printed report layouts.
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Design preview print mode"
            className="border-border bg-subtle inline-flex self-start rounded-lg border p-0.5 text-xs font-bold sm:self-auto"
          >
            <button
              type="button"
              aria-pressed={previewPrintMode === "color"}
              onClick={() => setPreviewPrintMode("color")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                previewPrintMode === "color"
                  ? "bg-indigo-600 text-white"
                  : "text-muted hover:text-main"
              }`}
            >
              Color
            </button>
            <button
              type="button"
              aria-pressed={previewPrintMode === "bw"}
              onClick={() => setPreviewPrintMode("bw")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                previewPrintMode === "bw"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-muted hover:text-main"
              }`}
            >
              B&amp;W
            </button>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs sm:hidden">
          <span className="text-main font-semibold">
            Active: <span className="text-indigo-600 dark:text-indigo-400">{activeTemplateName}</span>
          </span>
          <span className="text-muted text-[11px] font-medium">
            Swipe &bull; {TEMPLATE_REGISTRY.length} layouts
          </span>
        </div>

        <div
          ref={railRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 pt-0.5 pb-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-0 lg:grid-cols-3"
        >
          {TEMPLATE_REGISTRY.map((template) => {
            const isActive = activeTemplateId === template.id;
            return (
              <button
                key={template.id}
                ref={isActive ? activeCardRef : undefined}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  if (activeTemplateId === template.id) return;
                  setFormData({ ...formData, templateId: template.id });
                  captureEvent("Template_Changed", {
                    template_id: template.id,
                    previous_template_id: activeTemplateId,
                    school_level: formData.level || "unknown",
                    school_type: formData.schoolType || "unknown",
                    uses_custom_color: Boolean(formData.useCustomTemplateColor),
                  });
                }}
                className={`relative flex w-[205px] shrink-0 snap-start flex-col items-start rounded-xl border-2 p-3 text-left transition-all active:scale-95 sm:w-auto sm:shrink sm:p-4 ${
                  isActive
                    ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 dark:border-indigo-500 dark:bg-indigo-950/50 dark:ring-indigo-800/60"
                    : "border-border bg-surface hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
                }`}
              >
                <ScaledTemplatePreview
                  TemplateComponent={template.component}
                  previewSettings={deferredPreviewSettings}
                  previewStudent={deferredPreviewStudent}
                  printMode={deferredPreviewPrintMode}
                />
                <span className="text-main mb-1 pr-6 font-bold">{template.name}</span>
                <span className="text-muted line-clamp-2 text-xs leading-relaxed">
                  {template.description}
                </span>

                {/* Active Checkmark */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute top-3 right-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs"
                  >
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CARD 2: SCHOOL BRAND COLORS */}
      <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-100 p-2.5 dark:bg-pink-950/60">
              <Palette className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h2 className="text-main text-lg font-bold" data-record="true">
                School Brand Color
              </h2>
              <p className="text-muted text-xs">
                Print-calibrated palettes tuned for crisp color &amp; monochrome A4 paper.
              </p>
            </div>
          </div>

          <label className="border-border bg-subtle inline-flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2">
            <input
              type="checkbox"
              checked={useCustomColor}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  useCustomTemplateColor: e.target.checked,
                  primaryColor: activePrimary,
                  accentColor: activeAccent,
                })
              }
              className="border-border-strong h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-main text-xs font-bold" data-record="true">
              Use School Custom Colors
            </span>
          </label>
        </div>

        {/* Preset Swatches */}
        <div className="space-y-4">
          <div>
            <p className="text-muted mb-2 text-xs font-bold tracking-wide uppercase">
              Heritage Presets
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SCHOOL_COLOR_PRESETS.map((preset) => {
                const isSelected =
                  useCustomColor && activePrimary.toLowerCase() === preset.primary.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setPrimaryHexDraft(null);
                      setAccentHexDraft(null);
                      setFormData({
                        ...formData,
                        useCustomTemplateColor: true,
                        primaryColor: preset.primary,
                        accentColor: preset.accent,
                      });
                    }}
                    className={`flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-left text-xs font-bold transition-all active:scale-95 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 dark:border-indigo-500 dark:bg-indigo-950/50 dark:ring-indigo-800/60"
                        : "border-border bg-surface hover:border-border-strong"
                    }`}
                  >
                    <span className="flex shrink-0 items-center -space-x-1">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/15 dark:border-white/25"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white dark:border-slate-900"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </span>
                    <span className="text-main truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers + Mini Live Preview */}
          <div className="border-border bg-subtle grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="school-primary-color"
                  className="text-muted mb-1 block text-xs font-bold uppercase"
                >
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="school-primary-color"
                    type="color"
                    value={activePrimary}
                    onChange={(e) => {
                      setPrimaryHexDraft(null);
                      setFormData({
                        ...formData,
                        useCustomTemplateColor: true,
                        primaryColor: e.target.value,
                      });
                    }}
                    className="border-border-strong bg-input h-10 w-12 cursor-pointer rounded border p-1"
                  />
                  <input
                    type="text"
                    aria-label="Primary hex color"
                    value={primaryHexDraft ?? activePrimary}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrimaryHexDraft(val);
                      if (isValidHexColor(val)) {
                        setFormData({
                          ...formData,
                          useCustomTemplateColor: true,
                          primaryColor: val.toLowerCase(),
                        });
                      }
                    }}
                    onBlur={() => setPrimaryHexDraft(null)}
                    className="border-border-strong bg-input text-main w-28 rounded-lg border px-2.5 py-2 font-mono text-xs font-bold uppercase"
                    maxLength={7}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="school-accent-color"
                  className="text-muted mb-1 block text-xs font-bold uppercase"
                >
                  Accent Stripe Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="school-accent-color"
                    type="color"
                    value={activeAccent}
                    onChange={(e) => {
                      setAccentHexDraft(null);
                      setFormData({
                        ...formData,
                        useCustomTemplateColor: true,
                        accentColor: e.target.value,
                      });
                    }}
                    className="border-border-strong bg-input h-10 w-12 cursor-pointer rounded border p-1"
                  />
                  <input
                    type="text"
                    aria-label="Accent hex color"
                    value={accentHexDraft ?? activeAccent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAccentHexDraft(val);
                      if (isValidHexColor(val)) {
                        setFormData({
                          ...formData,
                          useCustomTemplateColor: true,
                          accentColor: val.toLowerCase(),
                        });
                      }
                    }}
                    onBlur={() => setAccentHexDraft(null)}
                    className="border-border-strong bg-input text-main w-28 rounded-lg border px-2.5 py-2 font-mono text-xs font-bold uppercase"
                    maxLength={7}
                  />
                </div>
              </div>

              {useCustomColor && (
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryHexDraft(null);
                    setAccentHexDraft(null);
                    setFormData({
                      ...formData,
                      useCustomTemplateColor: false,
                    });
                  }}
                  className="text-muted hover:text-main inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Use Template Default Colors
                </button>
              )}
            </div>

            {/* Live Header Preview (kept on paper-light surface matching printed reports) */}
            <div className="flex flex-col justify-center">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-muted text-xs font-bold tracking-wider uppercase">
                  Report Header Preview {useCustomColor ? "(Custom Active)" : "(Preview Only)"}
                </p>
                <div
                  role="group"
                  aria-label="Preview print mode"
                  className="border-border bg-surface inline-flex rounded-md border p-0.5 text-[11px] font-bold"
                >
                  <button
                    type="button"
                    aria-pressed={previewPrintMode === "color"}
                    onClick={() => setPreviewPrintMode("color")}
                    className={`rounded-xs px-2 py-0.5 transition-colors ${
                      previewPrintMode === "color"
                        ? "bg-indigo-600 text-white"
                        : "text-muted hover:text-main"
                    }`}
                  >
                    Color
                  </button>
                  <button
                    type="button"
                    aria-pressed={previewPrintMode === "bw"}
                    onClick={() => setPreviewPrintMode("bw")}
                    className={`rounded-xs px-2 py-0.5 transition-colors ${
                      previewPrintMode === "bw"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-muted hover:text-main"
                    }`}
                  >
                    B&amp;W
                  </button>
                </div>
              </div>
              <div
                data-paper-surface="true"
                className="overflow-hidden rounded-lg border-2 bg-white shadow-xs"
                style={{ borderColor: previewPalette.primaryDark }}
              >
                <div
                  className={`flex items-center justify-between gap-2 px-3 py-2 ${
                    previewPalette.isBW ? "border-t-4 border-b-2 border-black" : ""
                  }`}
                  style={{
                    backgroundColor: previewPalette.bannerBg,
                    color: previewPalette.bannerText,
                  }}
                >
                  <p className="truncate font-serif text-xs font-black uppercase">
                    {formData.schoolName || "Your School Name"}
                  </p>
                  <span
                    className="shrink-0 rounded-xs px-1.5 py-0.5 text-[9px] font-black uppercase"
                    style={{
                      backgroundColor: previewPalette.highlightBg,
                      color: previewPalette.highlightText,
                    }}
                  >
                    {previewPalette.isBW ? "B&W Ink" : "Color"}
                  </span>
                </div>
                <div className="h-1 w-full" style={{ backgroundColor: previewPalette.accent }} />
                <div
                  className="flex justify-between px-3 py-1.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: previewPalette.primarySoft,
                    color: previewPalette.primaryDark,
                  }}
                >
                  <span>Mathematics</span>
                  <span>87 &bull; Grade 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: RANKING & POSITION VISIBILITY */}
      <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-950/60">
            <Award className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-main text-lg font-bold" data-record="true">
              Position &amp; Ranking Display
            </h2>
            <p className="text-muted text-xs">
              Toggle class and subject ranking on or off cleanly without altering A4 sheet layout.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="border-border hover:bg-subtle flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3.5">
            <div>
              <p className="text-main text-sm font-bold" data-record="true">
                Show Overall Class Position
              </p>
              <p className="text-muted text-xs">
                Displays overall student rank (e.g., 1st, 2nd, 3rd) in the profile box and summary
                strip.
              </p>
            </div>
            <input
              type="checkbox"
              aria-label="Show Overall Class Position"
              checked={showClassPositionHeader}
              onChange={(e) =>
                setFormData({ ...formData, showClassPosition: e.target.checked })
              }
              className="border-border-strong h-5 w-5 shrink-0 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          <label className="border-border hover:bg-subtle flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3.5">
            <div>
              <p className="text-main text-sm font-bold" data-record="true">
                Show Subject Positions (Pos. Column)
              </p>
              <p className="text-muted text-xs">
                Displays per-subject rank inside the grades table (automatically collapses column if
                hidden).
              </p>
            </div>
            <input
              type="checkbox"
              aria-label="Show Subject Positions"
              checked={showSubjectPosition}
              onChange={(e) =>
                setFormData({ ...formData, showSubjectPosition: e.target.checked })
              }
              className="border-border-strong h-5 w-5 shrink-0 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>
      </fieldset>

      {/* PRINT PREVIEW SHORTCUT */}
      <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-indigo-800/70 dark:bg-indigo-950/45">
        <div>
          <p className="text-sm font-bold text-indigo-950 dark:text-indigo-200" data-record="true">
            Ready to see how your report cards look?
          </p>
          <p className="mt-0.5 text-xs text-indigo-800/80 dark:text-indigo-300/80">
            Preview your chosen template, colors, and ranking display on A4 sheets.
          </p>
        </div>
        <Link
          to="/print"
          className="bg-primary hover:bg-primary/90 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 sm:text-sm"
          data-record="true"
        >
          <Printer className="h-4 w-4 shrink-0" />
          <span>Preview &amp; Print Report Cards</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </div>
  );
}
