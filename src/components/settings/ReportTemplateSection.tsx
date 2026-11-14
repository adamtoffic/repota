import posthog from "posthog-js";
import { LayoutTemplate } from "lucide-react";
import { TEMPLATE_REGISTRY } from "../../templates/registry";
import { useSettingsForm } from "../../hooks/useSettingsForm";

export function ReportTemplateSection() {
  const { formData, setFormData, isPersistenceSuspended } = useSettingsForm();

  return (
    <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 space-y-6 border-0 p-0">
      {/* CARD: REPORT DESIGN TEMPLATE */}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TEMPLATE_REGISTRY.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setFormData({ ...formData, templateId: template.id });
                posthog.capture("Template_Changed", { template_id: template.id });
              }}
              className={`relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all active:scale-95 ${
                (formData.templateId || "original_v1") === template.id
                  ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50"
              }`}
            >
              <span className="mb-1 font-bold text-gray-900">{template.name}</span>
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
    </fieldset>
  );
}
