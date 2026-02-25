import type { ReportTemplateProps } from "../types";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";

export function ModernTemplate({ student, settings, printMode }: ReportTemplateProps) {
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
  const brandBgLight = isBW ? "bg-gray-50" : "bg-teal-50"; // subtle page fills
  const brandBgSolid = isBW ? "bg-gray-200" : "bg-teal-100"; // medium fills
  const brandBgDark = isBW ? "bg-gray-900" : "bg-teal-700"; // dominant accent
  const brandBorder = isBW ? "border-gray-500" : "border-teal-300"; // containers
  const brandDivide = isBW ? "divide-gray-300" : "divide-teal-200"; // table rows
  const brandTextDark = isBW ? "text-gray-900" : "text-teal-900"; // headings
  const brandTextAccent = isBW ? "text-gray-700" : "text-teal-600"; // secondary text
  const brandTextLabel = isBW ? "text-gray-700" : "text-teal-700"; // labels
  const badgeBg = isBW ? "bg-gray-800" : "bg-teal-700"; // report badge
  const sigLine = isBW ? "border-gray-600" : "border-teal-400"; // signature lines
  const redText = isBW
    ? "text-gray-900 font-black underline decoration-2 underline-offset-2"
    : "text-red-600 font-black";

  return (
    <div className="relative mx-auto box-border grid min-h-[297mm] w-[210mm] grid-rows-[auto_1fr_auto] gap-5 bg-white p-[10mm] font-sans text-gray-800 print:h-[297mm] print:overflow-hidden print:border-none">
      {/* 🛡️ WATERMARK */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 bg-[url('/assets/coat-of-arms.png')] bg-size-[50%] bg-center bg-no-repeat opacity-[0.04] ${isBW ? "grayscale" : ""}`}
      />
      {/* ==========================================
          HEADER
          ========================================== */}
      <header className={`flex items-center justify-between border-b-2 ${brandBorder} pb-4`}>
        {/* School Logo */}
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 ${brandBorder} ${brandBgLight} p-2`}
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className={`max-h-full max-w-full object-contain ${imgFilter}`}
            />
          ) : (
            <span className={`text-[10px] font-bold uppercase ${brandTextAccent}`}>No Logo</span>
          )}
        </div>

        {/* School Details — centred */}
        <div className="flex-1 px-5 text-center">
          <h1 className={`text-2xl font-black tracking-tight uppercase ${brandTextDark}`}>
            {settings.schoolName}
          </h1>
          {settings.address && <p className="mt-0.5 text-xs text-gray-500">{settings.address}</p>}
          {(settings.phoneNumber || settings.email) && (
            <p className="mt-0.5 text-xs text-gray-500">
              {settings.phoneNumber && `Tel: ${settings.phoneNumber}`}
              {settings.phoneNumber && settings.email && ` • `}
              {settings.email && settings.email}
            </p>
          )}
          {settings.schoolMotto && (
            <p className={`mt-1 text-xs font-semibold italic ${brandTextAccent}`}>
              "{settings.schoolMotto}"
            </p>
          )}
          <div className="mt-1.5 flex justify-center gap-4 text-[11px] font-semibold text-gray-600">
            <span>{settings.academicYear}</span>
            <span>•</span>
            <span>{settings.term}</span>
          </div>
          <div className="mt-2">
            <span
              className={`inline-block rounded-md px-6 py-1 text-[11px] font-black tracking-[0.2em] text-white uppercase shadow-sm ${badgeBg}`}
            >
              Terminal Report
            </span>
          </div>
        </div>

        {/* GES Logo */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center">
          <img
            src="/assets/ges-logo.png"
            alt="GES"
            className={`h-full w-full object-contain mix-blend-multiply ${imgFilter}`}
          />
        </div>
      </header>

      {/* ==========================================
          MAIN BODY: 70/30 Split
          ========================================== */}
      <main className="flex items-start gap-6">
        {/* LEFT COLUMN: Academic Table */}
        <div className="flex-[2.2]">
          <h3 className="mb-3 text-sm font-bold tracking-wider text-gray-900 uppercase">
            Academic Performance
          </h3>
          <div className={`overflow-hidden rounded-xl border ${brandBorder}`}>
            <table className="w-full text-left text-[13px]">
              <thead className={`border-b-2 ${brandBorder} ${brandBgSolid}`}>
                <tr>
                  <th
                    className={`w-[38%] px-3 py-2.5 text-left text-[10px] font-black uppercase ${brandTextDark}`}
                  >
                    Learning Area
                  </th>
                  {!isKG && (
                    <>
                      <th
                        className={`px-2 py-2.5 text-center text-[10px] font-black uppercase ${brandTextDark}`}
                      >
                        Class
                        <br />
                        <span className="text-[9px] font-semibold normal-case">
                          ({settings.classScoreMax})
                        </span>
                      </th>
                      <th
                        className={`px-2 py-2.5 text-center text-[10px] font-black uppercase ${brandTextDark}`}
                      >
                        Exam
                        <br />
                        <span className="text-[9px] font-semibold normal-case">
                          ({settings.examScoreMax})
                        </span>
                      </th>
                      <th
                        className={`px-2 py-2.5 text-center text-[10px] font-black uppercase ${brandTextDark}`}
                      >
                        Total
                        <br />
                        <span className="text-[9px] font-semibold normal-case">(100)</span>
                      </th>
                    </>
                  )}
                  <th
                    className={`px-2 py-2.5 text-center text-[10px] font-black uppercase ${brandTextDark}`}
                  >
                    Grade
                  </th>
                  {!isKG && (
                    <th
                      className={`px-2 py-2.5 text-center text-[10px] font-black uppercase ${brandTextDark}`}
                    >
                      Pos
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${brandDivide}`}>
                {student.subjects.map((sub, idx) => (
                  <tr key={sub.id} className={idx % 2 === 1 ? brandBgLight : "bg-white"}>
                    <td className="px-3 py-2 font-semibold text-gray-800">{sub.name}</td>
                    {!isKG && (
                      <>
                        <td className="px-2 py-2 text-center text-gray-600">{sub.classScore}</td>
                        <td className="px-2 py-2 text-center text-gray-600">{sub.examScore}</td>
                        <td className={`px-2 py-2 text-center font-bold ${brandTextDark}`}>
                          {sub.totalScore}
                        </td>
                      </>
                    )}
                    <td
                      className={`px-2 py-2 text-center font-bold ${
                        String(sub.grade).includes("9") || sub.grade === "F9" ? redText : ""
                      }`}
                    >
                      {sub.grade}
                    </td>
                    {!isKG && (
                      <td className="px-2 py-2 text-center text-xs text-gray-500">
                        {sub.subjectPosition || "-"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`mt-3 rounded-lg border-2 ${brandBorder} ${brandBgLight} p-3`}>
            <h4
              className={`mb-1.5 text-[9px] font-black tracking-wider uppercase ${brandTextLabel}`}
            >
              Subject Remarks
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {student.subjects.map((sub) => (
                <div key={`rem-${sub.id}`} className="flex items-baseline text-[11px]">
                  <span className={`w-24 truncate font-semibold ${brandTextAccent}`}>
                    {sub.name}:
                  </span>
                  <span className="ml-1 text-gray-600 italic">{sub.remark}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div
          className={`flex flex-[0.85] flex-col gap-4 rounded-xl border-2 p-4 ${brandBgLight} ${brandBorder}`}
        >
          <div className="text-center">
            <div
              className={`mx-auto mb-2 h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white ring-2 ${brandBorder} shadow-sm`}
            >
              {student.pictureUrl ? (
                <img
                  src={student.pictureUrl}
                  alt={student.name}
                  className={`h-full w-full object-cover ${imgFilter}`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                  No Photo
                </div>
              )}
            </div>
            <h2 className="text-lg leading-tight font-black text-gray-900">{student.name}</h2>
            <p className={`mt-1 text-sm font-semibold ${brandTextAccent}`}>{student.className}</p>
            <p className="mt-0.5 text-xs text-gray-500">Roll Size: {settings.classSize || "-"}</p>
          </div>

          {!isKG && (
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-lg border-2 ${brandBorder} bg-white p-2.5 text-center shadow-sm`}
              >
                <span className={`mb-0.5 block text-[9px] font-black uppercase ${brandTextLabel}`}>
                  Position
                </span>
                <span className={`text-lg font-black ${brandTextDark}`}>
                  {student.classPosition}
                </span>
              </div>
              <div
                className={`rounded-lg border-2 ${brandBorder} bg-white p-2.5 text-center shadow-sm`}
              >
                <span className={`mb-0.5 block text-[9px] font-black uppercase ${brandTextLabel}`}>
                  Average
                </span>
                <span className={`text-lg font-black ${brandTextDark}`}>
                  {student.averageScore.toFixed(1)}
                </span>
              </div>
              <div
                className={`col-span-2 flex items-center justify-between rounded-lg border-2 ${brandBorder} bg-white p-2.5 shadow-sm`}
              >
                <span className={`text-[9px] font-black uppercase ${brandTextLabel}`}>
                  Total Marks
                </span>
                <span className={`text-base font-black ${brandTextDark}`}>
                  {student.totalScore}
                </span>
              </div>
              {student.aggregate !== null && (
                <div
                  className={`col-span-2 flex items-center justify-between rounded-lg p-2.5 shadow-sm ${brandBgDark}`}
                >
                  <span className="text-[9px] font-black text-white uppercase opacity-80">
                    Aggregate
                  </span>
                  <span className="text-lg font-black text-white">{student.aggregate}</span>
                </div>
              )}
            </div>
          )}

          <div className={`space-y-2.5 border-t-2 pt-3 ${brandBorder}`}>
            <div>
              <span className="mb-0.5 block text-[10px] font-bold text-gray-500 uppercase">
                Attendance
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {student.attendancePresent || 0} / {settings.totalAttendanceDays || "-"} Days
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-[10px] font-bold text-gray-500 uppercase">
                Conduct
              </span>
              <span className="text-sm font-semibold text-gray-800 capitalize">
                {student.conduct || "Satisfactory"}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-[10px] font-bold text-gray-500 uppercase">
                Interest
              </span>
              <span className="text-sm font-semibold text-gray-800 capitalize">
                {student.interest || "Active Participant"}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer className="mt-auto space-y-4">
        <div className="flex gap-6">
          <div className={`flex-1 rounded-lg border-2 ${brandBorder} bg-white p-3`}>
            <h4
              className={`mb-1.5 text-[9px] font-black tracking-wider uppercase ${brandTextLabel}`}
            >
              Class Teacher's Remark
            </h4>
            <p className="min-h-9 text-xs leading-relaxed text-gray-700 italic">
              "{student.teacherRemark || "A good term's work."}"
            </p>
          </div>
          <div className={`flex-1 rounded-lg border-2 ${brandBorder} bg-white p-3`}>
            <h4
              className={`mb-1.5 text-[9px] font-black tracking-wider uppercase ${brandTextLabel}`}
            >
              Headmaster's Remark
            </h4>
            <p className="min-h-9 text-xs leading-relaxed text-gray-700 italic">
              "{headmasterRemark || "Keep it up."}"
            </p>
          </div>
        </div>

        {(isThirdTerm || (isPrivate && hasAnyFee)) && (
          <div
            className={`flex items-center justify-between border-t-2 border-b-2 ${brandBorder} ${brandBgLight} px-4 py-2.5`}
          >
            {isThirdTerm && (
              <div>
                <span className="mr-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Status:
                </span>
                <span
                  className={`rounded-md px-3 py-1 text-sm font-black text-white uppercase ${brandBgDark}`}
                >
                  {student.promotionStatus || "Pending"}
                </span>
              </div>
            )}

            {isPrivate && hasAnyFee && (
              <div className="flex gap-6 text-sm">
                {settings.schoolGift && (
                  <div>
                    <span className="text-xs text-gray-500">Fees:</span>{" "}
                    <span className="font-bold">GH₵{settings.schoolGift}</span>
                  </div>
                )}
                {settings.canteenFees && (
                  <div>
                    <span className="text-xs text-gray-500">Canteen:</span>{" "}
                    <span className="font-bold">GH₵{settings.canteenFees}</span>
                  </div>
                )}
                {settings.firstAidFees && (
                  <div>
                    <span className="text-xs text-gray-500">First Aid:</span>{" "}
                    <span className="font-bold">GH₵{settings.firstAidFees}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-end justify-between px-4 pt-6">
          <div className="w-48 text-center">
            <div className="mb-2 flex h-12 flex-col items-center justify-end">
              {settings.teacherSignature ? (
                <img
                  src={settings.teacherSignature}
                  alt="Sign"
                  className={`max-h-full object-contain ${imgFilter}`}
                />
              ) : (
                <div className={`w-full border-b-2 ${sigLine}`}></div>
              )}
            </div>
            <div className={`border-t-2 ${sigLine} pt-1`} />
            <p className="mt-1 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              {settings.classTeacherName || "Class Teacher"}
            </p>
          </div>
          <div className="text-center">
            <p className="mb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              Next Term Begins
            </p>
            <p className="text-sm font-black text-gray-800">
              {settings.nextTermStarts
                ? new Date(settings.nextTermStarts).toLocaleDateString("en-GB")
                : "To be determined"}
            </p>
          </div>
          <div className="w-48 text-center">
            <div className="mb-2 flex h-12 flex-col items-center justify-end">
              {settings.headTeacherSignature ? (
                <img
                  src={settings.headTeacherSignature}
                  alt="Sign"
                  className={`max-h-full object-contain ${imgFilter}`}
                />
              ) : (
                <div className={`w-full border-b-2 ${sigLine}`}></div>
              )}
            </div>
            <div className={`border-t-2 ${sigLine} pt-1`} />
            <p className="mt-1 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              {settings.headTeacherName || "Headmaster"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
