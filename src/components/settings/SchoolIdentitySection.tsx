import { useId, useState } from "react";
import { Briefcase, RotateCcw, School } from "lucide-react";
import { ConfirmModal } from "../ConfirmModal";
import { ImageUploader } from "../ImageUploader";
import { Input } from "../ui";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { useToast } from "../../hooks/useToast";
import type { PrivateFeeItem, SchoolSettings } from "../../types";
import { captureEvent } from "../../utils/analytics";
import {
  DEFAULT_PAYMENT_NOTE,
  DEFAULT_PRIVATE_FEE_SLOTS,
  resolveEditablePrivateFeeItems,
  syncLegacyFeesFromItems,
} from "../../utils/privateSchoolFees";

export function SchoolIdentitySection() {
  const { formData, setFormData, isPersistenceSuspended } = useSettingsForm();
  const { showToast } = useToast();
  const [showResetFeeLabelsModal, setShowResetFeeLabelsModal] = useState(false);
  const curriculumLabelId = useId();
  const feeSlots = resolveEditablePrivateFeeItems(formData);
  const showFeeSchedule = formData.showFeeSchedule !== false;

  const handleResetFeeLabelsClick = () => {
    if (isPersistenceSuspended) return;
    const hasCustomLabels = feeSlots.some(
      (slot, index) => slot.label !== DEFAULT_PRIVATE_FEE_SLOTS[index].label,
    );
    if (!hasCustomLabels) {
      showToast("Fee labels are already set to defaults.", "info");
      return;
    }
    setShowResetFeeLabelsModal(true);
  };

  const confirmResetFeeLabels = () => {
    const resetSlots = feeSlots.map((slot, index) => ({
      ...slot,
      label: DEFAULT_PRIVATE_FEE_SLOTS[index].label,
    }));
    setFormData({
      ...formData,
      privateFeeItems: resetSlots,
      ...syncLegacyFeesFromItems(resetSlots),
    });
    setShowResetFeeLabelsModal(false);
    showToast("Fee labels restored to defaults. Amounts kept.", "success");
  };

  const handleSchoolTypeChange = (nextType: SchoolSettings["schoolType"]) => {
    if (formData.schoolType === nextType) return;
    const previousType = formData.schoolType || "STANDARD";
    setFormData({ ...formData, schoolType: nextType });
    captureEvent("School_Type_Changed", {
      previous_type: previousType,
      new_type: nextType,
      school_level: formData.level || "unknown",
    });
  };

  const updateFeeSlot = (index: number, patch: Partial<PrivateFeeItem>) => {
    const nextSlots = feeSlots.map((slot, idx) => (idx === index ? { ...slot, ...patch } : slot));
    const legacy = syncLegacyFeesFromItems(nextSlots);
    setFormData({
      ...formData,
      privateFeeItems: nextSlots,
      ...legacy,
    });
  };

  return (
    <>
      <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 space-y-6 border-0 p-0">
      {/* CARD 1: IDENTITY */}
      <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-950/60">
            <School className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-main text-lg font-bold" data-record="true">
            School Identity
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-[140px_1fr]">
          <div className="mx-auto w-32 md:w-full">
            <ImageUploader
              label="School Crest"
              value={formData.logoUrl}
              onChange={(val) => setFormData({ ...formData, logoUrl: val })}
            />
          </div>

          <div className="space-y-4">
            <Input
              label="School Name"
              type="text"
              required
              value={formData.schoolName}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              className="text-main font-bold"
              placeholder="e.g. Royal International School"
            />

            <Input
              label="Motto"
              type="text"
              value={formData.schoolMotto || ""}
              onChange={(e) => setFormData({ ...formData, schoolMotto: e.target.value })}
              className="italic"
              placeholder="e.g. Knowledge is Power"
            />

            <Input
              label="Address / Location"
              type="text"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Kumasi, Ashanti Region"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phoneNumber || ""}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="024 123 4567"
              />
              <Input
                label="Email Address"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="school@gmail.com"
              />
            </div>

            {/* School Type */}
            <div>
              <span
                id={curriculumLabelId}
                className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase"
              >
                Curriculum Type
              </span>
              <div
                role="radiogroup"
                aria-labelledby={curriculumLabelId}
                className="bg-background border-border-subtle flex flex-wrap gap-4 rounded-lg border p-3"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="schoolType"
                    checked={formData.schoolType === "STANDARD"}
                    onChange={() => handleSchoolTypeChange("STANDARD")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-secondary text-sm font-bold">Standard (GES)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="schoolType"
                    checked={formData.schoolType === "ISLAMIC"}
                    onChange={() => handleSchoolTypeChange("ISLAMIC")}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-secondary text-sm font-bold">Islamic / Arabic</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="schoolType"
                    checked={formData.schoolType === "PRIVATE"}
                    onChange={() => handleSchoolTypeChange("PRIVATE")}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-secondary text-sm font-bold">Private School</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Private School 3-Slot Fee Schedule */}
      {formData.schoolType === "PRIVATE" && (
        <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50/70 p-4 sm:p-5 dark:border-purple-800/70 dark:bg-purple-950/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3
                className="text-xs font-bold tracking-wider text-purple-900 uppercase dark:text-purple-200"
                data-record="true"
              >
                Fee Schedule (3 A4 Slots)
              </h3>
              <p className="mt-0.5 text-xs text-purple-700 dark:text-purple-300">
                Customize labels, amounts, and toggle each of the 3 slots on or off while keeping
                every template on one A4 page.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="bg-surface inline-flex cursor-pointer items-center gap-2 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-900 dark:border-purple-800/70 dark:text-purple-200">
                <input
                  type="checkbox"
                  checked={showFeeSchedule}
                  onChange={(e) => setFormData({ ...formData, showFeeSchedule: e.target.checked })}
                  className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                />
                <span>Show on Report Card</span>
              </label>

              <button
                type="button"
                onClick={handleResetFeeLabelsClick}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline dark:text-purple-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Labels
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {feeSlots.map((slot, index) => (
              <div
                key={slot.id}
                className={`grid grid-cols-1 gap-3 rounded-lg border p-3 transition-colors sm:grid-cols-[auto_1.4fr_1fr_1fr] sm:items-end ${
                  slot.enabled
                    ? "bg-surface border-purple-200 dark:border-purple-800/70"
                    : "border-border bg-subtle opacity-75"
                }`}
              >
                <label className="flex cursor-pointer items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    aria-label={`Enable slot ${index + 1}`}
                    checked={slot.enabled}
                    onChange={(e) => updateFeeSlot(index, { enabled: e.target.checked })}
                    className="border-border-strong h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-secondary text-xs font-bold sm:hidden">
                    Item {index + 1} Active
                  </span>
                </label>

                <Input
                  label={`Item ${index + 1} Name`}
                  type="text"
                  maxLength={40}
                  value={slot.label}
                  onChange={(e) => updateFeeSlot(index, { label: e.target.value })}
                  placeholder={DEFAULT_PRIVATE_FEE_SLOTS[index].label}
                />

                <Input
                  label="Amount (GH₵)"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={slot.amount || ""}
                  onChange={(e) =>
                    updateFeeSlot(index, {
                      amount: e.target.value ? Math.max(0, parseFloat(e.target.value)) : 0,
                    })
                  }
                  placeholder="0.00"
                />

                <div>
                  <label className="text-muted mb-1 block text-xs font-bold uppercase">
                    Cycle
                  </label>
                  <select
                    aria-label={`Item ${index + 1} Cycle`}
                    value={slot.cycle}
                    onChange={(e) => updateFeeSlot(index, { cycle: e.target.value })}
                    className="border-border-strong bg-input text-main w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 sm:py-2"
                  >
                    <option value="Per Term">Per Term</option>
                    <option value="Daily">Daily</option>
                    <option value="Per Month">Per Month</option>
                    <option value="One-Time">One-Time</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-purple-200 pt-3 dark:border-purple-800/70">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200">
              <input
                type="checkbox"
                checked={Boolean(formData.showStudentFeeArrearsOnReport)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    showStudentFeeArrearsOnReport: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
              <span>Print student&apos;s outstanding fee arrears inline (when &gt; GH₵0)</span>
            </label>

            <Input
              label="Payment Note (Single-line on report)"
              type="text"
              maxLength={240}
              value={formData.feePaymentNote ?? ""}
              onChange={(e) => setFormData({ ...formData, feePaymentNote: e.target.value })}
              placeholder={DEFAULT_PAYMENT_NOTE}
            />
          </div>
        </div>
      )}

      {/* CARD 3: STAFF */}
      <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-950/60">
            <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-main text-lg font-bold" data-record="true">
            Staff Details
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <Input
              label="Head Teacher Name"
              type="text"
              value={formData.headTeacherName || ""}
              onChange={(e) => setFormData({ ...formData, headTeacherName: e.target.value })}
            />
            <ImageUploader
              label="Head Teacher Signature"
              value={formData.headTeacherSignature}
              onChange={(val) => setFormData({ ...formData, headTeacherSignature: val })}
              maxHeight="h-24"
            />
          </div>

          <div className="space-y-4">
            <Input
              label="Class Teacher Name"
              type="text"
              value={formData.classTeacherName || ""}
              onChange={(e) => setFormData({ ...formData, classTeacherName: e.target.value })}
            />
            <ImageUploader
              label="Class Teacher Signature"
              value={formData.teacherSignature}
              onChange={(val) => setFormData({ ...formData, teacherSignature: val })}
              maxHeight="h-24"
            />
          </div>
        </div>
      </div>
      </fieldset>

      <ConfirmModal
        isOpen={showResetFeeLabelsModal}
        title="Reset Fee Labels?"
        message="This will restore the 3 fee slot names to their defaults (School Fees, Canteen Fees, First Aid Fees). Your entered GH₵ amounts and cycles will be kept."
        confirmText="Yes, Reset Labels"
        isDangerous={false}
        onClose={() => setShowResetFeeLabelsModal(false)}
        onConfirm={confirmResetFeeLabels}
      />
    </>
  );
}
