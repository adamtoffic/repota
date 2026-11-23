import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarCheck,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";
import type { ProcessedStudent, StudentRecord } from "../../types";
import { useSchoolSettings, useSchoolStudents } from "../../hooks/useSchoolData";
import {
  generateAttendanceRating,
  generateTeacherRemark,
  getRandomConductTrait,
  getRandomInterest,
} from "../../utils/remarkGenerator";
import { hasNoScoresEntered } from "../../utils/studentValidation";
import { ImageUploader } from "../ImageUploader";
import { Input } from "../ui";

interface Props {
  student: ProcessedStudent;
  onUpdate: (updatedRecord: StudentRecord, silent?: boolean) => void;
}

export function DetailsTab({ student, onUpdate }: Props) {
  const settings = useSchoolSettings();
  const students = useSchoolStudents();
  const fieldPrefix = useId();

  const totalDays = settings.totalAttendanceDays || 60;
  const isUnscored = hasNoScoresEntered(student);

  const [formData, setFormData] = useState({
    name: student.name,
    className: student.className,
    dateOfBirth: student.dateOfBirth || "",
    gender: student.gender || "",
    attendancePresent: student.attendancePresent || 0,
    conduct: student.conduct || "",
    interest: student.interest || "",
    teacherRemark: student.teacherRemark || "",
    promotionStatus: student.promotionStatus || "",
    pictureUrl: student.pictureUrl || "",
    admissionNumber: student.admissionNumber || "",
    feeStatus: student.feeStatus || "",
    feeArrears: student.feeArrears ?? 0,
    guardianPhone: student.guardianPhone || "",
  });

  const [nameError, setNameError] = useState<string | null>(null);
  const [attendanceHint, setAttendanceHint] = useState<string | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current !== null) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  const buildRecord = (data: typeof formData): StudentRecord => ({
    ...student,
    subjects: student.subjects,
    name: data.name,
    className: data.className,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender as "Male" | "Female",
    attendancePresent: data.attendancePresent,
    conduct: data.conduct,
    interest: data.interest,
    teacherRemark: data.teacherRemark,
    promotionStatus: data.promotionStatus,
    pictureUrl: data.pictureUrl,
    admissionNumber: data.admissionNumber.trim() || undefined,
    feeStatus: (data.feeStatus || undefined) as StudentRecord["feeStatus"],
    feeArrears: data.feeArrears > 0 ? data.feeArrears : undefined,
    guardianPhone: data.guardianPhone.trim() || undefined,
  });

  const showPrivateAdminCard =
    settings.schoolType === "PRIVATE" ||
    Boolean(
      student.admissionNumber ||
        student.feeStatus ||
        (student.feeArrears && student.feeArrears > 0) ||
        student.guardianPhone,
    );

  const handleImmediateSave = (updates: Partial<typeof formData>) => {
    const nextData = { ...formData, ...updates };
    setFormData(nextData);
    onUpdate(buildRecord(nextData), true);
  };

  const handleNameChange = (value: string) => {
    if (value.trim().length === 0) {
      setFormData((prev) => ({ ...prev, name: value }));
      setNameError("Student name cannot be empty");
      return;
    }
    setNameError(null);
    handleImmediateSave({ name: value });
  };

  const handleNameBlur = () => {
    if (formData.name.trim().length === 0) {
      setFormData((prev) => ({ ...prev, name: student.name }));
      setNameError(null);
    }
  };

  const handleAttendanceChange = (value: string) => {
    if (value === "") {
      setAttendanceHint(null);
      handleImmediateSave({ attendancePresent: 0 });
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const clamped = Math.min(Math.max(Math.round(parsed), 0), totalDays);
    if (parsed > totalDays) {
      setAttendanceHint(`Max ${totalDays} days`);
      if (hintTimerRef.current !== null) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = window.setTimeout(() => setAttendanceHint(null), 2000);
    } else if (attendanceHint) {
      setAttendanceHint(null);
    }

    handleImmediateSave({ attendancePresent: clamped });
  };

  const remarkExcludeList = useMemo(() => {
    const exclude: string[] = [];
    if (formData.teacherRemark.trim()) exclude.push(formData.teacherRemark);
    for (const peer of students) {
      if (peer.id !== student.id && peer.teacherRemark?.trim()) {
        exclude.push(peer.teacherRemark);
      }
    }
    return exclude;
  }, [formData.teacherRemark, students, student.id]);

  const canAutoFillEmpty =
    !formData.conduct.trim() ||
    !formData.interest.trim() ||
    (!formData.teacherRemark.trim() && !isUnscored);

  const handleAutoFillEmpty = () => {
    const updates: Partial<typeof formData> = {};
    if (!formData.conduct.trim()) {
      updates.conduct = getRandomConductTrait(formData.conduct);
    }
    if (!formData.interest.trim()) {
      updates.interest = getRandomInterest(formData.interest);
    }
    if (!formData.teacherRemark.trim() && !isUnscored) {
      updates.teacherRemark = generateTeacherRemark(
        student,
        formData.attendancePresent,
        totalDays,
        settings.level,
        remarkExcludeList,
      );
    }
    if (Object.keys(updates).length > 0) {
      handleImmediateSave(updates);
    }
  };

  const attendancePct =
    formData.attendancePresent > 0
      ? Math.round((formData.attendancePresent / totalDays) * 100)
      : 0;
  const attendanceRating =
    formData.attendancePresent > 0 ? generateAttendanceRating(attendancePct) : null;

  const attendanceInputId = `${fieldPrefix}-attendance`;
  const promotionSelectId = `${fieldPrefix}-promotion`;
  const remarkTextareaId = `${fieldPrefix}-remark`;
  const feeStatusSelectId = `${fieldPrefix}-fee-status`;

  const presetPromotionValues = [
    "",
    "Promoted to Next Class",
    `Repeated ${student.className}`,
    "Promoted on Probation",
    "Withdrawn",
  ];
  const hasCustomPromotionStatus =
    Boolean(formData.promotionStatus) &&
    !presetPromotionValues.includes(formData.promotionStatus);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* 1. IDENTITY CARD (Photo + Basic Info) */}
      <div className="border-border bg-surface rounded-xl border p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-5 sm:flex-row">
          {/* PHOTO COLUMN */}
          <div className="flex flex-col items-center gap-2 sm:w-1/3">
            <div className="w-32 sm:w-full">
              <ImageUploader
                label="Student Photo"
                value={formData.pictureUrl}
                onChange={(val) => handleImmediateSave({ pictureUrl: val || "" })}
                maxHeight="h-32 sm:h-40"
              />
            </div>
          </div>

          {/* DETAILS COLUMN */}
          <div className="flex-1 space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              error={nameError ?? undefined}
              className="text-main font-bold"
              placeholder="e.g. Kwame Mensah"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleImmediateSave({ dateOfBirth: e.target.value })}
              />

              <div>
                <span
                  className="text-secondary mb-1.5 block text-sm font-medium"
                  data-record="true"
                >
                  Gender
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={formData.gender === "Male"}
                    onClick={() => handleImmediateSave({ gender: "Male" })}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors sm:py-2.5 sm:text-sm ${
                      formData.gender === "Male"
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800/60"
                        : "border-border-strong bg-surface text-secondary hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                    data-record="true"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Male</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={formData.gender === "Female"}
                    onClick={() => handleImmediateSave({ gender: "Female" })}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors sm:py-2.5 sm:text-sm ${
                      formData.gender === "Female"
                        ? "border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:ring-pink-800/60"
                        : "border-border-strong bg-surface text-secondary hover:border-pink-300 dark:hover:border-pink-600"
                    }`}
                    data-record="true"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Female</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ATTENDANCE & PROMOTION */}
      <div className="border-border bg-surface rounded-xl border p-4 shadow-xs sm:p-5">
        <h3
          className="text-main mb-3.5 flex items-center gap-2 text-sm font-semibold"
          data-record="true"
        >
          <CalendarCheck className="text-primary-text h-4 w-4" />
          <span>Attendance &amp; Promotion</span>
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor={attendanceInputId}
                className="text-secondary text-xs font-semibold"
                data-record="true"
              >
                Days Present
              </label>
              {attendanceRating && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 tabular-nums dark:bg-emerald-950/60 dark:text-emerald-300">
                  {attendancePct}% · {attendanceRating}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id={attendanceInputId}
                name={attendanceInputId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={formData.attendancePresent === 0 ? "" : formData.attendancePresent}
                onChange={(e) => handleAttendanceChange(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                className="border-border-strong bg-input text-main placeholder:text-muted w-full rounded-lg border px-4 py-2.5 pr-16 font-mono font-bold transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                placeholder="0"
              />
              <span className="text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums">
                / {totalDays}
              </span>
            </div>
            {attendanceHint && (
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {attendanceHint}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={promotionSelectId}
              className="text-secondary mb-1.5 block text-xs font-semibold"
              data-record="true"
            >
              Promotion Status
            </label>
            <select
              id={promotionSelectId}
              value={formData.promotionStatus}
              onChange={(e) => handleImmediateSave({ promotionStatus: e.target.value })}
              className="border-border-strong bg-input text-main w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">-- Select Status --</option>
              <option value="Promoted to Next Class">Promoted</option>
              <option value={`Repeated ${student.className}`}>Repeated</option>
              <option value="Promoted on Probation">Probation</option>
              <option value="Withdrawn">Withdrawn</option>
              {hasCustomPromotionStatus && (
                <option value={formData.promotionStatus}>{formData.promotionStatus}</option>
              )}
            </select>
            {settings.term !== "Third Term" && (
              <p className="text-muted mt-1 text-[11px]" data-record="true">
                Shown on Third Term reports
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. QUALITATIVE ASSESSMENT */}
      <div className="border-border bg-surface rounded-xl border p-4 shadow-xs sm:p-5">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <h3
            className="text-main flex items-center gap-2 text-sm font-semibold"
            data-record="true"
          >
            <MessageSquareText className="text-primary-text h-4 w-4" />
            <span>Qualitative Assessment</span>
          </h3>

          <button
            type="button"
            onClick={handleAutoFillEmpty}
            disabled={!canAutoFillEmpty}
            className="border-border-strong bg-subtle text-secondary hover:bg-surface hover:text-main inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            data-record="true"
          >
            <Sparkles className="text-primary-text h-3.5 w-3.5" />
            <span>Auto-fill Empty</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* CONDUCT */}
          <Input
            label={
              <span className="flex items-center justify-between gap-2">
                <span>Conduct / Character</span>
                <button
                  type="button"
                  onClick={() =>
                    handleImmediateSave({ conduct: getRandomConductTrait(formData.conduct) })
                  }
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-950/50"
                >
                  <RefreshCw className="h-3 w-3" /> Shuffle
                </button>
              </span>
            }
            type="text"
            placeholder="e.g. Respectful and neat"
            value={formData.conduct}
            onChange={(e) => handleImmediateSave({ conduct: e.target.value })}
          />

          {/* INTEREST */}
          <Input
            label={
              <span className="flex items-center justify-between gap-2">
                <span>Interest / Talent</span>
                <button
                  type="button"
                  onClick={() =>
                    handleImmediateSave({ interest: getRandomInterest(formData.interest) })
                  }
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-950/50"
                >
                  <RefreshCw className="h-3 w-3" /> Shuffle
                </button>
              </span>
            }
            type="text"
            placeholder="e.g. Football"
            value={formData.interest}
            onChange={(e) => handleImmediateSave({ interest: e.target.value })}
          />

          {/* TEACHER REMARK */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor={remarkTextareaId}
                className="text-secondary text-sm font-medium"
                data-record="true"
              >
                Teacher&apos;s Remark
              </label>
              <button
                type="button"
                disabled={isUnscored}
                onClick={() =>
                  handleImmediateSave({
                    teacherRemark: generateTeacherRemark(
                      student,
                      formData.attendancePresent,
                      totalDays,
                      settings.level,
                      remarkExcludeList,
                    ),
                  })
                }
                title={
                  isUnscored
                    ? "Enter at least one score first"
                    : "Generate a remark matched to scores and attendance"
                }
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-purple-600 hover:bg-purple-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 dark:text-purple-400 dark:hover:bg-purple-950/50"
                data-record="true"
              >
                <Wand2 className="h-3 w-3" /> Smart Generate
              </button>
            </div>
            <textarea
              id={remarkTextareaId}
              rows={2}
              placeholder="Write a custom remark..."
              value={formData.teacherRemark}
              onChange={(e) => handleImmediateSave({ teacherRemark: e.target.value })}
              className="border-border-strong bg-input text-main placeholder:text-muted w-full resize-none rounded-lg border px-4 py-2.5 text-sm transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            {isUnscored && (
              <p className="text-muted mt-1 text-[11px]" data-record="true">
                Enter at least one score to auto-generate a performance-matched remark.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. PRIVATE SCHOOL ADMINISTRATION & FEE TRACKING */}
      {showPrivateAdminCard && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 shadow-xs sm:p-5 dark:border-purple-800/70 dark:bg-purple-950/35">
          <h3
            className="mb-1 flex items-center gap-2 text-sm font-semibold text-purple-950 dark:text-purple-200"
            data-record="true"
          >
            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Private School Admin &amp; Fee Tracking</span>
          </h3>
          <p className="text-muted mb-4 text-xs" data-record="true">
            Track admission ID, guardian contact, and fee arrears for class &amp; bursar analytics.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Admission / ID Number"
              type="text"
              maxLength={40}
              value={formData.admissionNumber}
              onChange={(e) => handleImmediateSave({ admissionNumber: e.target.value })}
              placeholder="e.g. RIS-2026-014"
            />

            <Input
              label="Guardian Phone"
              type="tel"
              maxLength={30}
              value={formData.guardianPhone}
              onChange={(e) => handleImmediateSave({ guardianPhone: e.target.value })}
              placeholder="e.g. 024 000 0000"
            />

            <div>
              <label
                htmlFor={feeStatusSelectId}
                className="text-secondary mb-1.5 block text-sm font-medium"
                data-record="true"
              >
                Fee Payment Status
              </label>
              <select
                id={feeStatusSelectId}
                aria-label="Fee Payment Status"
                value={formData.feeStatus}
                onChange={(e) => handleImmediateSave({ feeStatus: e.target.value })}
                className="border-border-strong bg-input text-main w-full rounded-lg border p-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
              >
                <option value="">-- Not Tracked --</option>
                <option value="PAID">Paid in Full</option>
                <option value="PART_PAID">Part-Paid</option>
                <option value="OWING">Owing</option>
                <option value="SCHOLARSHIP">Scholarship / Exempt</option>
              </select>
            </div>

            <Input
              label="Fee Arrears (GH₵)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={formData.feeArrears === 0 ? "" : formData.feeArrears}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                handleImmediateSave({
                  feeArrears: e.target.value && Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                });
              }}
              placeholder="0.00"
            />
          </div>
        </div>
      )}
    </div>
  );
}
