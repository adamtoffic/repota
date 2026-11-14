import { Briefcase, School } from "lucide-react";
import { ImageUploader } from "../ImageUploader";
import { Input } from "../ui";
import { useSettingsForm } from "../../hooks/useSettingsForm";

export function SchoolIdentitySection() {
  const { formData, setFormData, isPersistenceSuspended } = useSettingsForm();

  return (
    <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 space-y-6 border-0 p-0">
      {/* CARD 1: IDENTITY */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2.5">
            <School className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800" data-record="true">
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
              <label className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase">
                Curriculum Type
              </label>
              <div className="bg-background flex flex-wrap gap-4 rounded-lg border border-gray-100 p-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="schoolType"
                    checked={formData.schoolType === "STANDARD"}
                    onChange={() => setFormData({ ...formData, schoolType: "STANDARD" })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-gray-700">Standard (GES)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="schoolType"
                    checked={formData.schoolType === "ISLAMIC"}
                    onChange={() => setFormData({ ...formData, schoolType: "ISLAMIC" })}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-bold text-gray-700">Islamic / Arabic</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="schoolType"
                    checked={formData.schoolType === "PRIVATE"}
                    onChange={() => setFormData({ ...formData, schoolType: "PRIVATE" })}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-bold text-gray-700">Private School</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Private School Fees */}
      {formData.schoolType === "PRIVATE" && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <label className="text-muted mb-1 block text-xs font-bold tracking-wide uppercase">
            <span className="text-purple-900">Fee Schedule (GH₵)</span>
          </label>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={
                <span>
                  School Fees <span className="text-[10px] text-slate-600">(Per Term)</span>
                </span>
              }
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={formData.schoolGift || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  schoolGift: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="5.00"
            />

            <Input
              label={
                <span>
                  Canteen Fees <span className="text-[10px] text-purple-600">(Daily)</span>
                </span>
              }
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={formData.canteenFees || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  canteenFees: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="10.00"
            />

            <Input
              label={
                <span>
                  First Aid <span className="text-[10px] text-green-700">(Per Term)</span>
                </span>
              }
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={formData.firstAidFees || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  firstAidFees: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="5.00"
            />
          </div>
        </div>
      )}

      {/* CARD 3: STAFF */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2.5">
            <Briefcase className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800" data-record="true">
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
  );
}
