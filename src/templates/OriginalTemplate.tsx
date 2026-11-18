import { Fragment } from "react";
import type { ReportTemplateProps } from "../types";
import { getActivePrivateFeeItems, resolvePositionVisibility } from "../utils/privateSchoolFees";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";
import { getReportPalette } from "../utils/reportTheme";

export function OriginalTemplate({ student, settings, printMode }: ReportTemplateProps) {
  const isIslamic = settings.schoolType === "ISLAMIC";
  const isPrivate = settings.schoolType === "PRIVATE";
  const isKG = settings.level === "KG";
  const isMock = settings.examType === "MOCK";
  const activeFees = getActivePrivateFeeItems(settings);
  const hasAnyFee = activeFees.length > 0;
  const showArrears =
    isPrivate &&
    Boolean(settings.showStudentFeeArrearsOnReport) &&
    typeof student.feeArrears === "number" &&
    student.feeArrears > 0;
  const { showClassPositionHeader, showClassPositionSummary, showSubjectPosition } =
    resolvePositionVisibility(settings);
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);

  // Logic to hide aggregate for KG
  const showAggregate = !isKG && student.aggregate !== null;

  // ---------------------------------------------------------------------------
  // 🎨 PRINT MODE & CUSTOM SCHOOL COLOR LOGIC
  // ---------------------------------------------------------------------------
  const isBW = printMode === "bw";
  const palette = getReportPalette({
    settings,
    printMode,
    defaultPrimary: "#1e3a8a",
  });
  const useCustom = palette.isCustomActive && !isBW;

  const borderColor = isBW ? "border-black" : "border-blue-950";
  const divideColor = isBW ? "divide-black" : "divide-blue-950";
  const primaryBg = isBW ? "bg-black" : "bg-primary";
  const accentText = isBW ? "text-black" : "text-blue-900";
  const mutedBg = isBW ? "bg-gray-200" : "bg-slate-200";
  const tableHeaderBg = isBW ? "bg-gray-100" : "bg-slate-100";
  const zebraBg = isBW ? "bg-gray-50" : "bg-slate-50";
  const redText = isBW ? "text-black underline decoration-2 underline-offset-2" : "text-red-600";

  const customBorderStyle = useCustom ? { borderColor: palette.primaryDark } : undefined;
  const customPrimaryBgStyle = useCustom
    ? { backgroundColor: palette.primary, color: palette.onPrimary }
    : undefined;
  const customHeaderBgStyle = useCustom ? { backgroundColor: palette.primarySoft } : undefined;
  const customMutedBgStyle = useCustom ? { backgroundColor: palette.primaryMedium } : undefined;
  const customAccentTextStyle = useCustom ? { color: palette.primary } : undefined;

  // ---------------------------------------------------------------------------
  // 📐 DENSITY LOGIC (Responsive Padding & Text Sizing)
  // ---------------------------------------------------------------------------
  const subjectCount = student.subjects.length;
  let density = {
    padding: "py-3",
    textSize: "text-sm",
    headerSize: "text-xs",
  };

  if (subjectCount > 10 && subjectCount <= 15) {
    density = {
      padding: "py-1.5",
      textSize: "text-xs",
      headerSize: "text-[10px]",
    };
  } else if (subjectCount > 15) {
    density = {
      padding: "py-[2px]",
      textSize: "text-[10px]",
      headerSize: "text-[9px]",
    };
  }

  return (
    // We use your exact grid-rows, but enforced A4 sizing
    <div
      className={`mx-auto box-border grid min-h-[297mm] w-[210mm] grid-rows-[auto_auto_1fr_auto_auto] gap-2 bg-white p-[8mm] text-gray-900 ${isIslamic ? "font-arabic" : "font-sans"}`}
    >
      {/* 🛡️ WATERMARK */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 bg-[url('/assets/coat-of-arms.png')] bg-size-[50%] bg-center bg-no-repeat opacity-[0.04] ${isBW ? "grayscale" : ""}`}
      />

      {/* =================================================================================
          SECTION 1: HEADER
         ================================================================================= */}
      <header
        className={`relative z-10 border-b-[3px] ${borderColor} pb-2`}
        style={customBorderStyle}
      >
        {isIslamic && (
          <div className="mb-1 text-center">
            <p className="font-arabic text-sm font-bold">بسم الله الرحمن الرحيم</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center" aria-hidden={!settings.logoUrl}>
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className={`h-full w-full object-contain mix-blend-multiply ${isBW ? "grayscale" : ""}`}
              />
            ) : null}
          </div>

          <div className="flex-1 text-center">
            <h1 className="font-serif text-3xl leading-none font-black tracking-wide uppercase">
              {settings.schoolName || "SCHOOL NAME"}
            </h1>
            {settings.address && (
              <p className="mt-1 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                {settings.address}
              </p>
            )}
            {settings.schoolMotto && (
              <p
                className={`mt-1 text-xs font-semibold italic ${accentText}`}
                style={customAccentTextStyle}
              >
                "{settings.schoolMotto}"
              </p>
            )}
            {(settings.phoneNumber || settings.email) && (
              <div className="mt-1 flex justify-center gap-3 text-[9px] font-semibold text-gray-600">
                {settings.phoneNumber && <span>Tel: {settings.phoneNumber}</span>}
                {settings.phoneNumber && settings.email && <span>•</span>}
                {settings.email && <span>{settings.email}</span>}
              </div>
            )}
            <div
              className={`mt-2 flex justify-center gap-6 border-t-2 ${borderColor} pt-1 text-xs font-bold tracking-wider text-gray-800 uppercase`}
              style={customBorderStyle}
            >
              <span>{settings.academicYear}</span>
              <span>•</span>
              <span>{settings.term}</span>
            </div>
          </div>

          <div className="flex h-24 w-24 shrink-0 items-center justify-center">
            <img
              src="/assets/ges-logo.png"
              alt="GES"
              className={`h-full w-full object-contain mix-blend-multiply ${isBW ? "opacity-80 grayscale" : ""}`}
            />
          </div>
        </div>

        <div className="mt-2 text-center">
          <span
            className={`${primaryBg} inline-block rounded-sm px-8 py-1.5 text-[11px] font-black tracking-[0.25em] text-white uppercase shadow-sm`}
            style={customPrimaryBgStyle}
          >
            STUDENT REPORT
          </span>
        </div>
      </header>

      {/* =================================================================================
          SECTION 2: STUDENT ID CARD
         ================================================================================= */}
      <section
        className={`relative z-10 flex border-2 ${borderColor} bg-white`}
        style={customBorderStyle}
      >
        {student.pictureUrl && (
          <div
            className={`flex w-28 shrink-0 items-center justify-center border-r-2 ${borderColor} bg-gray-50 p-2`}
            style={customBorderStyle}
          >
            <img
              src={student.pictureUrl}
              alt="Student"
              className={`h-24 w-24 rounded-md object-cover mix-blend-multiply shadow-sm ${isBW ? "grayscale" : ""}`}
            />
          </div>
        )}

        <div className="flex-1">
          <div
            className={`grid ${
              showClassPositionHeader
                ? "grid-cols-[1fr_100px_80px_80px]"
                : "grid-cols-[1fr_100px_90px]"
            } divide-x-2 ${divideColor} border-b-2 ${borderColor}`}
            style={customBorderStyle}
          >
            <div className="p-2" style={customBorderStyle}>
              <span className="block text-[9px] font-black text-gray-500 uppercase">
                Name of Student
              </span>
              <span className="block truncate text-lg leading-tight font-black tracking-tight uppercase">
                {student.name}
              </span>
            </div>
            <div className={`${tableHeaderBg} p-2 text-center`} style={{ ...customBorderStyle, ...customHeaderBgStyle }}>
              <span className="block text-[9px] font-black text-gray-500 uppercase">Class</span>
              <span className="block text-lg leading-tight font-black">
                {settings.className || student.className}
              </span>
            </div>
            <div className="p-2 text-center" style={customBorderStyle}>
              <span className="block text-[9px] font-black text-gray-500 uppercase">
                No. On Roll
              </span>
              <span className="block text-lg leading-tight font-black">
                {settings.classSize || "-"}
              </span>
            </div>
            {showClassPositionHeader && (
              <div className={`${primaryBg} p-2 text-center text-white`} style={customPrimaryBgStyle}>
                <span className="block text-[9px] font-black uppercase opacity-90">Pos.</span>
                <span className="block text-xl leading-tight font-black">
                  {student.classPosition || "-"}
                </span>
              </div>
            )}
          </div>

          <div className={`grid grid-cols-[1fr_2fr] divide-x-2 ${divideColor}`}>
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[10px] font-black text-gray-500 uppercase">Attendance</span>
              <span className="font-mono text-sm font-black">
                {student.attendancePresent || "-"} / {settings.totalAttendanceDays || "-"}
              </span>
            </div>
            <div className="px-3 py-1.5">
              {student.dateOfBirth ? (
                <div className={`grid grid-cols-2 gap-4 divide-x-2 ${divideColor}`}>
                  <div className="flex items-center justify-between pr-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase">DOB</span>
                    <span className="text-sm font-bold">{student.dateOfBirth}</span>
                  </div>
                  <div className="flex items-center justify-between pl-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase">
                      Next Term
                    </span>
                    <span className="text-sm font-bold">
                      {settings.nextTermStarts
                        ? new Date(settings.nextTermStarts).toLocaleDateString("en-GB")
                        : "TBA"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Next Term</span>
                  <span className="text-sm font-bold">
                    {settings.nextTermStarts
                      ? new Date(settings.nextTermStarts).toLocaleDateString("en-GB")
                      : "TBA"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================================
          SECTION 3: GRADES TABLE
         ================================================================================= */}
      <section className="relative z-10 flex flex-col justify-start">
        <table className={`w-full border-collapse border-2 ${borderColor}`} style={customBorderStyle}>
          <thead>
            <tr
              className={`divide-x-2 ${divideColor} border-b-2 ${borderColor} ${tableHeaderBg}`}
              style={{ ...customBorderStyle, ...customHeaderBgStyle }}
            >
              <th className={`w-4/12 p-1.5 text-left font-black uppercase ${density.headerSize}`}>
                Subject
              </th>
              {!isMock ? (
                <>
                  <th
                    className={`w-[8%] p-1 text-center font-black uppercase ${density.headerSize}`}
                  >
                    Class
                    <br />({settings.classScoreMax})
                  </th>
                  <th
                    className={`w-[8%] p-1 text-center font-black uppercase ${density.headerSize}`}
                  >
                    Exam
                    <br />({settings.examScoreMax})
                  </th>
                  <th
                    className={`w-[8%] p-1 text-center font-black uppercase ${density.headerSize}`}
                  >
                    Total
                    <br />
                    (100)
                  </th>
                </>
              ) : (
                <th className={`w-[8%] p-1 text-center font-black uppercase ${density.headerSize}`}>
                  Score
                  <br />
                  (100)
                </th>
              )}
              <th className={`w-[8%] p-1 text-center font-black uppercase ${density.headerSize}`}>
                Grd
              </th>
              {showSubjectPosition && (
                <th
                  className={`w-[8%] p-1 text-center font-black uppercase ${mutedBg} ${density.headerSize}`}
                  style={customMutedBgStyle}
                >
                  Pos.
                </th>
              )}
              <th className={`w-3/12 p-1.5 text-left font-black uppercase ${density.headerSize}`}>
                Remark
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y-2 ${divideColor} border-b-2 ${borderColor}`} style={customBorderStyle}>
            {student.subjects.map((sub, idx) => (
              <Fragment key={sub.id}>
                <tr
                  className={`divide-x-2 ${divideColor} ${density.padding} ${idx % 2 === 1 ? zebraBg : "bg-white"}`}
                  style={idx % 2 === 1 && useCustom ? { backgroundColor: palette.zebraBg } : undefined}
                >
                  <td className={`px-2 font-black uppercase ${density.textSize} truncate`}>
                    {sub.name}
                  </td>
                  {!isMock ? (
                    <>
                      <td
                        className={`text-center font-mono font-bold text-gray-700 ${density.textSize}`}
                      >
                        {sub.classScore || "-"}
                      </td>
                      <td
                        className={`text-center font-mono font-bold text-gray-700 ${density.textSize}`}
                      >
                        {sub.examScore || "-"}
                      </td>
                      <td className={`text-center font-mono font-black ${density.textSize}`}>
                        {sub.totalScore}
                      </td>
                    </>
                  ) : (
                    <td className={`text-center font-mono font-black ${density.textSize}`}>
                      {sub.totalScore}
                    </td>
                  )}
                  <td
                    className={`text-center font-black ${density.textSize} ${String(sub.grade).includes("9") || sub.grade === "F9" ? redText : ""}`}
                  >
                    {sub.grade}
                  </td>
                  {showSubjectPosition && (
                    <td
                      className={`text-center font-mono font-black ${tableHeaderBg} ${density.textSize}`}
                      style={customHeaderBgStyle}
                    >
                      {sub.subjectPosition || "-"}
                    </td>
                  )}
                  <td className={`truncate px-2 font-semibold uppercase ${density.textSize}`}>
                    {sub.remark}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>

      {/* =================================================================================
          SECTION 4: PERFORMANCE SUMMARY
         ================================================================================= */}
      <section
        className={`relative z-10 grid grid-cols-[1fr_auto] border-2 ${borderColor} ${tableHeaderBg}`}
        style={{ ...customBorderStyle, ...customHeaderBgStyle }}
      >
        <div className={`flex divide-x-2 ${divideColor}`}>
          <div className="flex flex-col justify-center px-4 py-2">
            <span className="text-[9px] font-black text-gray-500 uppercase">Overall Score</span>
            <span className="text-2xl leading-none font-black">{student.totalScore}</span>
          </div>
          <div className="flex flex-col justify-center px-4 py-2">
            <span className="text-[9px] font-black text-gray-500 uppercase">Average</span>
            <span className="text-2xl leading-none font-black">{student.averageScore}%</span>
          </div>
          {showClassPositionSummary && (
            <div className="flex flex-col justify-center px-4 py-2">
              <span className="text-[9px] font-black text-gray-500 uppercase">Position</span>
              <span className="text-2xl leading-none font-black">
                {student.classPosition || "-"}
              </span>
            </div>
          )}
          {showAggregate && (
            <div
              className={`flex flex-col justify-center px-4 py-2 text-white ${primaryBg}`}
              style={customPrimaryBgStyle}
            >
              <span className="text-[9px] font-black uppercase">Aggregate</span>
              <span className="text-center text-2xl leading-none font-black">
                {student.aggregate}
              </span>
            </div>
          )}
        </div>

        {settings.term === "Third Term" && student.promotionStatus && (
          <div className={`flex items-center border-l-2 ${borderColor} px-6 py-2`} style={customBorderStyle}>
            <div className="text-right">
              <span className="block text-[9px] font-black text-gray-500 uppercase">Status</span>
              <span
                className={`block text-base font-black uppercase underline decoration-2 underline-offset-2 ${accentText}`}
                style={customAccentTextStyle}
              >
                {student.promotionStatus}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* =================================================================================
          SECTION 5: FOOTER (Remarks & Signatures)
         ================================================================================= */}
      <footer className="relative z-10 flex flex-col gap-3">
        {isPrivate && (hasAnyFee || showArrears) && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border-2 ${borderColor} bg-gray-50 p-2`}
            style={{ ...customBorderStyle, ...customHeaderBgStyle }}
          >
            <span className="text-[10px] font-black tracking-wider text-gray-600 uppercase">
              Next Term Fees:
            </span>
            {activeFees.map((fee) => (
              <span key={fee.id} className="text-xs font-bold">
                {fee.label}: GH₵{fee.amount.toFixed(2)}
                {fee.cycle ? (
                  <span className="ml-1 text-[10px] font-medium text-gray-500">({fee.cycle})</span>
                ) : null}
              </span>
            ))}
            {showArrears && (
              <span className="text-xs font-black text-red-700">
                Arrears: GH₵{student.feeArrears!.toFixed(2)}
              </span>
            )}
          </div>
        )}

        <div className={`border-2 ${borderColor}`} style={customBorderStyle}>
          <div className={`grid grid-cols-[130px_1fr] border-b-2 ${borderColor}`} style={customBorderStyle}>
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
              style={{ ...customBorderStyle, ...customHeaderBgStyle }}
            >
              Conduct
            </div>
            <div className="p-2 text-xs font-semibold">{student.conduct || "Satisfactory"}</div>
          </div>
          <div className={`grid grid-cols-[130px_1fr] border-b-2 ${borderColor}`} style={customBorderStyle}>
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
              style={{ ...customBorderStyle, ...customHeaderBgStyle }}
            >
              Interest
            </div>
            <div className="p-2 text-xs font-semibold">{student.interest || "Reading, Sports"}</div>
          </div>
          <div className={`grid grid-cols-[130px_1fr] border-b-2 ${borderColor}`} style={customBorderStyle}>
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
              style={{ ...customBorderStyle, ...customHeaderBgStyle }}
            >
              Class Teacher's Remark
            </div>
            <div className="p-2 text-xs font-semibold italic">{student.teacherRemark}</div>
          </div>
          <div className="grid grid-cols-[130px_1fr]">
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
              style={{ ...customBorderStyle, ...customHeaderBgStyle }}
            >
              Head Teacher's Remark
            </div>
            <div className="p-2 text-xs font-semibold italic">{headmasterRemark}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 px-8 pb-2">
          <div className="flex flex-col items-center justify-end">
            {settings.teacherSignature ? (
              <img
                src={settings.teacherSignature}
                className={`-mb-2.5 block h-12 object-contain mix-blend-multiply ${isBW ? "grayscale" : ""}`}
                alt="Sign"
              />
            ) : (
              <div className="h-6 w-full"></div>
            )}
            <div
              className={`w-full border-t-2 border-dotted ${borderColor} pt-1`}
              style={customBorderStyle}
            />
            <p className="mt-1 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              {settings.classTeacherName || "Class Teacher"}
            </p>
          </div>
          <div className="flex flex-col items-center justify-end">
            {settings.headTeacherSignature ? (
              <img
                src={settings.headTeacherSignature}
                className={`-mb-3.75 block h-14 object-contain mix-blend-multiply ${isBW ? "grayscale" : ""}`}
                alt="Sign"
              />
            ) : (
              <div className="h-6 w-full"></div>
            )}
            <div
              className={`w-full border-t-2 border-dotted ${borderColor} pt-1`}
              style={customBorderStyle}
            />
            <p className="mt-1 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              {settings.headTeacherName
                ? `${settings.headTeacherName} (HEAD TEACHER)`
                : "Head Teacher"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
