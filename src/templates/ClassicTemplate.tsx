import type { ReportTemplateProps } from "../types";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";

export function ClassicTemplate({ student, settings, printMode }: ReportTemplateProps) {
  const isKG = settings.level === "KG";
  const isThirdTerm = settings.term === "Third Term";
  const isPrivate = settings.schoolType === "PRIVATE";
  const hasAnyFee = !!(settings.schoolGift || settings.canteenFees || settings.firstAidFees);
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);

  // ---------------------------------------------------------------------------
  // 🎨 PRINT MODE LOGIC (Color vs B&W)
  // ---------------------------------------------------------------------------
  const isBW = printMode === "bw";
  const imgFilter = isBW ? "grayscale" : "";

  // ── Brand Color Variables ──────────────────────────────────────────────────
  const borderColor   = isBW ? "border-black"             : "border-emerald-700";
  const divideColor   = isBW ? "divide-gray-400"           : "divide-emerald-300";
  const titleBg       = isBW ? "bg-black text-white"       : "bg-emerald-700 text-white";
  const tableHeaderBg = isBW ? "bg-gray-200 text-gray-900" : "bg-emerald-50 text-emerald-900";
  const zebraBg       = isBW ? "bg-gray-50"               : "bg-emerald-50/40";
  const remarkBg      = isBW ? "bg-gray-50"               : "bg-emerald-50";
  const summaryBg     = isBW ? "bg-gray-100"              : "bg-emerald-50";
  const promoText     = isBW ? "text-black"               : "text-emerald-700";
  const sigLine       = isBW ? "border-gray-700"          : "border-emerald-700";
  const infoRowBorder = isBW ? "border-gray-300"          : "border-emerald-200";
  const mottoColor    = isBW ? "text-gray-700"            : "text-emerald-800";
  const redText       = isBW ? "text-black underline decoration-2 underline-offset-2" : "text-red-600";

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
      <header className={`mb-6 border-b-2 ${borderColor} pb-4`}>
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
              <p className={`mt-1.5 text-sm font-bold italic ${mottoColor}`}>
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
              >
                Terminal Report Card
              </span>
            </div>
          </div>

          <div className="flex w-24 justify-end">
            <div className={`h-28 w-24 border-2 ${borderColor} bg-gray-50 p-1`}>
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
        >
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`}>
            <span className="font-semibold text-gray-600">Name of Student:</span>
            <span className="font-bold uppercase">{student.name}</span>
          </div>
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`}>
            <span className="font-semibold text-gray-600">Academic Year:</span>
            <span className="font-bold">{settings.academicYear}</span>
          </div>
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`}>
            <span className="font-semibold text-gray-600">Class:</span>
            <span className="font-bold">{settings.className || student.className}</span>
          </div>
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`}>
            <span className="font-semibold text-gray-600">Term:</span>
            <span className="font-bold">{settings.term}</span>
          </div>
          <div className={`flex justify-between border-b ${infoRowBorder} pb-1`}>
            <span className="font-semibold text-gray-600">Number on Roll:</span>
            <span className="font-bold">{settings.classSize || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-600">Position in Class:</span>
            <span className="font-bold">{isKG ? "N/A" : student.classPosition}</span>
          </div>
        </div>
      </header>

      {/* ==========================================
          ROW 2: ACADEMIC TABLE
          ========================================== */}
      <main className="mb-6 min-h-0 overflow-hidden">
        <table className={`w-full border-collapse border-2 ${borderColor} text-[13px]`}>
          <thead>
            <tr className={`border-b-2 ${borderColor} ${tableHeaderBg}`}>
              <th className={`w-1/3 border ${borderColor} px-2 py-2 text-left`}>Subject</th>
              {!isKG && (
                <>
                  <th className={`w-16 border ${borderColor} px-1 py-2 text-center leading-tight`}>
                    Class
                    <br />
                    <span className="text-[10px]">({settings.classScoreMax}%)</span>
                  </th>
                  <th className={`w-16 border ${borderColor} px-1 py-2 text-center leading-tight`}>
                    Exam
                    <br />
                    <span className="text-[10px]">({settings.examScoreMax}%)</span>
                  </th>
                  <th className={`w-16 border ${borderColor} px-1 py-2 text-center leading-tight`}>
                    Total
                    <br />
                    <span className="text-[10px]">(100%)</span>
                  </th>
                </>
              )}
              <th className={`w-16 border ${borderColor} px-2 py-2 text-center`}>Grade</th>
              {!isKG && <th className={`w-16 border ${borderColor} px-2 py-2 text-center`}>Pos</th>}
              <th className={`border ${borderColor} px-2 py-2 text-left`}>Remarks</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${divideColor}`}>
            {student.subjects.map((sub, idx) => (
              <tr key={sub.id} className={idx % 2 === 1 ? zebraBg : "bg-white"}>
                <td className={`border ${borderColor} px-2 py-1.5 font-medium`}>{sub.name}</td>
                {!isKG && (
                  <>
                    <td className={`border ${borderColor} px-2 py-1.5 text-center`}>
                      {sub.classScore}
                    </td>
                    <td className={`border ${borderColor} px-2 py-1.5 text-center`}>
                      {sub.examScore}
                    </td>
                    <td className={`border ${borderColor} px-2 py-1.5 text-center font-bold`}>
                      {sub.totalScore}
                    </td>
                  </>
                )}
                <td
                  className={`border ${borderColor} px-2 py-1.5 text-center font-bold ${String(sub.grade).includes("9") || sub.grade === "F9" ? redText : ""}`}
                >
                  {sub.grade}
                </td>
                {!isKG && (
                  <td className={`border ${borderColor} px-2 py-1.5 text-center text-xs`}>
                    {sub.subjectPosition || "-"}
                  </td>
                )}
                <td className={`border ${borderColor} px-2 py-1.5 text-left text-xs italic`}>
                  {sub.remark}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isKG && (
          <div className={`mt-3 flex justify-end gap-4 rounded border-2 ${borderColor} ${summaryBg} px-4 py-2 text-sm`}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-600">Total Score:</span>
              <span className={`rounded border-2 ${borderColor} ${summaryBg} px-3 py-1 font-black`}>
                {student.totalScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-600">Average:</span>
              <span className={`rounded border-2 ${borderColor} ${summaryBg} px-3 py-1 font-black`}>
                {student.averageScore.toFixed(1)}
              </span>
            </div>
            {student.aggregate !== null && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-600">Aggregate:</span>
                <span className={`rounded ${titleBg} px-3 py-1 font-bold shadow-sm`}>
                  {student.aggregate}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          ROW 3: FOOTER
          ========================================== */}
      <footer className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-4">
          <div className={`flex-1 rounded border ${borderColor} p-2`}>
            <span className="mb-1 block text-xs font-semibold text-gray-600 uppercase">
              Attendance
            </span>
            <div className="text-sm font-bold">
              {student.attendancePresent || 0} out of {settings.totalAttendanceDays || "-"} days
            </div>
          </div>
          <div className={`flex-2 rounded border ${borderColor} p-2`}>
            <span className="mb-1 block text-xs font-semibold text-gray-600 uppercase">
              Conduct / Character
            </span>
            <div className="text-sm italic">{student.conduct || "Satisfactory"}</div>
          </div>
          <div className={`flex-2 rounded border ${borderColor} p-2`}>
            <span className="mb-1 block text-xs font-semibold text-gray-600 uppercase">
              Interest / Talent
            </span>
            <div className="text-sm italic">{student.interest || "Active in class"}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded border ${borderColor} ${remarkBg} p-3`}>
            <span
              className={`mb-1 block border-b ${borderColor} pb-1 text-xs font-semibold uppercase`}
            >
              Class Teacher's Remark
            </span>
            <p className="mt-2 min-h-10 text-[13px] italic">
              {student.teacherRemark || "Good performance."}
            </p>
          </div>
          <div className={`rounded border ${borderColor} ${remarkBg} p-3`}>
            <span
              className={`mb-1 block border-b ${borderColor} pb-1 text-xs font-semibold uppercase`}
            >
              Head Teacher's Remark
            </span>
            <p className="mt-2 min-h-10 text-[13px] italic">
              {headmasterRemark || "Keep it up."}
            </p>
          </div>
        </div>

        {(isThirdTerm || (isPrivate && hasAnyFee)) && (
          <div className={`flex gap-4 rounded border ${borderColor} p-3`}>
            {isThirdTerm && (
              <div className={`flex-1 border-r ${borderColor} pr-4`}>
                <span className="text-xs font-bold text-gray-600 uppercase">Promotion Status:</span>
                <p className={`mt-1 font-black uppercase ${promoText}`}>
                  {student.promotionStatus || "Pending Decision"}
                </p>
              </div>
            )}
            {isPrivate && hasAnyFee && (
              <div className="flex flex-2 justify-between px-2">
                {settings.schoolGift && (
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Next Term Fees
                    </span>
                    <p className="text-sm font-bold">GH₵ {settings.schoolGift}</p>
                  </div>
                )}
                {settings.canteenFees && (
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Canteen</span>
                    <p className="text-sm font-bold">GH₵ {settings.canteenFees}</p>
                  </div>
                )}
                {settings.firstAidFees && (
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">First Aid</span>
                    <p className="text-sm font-bold">GH₵ {settings.firstAidFees}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-end justify-between pt-4">
          <div className="w-48 text-center">
            <div className="mb-1 flex h-12 items-end justify-center">
              {settings.teacherSignature ? (
                <img
                  src={settings.teacherSignature}
                  alt="Sign"
                  className={`max-h-full max-w-full object-contain ${imgFilter}`}
                />
              ) : (
                <div className={`mb-2 w-full border-b-2 ${sigLine}`}></div>
              )}
            </div>
            <p className={`border-t-2 ${sigLine} pt-1 text-xs font-black uppercase`}>
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
                <div className={`mb-2 w-full border-b-2 ${sigLine}`}></div>
              )}
            </div>
            <p className={`border-t-2 ${sigLine} pt-1 text-xs font-black uppercase`}>
              {settings.headTeacherName || "Head Teacher"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
