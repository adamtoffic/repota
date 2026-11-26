import { Fragment, memo } from "react";
import type { ReportTemplateProps } from "../types";
import {
  DEFAULT_PAYMENT_NOTE,
  formatReportDate,
  getActivePrivateFeeItems,
  resolvePositionVisibility,
} from "../utils/privateSchoolFees";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";
import { getReportPalette } from "../utils/reportTheme";

export const MinimalTemplate = memo(function MinimalTemplate({
  student,
  settings,
  printMode,
}: ReportTemplateProps) {
  const isIslamic = settings.schoolType === "ISLAMIC";
  const isKG = settings.level === "KG";
  const isMock = settings.examType === "MOCK";
  const isThirdTerm = settings.term === "Third Term";
  const isPrivate = settings.schoolType === "PRIVATE";
  const activeFees = getActivePrivateFeeItems(settings);
  const hasAnyFee = activeFees.length > 0;
  const showArrears =
    isPrivate &&
    Boolean(settings.showStudentFeeArrearsOnReport) &&
    typeof student.feeArrears === "number" &&
    student.feeArrears > 0;
  const paymentNote = settings.feePaymentNote?.trim() || DEFAULT_PAYMENT_NOTE;
  const { showClassPositionSummary, showSubjectPosition } = resolvePositionVisibility(settings);
  const headmasterRemark = generateHeadmasterRemark(
    student.averageScore,
    settings.term,
    [],
    `${student.id}|${settings.term}|${student.averageScore}`,
  );

  // ---------------------------------------------------------------------------
  // 🎨 PRINT MODE & CUSTOM SCHOOL COLOR LOGIC
  // ---------------------------------------------------------------------------
  const isBW = printMode === "bw";
  const imgFilter = isBW ? "grayscale" : "";
  const palette = getReportPalette({
    settings,
    printMode,
    defaultPrimary: "#292524",
  });
  const useCustom = palette.isCustomActive && !isBW;

  // ── Brand Color Variables ──────────────────────────────────────────────────
  const headerBorder = isBW ? "border-black" : "border-stone-800";
  const tableBorder = isBW ? "border-black" : "border-stone-800";
  const tableRowDiv = isBW ? "border-gray-400" : "border-stone-200";
  const footerBorder = isBW ? "border-black" : "border-stone-800";
  const titleColor = isBW ? "text-black" : "text-stone-900";
  const labelColor = isBW ? "text-gray-600" : "text-stone-500";
  const aggregateBox = isBW
    ? "border border-black px-2 py-0.5 font-black"
    : "border-2 border-stone-700 bg-stone-100 px-2 py-0.5 font-black";
  const redText = isBW
    ? "text-gray-900 font-black underline decoration-2 underline-offset-2"
    : "text-red-600 font-black";
  const summaryStrong = isBW ? "text-black font-black" : "text-stone-900 font-black";

  const customBorder = useCustom ? { borderColor: palette.primaryDark } : undefined;
  const customTitleColor = useCustom ? { color: palette.primaryDark } : undefined;
  const customAggregateStyle = useCustom
    ? {
        borderColor: palette.primaryDark,
        backgroundColor: palette.primarySoft,
        color: palette.primaryDark,
      }
    : undefined;

  const subjectCount = student.subjects.length;
  const density =
    subjectCount > 14
      ? {
          rowPy: "py-0.5",
          headerPy: "py-1",
          textSize: "text-[11px]",
          sectionMb: "mb-2.5",
          footerMb: "mb-3",
          headerPb: "mb-3 pb-3",
        }
      : subjectCount > 10
        ? {
            rowPy: "py-1",
            headerPy: "py-1.5",
            textSize: "text-xs",
            sectionMb: "mb-4",
            footerMb: "mb-4",
            headerPb: "mb-4 pb-4",
          }
        : {
            rowPy: "py-2.5",
            headerPy: "py-2.5",
            textSize: "text-[13px]",
            sectionMb: "mb-6",
            footerMb: "mb-6",
            headerPb: "mb-6 pb-6",
          };

  return (
    <div
      className={`report-page relative mx-auto box-border grid min-h-[297mm] w-[210mm] grid-rows-[auto_1fr_auto] bg-white p-[12mm] text-black print:h-[296.5mm] print:overflow-hidden print:border-none ${
        isIslamic ? "font-arabic" : "font-serif"
      }`}
    >
      {/* ==========================================
          HEADER: Centered, Formal, Academic
          ========================================== */}
      <header className={`relative ${density.headerPb} border-b-2 ${headerBorder} text-center`} style={customBorder}>
        {isIslamic && (
          <p className="font-arabic mb-1 text-sm font-bold" style={customTitleColor}>
            بسم الله الرحمن الرحيم
          </p>
        )}
        {settings.logoUrl && (
          <div className="absolute top-0 left-0 h-20 w-20">
            <img
              src={settings.logoUrl}
              alt="Logo"
              className={`h-full w-full object-contain ${imgFilter}`}
            />
          </div>
        )}

        {/* GES Logo removed – student photo takes the top-right anchor */}
        {student.pictureUrl && (
          <div className={`absolute top-0 right-0 h-20 w-20 border-2 ${headerBorder} p-0.5`} style={customBorder}>
            <img
              src={student.pictureUrl}
              alt={student.name}
              className={`h-full w-full object-cover ${imgFilter}`}
            />
          </div>
        )}

        <div className="mx-auto max-w-[60%]">
          <h1
            className={`mb-2 text-3xl leading-tight font-bold tracking-widest uppercase ${titleColor}`}
            style={customTitleColor}
          >
            {settings.schoolName}
          </h1>
          {settings.address && <p className="text-sm">{settings.address}</p>}
          <p className="mt-1 text-xs">
            {settings.phoneNumber && `Tel: ${settings.phoneNumber}`}
            {settings.phoneNumber && settings.email && ` | `}
            {settings.email && `Email: ${settings.email}`}
          </p>
          {settings.schoolMotto && (
            <p className="mt-3 text-sm font-medium italic">"{settings.schoolMotto}"</p>
          )}
        </div>

        <div className="mt-5">
          <h2
            className={`text-base font-black tracking-[0.2em] uppercase underline underline-offset-4 ${titleColor}`}
            style={customTitleColor}
          >
            {" "}
            {isMock ? "Mock Examination Results" : "Official Academic Transcript"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {settings.academicYear} &nbsp;·&nbsp; {settings.term}
          </p>
        </div>
      </header>

      {/* ==========================================
          MAIN BODY: Clean Data & Horizontal Lines
          ========================================== */}
      <main className="flex min-h-0 flex-col overflow-hidden">
        <div className={`${density.sectionMb} flex justify-between font-sans text-sm`}>
          <div className="space-y-1.5">
            <p>
              <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                Student Name:
              </span>{" "}
              <span className="ml-2 text-base font-bold">{student.name}</span>
            </p>
            <p>
              <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                Class:
              </span>{" "}
              <span className="ml-2">{settings.className || student.className || settings.level}</span>
            </p>
            <p>
              <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                Academic Year:
              </span>{" "}
              <span className="ml-2">{settings.academicYear}</span>
            </p>
          </div>
          <div className="space-y-1.5 text-right">
            <p>
              <span className="mr-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                Term:
              </span>{" "}
              <span>{settings.term}</span>
            </p>
            <p>
              <span className="mr-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                Total Roll:
              </span>{" "}
              <span>{settings.classSize || "-"}</span>
            </p>
            {showClassPositionSummary && (
              <p>
                <span className="mr-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Position:
                </span>{" "}
                <span className="font-bold">{student.classPosition}</span>
              </p>
            )}
          </div>
        </div>

        <table className={`mb-4 w-full border-collapse text-left font-sans ${density.textSize}`}>
          <thead>
            <tr className={`border-y-2 ${tableBorder}`} style={customBorder}>
              <th className={`px-1 ${density.headerPy} font-bold`}>Course / Subject</th>
              {!isMock ? (
                <>
                  <th className={`px-1 ${density.headerPy} text-center font-bold`}>
                    Class ({settings.classScoreMax})
                  </th>
                  <th className={`px-1 ${density.headerPy} text-center font-bold`}>
                    Exam ({settings.examScoreMax})
                  </th>
                  <th className={`px-1 ${density.headerPy} text-center font-bold`}>Total (100)</th>
                </>
              ) : (
                <th className={`px-1 ${density.headerPy} text-center font-bold`}>Score (100)</th>
              )}
              <th className={`px-1 ${density.headerPy} text-center font-bold`}>Grade</th>
              {showSubjectPosition && <th className={`px-1 ${density.headerPy} text-center font-bold`}>Pos</th>}
              <th className={`px-1 ${density.headerPy} text-left font-bold`}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {student.subjects.map((sub) => (
              <tr key={sub.id} className={`border-b ${tableRowDiv}`}>
                <td className={`px-1 ${density.rowPy} font-medium`}>{sub.name}</td>
                {!isMock ? (
                  <>
                    <td className={`px-1 ${density.rowPy} text-center`}>{sub.classScore}</td>
                    <td className={`px-1 ${density.rowPy} text-center`}>{sub.examScore}</td>
                    <td className={`px-1 ${density.rowPy} text-center font-bold`}>{sub.totalScore}</td>
                  </>
                ) : (
                  <td className={`px-1 ${density.rowPy} text-center font-bold`}>{sub.totalScore}</td>
                )}
                <td
                  className={`px-1 ${density.rowPy} text-center font-bold ${
                    String(sub.grade).includes("9") || sub.grade === "F9" ? redText : ""
                  }`}
                >
                  {sub.grade}
                </td>
                {showSubjectPosition && (
                  <td className={`px-1 ${density.rowPy} text-center text-xs`}>{sub.subjectPosition || "-"}</td>
                )}
                <td className={`px-1 ${density.rowPy} text-left text-xs italic`}>{sub.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={`${density.sectionMb} flex justify-end gap-6 font-sans text-sm`}>
          <p>
            <span className={`mr-2 text-xs font-bold uppercase ${labelColor}`}>Total Score:</span>{" "}
            <strong className={summaryStrong}>{student.totalScore}</strong>
          </p>
          <p>
            <span className={`mr-2 text-xs font-bold uppercase ${labelColor}`}>Average:</span>{" "}
            <strong className={summaryStrong}>{student.averageScore.toFixed(2)}</strong>
          </p>
          {showClassPositionSummary && (
            <p>
              <span className={`mr-2 text-xs font-bold uppercase ${labelColor}`}>Position:</span>{" "}
              <strong className={summaryStrong}>{student.classPosition || "-"}</strong>
            </p>
          )}
          {!isKG && student.aggregate !== null && (
            <p>
              <span className={`mr-2 text-xs font-bold uppercase ${labelColor}`}>Aggregate:</span>{" "}
              <strong className={aggregateBox} style={customAggregateStyle}>{student.aggregate}</strong>
            </p>
          )}
        </div>
      </main>

      {/* ==========================================
          FOOTER: Signatures & Inline Remarks
          ========================================== */}
      <footer className="mt-auto font-sans text-sm">
        <div className={`${density.footerMb} border-t-2 ${footerBorder} pt-4`} style={customBorder}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <p>
              <strong className="text-xs tracking-wider uppercase">Attendance:</strong>{" "}
              {student.attendancePresent ?? "-"} out of {settings.totalAttendanceDays || "---"} days
            </p>
            <p>
              <strong className="text-xs tracking-wider uppercase">Conduct:</strong>{" "}
              {student.conduct || "Satisfactory behavior."}
            </p>
            <p>
              <strong className="text-xs tracking-wider uppercase">Interest:</strong>{" "}
              {student.interest || "Participates well."}
            </p>
            {isThirdTerm && (
              <p>
                <strong className="text-xs tracking-wider uppercase">Status:</strong>{" "}
                <span className="font-bold uppercase underline underline-offset-2">
                  {student.promotionStatus || "Pending"}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className={`${density.footerMb} space-y-3`}>
          <p>
            <strong className="mr-2 text-xs tracking-wider uppercase">
              Class Teacher's Remark:
            </strong>{" "}
            <span className="italic">{student.teacherRemark?.trim() || "\u00A0"}</span>
          </p>
          <p>
            <strong className="mr-2 text-xs tracking-wider uppercase">Headmaster's Remark:</strong>{" "}
            <span className="italic">
              {headmasterRemark || "A satisfactory performance. Keep it up."}
            </span>
          </p>
        </div>

        {isPrivate && (hasAnyFee || showArrears) && (
          <div
            className={`mb-4 border ${footerBorder} bg-gray-50 p-2 text-center text-xs`}
            style={customBorder}
          >
            <strong className="mr-2 tracking-wider uppercase">Next Term Fees:</strong>
            {activeFees.map((fee, idx) => (
              <Fragment key={fee.id}>
                {idx > 0 && <> &nbsp;|&nbsp; </>}
                {fee.label}
                {fee.cycle ? ` (${fee.cycle})` : ""}: GH₵{fee.amount.toFixed(2)}
              </Fragment>
            ))}
            {showArrears && (
              <>
                {activeFees.length > 0 && <> &nbsp;|&nbsp; </>}
                <strong className={isBW ? "text-black underline" : "text-red-700"}>
                  Arrears: GH₵{student.feeArrears!.toFixed(2)}
                </strong>
              </>
            )}
            <p className="mt-1 text-[9px] text-gray-600">{paymentNote}</p>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div className="w-48">
            <div className="mb-1 flex h-10 items-end justify-center">
              {settings.teacherSignature && (
                <img
                  src={settings.teacherSignature}
                  alt="Signature"
                  className={`max-h-full max-w-full object-contain ${imgFilter}`}
                />
              )}
            </div>
            <div className={`border-t-2 ${footerBorder} pt-1 text-center`} style={customBorder}>
              <p className="text-xs font-black uppercase">
                {settings.classTeacherName || "Class Teacher"}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="mb-1 text-xs tracking-wider uppercase">Next Term Resumes</p>
            <p className="text-sm font-bold">
              {formatReportDate(settings.nextTermStarts, "...................................")}
            </p>
          </div>

          <div className="w-48">
            <div className="mb-1 flex h-10 items-end justify-center">
              {settings.headTeacherSignature && (
                <img
                  src={settings.headTeacherSignature}
                  alt="Signature"
                  className={`max-h-full max-w-full object-contain ${imgFilter}`}
                />
              )}
            </div>
            <div className={`border-t-2 ${footerBorder} pt-1 text-center`} style={customBorder}>
              <p className="text-xs font-black uppercase">
                {settings.headTeacherName || "Headmaster"}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
});
