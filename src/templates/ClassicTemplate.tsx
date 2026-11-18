import type { ReportTemplateProps } from "../types";
import { getActivePrivateFeeItems, resolvePositionVisibility } from "../utils/privateSchoolFees";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";
import { getReportPalette } from "../utils/reportTheme";

export function ClassicTemplate({ student, settings, printMode }: ReportTemplateProps) {
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
  const { showClassPositionHeader, showClassPositionSummary, showSubjectPosition } =
    resolvePositionVisibility(settings);
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);

  // ---------------------------------------------------------------------------
  // 🎨 PRINT MODE & CUSTOM SCHOOL COLOR LOGIC
  // ---------------------------------------------------------------------------
  const isBW = printMode === "bw";
  const imgFilter = isBW ? "grayscale" : "";
  const palette = getReportPalette({
    settings,
    printMode,
    defaultPrimary: "#047857",
  });
  const useCustom = palette.isCustomActive && !isBW;

  // ── Brand Color Variables ──────────────────────────────────────────────────
  const borderColor = isBW ? "border-black" : "border-emerald-700";
  const divideColor = isBW ? "divide-gray-400" : "divide-emerald-300";
  const titleBg = isBW ? "bg-black text-white" : "bg-emerald-700 text-white";
  const tableHeaderBg = isBW ? "bg-gray-200 text-gray-900" : "bg-emerald-50 text-emerald-900";
  const zebraBg = isBW ? "bg-gray-50" : "bg-emerald-50/40";
  const remarkBg = isBW ? "bg-gray-50" : "bg-emerald-50";
  const summaryBg = isBW ? "bg-gray-100" : "bg-emerald-50";
  const promoText = isBW ? "text-black" : "text-emerald-700";
  const sigLine = isBW ? "border-gray-700" : "border-emerald-700";
  const infoRowBorder = isBW ? "border-gray-300" : "border-emerald-200";
  const mottoColor = isBW ? "text-gray-700" : "text-emerald-800";
  const redText = isBW ? "text-black underline decoration-2 underline-offset-2" : "text-red-600";

  const customBorder = useCustom ? { borderColor: palette.primary } : undefined;
  const customInfoBorder = useCustom ? { borderColor: palette.primaryBorder } : undefined;
  const customTitleBg = useCustom
    ? { backgroundColor: palette.primary, color: palette.onPrimary }
    : undefined;
  const customSoftBg = useCustom ? { backgroundColor: palette.primarySoft } : undefined;
  const customHeaderBg = useCustom
    ? { backgroundColor: palette.primarySoft, color: palette.primaryDark }
    : undefined;
  const customText = useCustom ? { color: palette.primaryDark } : undefined;

  return (
    <div
      className={`relative mx-auto box-border grid min-h-[297mm] w-[210mm] grid-rows-[auto_1fr_auto] bg-white p-[10mm] font-sans text-gray-900 print:h-[297mm] print:overflow-hidden print:border-none`}
    >
      {/* 🛡️ WATERMARK */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 bg-[url('/assets/coat-of-arms.png')] bg-size-[50%] bg-center bg-no-repeat opacity-[0.04] ${isBW ? "grayscale" : ""}`}
      />
      {/* ==========================================
          ROW 1: HEADER & STUDENT PROFILE
          ========================================== */}
      <header className={`mb-1 border-b-2 ${borderColor} pb-1`} style={customBorder}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-24 w-24 items-center justify-center">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className={`max-h-full max-w-full object-contain ${imgFilter}`}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-center text-xs text-gray-400">
                No Logo
              </div>
            )}
          </div>

          <div className="flex-1 px-4 text-center">
            <h1 className="text-2xl font-black tracking-wide text-gray-900 uppercase">
              {settings.schoolName}
            </h1>
            {settings.address && <p className="text-sm font-medium">{settings.address}</p>}
            <p className="mt-1 text-xs text-gray-600">
              {settings.phoneNumber && `Tel: ${settings.phoneNumber}`}
              {settings.phoneNumber && settings.email && ` | `}
              {settings.email && `Email: ${settings.email}`}
            </p>
            {settings.schoolMotto && (
              <p className={`mt-1.5 text-sm font-bold italic ${mottoColor}`} style={customText}>
                "{settings.schoolMotto}"
              </p>
            )}
            <div className="mt-1.5 flex justify-center gap-3 text-[11px] font-semibold text-gray-500">
              <span>{settings.academicYear}</span>
              <span>·</span>
              <span>{settings.term}</span>
            </div>
            <div className="mt-2">
              <span
                className={`inline-block rounded-sm px-6 py-1.5 text-sm font-black tracking-widest uppercase shadow-sm ${titleBg}`}
                style={customTitleBg}
              >
                Terminal Report Card
              </span>
            </div>
          </div>

          <div className="flex w-24 justify-end">
            <div className={`h-28 w-24 border-2 ${borderColor} bg-gray-50 p-1`} style={customBorder}>
              {student.pictureUrl ? (
                <img
                  src={student.pictureUrl}
                  alt="Student"
                  className={`h-full w-full object-cover ${imgFilter}`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-gray-400">
                  Photo
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-2 gap-x-8 gap-y-2 rounded border-2 ${borderColor} ${summaryBg} p-3 text-sm`}
          style={{ ...customBorder, ...customSoftBg }}
        >
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`} style={customInfoBorder}>
            <span className="font-semibold text-gray-600">Name of Student:</span>
            <span className="font-bold uppercase">{student.name}</span>
          </div>
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`} style={customInfoBorder}>
            <span className="font-semibold text-gray-600">Academic Year:</span>
            <span className="font-bold">{settings.academicYear}</span>
          </div>
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`} style={customInfoBorder}>
            <span className="font-semibold text-gray-600">Class:</span>
            <span className="font-bold">{settings.className || student.className}</span>
          </div>
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`} style={customInfoBorder}>
            <span className="font-semibold text-gray-600">Term:</span>
            <span className="font-bold">{settings.term}</span>
          </div>
          <div
            className={`flex justify-between ${showClassPositionHeader ? `border-b ${infoRowBorder} pb-1` : "col-span-2"}`}
            style={showClassPositionHeader ? customInfoBorder : undefined}
          >
            <span className="font-semibold text-gray-600">Number on Roll:</span>
            <span className="font-bold">{settings.classSize || "-"}</span>
          </div>
          {showClassPositionHeader && (
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Position in Class:</span>
              <span className="font-bold">{student.classPosition || "-"}</span>
            </div>
          )}
        </div>
      </header>

      {/* ==========================================
          ROW 2: ACADEMIC TABLE
          ========================================== */}
      <main className="mb-1 min-h-0 overflow-hidden">
        <table className={`w-full border-collapse border-2 ${borderColor} text-[13px]`} style={customBorder}>
          <thead>
            <tr className={`border-b-2 ${borderColor} ${tableHeaderBg}`} style={{ ...customBorder, ...customHeaderBg }}>
              <th className={`w-1/3 border ${borderColor} px-2 py-2 text-left`} style={customBorder}>Subject</th>
              {!isMock ? (
                <>
                  <th className={`w-16 border ${borderColor} px-1 py-2 text-center leading-tight`} style={customBorder}>
                    Class
                    <br />
                    <span className="text-[10px]">({settings.classScoreMax}%)</span>
                  </th>
                  <th className={`w-16 border ${borderColor} px-1 py-2 text-center leading-tight`} style={customBorder}>
                    Exam
                    <br />
                    <span className="text-[10px]">({settings.examScoreMax}%)</span>
                  </th>
                  <th className={`w-16 border ${borderColor} px-1 py-2 text-center leading-tight`} style={customBorder}>
                    Total
                    <br />
                    <span className="text-[10px]">(100%)</span>
                  </th>
                </>
              ) : (
                <th className={`w-16 border ${borderColor} px-1 py-2 text-center leading-tight`} style={customBorder}>
                  Score
                  <br />
                  <span className="text-[10px]">(100%)</span>
                </th>
              )}
              <th className={`w-16 border ${borderColor} px-2 py-2 text-center`} style={customBorder}>Grade</th>
              {showSubjectPosition && (
                <th className={`w-16 border ${borderColor} px-2 py-2 text-center`} style={customBorder}>Pos</th>
              )}
              <th className={`border ${borderColor} px-2 py-2 text-left`} style={customBorder}>Remarks</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${divideColor}`}>
            {student.subjects.map((sub, idx) => (
              <tr
                key={sub.id}
                className={idx % 2 === 1 ? zebraBg : "bg-white"}
                style={idx % 2 === 1 && useCustom ? { backgroundColor: palette.zebraBg } : undefined}
              >
                <td className={`border ${borderColor} px-2 py-1.5 font-medium`} style={customBorder}>{sub.name}</td>
                {!isMock ? (
                  <>
                    <td className={`border ${borderColor} px-2 py-1.5 text-center`} style={customBorder}>
                      {sub.classScore}
                    </td>
                    <td className={`border ${borderColor} px-2 py-1.5 text-center`} style={customBorder}>
                      {sub.examScore}
                    </td>
                    <td className={`border ${borderColor} px-2 py-1.5 text-center font-bold`} style={customBorder}>
                      {sub.totalScore}
                    </td>
                  </>
                ) : (
                  <td className={`border ${borderColor} px-2 py-1.5 text-center font-bold`} style={customBorder}>
                    {sub.totalScore}
                  </td>
                )}
                <td
                  className={`border ${borderColor} px-2 py-1.5 text-center font-bold ${String(sub.grade).includes("9") || sub.grade === "F9" ? redText : ""}`}
                  style={customBorder}
                >
                  {sub.grade}
                </td>
                {showSubjectPosition && (
                  <td className={`border ${borderColor} px-2 py-1.5 text-center text-xs`} style={customBorder}>
                    {sub.subjectPosition || "-"}
                  </td>
                )}
                <td className={`border ${borderColor} px-2 py-1.5 text-left text-xs italic`} style={customBorder}>
                  {sub.remark}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className={`mt-1 flex justify-end gap-4 rounded border-2 ${borderColor} ${summaryBg} px-1 py-1 text-sm`}
          style={{ ...customBorder, ...customSoftBg }}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Total Score:</span>
            <span className={`rounded border-2 ${borderColor} ${summaryBg} px-1 py-1 font-black`} style={{ ...customBorder, ...customSoftBg }}>
              {student.totalScore}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Average:</span>
            <span className={`rounded border-2 ${borderColor} ${summaryBg} px-1 py-1 font-black`} style={{ ...customBorder, ...customSoftBg }}>
              {student.averageScore.toFixed(1)}
            </span>
          </div>
          {showClassPositionSummary && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-600">Position:</span>
              <span className={`rounded border-2 ${borderColor} ${summaryBg} px-1 py-1 font-black`} style={{ ...customBorder, ...customSoftBg }}>
                {student.classPosition || "-"}
              </span>
            </div>
          )}
          {!isKG && student.aggregate !== null && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-600">Aggregate:</span>
              <span className={`rounded ${titleBg} px-1 py-1 font-bold shadow-sm`} style={customTitleBg}>
                {student.aggregate}
              </span>
            </div>
          )}
        </div>
      </main>

      {/* ==========================================
          ROW 3: FOOTER
          ========================================== */}
      <footer className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-4">
          <div className={`flex-1 rounded border ${borderColor} p-2`} style={customBorder}>
            <span className="block text-xs font-semibold text-gray-600 uppercase">Attendance</span>
            <div className="text-sm font-bold">
              {student.attendancePresent || 0} out of {settings.totalAttendanceDays || "-"} days
            </div>
          </div>
          <div className={`flex-2 rounded border ${borderColor} p-2`} style={customBorder}>
            <span className="block text-xs font-semibold text-gray-600 uppercase">
              Conduct / Character
            </span>
            <div className="text-sm italic">{student.conduct || "Satisfactory"}</div>
          </div>
          <div className={`flex-2 rounded border ${borderColor} p-2`} style={customBorder}>
            <span className="block text-xs font-semibold text-gray-600 uppercase">
              Interest / Talent
            </span>
            <div className="text-sm italic">{student.interest || "Active in class"}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded border ${borderColor} ${remarkBg} p-3`} style={{ ...customBorder, ...customSoftBg }}>
            <span
              className={`mb-1 block border-b ${borderColor} pb-1 text-xs font-semibold uppercase`}
              style={customBorder}
            >
              Class Teacher's Remark
            </span>
            <p className="mt-2 min-h-10 text-[13px] italic">
              {student.teacherRemark || "Good performance."}
            </p>
          </div>
          <div className={`rounded border ${borderColor} ${remarkBg} p-3`} style={{ ...customBorder, ...customSoftBg }}>
            <span
              className={`mb-1 block border-b ${borderColor} pb-1 text-xs font-semibold uppercase`}
              style={customBorder}
            >
              Head Teacher's Remark
            </span>
            <p className="mt-2 min-h-10 text-[13px] italic">{headmasterRemark || "Keep it up."}</p>
          </div>
        </div>

        {(isThirdTerm || (isPrivate && (hasAnyFee || showArrears))) && (
          <div className={`flex gap-2 rounded border ${borderColor} p-1`} style={customBorder}>
            {isThirdTerm && (
              <div className={`flex-1 ${isPrivate && (hasAnyFee || showArrears) ? `border-r ${borderColor}` : ""} pr-4`} style={customBorder}>
                <span className="text-xs font-bold text-gray-600 uppercase">Promotion Status:</span>
                <p className={`mt-1 font-black uppercase ${promoText}`} style={customText}>
                  {student.promotionStatus || "Pending Decision"}
                </p>
              </div>
            )}
            {isPrivate && (hasAnyFee || showArrears) && (
              <div className="flex flex-2 flex-wrap justify-between gap-2 px-2">
                {activeFees.map((fee) => (
                  <div key={fee.id} className="text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      {fee.label}
                    </span>
                    <p className="text-sm font-bold">GH₵ {fee.amount.toFixed(2)}</p>
                  </div>
                ))}
                {showArrears && (
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-red-600 uppercase">Arrears</span>
                    <p className="text-sm font-bold text-red-700">
                      GH₵ {student.feeArrears!.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-end justify-between pt-4">
          <div className="w-48 text-center">
            <div className="mb-1 flex h-12 items-end justify-center">
              {settings.teacherSignature ? (
                <img
                  src={settings.teacherSignature}
                  alt="Sign"
                  className={`max-h-full max-w-full object-contain ${imgFilter}`}
                />
              ) : (
                <div className={`mb-2 w-full border-b-2 ${sigLine}`} style={customBorder}></div>
              )}
            </div>
            <p className={`border-t-2 ${sigLine} pt-1 text-xs font-black uppercase`} style={customBorder}>
              {settings.classTeacherName || "Class Teacher"}
            </p>
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs font-bold text-gray-500">Next Term Begins On</p>
            <p className="min-w-30 border-b border-gray-400 pb-1 font-black">
              {settings.nextTermStarts
                ? new Date(settings.nextTermStarts).toLocaleDateString("en-GB")
                : "........................"}
            </p>
          </div>
          <div className="w-48 text-center">
            <div className="mb-1 flex h-12 items-end justify-center">
              {settings.headTeacherSignature ? (
                <img
                  src={settings.headTeacherSignature}
                  alt="Sign"
                  className={`max-h-full max-w-full object-contain ${imgFilter}`}
                />
              ) : (
                <div className={`mb-2 w-full border-b-2 ${sigLine}`} style={customBorder}></div>
              )}
            </div>
            <p className={`border-t-2 ${sigLine} pt-1 text-xs font-black uppercase`} style={customBorder}>
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
