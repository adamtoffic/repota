import { memo } from "react";
import type { ReportTemplateProps } from "../types";
import {
  DEFAULT_PAYMENT_NOTE,
  getActivePrivateFeeItems,
  resolvePositionVisibility,
} from "../utils/privateSchoolFees";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";
import { getReportPalette } from "../utils/reportTheme";

export const HeritageTemplate = memo(function HeritageTemplate({
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
    defaultPrimary: "#78350f",
    defaultAccent: "#d97706",
  });

  // 3-tier A4 density so 6–18 subjects stay on one framed sheet
  const subjectCount = student.subjects.length;
  const density =
    subjectCount > 14
      ? { rowPy: "py-0.5", text: "text-[10px]", header: "text-[9px]" }
      : subjectCount > 10
        ? { rowPy: "py-1", text: "text-[11px]", header: "text-[10px]" }
        : { rowPy: "py-2", text: "text-xs", header: "text-[10px]" };

  const outerFrameStyle = { borderColor: palette.primaryDark };
  const innerFrameStyle = { borderColor: palette.accent };
  const cornerStyle = { borderColor: palette.accent };
  const nextTermLabel = settings.nextTermStarts
    ? new Date(settings.nextTermStarts).toLocaleDateString("en-GB")
    : "To Be Announced";

  return (
    <div
      className={`report-page relative mx-auto box-border flex min-h-[297mm] w-[210mm] flex-col bg-white p-[7mm] text-gray-900 print:h-[297mm] print:overflow-hidden ${
        isIslamic ? "font-arabic" : "font-sans"
      }`}
    >
      {/* Double-rule institutional diploma frame */}
      <div className="relative flex flex-1 flex-col border-[3px] p-1" style={outerFrameStyle}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 h-3.5 w-3.5 border-t-[3px] border-l-[3px]"
          style={cornerStyle}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 h-3.5 w-3.5 border-t-[3px] border-r-[3px]"
          style={cornerStyle}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-3.5 w-3.5 border-b-[3px] border-l-[3px]"
          style={cornerStyle}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 h-3.5 w-3.5 border-r-[3px] border-b-[3px]"
          style={cornerStyle}
        />

        <div
          className="relative grid flex-1 grid-rows-[auto_auto_1fr_auto_auto] gap-2.5 border p-3.5"
          style={innerFrameStyle}
        >
          {/* Subtle central watermark */}
          <div
            className={`pointer-events-none absolute inset-0 z-0 bg-[url('/assets/coat-of-arms.png')] bg-size-[46%] bg-center bg-no-repeat opacity-[0.03] ${imgFilter}`}
          />

          {/* =================================================================
              1. HERITAGE CENTERED CREST HEADER
             ================================================================= */}
          <header
            className="relative z-10 border-b-2 pb-2.5 text-center"
            style={{ borderColor: palette.primaryDark }}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Left Crest */}
              {settings.logoUrl ? (
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded border bg-white p-1"
                  style={{ borderColor: palette.primaryBorder }}
                >
                  <img
                    src={settings.logoUrl}
                    alt="School Crest"
                    className={`h-full w-full object-contain ${imgFilter}`}
                  />
                </div>
              ) : (
                <div className="h-16 w-16 shrink-0" aria-hidden="true" />
              )}

              {/* Center Typography */}
              <div className="min-w-0 flex-1">
                {isIslamic && (
                  <p
                    className="font-arabic mb-0.5 text-xs font-bold"
                    style={{ color: palette.primary }}
                  >
                    بسم الله الرحمن الرحيم
                  </p>
                )}
                <h1
                  className="font-serif text-xl font-black tracking-wide uppercase"
                  style={{ color: palette.primaryDark }}
                >
                  {settings.schoolName}
                </h1>
                {settings.schoolMotto && (
                  <p className="text-[11px] font-medium text-gray-600 italic">
                    &ldquo;{settings.schoolMotto}&rdquo;
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] font-medium text-gray-600">
                  {settings.address && <span>{settings.address}</span>}
                  {settings.phoneNumber && <span>Tel: {settings.phoneNumber}</span>}
                  {settings.email && <span>{settings.email}</span>}
                </div>
              </div>

              {/* Right Year & Term Stamp */}
              <div className="flex w-20 shrink-0 flex-col items-end justify-center text-right">
                <span
                  className="border px-1.5 py-0.5 text-[9px] font-black uppercase"
                  style={{
                    borderColor: palette.primaryDark,
                    backgroundColor: palette.primarySoft,
                    color: palette.primaryDark,
                  }}
                >
                  {settings.academicYear}
                </span>
                <span className="mt-1 text-[9px] font-bold text-gray-600 uppercase">
                  {settings.term}
                </span>
              </div>
            </div>

            {/* Banner Title */}
            <div
              className={`mt-2.5 inline-block rounded-sm px-5 py-1 text-[11px] font-black tracking-[0.2em] uppercase ${
                isBW ? "border border-black" : ""
              }`}
              style={{
                backgroundColor: palette.bannerBg,
                color: palette.bannerText,
              }}
            >
              {isMock
                ? "Mock Examination Transcript"
                : isKG
                  ? "Kindergarten Progress Report"
                  : "Terminal Academic Report"}
            </div>
          </header>

          {/* =================================================================
              2. STUDENT BIO LEDGER + PHOTOGRAPH
             ================================================================= */}
          <section className="relative z-10 flex items-stretch gap-3">
            <div
              className="grid flex-1 grid-cols-12 border text-[11px]"
              style={{ borderColor: palette.primaryBorder }}
            >
              <div
                className="col-span-7 border-r border-b px-2.5 py-1.5"
                style={{ borderColor: palette.primaryBorder }}
              >
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Student Name
                </span>
                <span className="font-serif text-sm font-bold text-gray-900 uppercase">
                  {student.name}
                </span>
              </div>
              <div
                className="col-span-3 border-r border-b px-2.5 py-1.5"
                style={{ borderColor: palette.primaryBorder }}
              >
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Class / Level
                </span>
                <span className="font-bold text-gray-900">
                  {student.className || settings.className || settings.level}
                </span>
              </div>
              <div
                className="col-span-2 border-b px-2 py-1.5 text-center"
                style={{ borderColor: palette.primaryBorder }}
              >
                <span className="block text-[9px] font-bold text-gray-500 uppercase">No. Roll</span>
                <span className="font-bold text-gray-900">{settings.classSize || "-"}</span>
              </div>

              <div
                className="col-span-4 border-r px-2.5 py-1.5"
                style={{ borderColor: palette.primaryBorder }}
              >
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Term &amp; Session
                </span>
                <span className="font-semibold text-gray-900">
                  {settings.term} ({settings.academicYear})
                </span>
              </div>
              <div
                className={`${showClassPositionHeader ? "col-span-3" : "col-span-4"} border-r px-2.5 py-1.5`}
                style={{ borderColor: palette.primaryBorder }}
              >
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Attendance
                </span>
                <span className="font-semibold text-gray-900">
                  {student.attendancePresent ?? "-"} / {settings.totalAttendanceDays || "-"} Days
                </span>
              </div>
              <div
                className={`${showClassPositionHeader ? "col-span-3 border-r" : "col-span-4"} px-2.5 py-1.5`}
                style={{ borderColor: palette.primaryBorder }}
              >
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Next Term Begins
                </span>
                <span className="font-semibold text-gray-900">{nextTermLabel}</span>
              </div>
              {showClassPositionHeader && (
                <div
                  className={`col-span-2 flex flex-col items-center justify-center px-2 py-1 text-center ${
                    isBW ? "border-l border-black" : ""
                  }`}
                  style={{
                    backgroundColor: palette.highlightBg,
                    color: palette.highlightText,
                  }}
                >
                  <span className="block text-[8px] font-black uppercase opacity-85">Position</span>
                  <span className="text-sm leading-tight font-black">
                    {student.classPosition || "-"}
                  </span>
                </div>
              )}
            </div>

            {student.pictureUrl && (
              <div
                className="w-18 shrink-0 overflow-hidden border bg-white p-0.5"
                style={{ borderColor: palette.primaryDark }}
              >
                <img
                  src={student.pictureUrl}
                  alt={student.name}
                  className={`h-full w-full object-cover ${imgFilter}`}
                />
              </div>
            )}
          </section>

          {/* =================================================================
              3. ACADEMIC ACHIEVEMENT LEDGER TABLE
             ================================================================= */}
          <main className="relative z-10 flex flex-col justify-start">
            <table
              className="w-full border-collapse border"
              style={{ borderColor: palette.primaryDark }}
            >
              <thead>
                <tr
                  className={`border-b-2 uppercase ${density.header} ${isBW ? "border-black" : ""}`}
                  style={{
                    backgroundColor: palette.bannerBg,
                    color: palette.bannerText,
                    borderColor: palette.primaryDark,
                  }}
                >
                  <th
                    className="border-r px-2.5 py-1.5 text-left font-bold"
                    style={{ borderColor: palette.primaryBorder }}
                  >
                    Subject
                  </th>
                  {!isMock ? (
                    <>
                      <th
                        className="w-16 border-r px-1.5 py-1.5 text-center font-bold"
                        style={{ borderColor: palette.primaryBorder }}
                      >
                        Class ({settings.classScoreMax}%)
                      </th>
                      <th
                        className="w-16 border-r px-1.5 py-1.5 text-center font-bold"
                        style={{ borderColor: palette.primaryBorder }}
                      >
                        Exam ({settings.examScoreMax}%)
                      </th>
                      <th
                        className="w-16 border-r px-1.5 py-1.5 text-center font-bold"
                        style={{ borderColor: palette.primaryBorder }}
                      >
                        Total (100%)
                      </th>
                    </>
                  ) : (
                    <th
                      className="w-20 border-r px-1.5 py-1.5 text-center font-bold"
                      style={{ borderColor: palette.primaryBorder }}
                    >
                      Score (100%)
                    </th>
                  )}
                  <th
                    className="w-14 border-r px-1.5 py-1.5 text-center font-bold"
                    style={{ borderColor: palette.primaryBorder }}
                  >
                    Grade
                  </th>
                  {showSubjectPosition && (
                    <th
                      className="w-12 border-r px-1.5 py-1.5 text-center font-bold"
                      style={{ borderColor: palette.primaryBorder }}
                    >
                      Pos.
                    </th>
                  )}
                  <th className="w-28 px-2 py-1.5 text-left font-bold">Remark</th>
                </tr>
              </thead>
              <tbody className={density.text}>
                {student.subjects.map((sub, idx) => {
                  const g = String(sub.grade);
                  const isHighGrade = ["1", "2", "A1", "GOLD"].includes(g);
                  const isLowGrade = ["9", "F9", "BRONZE"].includes(g);
                  const gradeColor = isBW
                    ? "text-black"
                    : isLowGrade
                      ? "text-red-700"
                      : isHighGrade
                        ? "text-emerald-800"
                        : "text-gray-900";

                  return (
                    <tr
                      key={sub.id}
                      className="border-b"
                      style={{
                        borderColor: palette.primaryBorder,
                        backgroundColor: idx % 2 === 1 ? palette.zebraBg : "#ffffff",
                      }}
                    >
                      <td
                        className={`border-r px-2.5 ${density.rowPy} font-semibold text-gray-900`}
                        style={{ borderColor: palette.primaryBorder }}
                      >
                        {sub.name}
                      </td>
                      {!isMock && (
                        <>
                          <td
                            className={`border-r px-1.5 ${density.rowPy} text-center text-gray-700 tabular-nums`}
                            style={{ borderColor: palette.primaryBorder }}
                          >
                            {sub.classScore}
                          </td>
                          <td
                            className={`border-r px-1.5 ${density.rowPy} text-center text-gray-700 tabular-nums`}
                            style={{ borderColor: palette.primaryBorder }}
                          >
                            {sub.examScore}
                          </td>
                        </>
                      )}
                      <td
                        className={`border-r px-1.5 ${density.rowPy} text-center font-black text-gray-900 tabular-nums`}
                        style={{ borderColor: palette.primaryBorder }}
                      >
                        {sub.totalScore}
                      </td>
                      <td
                        className={`border-r px-1.5 ${density.rowPy} text-center font-black ${gradeColor}`}
                        style={{ borderColor: palette.primaryBorder }}
                      >
                        {sub.grade}
                      </td>
                      {showSubjectPosition && (
                        <td
                          className={`border-r px-1.5 ${density.rowPy} text-center font-semibold text-gray-700`}
                          style={{ borderColor: palette.primaryBorder }}
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
          </main>

          {/* =================================================================
              4. PERFORMANCE SUMMARY BAR & QUALITATIVE EVALUATION
             ================================================================= */}
          <section className="relative z-10 space-y-2">
            <div
              className="flex flex-wrap items-center justify-between gap-2 border px-3 py-1.5"
              style={{
                borderColor: palette.primaryDark,
                backgroundColor: palette.primarySoft,
              }}
            >
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Total Score: </span>
                  <span className="font-black text-gray-900 tabular-nums">
                    {student.totalScore}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Average: </span>
                  <span
                    className="font-black tabular-nums"
                    style={{ color: palette.primaryDark }}
                  >
                    {student.averageScore}%
                  </span>
                </div>
                {showClassPositionSummary && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase">
                      Position in Class:{" "}
                    </span>
                    <span className="font-black text-gray-900">
                      {student.classPosition || "-"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isThirdTerm && student.promotionStatus && (
                  <span
                    className={`border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      isBW ? "border-black bg-white text-black" : "bg-white text-gray-900"
                    }`}
                    style={isBW ? undefined : { borderColor: palette.primaryDark, color: palette.primaryDark }}
                  >
                    {student.promotionStatus}
                  </span>
                )}
                {showAggregate && (
                  <div
                    className={`px-3 py-1 text-center ${isBW ? "border border-black" : ""}`}
                    style={{
                      backgroundColor: palette.highlightBg,
                      color: palette.highlightText,
                    }}
                  >
                    <span className="mr-1.5 text-[9px] font-bold uppercase opacity-85">
                      Aggregate:
                    </span>
                    <span className="text-sm font-black">{student.aggregate}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="border px-2.5 py-1.5" style={{ borderColor: palette.primaryBorder }}>
                <span className="block text-[9px] font-bold text-gray-500 uppercase">Conduct</span>
                <span className="font-semibold text-gray-900">
                  {student.conduct || "Satisfactory"}
                </span>
              </div>
              <div className="border px-2.5 py-1.5" style={{ borderColor: palette.primaryBorder }}>
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Interest &amp; Talent
                </span>
                <span className="font-semibold text-gray-900">
                  {student.interest || "Reading & Science"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
              <div className="border px-2.5 py-1.5" style={{ borderColor: palette.primaryBorder }}>
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Class Teacher&apos;s Remark
                </span>
                <p className="mt-0.5 font-medium text-gray-800 italic">
                  {student.teacherRemark ||
                    "A diligent learner who participates actively in classwork."}
                </p>
              </div>
              <div className="border px-2.5 py-1.5" style={{ borderColor: palette.primaryBorder }}>
                <span className="block text-[9px] font-bold text-gray-500 uppercase">
                  Headmaster&apos;s Endorsement
                </span>
                <p className="mt-0.5 font-medium text-gray-800 italic">{headmasterRemark}</p>
              </div>
            </div>
          </section>

          {/* =================================================================
              5. FEE SCHEDULE (PRIVATE ONLY) & SIGNATURES FOOTER
             ================================================================= */}
          <footer className="relative z-10 space-y-2.5">
            {isPrivate && settings.showFeeSchedule !== false && (hasAnyFee || showArrears) && (
              <div
                className="border p-2.5"
                style={{
                  borderColor: palette.primaryBorder,
                  backgroundColor: palette.primarySoft,
                }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-black tracking-wider uppercase"
                    style={{ color: palette.primaryDark }}
                  >
                    Next Term Fees Schedule
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
                        <span className="font-medium text-gray-700">{item.label}:</span>
                        <span className="font-bold text-gray-900 tabular-nums">
                          GH₵{item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p
                  className="mt-1.5 border-t pt-1 text-[9px] font-medium text-gray-600"
                  style={{ borderColor: palette.primaryBorder }}
                >
                  {paymentNote}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-10 pt-3">
              <div className="text-center">
                <div className="mx-auto mb-1 flex h-8 w-44 items-end justify-center border-b border-gray-800 pb-0.5">
                  {settings.teacherSignature && (
                    <img
                      src={settings.teacherSignature}
                      alt="Class Teacher Signature"
                      className={`max-h-7 object-contain ${imgFilter}`}
                    />
                  )}
                </div>
                <p className="text-[10px] font-bold tracking-wider text-gray-700 uppercase">
                  {settings.classTeacherName || "Class Teacher"} &bull; Signature
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-1 flex h-8 w-44 items-end justify-center border-b border-gray-800 pb-0.5">
                  {settings.headTeacherSignature && (
                    <img
                      src={settings.headTeacherSignature}
                      alt="Headteacher Signature"
                      className={`max-h-7 object-contain ${imgFilter}`}
                    />
                  )}
                </div>
                <p className="text-[10px] font-bold tracking-wider text-gray-700 uppercase">
                  {settings.headTeacherName || "Headteacher"} &bull; Signature &amp; Stamp
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
});
