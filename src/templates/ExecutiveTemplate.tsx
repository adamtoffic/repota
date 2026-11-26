import { memo } from "react";
import type { ReportTemplateProps } from "../types";
import {
  DEFAULT_PAYMENT_NOTE,
  formatReportDate,
  getActivePrivateFeeItems,
  resolvePositionVisibility,
} from "../utils/privateSchoolFees";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";
import { getReportPalette } from "../utils/reportTheme";

export const ExecutiveTemplate = memo(function ExecutiveTemplate({
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
    defaultPrimary: "#1e3a8a",
    defaultAccent: "#d97706",
  });

  // 3-tier A4 density so 6–18 subjects stay comfortably on one sheet
  const subjectCount = student.subjects.length;
  const density =
    subjectCount > 14
      ? { rowPy: "py-0.5", text: "text-[10px]", header: "text-[9px]" }
      : subjectCount > 10
        ? { rowPy: "py-1", text: "text-[11px]", header: "text-[10px]" }
        : { rowPy: "py-2", text: "text-xs", header: "text-[10px]" };

  const borderStyle = { borderColor: palette.primaryDark };
  const softBorderStyle = { borderColor: palette.primaryBorder };

  return (
    <div
      className={`report-page relative mx-auto box-border grid min-h-[297mm] w-[210mm] grid-rows-[auto_auto_1fr_auto_auto] gap-2.5 bg-white p-[8mm] text-gray-900 print:h-[296.5mm] print:overflow-hidden ${
        isIslamic ? "font-arabic" : "font-sans"
      }`}
    >
      {/* Subtle institutional watermark */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 bg-[url('/assets/coat-of-arms.png')] bg-size-[48%] bg-center bg-no-repeat opacity-[0.035] ${imgFilter}`}
      />

      {/* =====================================================================
          1. EXECUTIVE CREST HEADER BANNER
         ===================================================================== */}
      <header className="relative z-10 overflow-hidden rounded-lg border-2" style={borderStyle}>
        {/* Top institutional color band (light bordered band in B&W to save toner while staying crisp) */}
        <div
          className={`flex items-center justify-between gap-4 px-4 py-3 ${
            isBW ? "border-t-4 border-b-2 border-black" : ""
          }`}
          style={{ backgroundColor: palette.bannerBg, color: palette.bannerText }}
        >
          {/* Left: School Crest */}
          {settings.logoUrl ? (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
              <img
                src={settings.logoUrl}
                alt="School Crest"
                className={`h-full w-full object-contain ${imgFilter}`}
              />
            </div>
          ) : (
            <div className="h-16 w-16 shrink-0" aria-hidden="true" />
          )}

          {/* Center: School Identity */}
          <div className="min-w-0 flex-1 text-center">
            {isIslamic && (
              <p className="font-arabic mb-0.5 text-xs font-bold opacity-95">
                بسم الله الرحمن الرحيم
              </p>
            )}
            <h1 className="truncate font-serif text-2xl leading-tight font-black tracking-wide uppercase">
              {settings.schoolName || "SCHOOL NAME"}
            </h1>
            {settings.schoolMotto && (
              <p className="mt-0.5 text-[11px] font-semibold italic opacity-90">
                "{settings.schoolMotto}"
              </p>
            )}
            {(settings.address || settings.phoneNumber || settings.email) && (
              <p className="mt-0.5 truncate text-[9px] font-medium opacity-85">
                {[settings.address, settings.phoneNumber && `Tel: ${settings.phoneNumber}`, settings.email]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
          </div>

          {/* Right: GES Crest or Student Photo */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
            <img
              src="/assets/ges-logo.png"
              alt="GES"
              className={`h-full w-full object-contain ${imgFilter}`}
            />
          </div>
        </div>

        {/* Accent stripe + Term Sub-bar */}
        <div className="h-1 w-full" style={{ backgroundColor: palette.accent }} />
        <div
          className="flex items-center justify-between px-4 py-1.5 text-[11px] font-black tracking-wider uppercase"
          style={{ backgroundColor: palette.primarySoft, color: palette.primaryDark }}
        >
          <span>{settings.academicYear}</span>
          <span>
            {isMock ? "Mock Examination Report" : `${settings.term} Progress Report`}
          </span>
          <span>{settings.level}</span>
        </div>
      </header>

      {/* =====================================================================
          2. STUDENT PROFILE STRIP
         ===================================================================== */}
      <section
        className="relative z-10 flex overflow-hidden rounded-lg border-2 bg-white"
        style={borderStyle}
      >
        {student.pictureUrl && (
          <div
            className="flex w-22 shrink-0 items-center justify-center border-r-2 p-1.5"
            style={{ ...borderStyle, backgroundColor: palette.primarySoft }}
          >
            <img
              src={student.pictureUrl}
              alt={student.name}
              className={`h-20 w-20 rounded object-cover shadow-xs ${imgFilter}`}
            />
          </div>
        )}

        <div className="flex-1">
          <div
            className={`grid ${
              showClassPositionHeader
                ? "grid-cols-[1fr_95px_75px_75px]"
                : "grid-cols-[1fr_105px_85px]"
            } divide-x-2 border-b-2`}
            style={borderStyle}
          >
            <div className="px-3 py-1.5" style={borderStyle}>
              <span className="block text-[8px] font-black tracking-wider text-gray-500 uppercase">
                Student Name
                {student.admissionNumber ? ` • ID: ${student.admissionNumber}` : ""}
              </span>
              <span className="block truncate text-base leading-tight font-black uppercase">
                {student.name}
              </span>
            </div>
            <div
              className="px-2 py-1.5 text-center"
              style={{ ...borderStyle, backgroundColor: palette.primarySoft }}
            >
              <span className="block text-[8px] font-black text-gray-500 uppercase">Class</span>
              <span className="block text-sm leading-tight font-black">
                {settings.className || student.className || settings.level}
              </span>
            </div>
            <div className="px-2 py-1.5 text-center" style={borderStyle}>
              <span className="block text-[8px] font-black text-gray-500 uppercase">Roll</span>
              <span className="block text-sm leading-tight font-black">
                {settings.classSize || "-"}
              </span>
            </div>
            {showClassPositionHeader && (
              <div
                className={`px-2 py-1.5 text-center ${isBW ? "border-l border-black" : ""}`}
                style={{ backgroundColor: palette.highlightBg, color: palette.highlightText }}
              >
                <span className="block text-[8px] font-black uppercase opacity-90">Position</span>
                <span className="block text-base leading-tight font-black">
                  {student.classPosition || "-"}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 divide-x-2 text-xs" style={borderStyle}>
            <div className="flex items-center justify-between px-3 py-1" style={borderStyle}>
              <span className="text-[9px] font-black text-gray-500 uppercase">Attendance</span>
              <span className="font-mono font-bold">
                {student.attendancePresent ?? "-"}/{settings.totalAttendanceDays || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-1" style={borderStyle}>
              <span className="text-[9px] font-black text-gray-500 uppercase">
                {student.dateOfBirth ? "DOB" : "Gender"}
              </span>
              <span className="font-bold">
                {student.dateOfBirth || student.gender || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-1" style={borderStyle}>
              <span className="text-[9px] font-black text-gray-500 uppercase">Next Term</span>
              <span className="font-bold">
                {formatReportDate(settings.nextTermStarts, "TBA")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. ACADEMIC PERFORMANCE TABLE
         ===================================================================== */}
      <section className="relative z-10 flex min-h-0 flex-col justify-start">
        <div className="overflow-hidden rounded-lg border-2" style={borderStyle}>
          <table className="w-full border-collapse">
            <thead>
              <tr
                className="border-b-2 uppercase"
                style={{
                  ...borderStyle,
                  backgroundColor: palette.primaryMedium,
                  color: palette.primaryDark,
                }}
              >
                <th className={`w-[36%] px-2.5 py-1.5 text-left font-black ${density.header}`}>
                  Subject / Learning Area
                </th>
                {!isMock ? (
                  <>
                    <th className={`border-l px-1 py-1.5 text-center font-black ${density.header}`} style={softBorderStyle}>
                      Class ({settings.classScoreMax})
                    </th>
                    <th className={`border-l px-1 py-1.5 text-center font-black ${density.header}`} style={softBorderStyle}>
                      Exam ({settings.examScoreMax})
                    </th>
                    <th className={`border-l px-1 py-1.5 text-center font-black ${density.header}`} style={softBorderStyle}>
                      Total (100)
                    </th>
                  </>
                ) : (
                  <th className={`border-l px-1 py-1.5 text-center font-black ${density.header}`} style={softBorderStyle}>
                    Score (100)
                  </th>
                )}
                <th className={`border-l px-1 py-1.5 text-center font-black ${density.header}`} style={softBorderStyle}>
                  Grade
                </th>
                {showSubjectPosition && (
                  <th className={`border-l px-1 py-1.5 text-center font-black ${density.header}`} style={softBorderStyle}>
                    Pos.
                  </th>
                )}
                <th className={`border-l px-2 py-1.5 text-left font-black ${density.header}`} style={softBorderStyle}>
                  Remark
                </th>
              </tr>
            </thead>
            <tbody>
              {student.subjects.map((sub, idx) => (
                <tr
                  key={sub.id}
                  className="border-t"
                  style={{
                    ...softBorderStyle,
                    backgroundColor: idx % 2 === 1 ? palette.zebraBg : "#ffffff",
                  }}
                >
                  <td className={`px-2.5 font-bold uppercase ${density.rowPy} ${density.text}`}>
                    {sub.name}
                  </td>
                  {!isMock ? (
                    <>
                      <td
                        className={`border-l text-center font-mono text-gray-700 ${density.rowPy} ${density.text}`}
                        style={softBorderStyle}
                      >
                        {sub.classScore || "-"}
                      </td>
                      <td
                        className={`border-l text-center font-mono text-gray-700 ${density.rowPy} ${density.text}`}
                        style={softBorderStyle}
                      >
                        {sub.examScore || "-"}
                      </td>
                      <td
                        className={`border-l text-center font-mono font-black ${density.rowPy} ${density.text}`}
                        style={{ ...softBorderStyle, color: palette.primaryDark }}
                      >
                        {sub.totalScore}
                      </td>
                    </>
                  ) : (
                    <td
                      className={`border-l text-center font-mono font-black ${density.rowPy} ${density.text}`}
                      style={{ ...softBorderStyle, color: palette.primaryDark }}
                    >
                      {sub.totalScore}
                    </td>
                  )}
                  <td
                    className={`border-l text-center font-black ${density.rowPy} ${density.text} ${
                      String(sub.grade).includes("9") || sub.grade === "F9"
                        ? isBW
                          ? "text-black underline decoration-2"
                          : "text-red-600"
                        : ""
                    }`}
                    style={softBorderStyle}
                  >
                    {sub.grade}
                  </td>
                  {showSubjectPosition && (
                    <td
                      className={`border-l text-center font-mono font-bold ${density.rowPy} ${density.text}`}
                      style={softBorderStyle}
                    >
                      {sub.subjectPosition || "-"}
                    </td>
                  )}
                  <td
                    className={`truncate border-l px-2 font-semibold text-gray-700 uppercase ${density.rowPy} ${density.text}`}
                    style={softBorderStyle}
                  >
                    {sub.remark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================================
          4. PERFORMANCE SUMMARY BAR
         ===================================================================== */}
      <section
        className="relative z-10 flex flex-wrap items-center justify-between overflow-hidden rounded-lg border-2"
        style={{ ...borderStyle, backgroundColor: palette.primarySoft }}
      >
        <div className="flex flex-wrap divide-x-2" style={borderStyle}>
          <div className="px-4 py-1.5" style={borderStyle}>
            <span className="block text-[8px] font-black text-gray-500 uppercase">Total Score</span>
            <span className="text-lg leading-none font-black">{student.totalScore}</span>
          </div>
          <div className="px-4 py-1.5" style={borderStyle}>
            <span className="block text-[8px] font-black text-gray-500 uppercase">Average</span>
            <span className="text-lg leading-none font-black">{student.averageScore}%</span>
          </div>
          {showClassPositionSummary && (
            <div className="px-4 py-1.5" style={borderStyle}>
              <span className="block text-[8px] font-black text-gray-500 uppercase">
                Class Position
              </span>
              <span className="text-lg leading-none font-black">
                {student.classPosition || "-"}
              </span>
            </div>
          )}
          {showAggregate && (
            <div
              className={`px-4 py-1.5 text-center ${isBW ? "border-l border-black" : ""}`}
              style={{ backgroundColor: palette.highlightBg, color: palette.highlightText }}
            >
              <span className="block text-[8px] font-black uppercase opacity-90">Aggregate</span>
              <span className="text-lg leading-none font-black">{student.aggregate}</span>
            </div>
          )}
        </div>

        {isThirdTerm && student.promotionStatus && (
          <div className="px-4 py-1.5 text-right">
            <span className="block text-[8px] font-black text-gray-500 uppercase">
              Promotion Status
            </span>
            <span
              className="text-sm font-black uppercase underline decoration-2 underline-offset-2"
              style={{ color: palette.primaryDark }}
            >
              {student.promotionStatus}
            </span>
          </div>
        )}
      </section>

      {/* =====================================================================
          5. COMPACT FOOTER: REMARKS, 3-ITEM FEE SCHEDULE, SIGNATURES
         ===================================================================== */}
      <footer className="relative z-10 flex flex-col gap-2">
        {/* Compact 2-Column Conduct/Interest & Remarks */}
        <div className="grid grid-cols-2 divide-x-2 rounded-lg border-2" style={borderStyle}>
          <div className="divide-y" style={softBorderStyle}>
            <div className="px-2.5 py-1.5">
              <span className="text-[8px] font-black text-gray-500 uppercase">Conduct: </span>
              <span className="text-[11px] font-semibold">
                {student.conduct || "Satisfactory"}
              </span>
            </div>
            <div className="px-2.5 py-1.5">
              <span className="text-[8px] font-black text-gray-500 uppercase">Interest: </span>
              <span className="text-[11px] font-semibold">
                {student.interest || "Reading, Sports"}
              </span>
            </div>
          </div>
          <div className="divide-y" style={softBorderStyle}>
            <div className="px-2.5 py-1.5">
              <span className="block text-[8px] font-black text-gray-500 uppercase">
                Class Teacher's Remark
              </span>
              <span className="text-[11px] font-semibold italic">
                {student.teacherRemark?.trim() || "\u00A0"}
              </span>
            </div>
            <div className="px-2.5 py-1.5">
              <span className="block text-[8px] font-black text-gray-500 uppercase">
                Head Teacher's Remark
              </span>
              <span className="text-[11px] font-semibold italic">{headmasterRemark}</span>
            </div>
          </div>
        </div>

        {/* Private School 3-Item Fee Schedule (Strictly compact for single A4) */}
        {isPrivate && (hasAnyFee || showArrears) && (
          <div className="overflow-hidden rounded-lg border-2" style={borderStyle}>
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5"
              style={{ backgroundColor: palette.primarySoft }}
            >
              <span
                className="text-[9px] font-black tracking-wider uppercase"
                style={{ color: palette.primaryDark }}
              >
                Next Term Schedule:
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {activeFees.map((fee) => (
                  <div key={fee.id} className="text-xs">
                    <span className="font-bold text-gray-700">{fee.label}:</span>{" "}
                    <span className="font-black">GH₵{fee.amount.toFixed(2)}</span>
                    {fee.cycle && (
                      <span className="ml-1 text-[9px] font-medium text-gray-500">
                        ({fee.cycle})
                      </span>
                    )}
                  </div>
                ))}
                {showArrears && (
                  <div className="text-xs">
                    <span className={`font-bold ${isBW ? "text-black" : "text-red-700"}`}>
                      Arrears:
                    </span>{" "}
                    <span className={`font-black ${isBW ? "text-black underline" : "text-red-700"}`}>
                      GH₵{student.feeArrears!.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t bg-white px-3 py-1" style={softBorderStyle}>
              <p className="text-[8px] leading-snug text-gray-600">
                <strong className="font-black text-gray-800">NOTE:</strong> {paymentNote}
              </p>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 px-8 pt-1">
          <div className="flex flex-col items-center justify-end">
            {settings.teacherSignature ? (
              <img
                src={settings.teacherSignature}
                alt="Class Teacher Signature"
                className={`-mb-2 block h-9 object-contain mix-blend-multiply ${imgFilter}`}
              />
            ) : (
              <div className="h-5 w-full" />
            )}
            <div className="w-full border-t-2 border-dotted pt-1" style={borderStyle} />
            <p className="mt-0.5 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              {settings.classTeacherName || "Class Teacher"}
            </p>
          </div>
          <div className="flex flex-col items-center justify-end">
            {settings.headTeacherSignature ? (
              <img
                src={settings.headTeacherSignature}
                alt="Head Teacher Signature"
                className={`-mb-2 block h-9 object-contain mix-blend-multiply ${imgFilter}`}
              />
            ) : (
              <div className="h-5 w-full" />
            )}
            <div className="w-full border-t-2 border-dotted pt-1" style={borderStyle} />
            <p className="mt-0.5 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              {settings.headTeacherName
                ? `${settings.headTeacherName} (Head Teacher)`
                : "Head Teacher"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});
