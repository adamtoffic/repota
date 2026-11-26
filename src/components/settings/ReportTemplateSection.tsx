import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Award, LayoutTemplate, Palette, Printer, RotateCcw } from "lucide-react";
import type { PrintMode } from "../../types";
import { captureEvent } from "../../utils/analytics";
import { TEMPLATE_REGISTRY } from "../../templates/registry";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { resolvePositionVisibility } from "../../utils/privateSchoolFees";
import {
  getReportPalette,
  isValidHexColor,
  SCHOOL_COLOR_PRESETS,
} from "../../utils/reportTheme";

const TEMPLATE_DEFAULT_SWATCHES: Record<string, { primary: string; accent: string }> = {
  original_v1: { primary: "#1f2937", accent: "#4b5563" },
  classic_v1: { primary: "#1e3a8a", accent: "#2563eb" },
  modern_v1: { primary: "#0f172a", accent: "#4f46e5" },
  minimal_v1: { primary: "#111827", accent: "#6b7280" },
  executive_v1: { primary: "#1e3a8a", accent: "#d97706" },
  heritage_v1: { primary: "#78350f", accent: "#d97706" },
  scholar_v1: { primary: "#0f766e", accent: "#1e3a8a" },
};

function TemplateThumbnail({
  templateId,
  primary,
  accent,
}: {
  templateId: string;
  primary: string;
  accent: string;
}) {
  if (templateId === "heritage_v1") {
    return (
      <div
        data-paper-surface="true"
        aria-hidden="true"
        className="mb-3 h-24 w-full overflow-hidden rounded-md bg-white p-1.5 shadow-2xs"
      >
        <div className="h-full w-full border-2 p-0.5" style={{ borderColor: primary }}>
          <div
            className="flex h-full w-full flex-col justify-between border p-1.5"
            style={{ borderColor: accent }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
              <div className="h-1.5 w-20 rounded-xs" style={{ backgroundColor: primary }} />
              <div className="h-1 w-12 rounded-xs opacity-75" style={{ backgroundColor: primary }} />
            </div>
            <div className="space-y-1">
              <div className="h-1 w-full bg-gray-200" />
              <div className="h-1 w-full bg-gray-100" />
              <div className="h-1 w-full bg-gray-200" />
            </div>
            <div className="flex justify-between">
              <div className="h-1 w-8 bg-gray-300" />
              <div className="h-1 w-8 bg-gray-300" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === "scholar_v1") {
    return (
      <div
        data-paper-surface="true"
        aria-hidden="true"
        className="mb-3 flex h-24 w-full flex-col justify-between overflow-hidden rounded-md border border-gray-200 bg-white p-2 shadow-2xs"
      >
        <div className="flex items-center justify-between gap-2 border-b pb-1" style={{ borderColor: primary }}>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-1 rounded-full" style={{ backgroundColor: primary }} />
            <div className="space-y-0.5">
              <div className="h-1.5 w-16 rounded-xs" style={{ backgroundColor: primary }} />
              <div className="h-1 w-10 rounded-xs bg-gray-300" />
            </div>
          </div>
          <div className="h-3 w-3 rounded-xs border border-gray-300 bg-gray-50" />
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="h-2.5 rounded-xs bg-gray-100" />
          <div className="h-2.5 rounded-xs" style={{ backgroundColor: primary, opacity: 0.2 }} />
          <div className="h-2.5 rounded-xs bg-gray-100" />
        </div>
        <div className="space-y-1">
          {[82, 68, 90].map((pct) => (
            <div key={pct} className="flex items-center gap-1.5">
              <div className="h-1 w-10 rounded-xs bg-gray-300" />
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: primary }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (templateId === "executive_v1") {
    return (
      <div
        data-paper-surface="true"
        aria-hidden="true"
        className="mb-3 flex h-24 w-full flex-col justify-between overflow-hidden rounded-md border-2 bg-white shadow-2xs"
        style={{ borderColor: primary }}
      >
        <div
          className="flex items-center justify-between px-2 py-1.5"
          style={{ backgroundColor: primary }}
        >
          <div className="h-3 w-3 rounded-xs bg-white/90" />
          <div className="h-1.5 w-20 rounded-xs bg-white/95" />
          <div className="h-3 w-3 rounded-xs opacity-0" />
        </div>
        <div className="h-0.5 w-full" style={{ backgroundColor: accent }} />
        <div className="flex flex-1 flex-col justify-between p-1.5">
          <div className="grid grid-cols-4 gap-1">
            <div className="col-span-3 h-2.5 rounded-xs bg-gray-100" />
            <div className="h-2.5 rounded-xs" style={{ backgroundColor: primary }} />
          </div>
          <div className="space-y-1">
            <div className="h-1 w-full bg-gray-200" />
            <div className="h-1 w-full bg-gray-100" />
            <div className="h-1 w-full bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (templateId === "modern_v1") {
    return (
      <div
        data-paper-surface="true"
        aria-hidden="true"
        className="mb-3 flex h-24 w-full flex-col justify-between overflow-hidden rounded-md border border-gray-200 bg-white p-2 shadow-2xs"
      >
        <div className="flex items-center justify-between rounded-sm px-2 py-1.5" style={{ backgroundColor: primary }}>
          <div className="h-1.5 w-14 rounded-xs bg-white" />
          <div className="h-2 w-6 rounded-xs" style={{ backgroundColor: accent }} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-3 rounded-xs bg-gray-100" />
          <div className="h-3 rounded-xs bg-gray-100" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-full rounded-xs bg-gray-200" />
          <div className="h-1 w-5/6 rounded-xs bg-gray-200" />
        </div>
      </div>
    );
  }

  if (templateId === "minimal_v1") {
    return (
      <div
        data-paper-surface="true"
        aria-hidden="true"
        className="mb-3 flex h-24 w-full flex-col justify-between overflow-hidden rounded-md border border-gray-200 bg-white p-2.5 shadow-2xs"
      >
        <div className="space-y-1 border-b border-gray-300 pb-1.5">
          <div className="h-1.5 w-20 rounded-xs bg-gray-900" />
          <div className="h-1 w-12 rounded-xs bg-gray-400" />
        </div>
        <div className="space-y-1.5">
          <div className="h-px w-full bg-gray-200" />
          <div className="h-px w-full bg-gray-200" />
          <div className="h-px w-full bg-gray-200" />
        </div>
        <div className="flex justify-end gap-2">
          <div className="h-1 w-8 bg-gray-300" />
          <div className="h-1 w-8 bg-gray-300" />
        </div>
      </div>
    );
  }

  const isClassic = templateId === "classic_v1";
  return (
    <div
      data-paper-surface="true"
      aria-hidden="true"
      className={`mb-3 flex h-24 w-full flex-col justify-between overflow-hidden border bg-white p-2 shadow-2xs ${
        isClassic ? "rounded-md" : "rounded-none border-gray-800"
      }`}
      style={isClassic ? { borderColor: primary } : undefined}
    >
      <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: primary }}>
        <div className="h-3 w-3 rounded-xs bg-gray-200" />
        <div className="h-1.5 w-20 rounded-xs" style={{ backgroundColor: primary }} />
        <div className="h-3 w-3 rounded-xs bg-gray-100" />
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-gray-200" />
        <div className="h-1.5 w-full bg-gray-100" />
        <div className="h-1.5 w-full bg-gray-200" />
      </div>
      <div className="h-2 w-full border border-gray-300 bg-gray-50" />
    </div>
  );
}

export function ReportTemplateSection() {
  const { formData, setFormData, isPersistenceSuspended } = useSettingsForm();
  const [primaryHexDraft, setPrimaryHexDraft] = useState<string | null>(null);
  const [accentHexDraft, setAccentHexDraft] = useState<string | null>(null);
  const [previewPrintMode, setPreviewPrintMode] = useState<PrintMode>("color");

  const { showClassPositionHeader, showSubjectPosition } = resolvePositionVisibility(formData);
  const useCustomColor = Boolean(formData.useCustomTemplateColor);
  const activePrimary = isValidHexColor(formData.primaryColor)
    ? formData.primaryColor
    : "#1e3a8a";
  const activeAccent = isValidHexColor(formData.accentColor)
    ? formData.accentColor
    : "#d97706";

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
      <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-950/60">
            <LayoutTemplate className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-main text-lg font-bold" data-record="true">
              Report Card Design
            </h2>
            <p className="text-muted text-xs">
              Choose the visual layout for your printed reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_REGISTRY.map((template) => {
            const defaults =
              TEMPLATE_DEFAULT_SWATCHES[template.id] || TEMPLATE_DEFAULT_SWATCHES.executive_v1;
            const thumbPrimary = useCustomColor ? activePrimary : defaults.primary;
            const thumbAccent = useCustomColor ? activeAccent : defaults.accent;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  const currentTemplateId = formData.templateId || "original_v1";
                  if (currentTemplateId === template.id) return;
                  setFormData({ ...formData, templateId: template.id });
                  captureEvent("Template_Changed", {
                    template_id: template.id,
                    previous_template_id: currentTemplateId,
                    school_level: formData.level || "unknown",
                    school_type: formData.schoolType || "unknown",
                    uses_custom_color: Boolean(formData.useCustomTemplateColor),
                  });
                }}
                className={`relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all active:scale-95 ${
                  (formData.templateId || "original_v1") === template.id
                    ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 dark:border-indigo-500 dark:bg-indigo-950/50 dark:ring-indigo-800/60"
                    : "border-border bg-surface hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
                }`}
              >
                <TemplateThumbnail
                  templateId={template.id}
                  primary={thumbPrimary}
                  accent={thumbAccent}
                />
                <span className="text-main mb-1 pr-6 font-bold">{template.name}</span>
                <span className="text-muted text-xs leading-relaxed">{template.description}</span>

                {/* Active Checkmark */}
                {(formData.templateId || "original_v1") === template.id && (
                  <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs">
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
                        ? "bg-slate-800 text-white"
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
                  className={`px-3 py-2 text-center ${
                    previewPalette.isBW ? "border-b border-black" : ""
                  }`}
                  style={{
                    backgroundColor: previewPalette.bannerBg,
                    color: previewPalette.bannerText,
                  }}
                >
                  <p className="truncate font-serif text-xs font-black uppercase">
                    {formData.schoolName || "Your School Name"}
                  </p>
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
