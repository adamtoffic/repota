import { Fragment } from "react";
import type { ReportTemplateProps } from "../types";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";

export function OriginalTemplate({ student, settings, printMode }: ReportTemplateProps) {
  const isIslamic = settings.schoolType === "ISLAMIC";
  const isPrivate = settings.schoolType === "PRIVATE";
  const hasAnyFee = !!(settings.schoolGift || settings.canteenFees || settings.firstAidFees);
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);

  // Logic to hide aggregate for KG
  const showAggregate = settings.level !== "KG" && student.aggregate !== null;

  // ---------------------------------------------------------------------------
  // 🎨 PRINT MODE LOGIC (Color vs B&W)
  // ---------------------------------------------------------------------------
  const isBW = printMode === "bw";
  const borderColor = isBW ? "border-black" : "border-blue-950";
  const divideColor = isBW ? "divide-black" : "divide-blue-950";
  const primaryBg = isBW ? "bg-black" : "bg-primary";
  const accentText = isBW ? "text-black" : "text-blue-900";
  const mutedBg = isBW ? "bg-gray-200" : "bg-slate-200";
  const tableHeaderBg = isBW ? "bg-gray-100" : "bg-slate-100";
  const zebraBg = isBW ? "bg-gray-50" : "bg-slate-50";
  const redText = isBW ? "text-black underline decoration-2 underline-offset-2" : "text-red-600";

  // ---------------------------------------------------------------------------
  // 📐 DENSITY LOGIC (The "3 Gears" System)
  // ---------------------------------------------------------------------------
  const subjectCount = student.subjects.length;
  let density = {
    padding: "py-3",
    textSize: "text-sm",
    headerSize: "text-xs",
    fillerCount: 12,
  };

  if (subjectCount > 10 && subjectCount <= 15) {
    density = {
      padding: "py-1.5",
      textSize: "text-xs",
      headerSize: "text-[10px]",
      fillerCount: 15,
    };
  } else if (subjectCount > 15) {
    density = {
      padding: "py-[2px]",
      textSize: "text-[10px]",
      headerSize: "text-[9px]",
      fillerCount: 0,
    };
  }

  const fillersNeeded = Math.max(0, density.fillerCount - subjectCount);

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
      <header className={`relative z-10 border-b-[3px] ${borderColor} pb-2`}>
        {isIslamic && (
          <div className="mb-1 text-center">
            <p className="font-arabic text-sm font-bold">بسم الله الرحمن الرحيم</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className={`h-full w-full object-contain mix-blend-multiply ${isBW ? "grayscale" : ""}`}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border-2 border-dashed border-gray-300 text-[10px] font-bold text-gray-400">
                LOGO
              </div>
            )}
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
              <p className={`mt-1 text-xs font-semibold italic ${accentText}`}>
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
          >
            STUDENT REPORT
          </span>
        </div>
      </header>

      {/* =================================================================================
          SECTION 2: STUDENT ID CARD
         ================================================================================= */}
      <section className={`relative z-10 flex border-2 ${borderColor} bg-white`}>
        {student.pictureUrl && (
          <div
            className={`flex w-28 shrink-0 items-center justify-center border-r-2 ${borderColor} bg-gray-50 p-2`}
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
            className={`grid grid-cols-[1fr_100px_80px_80px] divide-x-2 ${divideColor} border-b-2 ${borderColor}`}
          >
            <div className="p-2">
              <span className="block text-[9px] font-black text-gray-500 uppercase">
                Name of Student
              </span>
              <span className="block truncate text-lg leading-tight font-black tracking-tight uppercase">
                {student.name}
              </span>
            </div>
            <div className={`${tableHeaderBg} p-2 text-center`}>
              <span className="block text-[9px] font-black text-gray-500 uppercase">Class</span>
              <span className="block text-lg leading-tight font-black">
                {settings.className || student.className}
              </span>
            </div>
            <div className="p-2 text-center">
              <span className="block text-[9px] font-black text-gray-500 uppercase">
                No. On Roll
              </span>
              <span className="block text-lg leading-tight font-black">
                {settings.classSize || "-"}
              </span>
            </div>
            <div className={`${primaryBg} p-2 text-center text-white`}>
              <span className="block text-[9px] font-black uppercase opacity-90">Pos.</span>
              <span className="block text-xl leading-tight font-black">
                {settings.level === "KG" ? "N/A" : student.classPosition}
              </span>
            </div>
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
        <table className={`w-full border-collapse border-2 ${borderColor}`}>
          <thead>
            <tr className={`divide-x-2 ${divideColor} border-b-2 ${borderColor} ${tableHeaderBg}`}>
              <th className={`w-4/12 p-1.5 text-left font-black uppercase ${density.headerSize}`}>
                Subject
              </th>
              {settings.level !== "KG" && (
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
              )}
              <th className={`w-[8%] p-1 text-center font-black uppercase ${density.headerSize}`}>
                Grd
              </th>
              {settings.level !== "KG" && (
                <th
                  className={`w-[8%] p-1 text-center font-black uppercase ${mutedBg} ${density.headerSize}`}
                >
                  Pos.
                </th>
              )}
              <th className={`w-3/12 p-1.5 text-left font-black uppercase ${density.headerSize}`}>
                Remark
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y-2 ${divideColor} border-b-2 ${borderColor}`}>
            {student.subjects.map((sub, idx) => (
              <Fragment key={sub.id}>
                <tr
                  className={`divide-x-2 ${divideColor} ${density.padding} ${idx % 2 === 1 ? zebraBg : "bg-white"}`}
                >
                  <td className={`px-2 font-black uppercase ${density.textSize} truncate`}>
                    {sub.name}
                  </td>
                  {settings.level !== "KG" && (
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
                  )}
                  <td
                    className={`text-center font-black ${density.textSize} ${String(sub.grade).includes("9") || sub.grade === "F9" ? redText : ""}`}
                  >
                    {sub.grade}
                  </td>
                  {settings.level !== "KG" && (
                    <td
                      className={`text-center font-mono font-black ${tableHeaderBg} ${density.textSize}`}
                    >
                      {sub.subjectPosition || "-"}
                    </td>
                  )}
                  <td className={`truncate px-2 font-semibold uppercase ${density.textSize}`}>
                    {sub.remark}
                  </td>
                </tr>
                {sub.classScoreComponents && sub.classScoreComponents.length > 0 && (
                  <tr
                    key={`${sub.id}-breakdown`}
                    className={`border-t border-gray-200 ${idx % 2 === 1 ? zebraBg : "bg-white"}`}
                  >
                    <td colSpan={settings.level === "KG" ? 3 : 7} className="px-3 pt-0 pb-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0">
                        <span
                          className={`text-[8px] font-black tracking-wider uppercase ${isBW ? "text-black" : "text-purple-600"}`}
                        >
                          SBA:
                        </span>
                        {sub.classScoreComponents.map((comp) => (
                          <span key={comp.id} className="text-[8px] font-semibold text-gray-600">
                            {comp.name}&nbsp;
                            <span className="font-black text-gray-900">
                              {comp.score}/{comp.maxScore}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {/* FILLER ROWS */}
            {Array.from({ length: fillersNeeded }).map((_, i) => (
              <tr
                key={`empty-${i}`}
                className={`divide-x-2 ${divideColor} ${density.padding} ${(student.subjects.length + i) % 2 === 1 ? zebraBg : "bg-white"}`}
              >
                <td colSpan={settings.level === "KG" ? 3 : 7}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* =================================================================================
          SECTION 4: PERFORMANCE SUMMARY
         ================================================================================= */}
      {settings.level !== "KG" && (
        <section
          className={`relative z-10 grid grid-cols-[1fr_auto] border-2 ${borderColor} ${tableHeaderBg}`}
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
            {showAggregate && (
              <div className={`flex flex-col justify-center px-4 py-2 text-white ${primaryBg}`}>
                <span className="text-[9px] font-black uppercase">Aggregate</span>
                <span className="text-center text-2xl leading-none font-black">
                  {student.aggregate}
                </span>
              </div>
            )}
          </div>

          {settings.term === "Third Term" && student.promotionStatus && (
            <div className={`flex items-center border-l-2 ${borderColor} px-6 py-2`}>
              <div className="text-right">
                <span className="block text-[9px] font-black text-gray-500 uppercase">Status</span>
                <span
                  className={`block text-base font-black uppercase underline decoration-2 underline-offset-2 ${accentText}`}
                >
                  {student.promotionStatus}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =================================================================================
          SECTION 5: FOOTER (Remarks & Signatures)
         ================================================================================= */}
      <footer className="relative z-10 flex flex-col gap-3">
        {isPrivate && hasAnyFee && (
          <div
            className={`flex items-center justify-between border-2 ${borderColor} bg-gray-50 p-2`}
          >
            <span className="text-[10px] font-black tracking-wider text-gray-600 uppercase">
              Next Term Fees:
            </span>
            {settings.schoolGift && (
              <span className="text-sm font-bold">School: GH₵{settings.schoolGift}</span>
            )}
            {settings.canteenFees && (
              <span className="text-sm font-bold">Canteen: GH₵{settings.canteenFees}</span>
            )}
            {settings.firstAidFees && (
              <span className="text-sm font-bold">First Aid: GH₵{settings.firstAidFees}</span>
            )}
          </div>
        )}

        <div className={`border-2 ${borderColor}`}>
          <div className={`grid grid-cols-[130px_1fr] border-b-2 ${borderColor}`}>
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
            >
              Conduct
            </div>
            <div className="p-2 text-xs font-semibold">{student.conduct || "Satisfactory"}</div>
          </div>
          <div className={`grid grid-cols-[130px_1fr] border-b-2 ${borderColor}`}>
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
            >
              Interest
            </div>
            <div className="p-2 text-xs font-semibold">{student.interest || "Reading, Sports"}</div>
          </div>
          <div className={`grid grid-cols-[130px_1fr] border-b-2 ${borderColor}`}>
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
            >
              Class Teacher
            </div>
            <div className="p-2 text-xs font-semibold italic">{student.teacherRemark}</div>
          </div>
          <div className="grid grid-cols-[130px_1fr]">
            <div
              className={`flex items-center border-r-2 ${borderColor} ${tableHeaderBg} p-2 text-[10px] font-black text-gray-700 uppercase`}
            >
              Head Teacher
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
            <div className={`w-full border-t-2 border-dotted ${borderColor} pt-1`} />
            <p className="mt-1 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              Class Teacher's Signature
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
            <div className={`w-full border-t-2 border-dotted ${borderColor} pt-1`} />
            <p className="mt-1 text-[9px] font-black tracking-wider text-gray-600 uppercase">
              Head Teacher's Signature
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
