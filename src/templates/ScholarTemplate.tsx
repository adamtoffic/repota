import { memo } from "react";
import type { ReportTemplateProps } from "../types";
import {
  DEFAULT_PAYMENT_NOTE,
  getActivePrivateFeeItems,
  resolvePositionVisibility,
} from "../utils/privateSchoolFees";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";
import { getReportPalette } from "../utils/reportTheme";

export const ScholarTemplate = memo(function ScholarTemplate({
  student,
  settings,
  printMode,
}: ReportTemplateProps) {
  const isIslamic = settings.schoolType === "ISLAMIC";
  const isPrivate = settings.schoolType === "PRIVATE";
  const isKG = settings.level === "KG";
  const isMock = settings.examType === "MOCK";
  const isThirdTerm = settings.term === "Third Term";

  const activeFees = getActivePrivateFeeItems(settings);
  const hasAnyFee = activeFees.length > 0;
  const showArrears =
    isPrivate &&
    Boolean(settings.showStudentFeeArrearsOnReport) &&
    typeof student.feeArrears === "number" &&
    student.feeArrears > 0;
  const paymentNote = settings.feePaymentNote?.trim() || DEFAULT_PAYMENT_NOTE;

  const { showClassPositionHeader, showClassPositionSummary, showSubjectPosition } =
    resolvePositionVisibility(settings);
  const showAggregate = !isKG && student.aggregate !== null;
  const headmasterRemark = generateHeadmasterRemark(
    student.averageScore,
    settings.term,
    [],
    `${student.id}|${settings.term}|${student.averageScore}`,
  );

  const isBW = printMode === "bw";
  const imgFilter = isBW ? "grayscale" : "";
  const palette = getReportPalette({
    settings,
    printMode,
    defaultPrimary: "#0f766e",
    defaultAccent: "#1e3a8a",
  });

  // 3-tier A4 density so 6–18 subjects stay on one clean editorial sheet
  const subjectCount = student.subjects.length;
  const density =
    subjectCount > 14
      ? { rowPy: "py-0.5", text: "text-[10px]", header: "text-[9px]" }
      : subjectCount > 10
        ? { rowPy: "py-1", text: "text-[11px]", header: "text-[10px]" }
        : { rowPy: "py-1.5", text: "text-xs", header: "text-[10px]" };

  const softBorderStyle = { borderColor: palette.primaryBorder };
  const ruleStyle = { borderColor: palette.primaryDark };
  const nextTermLabel = settings.nextTermStarts
    ? new Date(settings.nextTermStarts).toLocaleDateString("en-GB")
    : "TBD";

  return (
    <div
      className={`report-page relative mx-auto box-border grid min-h-[297mm] w-[210mm] grid-rows-[auto_auto_1fr_auto_auto] gap-3 bg-white p-[9mm] text-gray-900 print:h-[297mm] print:overflow-hidden ${
        isIslamic ? "font-arabic" : "font-sans"
      }`}
    >
      {/* Subtle watermark */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 bg-[url('/assets/coat-of-arms.png')] bg-size-[44%] bg-center bg-no-repeat opacity-[0.025] ${imgFilter}`}
      />

      {/* =====================================================================
          1. SWISS / EDITORIAL MASTHEAD
         ===================================================================== */}
      <header
        className="relative z-10 flex items-center justify-between gap-4 border-b-2 pb-3"
        style={ruleStyle}
      >
        <div className="flex min-w-0 flex-1 items-stretch gap-3">
          {/* Vertical institutional spine */}
          <div
            className="w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: palette.primaryDark }}
          />
          <div className="min-w-0 flex-1">
            {isIslamic && (
              <p
                className="font-arabic mb-0.5 text-xs font-bold"
                style={{ color: palette.primary }}
              >
                بسم الله الرحمن الرحيم
              </p>
            )}
            <div className="flex flex-wrap items-baseline gap-2">
              <h1
                className="text-xl font-black tracking-tight uppercase"
                style={{ color: palette.primaryDark }}
              >
                {settings.schoolName}
              </h1>
              <span
                className={`rounded-sm px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${
                  isBW ? "border border-black" : ""
                }`}
                style={{
                  backgroundColor: palette.bannerBg,
                  color: palette.bannerText,
                }}
              >
                {isMock ? "Mock Assessment" : isKG ? "Early Years" : "Academic Record"}
              </span>
            </div>
            {settings.schoolMotto && (
              <p className="text-[11px] font-medium text-gray-600">{settings.schoolMotto}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-gray-500">
              {settings.address && <span>{settings.address}</span>}
              {settings.phoneNumber && <span>Tel: {settings.phoneNumber}</span>}
              {settings.email && <span>{settings.email}</span>}
            </div>
          </div>
        </div>

        {/* Right: Term Meta + School Crest */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right text-[10px]">
            <p className="font-black tracking-wider uppercase" style={{ color: palette.primary }}>
              {settings.term}
            </p>
            <p className="font-bold text-gray-700">{settings.academicYear}</p>
            <p className="text-gray-500">{student.className || settings.className || settings.level}</p>
          </div>
          {settings.logoUrl ? (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-white p-1"
              style={softBorderStyle}
            >
              <img
                src={settings.logoUrl}
                alt="School Crest"
                className={`h-full w-full object-contain ${imgFilter}`}
              />
            </div>
          ) : (
            <div className="h-14 w-14 shrink-0" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* =====================================================================
          2. STUDENT DOSSIER + EXECUTIVE KPI STRIP
         ===================================================================== */}
      <section className="relative z-10 space-y-2">
        <div
          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
          style={{ ...softBorderStyle, backgroundColor: palette.primarySoft }}
        >
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold tracking-wider text-gray-500 uppercase">
              Candidate Name
            </span>
            <p className="truncate text-sm font-black text-gray-900 uppercase">{student.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-[11px]">
            <div>
              <span className="block text-[9px] font-bold text-gray-500 uppercase">Class Size</span>
              <span className="font-bold text-gray-900">{settings.classSize || "-"}</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-gray-500 uppercase">Next Term</span>
              <span className="font-bold text-gray-900">{nextTermLabel}</span>
            </div>
            {student.pictureUrl && (
              <div
                className="h-11 w-11 shrink-0 overflow-hidden rounded border bg-white"
                style={softBorderStyle}
              >
                <img
                  src={student.pictureUrl}
                  alt={student.name}
                  className={`h-full w-full object-cover ${imgFilter}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards Row */}
        <div
          className={`grid gap-2 ${
            showClassPositionHeader && showAggregate
              ? "grid-cols-4"
              : showClassPositionHeader || showAggregate
                ? "grid-cols-3"
                : "grid-cols-2"
          }`}
        >
          <div className="rounded-md border px-3 py-1.5" style={softBorderStyle}>
            <span className="block text-[9px] font-bold tracking-wider text-gray-500 uppercase">
              Overall Average
            </span>
            <span
              className="text-base font-black tabular-nums"
              style={{ color: palette.primaryDark }}
            >
              {student.averageScore}%
            </span>
          </div>

          <div className="rounded-md border px-3 py-1.5" style={softBorderStyle}>
            <span className="block text-[9px] font-bold tracking-wider text-gray-500 uppercase">
              Attendance
            </span>
            <span className="text-base font-black text-gray-900 tabular-nums">
              {student.attendancePresent ?? "-"} / {settings.totalAttendanceDays || "-"}
            </span>
          </div>

          {showClassPositionHeader && (
            <div
              className={`rounded-md border px-3 py-1.5 ${isBW ? "border-black" : ""}`}
              style={{
                borderColor: palette.primaryDark,
                backgroundColor: palette.highlightBg,
                color: palette.highlightText,
              }}
            >
              <span className="block text-[9px] font-bold tracking-wider uppercase opacity-85">
                Position
              </span>
              <span className="text-base font-black">{student.classPosition || "-"}</span>
            </div>
          )}

          {showAggregate && (
            <div className="rounded-md border px-3 py-1.5" style={softBorderStyle}>
              <span className="block text-[9px] font-bold tracking-wider text-gray-500 uppercase">
                Aggregate
              </span>
              <span
                className="text-base font-black tabular-nums"
                style={{ color: palette.primaryDark }}
              >
                {student.aggregate}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          3. SUBJECT PERFORMANCE TABLE WITH MASTERY BARS
         ===================================================================== */}
      <main className="relative z-10">
        <div className="overflow-hidden rounded-md border" style={softBorderStyle}>
          <table className="w-full border-collapse">
            <thead>
              <tr
                className={`border-b text-left uppercase ${density.header} ${
                  isBW ? "border-black" : ""
                }`}
                style={{
                  backgroundColor: palette.bannerBg,
                  color: palette.bannerText,
                  borderColor: palette.primaryDark,
                }}
              >
                <th className="px-2.5 py-2 font-bold">Subject</th>
                {!isMock && (
                  <>
                    <th className="w-15 px-1.5 py-2 text-center font-bold">
                      Class ({settings.classScoreMax})
                    </th>
                    <th className="w-15 px-1.5 py-2 text-center font-bold">
                      Exam ({settings.examScoreMax})
                    </th>
                  </>
                )}
                <th className="w-28 px-2 py-2 font-bold">
                  {isMock ? "Score & Mastery" : "Total & Mastery"}
                </th>
                <th className="w-14 px-1.5 py-2 text-center font-bold">Grade</th>
                {showSubjectPosition && (
                  <th className="w-12 px-1.5 py-2 text-center font-bold">Pos.</th>
                )}
                <th className="w-28 px-2 py-2 font-bold">Remark</th>
              </tr>
            </thead>
            <tbody className={density.text}>
              {student.subjects.map((sub, idx) => {
                const barWidth = Math.max(0, Math.min(100, sub.totalScore));
                const g = String(sub.grade);
                const isHigh = ["1", "2", "A1", "GOLD"].includes(g);
                const isLow = ["9", "F9", "BRONZE"].includes(g);
                const gradeClasses = isBW
                  ? "border-black bg-gray-100 text-black"
                  : isLow
                    ? "border-red-300 bg-red-50 text-red-700"
                    : isHigh
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-gray-50 text-gray-800";

                return (
                  <tr
                    key={sub.id}
                    className="border-b last:border-b-0"
                    style={{
                      borderColor: palette.primaryBorder,
                      backgroundColor: idx % 2 === 1 ? palette.zebraBg : "#ffffff",
                    }}
                  >
                    <td className={`px-2.5 ${density.rowPy} font-semibold text-gray-900`}>
                      {sub.name}
                    </td>
                    {!isMock && (
                      <>
                        <td
                          className={`px-1.5 ${density.rowPy} text-center text-gray-600 tabular-nums`}
                        >
                          {sub.classScore}
                        </td>
                        <td
                          className={`px-1.5 ${density.rowPy} text-center text-gray-600 tabular-nums`}
                        >
                          {sub.examScore}
                        </td>
                      </>
                    )}
                    <td className={`px-2 ${density.rowPy}`}>
                      <div className="flex items-center gap-2">
                        <span className="w-7 text-right font-black text-gray-900 tabular-nums">
                          {sub.totalScore}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: palette.barFill,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={`px-1.5 ${density.rowPy} text-center`}>
                      <span
                        className={`inline-block min-w-6 rounded border px-1 py-0.5 text-[10px] font-black ${gradeClasses}`}
                      >
                        {sub.grade}
                      </span>
                    </td>
                    {showSubjectPosition && (
                      <td
                        className={`px-1.5 ${density.rowPy} text-center font-semibold text-gray-700`}
                      >
                        {sub.subjectPosition || "-"}
                      </td>
                    )}
                    <td className={`px-2 ${density.rowPy} font-medium text-gray-700`}>
                      {sub.remark}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* =====================================================================
          4. EDITORIAL EVALUATION & PROMOTION STATUS
         ===================================================================== */}
      <section className="relative z-10 space-y-2">
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs"
          style={softBorderStyle}
        >
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-[10px] text-gray-500 uppercase">Total Marks:</strong>{" "}
              <strong className="text-gray-900 tabular-nums">{student.totalScore}</strong>
            </span>
            {showClassPositionSummary && (
              <span>
                <strong className="text-[10px] text-gray-500 uppercase">Position in Class:</strong>{" "}
                <strong className="text-gray-900">{student.classPosition || "-"}</strong>
              </span>
            )}
            <span>
              <strong className="text-[10px] text-gray-500 uppercase">Conduct:</strong>{" "}
              <span className="font-semibold text-gray-800">
                {student.conduct || "Satisfactory"}
              </span>
            </span>
            <span>
              <strong className="text-[10px] text-gray-500 uppercase">Interest:</strong>{" "}
              <span className="font-semibold text-gray-800">
                {student.interest || "Reading & Science"}
              </span>
            </span>
          </div>

          {isThirdTerm && student.promotionStatus && (
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase ${
                isBW ? "border-black bg-gray-100 text-black" : "bg-white text-gray-900"
              }`}
              style={
                isBW
                  ? undefined
                  : { borderColor: palette.primaryDark, color: palette.primaryDark }
              }
            >
              {student.promotionStatus}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
          <div className="rounded-md border px-3 py-2" style={softBorderStyle}>
            <span className="block text-[9px] font-bold tracking-wider text-gray-500 uppercase">
              Teacher&apos;s Assessment
            </span>
            <p className="mt-0.5 text-gray-800">
              {student.teacherRemark || "Consistent engagement across term subjects."}
            </p>
          </div>
          <div className="rounded-md border px-3 py-2" style={softBorderStyle}>
            <span className="block text-[9px] font-bold tracking-wider text-gray-500 uppercase">
              Headteacher&apos;s Remark
            </span>
            <p className="mt-0.5 text-gray-800">{headmasterRemark}</p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. FEE SCHEDULE (PRIVATE ONLY) & SIGNATURES FOOTER
         ===================================================================== */}
      <footer className="relative z-10 space-y-2.5">
        {isPrivate && settings.showFeeSchedule !== false && (hasAnyFee || showArrears) && (
          <div
            className="rounded-md border p-2.5"
            style={{ ...softBorderStyle, backgroundColor: palette.primarySoft }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className="text-[10px] font-black tracking-wider uppercase"
                style={{ color: palette.primaryDark }}
              >
                Term Fees Statement
              </span>
              {showArrears && (
                <span
                  className={`text-xs font-black ${
                    isBW ? "text-black underline" : "text-red-700"
                  }`}
                >
                  Arrears: GH₵{student.feeArrears!.toFixed(2)}
                </span>
              )}
            </div>

            {hasAnyFee && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                {activeFees.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <span className="text-gray-700">{item.label}:</span>
                    <span className="font-bold text-gray-900 tabular-nums">
                      GH₵{item.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-1 text-[9px] text-gray-600">{paymentNote}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-10 pt-2">
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-8 w-44 items-end justify-center border-b border-dashed border-gray-500 pb-0.5">
              {settings.teacherSignature && (
                <img
                  src={settings.teacherSignature}
                  alt="Class Teacher Signature"
                  className={`max-h-7 object-contain ${imgFilter}`}
                />
              )}
            </div>
            <p className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">
              {settings.classTeacherName || "Class Teacher"} &bull; Signature
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-8 w-44 items-end justify-center border-b border-dashed border-gray-500 pb-0.5">
              {settings.headTeacherSignature && (
                <img
                  src={settings.headTeacherSignature}
                  alt="Headteacher Signature"
                  className={`max-h-7 object-contain ${imgFilter}`}
                />
              )}
            </div>
            <p className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">
              {settings.headTeacherName || "Headteacher"} &bull; Authorised Signature
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});
