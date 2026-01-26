// Optimized Report Template for Private Schools
// - Max 12-13 subjects (space-efficient)
// - Includes fees section
// - Optimized for A4 printing

import type { ProcessedStudent, SchoolSettings } from "../../types";
import { generateHeadmasterRemark } from "../../utils/remarkGenerator";
import { ReportHeader } from "./ReportHeader";
import { StudentInfo } from "./StudentInfo";

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
}

export function PrivateSchoolReport({ student, settings }: Props) {
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);
  const showAggregate = settings.level !== "KG" && student.aggregate !== null;

  // Private schools: max 12-13 subjects, use compact density
  const subjectCount = student.subjects.length;
  const density = {
    padding: "py-1",
    textSize: "text-[11px]",
    headerSize: "text-[10px]",
  };

  // Reduced fillers for private schools (space for fees)
  const fillersNeeded = Math.max(0, 10 - subjectCount);

  return (
    <div className="report-page text-main h-full w-full bg-white">
      {/* Watermark */}
      <div className="watermark print:absolute print:inset-0 print:z-0 print:bg-[url('/assets/coat-of-arms.png')] print:bg-size-[50%] print:bg-center print:bg-no-repeat print:opacity-[0.04]" />

      {/* Main Container */}
      <div className="relative z-10 grid h-full grid-rows-[auto_auto_1fr_auto_auto] gap-2">
        {/* Header */}
        <ReportHeader settings={settings} />

        {/* Student Info */}
        <StudentInfo student={student} settings={settings} />

        {/* Grades Table */}
        <section className="flex flex-col justify-start">
          <table className="w-full border-collapse border-2 border-blue-950">
            <thead>
              <tr className="divide-x-2 divide-blue-950 border-b-2 border-blue-950 bg-slate-100 print:bg-gray-200">
                <th
                  className={`w-4/12 p-1.5 text-left font-black text-slate-800 uppercase ${density.headerSize}`}
                >
                  Subject
                </th>
                <th
                  className={`w-[8%] p-1 text-center font-black text-slate-800 uppercase ${density.headerSize}`}
                >
                  Class
                  <br />({settings.classScoreMax})
                </th>
                <th
                  className={`w-[8%] p-1 text-center font-black text-slate-800 uppercase ${density.headerSize}`}
                >
                  Exam
                  <br />({settings.examScoreMax})
                </th>
                <th
                  className={`w-[8%] p-1 text-center font-black text-slate-800 uppercase ${density.headerSize}`}
                >
                  Total
                  <br />
                  (100)
                </th>
                <th
                  className={`w-[8%] bg-slate-200 p-1 text-center font-black text-slate-800 uppercase print:bg-gray-300 ${density.headerSize}`}
                >
                  Pos.
                </th>
                <th
                  className={`w-[8%] p-1 text-center font-black text-slate-800 uppercase ${density.headerSize}`}
                >
                  Grd
                </th>
                <th
                  className={`w-3/12 p-1.5 text-left font-black text-slate-800 uppercase ${density.headerSize}`}
                >
                  Remark
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-blue-950 border-b-2 border-blue-950">
              {student.subjects.map((sub, idx) => (
                <tr
                  key={sub.id}
                  className={`divide-x-2 divide-blue-950 ${density.padding} ${idx % 2 === 1 ? "print:bg-background bg-slate-50" : "bg-white"}`}
                >
                  <td
                    className={`text-main px-2 font-black uppercase ${density.textSize} truncate`}
                  >
                    {sub.name}
                  </td>
                  <td
                    className={`text-center font-mono font-bold text-slate-700 ${density.textSize}`}
                  >
                    {sub.classScore || "-"}
                  </td>
                  <td
                    className={`text-center font-mono font-bold text-slate-700 ${density.textSize}`}
                  >
                    {sub.examScore || "-"}
                  </td>
                  <td className={`text-main text-center font-mono font-black ${density.textSize}`}>
                    {sub.totalScore}
                  </td>
                  <td
                    className={`text-main bg-slate-100 text-center font-mono font-black print:bg-gray-100 ${density.textSize}`}
                  >
                    {sub.subjectPosition || "-"}
                  </td>
                  <td
                    className={`text-center font-black ${density.textSize} ${
                      String(sub.grade).includes("9") || sub.grade === "F9"
                        ? "text-red-600 underline decoration-2 underline-offset-2 print:text-black"
                        : "text-main"
                    }`}
                  >
                    {sub.grade}
                  </td>
                  <td
                    className={`truncate px-2 font-semibold text-slate-800 uppercase ${density.textSize}`}
                  >
                    {sub.remark}
                  </td>
                </tr>
              ))}

              {/* Filler Rows */}
              {Array.from({ length: fillersNeeded }).map((_, i) => (
                <tr
                  key={`empty-${i}`}
                  className={`divide-x-2 divide-blue-950 ${density.padding} ${(student.subjects.length + i) % 2 === 1 ? "print:bg-background bg-slate-50" : "bg-white"}`}
                >
                  <td colSpan={7}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Performance Summary */}
        <section className="border-2 border-blue-950 bg-slate-100 print:bg-gray-100">
          <div className="flex flex-wrap items-center divide-x-2 divide-blue-950">
            <div className="flex min-w-22.5 flex-col justify-center px-3 py-2 sm:px-4">
              <span className="text-muted text-[9px] font-black uppercase">Overall Score</span>
              <span className="text-main text-2xl leading-none font-black">
                {student.totalScore}
              </span>
            </div>
            <div className="flex min-w-22.5 flex-col justify-center px-3 py-2 sm:px-4">
              <span className="text-muted text-[9px] font-black uppercase">Average</span>
              <span className="text-main text-2xl leading-none font-black">
                {student.averageScore}%
              </span>
            </div>
            {showAggregate && (
              <div className="bg-primary flex min-w-22.5 flex-col justify-center px-3 py-2 text-white sm:px-4 print:bg-black">
                <span className="text-[9px] font-black uppercase">Aggregate</span>
                <span className="text-center text-2xl leading-none font-black">
                  {student.aggregate}
                </span>
              </div>
            )}
            {settings.term === "Third Term" && student.promotionStatus && (
              <div className="flex min-w-22.5 flex-col justify-center border-l-2 border-blue-950 px-3 py-2 sm:px-4">
                <span className="text-muted text-[9px] font-black uppercase">Status</span>
                <span className="text-main text-base font-black uppercase">
                  {student.promotionStatus}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Footer: Remarks, Fees, Signatures */}
        <footer className="flex flex-col gap-2">
          {/* Remarks Grid - Compact */}
          <div className="grid grid-cols-2 gap-2 border-2 border-blue-950">
            {/* Left Column */}
            <div className="border-r-2 border-blue-950">
              <div className="border-b-2 border-blue-950 bg-slate-100 p-1.5 text-center print:bg-gray-200">
                <span className="text-[9px] font-black text-slate-700 uppercase">
                  Conduct & Interest
                </span>
              </div>
              <div className="grid grid-rows-2 divide-y-2 divide-blue-950">
                <div className="p-1.5">
                  <span className="text-muted text-[8px] font-black uppercase">Conduct: </span>
                  <span className="text-main text-[10px] font-semibold">
                    {student.conduct || "Satisfactory"}
                  </span>
                </div>
                <div className="p-1.5">
                  <span className="text-muted text-[8px] font-black uppercase">Interest: </span>
                  <span className="text-main text-[10px] font-semibold">
                    {student.interest || "Reading, Sports"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column - Remarks */}
            <div>
              <div className="border-b-2 border-blue-950 bg-slate-100 p-1.5 text-center print:bg-gray-200">
                <span className="text-[9px] font-black text-slate-700 uppercase">Remarks</span>
              </div>
              <div className="grid grid-rows-2 divide-y-2 divide-blue-950">
                <div className="p-1.5">
                  <span className="text-muted mb-0.5 block text-[8px] font-black uppercase">
                    Class Teacher:
                  </span>
                  <span className="text-main block text-[10px] font-semibold italic">
                    {student.teacherRemark}
                  </span>
                </div>
                <div className="p-1.5">
                  <span className="text-muted mb-0.5 block text-[8px] font-black uppercase">
                    Head Teacher:
                  </span>
                  <span className="text-main block text-[10px] font-semibold italic">
                    {headmasterRemark}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fees Section - Smart Conditional Rendering */}
          {(settings.schoolGift || settings.canteenFees || settings.firstAidFees) && (
            <div className="border-2 border-blue-950">
              <div className="border-b-2 border-blue-950 bg-slate-100 px-2 py-1 text-center print:bg-gray-200">
                <span className="text-[9px] font-black text-slate-700 uppercase">Fee Schedule</span>
              </div>

              {/* Fee Items Grid */}
              <div className="divide-y-2 divide-blue-950">
                {/* School Fees */}
                {settings.schoolGift !== undefined && settings.schoolGift > 0 && (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-1.5">
                    <div>
                      <span className="text-main block text-[9px] leading-tight font-black uppercase">
                        School Fees
                      </span>
                      <span className="text-[7px] font-medium text-slate-600">Per Term</span>
                    </div>
                    <span className="text-main text-[12px] font-black">
                      GH₵{settings.schoolGift.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Canteen Fees - Daily */}
                {settings.canteenFees !== undefined && settings.canteenFees > 0 && (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-1.5">
                    <div>
                      <span className="text-main block text-[9px] leading-tight font-black uppercase">
                        Canteen Fees
                      </span>
                      <span className="text-[7px] font-semibold text-blue-600">Daily</span>
                    </div>
                    <span className="text-main text-[12px] font-black">
                      GH₵{settings.canteenFees.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* First Aid - Termly */}
                {settings.firstAidFees !== undefined && settings.firstAidFees > 0 && (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-1.5">
                    <div>
                      <span className="text-main block text-[9px] leading-tight font-black uppercase">
                        First Aid Fees
                      </span>
                      <span className="text-[7px] font-semibold text-green-700">Per Term</span>
                    </div>
                    <span className="text-main text-[12px] font-black">
                      GH₵{settings.firstAidFees.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Instructions */}
              <div className="border-t-2 border-blue-950 bg-slate-50 px-2 py-1.5 print:bg-gray-50">
                <p className="text-[8px] leading-relaxed font-medium text-slate-700">
                  <strong className="font-black">PAYMENT INSTRUCTIONS:</strong> All fees must be
                  paid on or before the beginning of the term. Please present this bill when making
                  payment and demand an official receipt.
                </p>
              </div>
            </div>
          )}

          {/* Signatures - Compact */}
          <div className="grid grid-cols-2 gap-8 px-6 pb-0.5">
            <div className="flex flex-col items-center justify-end">
              {settings.teacherSignature && (
                <img
                  src={settings.teacherSignature}
                  className="-mb-2 block h-9 object-contain mix-blend-multiply"
                  alt="Sign"
                />
              )}
              <div className="w-full border-t-2 border-dotted border-blue-950 pt-0.5" />
              <p className="mt-0.5 text-[8px] font-black tracking-wider text-slate-600 uppercase">
                Class Teacher
              </p>
              {settings.classTeacherName && (
                <p className="text-main text-[8px] leading-tight font-bold">
                  {settings.classTeacherName}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center justify-end">
              {settings.headTeacherSignature && (
                <img
                  src={settings.headTeacherSignature}
                  className="-mb-2 block h-9 object-contain mix-blend-multiply"
                  alt="Sign"
                />
              )}
              <div className="w-full border-t-2 border-dotted border-blue-950 pt-0.5" />
              <p className="mt-0.5 text-[8px] font-black tracking-wider text-slate-600 uppercase">
                Head Teacher
              </p>
              {settings.headTeacherName && (
                <p className="text-main text-[8px] leading-tight font-bold">
                  {settings.headTeacherName}
                </p>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
