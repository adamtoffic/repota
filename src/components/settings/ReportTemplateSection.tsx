import { Link } from "@tanstack/react-router";
import { ArrowRight, Award, LayoutTemplate, Palette, Printer, RotateCcw } from "lucide-react";
import { captureEvent } from "../../utils/analytics";
import { TEMPLATE_REGISTRY } from "../../templates/registry";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { resolvePositionVisibility } from "../../utils/privateSchoolFees";
import {
  getReportPalette,
  isValidHexColor,
  SCHOOL_COLOR_PRESETS,
} from "../../utils/reportTheme";

export function ReportTemplateSection() {
  const { formData, setFormData, isPersistenceSuspended } = useSettingsForm();

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
    printMode: "color",
    defaultPrimary: "#1e3a8a",
    defaultAccent: "#d97706",
  });

  return (
    <div className="space-y-6">
      <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 space-y-6 border-0 p-0">
      {/* CARD 1: REPORT DESIGN TEMPLATE */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2.5">
            <LayoutTemplate className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800" data-record="true">
              Report Card Design
            </h2>
            <p className="text-muted text-xs">
              Choose the visual layout for your printed reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_REGISTRY.map((template) => (
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
                  ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50"
              }`}
            >
              <span className="mb-1 pr-6 font-bold text-gray-900">{template.name}</span>
              <span className="text-xs leading-relaxed text-gray-600">{template.description}</span>

              {/* Active Checkmark */}
              {(formData.templateId || "original_v1") === template.id && (
                <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CARD 2: SCHOOL BRAND COLORS */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-100 p-2.5">
              <Palette className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800" data-record="true">
                School Brand Color
              </h2>
              <p className="text-muted text-xs">
                Customize any report template with your school&apos;s official color palette.
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
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
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-gray-800" data-record="true">
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SCHOOL_COLOR_PRESETS.map((preset) => {
                const isSelected =
                  useCustomColor && activePrimary.toLowerCase() === preset.primary.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        useCustomTemplateColor: true,
                        primaryColor: preset.primary,
                        accentColor: preset.accent,
                      })
                    }
                    className={`flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-left text-xs font-bold transition-all active:scale-95 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span className="truncate text-gray-800">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers + Mini Live Preview */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        useCustomTemplateColor: true,
                        primaryColor: e.target.value,
                      })
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    aria-label="Primary hex color"
                    value={activePrimary}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isValidHexColor(val)) {
                        setFormData({
                          ...formData,
                          useCustomTemplateColor: true,
                          primaryColor: val.toLowerCase(),
                        });
                      }
                    }}
                    className="w-28 rounded-lg border border-gray-300 bg-white px-2.5 py-2 font-mono text-xs font-bold uppercase"
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        useCustomTemplateColor: true,
                        accentColor: e.target.value,
                      })
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    aria-label="Accent hex color"
                    value={activeAccent}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isValidHexColor(val)) {
                        setFormData({
                          ...formData,
                          useCustomTemplateColor: true,
                          accentColor: val.toLowerCase(),
                        });
                      }
                    }}
                    className="w-28 rounded-lg border border-gray-300 bg-white px-2.5 py-2 font-mono text-xs font-bold uppercase"
                    maxLength={7}
                  />
                </div>
              </div>

              {useCustomColor && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      useCustomTemplateColor: false,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Use Template Default Colors
                </button>
              )}
            </div>

            {/* Live Header Preview */}
            <div className="flex flex-col justify-center">
              <p className="text-muted mb-1.5 text-[10px] font-bold tracking-wider uppercase">
                Report Header Preview {useCustomColor ? "(Custom Active)" : "(Preview Only)"}
              </p>
              <div
                className="overflow-hidden rounded-lg border-2 bg-white shadow-xs"
                style={{ borderColor: previewPalette.primaryDark }}
              >
                <div
                  className="px-3 py-2 text-center"
                  style={{
                    backgroundColor: previewPalette.primary,
                    color: previewPalette.onPrimary,
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
                  <span>87 • Grade 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: RANKING & POSITION VISIBILITY */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2.5">
            <Award className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800" data-record="true">
              Position &amp; Ranking Display
            </h2>
            <p className="text-muted text-xs">
              Toggle class and subject ranking on or off cleanly without altering A4 sheet layout.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 p-3.5 hover:bg-gray-50">
            <div>
              <p className="text-sm font-bold text-gray-800" data-record="true">
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
              className="h-5 w-5 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 p-3.5 hover:bg-gray-50">
            <div>
              <p className="text-sm font-bold text-gray-800" data-record="true">
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
              className="h-5 w-5 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>
      </fieldset>

      {/* PRINT PREVIEW SHORTCUT */}
      <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-sm font-bold text-indigo-950" data-record="true">
            Ready to see how your report cards look?
          </p>
          <p className="mt-0.5 text-xs text-indigo-800/80">
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
