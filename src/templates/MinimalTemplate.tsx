import type { ReportTemplateProps } from "../types";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";

export function MinimalTemplate({ student, settings, printMode }: ReportTemplateProps) {
  const isKG = settings.level === "KG";
  const isThirdTerm = settings.term === "Third Term";
  const isPrivate = settings.schoolType === "PRIVATE";
  const hasAnyFee = !!(settings.schoolGift || settings.canteenFees || settings.firstAidFees);
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);

  // ---------------------------------------------------------------------------
  // 🎨 PRINT MODE LOGIC (Color vs B&W)
  // The Minimal template is intentionally austere. Color mode adds navy accents.
  // ---------------------------------------------------------------------------
  const isBW = printMode === "bw";
  const imgFilter = isBW ? "grayscale" : "";

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

  return (
    <div className="mx-auto box-border grid min-h-[297mm] w-[210mm] grid-rows-[auto_1fr_auto] bg-white p-[12mm] font-serif text-black print:h-[297mm] print:overflow-hidden print:border-none">
      {/* ==========================================
          HEADER: Centered, Formal, Academic
          ========================================== */}
      <header className={`relative mb-6 border-b-2 ${headerBorder} pb-6 text-center`}>
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
          <div className={`absolute top-0 right-0 h-20 w-20 border-2 ${headerBorder} p-0.5`}>
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
          >
            Official Academic Transcript
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
        <div className="mb-6 flex justify-between font-sans text-sm">
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
              <span className="ml-2">{student.className}</span>
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
            {!isKG && (
              <p>
                <span className="mr-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Position:
                </span>{" "}
                <span className="font-bold">{student.classPosition}</span>
              </p>
            )}
          </div>
        </div>

        <table className="mb-4 w-full border-collapse text-left font-sans text-[13px]">
          <thead>
            <tr className={`border-y-2 ${tableBorder}`}>
              <th className="px-1 py-2.5 font-bold">Course / Subject</th>
              {!isKG && (
                <>
                  <th className="px-1 py-2.5 text-center font-bold">
                    Class ({settings.classScoreMax})
                  </th>
                  <th className="px-1 py-2.5 text-center font-bold">
                    Exam ({settings.examScoreMax})
                  </th>
                  <th className="px-1 py-2.5 text-center font-bold">Total (100)</th>
                </>
              )}
              <th className="px-1 py-2.5 text-center font-bold">Grade</th>
              {!isKG && <th className="px-1 py-2.5 text-center font-bold">Pos</th>}
              <th className="px-1 py-2.5 text-left font-bold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {student.subjects.map((sub) => (
              <tr key={sub.id} className={`border-b ${tableRowDiv}`}>
                <td className="px-1 py-2.5 font-medium">{sub.name}</td>
                {!isKG && (
                  <>
                    <td className="px-1 py-2.5 text-center">{sub.classScore}</td>
                    <td className="px-1 py-2.5 text-center">{sub.examScore}</td>
                    <td className="px-1 py-2.5 text-center font-bold">{sub.totalScore}</td>
                  </>
                )}
                <td
                  className={`px-1 py-2.5 text-center font-bold ${
                    String(sub.grade).includes("9") || sub.grade === "F9" ? redText : ""
                  }`}
                >
                  {sub.grade}
                </td>
                {!isKG && (
                  <td className="px-1 py-2.5 text-center text-xs">{sub.subjectPosition || "-"}</td>
                )}
                <td className="px-1 py-2.5 text-left text-xs italic">{sub.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isKG && (
          <div className="mb-8 flex justify-end gap-6 font-sans text-sm">
            <p>
              <span className={`mr-2 text-xs font-bold uppercase ${labelColor}`}>Total Score:</span>{" "}
              <strong className={summaryStrong}>{student.totalScore}</strong>
            </p>
            <p>
              <span className={`mr-2 text-xs font-bold uppercase ${labelColor}`}>Average:</span>{" "}
              <strong className={summaryStrong}>{student.averageScore.toFixed(2)}</strong>
            </p>
            {student.aggregate !== null && (
              <p>
                <span className={`mr-2 text-xs font-bold uppercase ${labelColor}`}>Aggregate:</span>{" "}
                <strong className={aggregateBox}>{student.aggregate}</strong>
              </p>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          FOOTER: Signatures & Inline Remarks
          ========================================== */}
      <footer className="mt-auto font-sans text-sm">
        <div className={`mb-6 border-t-2 ${footerBorder} pt-4`}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <p>
              <strong className="text-xs tracking-wider uppercase">Attendance:</strong>{" "}
              {student.attendancePresent || 0} out of {settings.totalAttendanceDays || "---"} days
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

        <div className="mb-8 space-y-4">
          <p>
            <strong className="mr-2 text-xs tracking-wider uppercase">
              Class Teacher's Remark:
            </strong>{" "}
            <span className="italic">
              {student.teacherRemark || "Has shown consistent effort throughout the term."}
            </span>
          </p>
          <p>
            <strong className="mr-2 text-xs tracking-wider uppercase">Headmaster's Remark:</strong>{" "}
            <span className="italic">
              {headmasterRemark || "A satisfactory performance. Keep it up."}
            </span>
          </p>
        </div>

        {isPrivate && hasAnyFee && (
          <div className={`mb-4 border ${footerBorder} bg-gray-50 p-2 text-center text-xs`}>
            <strong className="mr-2 tracking-wider uppercase">Next Term Fees:</strong>
            {settings.schoolGift && <>School: GH₵{settings.schoolGift}</>}
            {settings.schoolGift && settings.canteenFees && <> &nbsp;|&nbsp; </>}
            {settings.canteenFees && <>Canteen: GH₵{settings.canteenFees}</>}
            {(settings.schoolGift || settings.canteenFees) && settings.firstAidFees && (
              <> &nbsp;|&nbsp; </>
            )}
            {settings.firstAidFees && <>First Aid: GH₵{settings.firstAidFees}</>}
          </div>
        )}

        <div className="mt-8 flex items-end justify-between">
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
            <div className={`border-t-2 ${footerBorder} pt-1 text-center`}>
              <p className="text-xs font-black uppercase">
                {settings.classTeacherName || "Class Teacher"}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="mb-1 text-xs tracking-wider uppercase">Next Term Resumes</p>
            <p className="text-sm font-bold">
              {settings.nextTermStarts
                ? new Date(settings.nextTermStarts).toLocaleDateString("en-GB")
                : "..................................."}
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
            <div className={`border-t-2 ${footerBorder} pt-1 text-center`}>
              <p className="text-xs font-black uppercase">
                {settings.headTeacherName || "Headmaster"}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
