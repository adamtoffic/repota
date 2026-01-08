import type { ProcessedStudent, SchoolSettings } from "../types";
import { generateHeadmasterRemark, generateAttendanceRating } from "../utils/remarkGenerator";

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
}

export function ReportTemplate({ student, settings }: Props) {
  // Generate on the fly
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);
  const attendanceRating = generateAttendanceRating(
    settings.totalAttendanceDays && settings.totalAttendanceDays > 0
      ? ((student.attendancePresent || 0) / settings.totalAttendanceDays) * 100
      : 100,
  );

  return (
    <div className="report-page font-serif text-gray-900">
      {/* 🛡️ WATERMARK (Background Layer) */}
      <div className="watermark print:absolute print:inset-0 print:z-0 print:bg-[url('/assets/coat-of-arms.png')] print:bg-[length:50%] print:bg-center print:bg-no-repeat" />

      {/* 📄 CONTENT (Foreground Layer) */}
      <div className="relative z-10 flex h-full flex-col justify-between">
        {/* --- HEADER --- */}
        <header className="mb-4 border-b-4 border-blue-900 pb-4">
          <div className="flex items-center justify-between gap-4">
            {/* School Crest (Left) */}
            <div className="h-24 w-24 flex-shrink-0">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="School Crest"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-gray-300 bg-gray-100 text-center text-xs text-gray-400">
                  No Logo
                </div>
              )}
            </div>

            {/* School Info (Center) */}
            <div className="flex-1 text-center">
              <h1 className="mb-1 text-2xl font-bold tracking-wider text-blue-900 uppercase">
                {settings.name || "Ghana Education Service"}
              </h1>
              <p className="mb-1 text-sm font-medium text-gray-600">
                {settings.address || "Address Not Set"}
              </p>
              <div className="flex justify-center gap-3 text-xs font-bold text-gray-500 uppercase">
                <span>{settings.email}</span>
                {settings.email && <span>•</span>}
                <span>{settings.academicYear} Academic Year</span>
              </div>
            </div>

            {/* GES Logo (Right) */}
            <div className="h-24 w-24 flex-shrink-0">
              {/* Make sure this file exists in /public/assets/ */}
              <img
                src="/assets/ges-logo.png"
                alt="GES Logo"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Title Bar */}
          <div className="mt-4 bg-blue-900 py-1 text-center text-sm font-bold tracking-widest text-white uppercase">
            Term Report • {settings.term}
          </div>
        </header>

        {/* --- STUDENT DETAILS GRID --- */}
        <section className="mb-6 grid grid-cols-4 gap-4 border border-gray-200 bg-gray-50 p-3 text-sm">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">Name</span>
            <span className="font-bold">{student.name}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">Class</span>
            <span className="font-bold">{student.className}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">No. on Roll</span>
            <span className="font-bold">--</span> {/* Placeholder for now */}
          </div>
          <div>
            {/* Show Position only if calculated */}
            <span className="block text-xs font-bold text-gray-400 uppercase">Position</span>
            <span className="font-bold text-blue-700">{student.classPosition || "-"}</span>
          </div>
        </section>

        {/* --- ACADEMIC TABLE --- */}
        <section className="flex-1">
          <table className="w-full border-collapse border border-gray-800 text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr className="divide-x divide-gray-800 border-b border-gray-800">
                <th className="w-5/12 p-2 text-left">Subject</th>
                <th className="w-2/12 p-2 text-center">Class (30%)</th>
                <th className="w-2/12 p-2 text-center">Exam (70%)</th>
                <th className="w-1/12 p-2 text-center">Total</th>
                <th className="w-1/12 p-2 text-center">Grade</th>
                <th className="w-3/12 p-2 text-left">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400">
              {student.subjects.map((sub) => (
                <tr key={sub.id} className="divide-x divide-gray-400 hover:bg-gray-50">
                  <td className="p-2 font-medium">{sub.name}</td>
                  <td className="p-2 text-center text-gray-600">{sub.classScore || "-"}</td>
                  <td className="p-2 text-center text-gray-600">{sub.examScore || "-"}</td>
                  <td className="p-2 text-center font-bold">{sub.totalScore}</td>
                  <td className="p-2 text-center font-bold text-blue-800">{sub.grade}</td>
                  <td className="p-2 text-xs text-gray-500 italic">{sub.remark}</td>
                </tr>
              ))}
              {/* Empty Rows Filler (Optional: Keeps table height consistent) */}
              {Array.from({ length: Math.max(0, 8 - student.subjects.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8 divide-x divide-gray-200">
                  <td colSpan={6}></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-800 bg-gray-100 font-bold">
              <tr>
                <td className="p-2 text-right" colSpan={3}>
                  AVERAGE SCORE:
                </td>
                <td className="p-2 text-center text-lg text-blue-900">{student.averageScore}%</td>
                <td className="p-2" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* --- FOOTER SECTION (Remarks & Signatures) --- */}
        <footer className="mt-4 space-y-4">
          {/* Status Grid */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="border border-gray-400 p-2">
              <span className="block text-xs font-bold text-gray-500 uppercase">Attendance</span>
              <div className="flex items-end justify-between">
                <span className="text-lg font-bold">
                  {student.attendancePresent || 0}{" "}
                  <span className="text-xs font-normal text-gray-400">
                    / {settings.totalAttendanceDays || 0}
                  </span>
                </span>
                <span className="rounded bg-gray-100 px-2 text-xs font-medium">
                  {attendanceRating}
                </span>
              </div>
            </div>
            <div className="border border-gray-400 p-2">
              <span className="block text-xs font-bold text-gray-500 uppercase">Conduct</span>
              <span className="font-bold">{student.conduct || "Satisfactory"}</span>
            </div>
            <div className="border border-gray-400 p-2">
              <span className="block text-xs font-bold text-gray-500 uppercase">
                Next Term Begins
              </span>
              <span className="font-bold">{settings.nextTermStarts || "TBA"}</span>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <div className="border border-gray-300 bg-gray-50 p-2">
              <span className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                Class Teacher's Remark
              </span>
              <p className="min-h-[1.5rem] text-sm font-medium text-gray-800 italic">
                {student.teacherRemark}
              </p>
            </div>
            <div className="border border-gray-300 bg-gray-50 p-2">
              <span className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                Head Teacher's Remark
              </span>
              <p className="min-h-[1.5rem] text-sm font-medium text-gray-800 italic">
                {headmasterRemark}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex items-end justify-between px-4 pt-8 pb-4">
            {/* Class Teacher */}
            <div className="flex w-48 flex-col items-center gap-2">
              {settings.teacherSignature ? (
                <img
                  src={settings.teacherSignature}
                  className="-mb-4 h-12 object-contain"
                  alt="Signed"
                />
              ) : (
                <div className="h-8" />
              )}
              <div className="w-full border-t border-black"></div>
              <span className="text-xs font-bold text-gray-500 uppercase">Class Teacher</span>
            </div>

            {/* Head Teacher */}
            <div className="flex w-48 flex-col items-center gap-2">
              {settings.headTeacherSignature ? (
                <img
                  src={settings.headTeacherSignature}
                  className="-mb-4 h-12 object-contain"
                  alt="Signed"
                />
              ) : (
                <div className="h-8" />
              )}
              <div className="w-full border-t border-black"></div>
              <span className="text-xs font-bold text-gray-500 uppercase">Head Teacher</span>
            </div>
          </div>

          {/* Promo Status (Only for 3rd Term) */}
          {student.promotionStatus && (
            <div className="bg-black py-1 text-center text-xs font-bold tracking-widest text-white uppercase">
              {student.promotionStatus}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
