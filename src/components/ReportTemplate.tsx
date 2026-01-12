// src/components/ReportTemplate.tsx
import type { ProcessedStudent, SchoolSettings } from "../types";
import { generateHeadmasterRemark, generateAttendanceRating } from "../utils/remarkGenerator";

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
}

export function ReportTemplate({ student, settings }: Props) {
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);
  const showAggregate =
    (settings.level === "JHS" || settings.level === "SHS" || settings.level === "PRIMARY") &&
    student.aggregate !== null;

  // Calculate attendance percentage safely
  const attendancePct =
    settings.totalAttendanceDays && settings.totalAttendanceDays > 0
      ? ((student.attendancePresent || 0) / settings.totalAttendanceDays) * 100
      : 100;

  const attendanceRating = generateAttendanceRating(attendancePct);

  return (
    <div className="report-page leading-tight text-black">
      {/* 🛡️ WATERMARK (For Print) */}
      <div className="watermark print:absolute print:inset-0 print:z-0 print:bg-[url('/assets/coat-of-arms.png')] print:bg-size-[60%] print:bg-center print:bg-no-repeat" />

      {/* 📄 CONTENT */}
      <div className="relative z-10 flex h-full flex-col justify-between">
        {/* --- HEADER --- */}
        <header className="mb-4 border-b-[3px] border-black pb-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: School Crest */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Crest" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded border-2 border-dashed border-gray-300 text-[10px] text-gray-400 opacity-0">
                  No Logo
                </div>
              )}
            </div>

            {/* Center: School Details */}
            <div className="flex-1 pt-2 text-center">
              <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide text-black uppercase">
                {settings.schoolName || "School Name"}
              </h1>

              {/* ✅ NEW: Motto */}
              {settings.schoolMotto && (
                <p className="mb-2 text-xs font-bold text-gray-600 italic">
                  "{settings.schoolMotto}"
                </p>
              )}

              {/* Address Line */}
              <p className="text-xs font-medium text-gray-700 uppercase">
                {settings.address || "Location Address"}
              </p>

              {/* Contact Line (Only shows separators if data exists) */}
              {(settings.phoneNumber || settings.email) && (
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {settings.phoneNumber && <span>{settings.phoneNumber}</span>}
                  {settings.phoneNumber && settings.email && <span className="mx-2">•</span>}
                  {settings.email && <span>{settings.email}</span>}
                </p>
              )}

              <div className="mt-1 flex justify-center gap-4 border-t border-black px-4 pt-1 text-xs font-bold uppercase">
                <span>{settings.academicYear}</span>
                <span>•</span>
                <span>{settings.term}</span>
              </div>
            </div>

            {/* Right: GES Logo */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center">
              <img src="/assets/ges-logo.png" alt="GES" className="h-full w-full object-contain" />
            </div>
          </div>

          <div className="mt-2 text-center">
            <span className="rounded-full bg-black px-6 py-1 text-sm font-bold tracking-widest text-white uppercase">
              Student Report
            </span>
          </div>
        </header>

        {/* --- STUDENT INFO GRID (Clean Lines) --- */}
        <section className="mb-6 border border-black">
          <div className="grid grid-cols-[1fr_100px_80px_100px] divide-x divide-black">
            {/* Row 1 */}
            <div className="border-b border-black p-2">
              <span className="block text-[10px] font-bold text-gray-600 uppercase">
                Name of Student
              </span>
              <span className="block truncate text-lg font-bold uppercase">{student.name}</span>
            </div>
            <div className="border-b border-black p-2">
              <span className="block text-[10px] font-bold text-gray-600 uppercase">Class</span>
              <span className="text-lg font-bold">{student.className}</span>
            </div>
            <div className="border-b border-black p-2 text-center">
              <span className="block text-[10px] font-bold text-gray-600 uppercase">Roll No.</span>
              <span className="text-lg font-bold">-</span>
            </div>
            <div className="border-b border-black bg-gray-50 p-2 text-center">
              <span className="block text-[10px] font-bold text-gray-600 uppercase">Position</span>
              <span className="text-lg font-bold">{student.classPosition || "-"}</span>
            </div>
          </div>

          {/* Row 2: Status */}
          <div className="grid grid-cols-4 divide-x divide-black bg-gray-50">
            <div className="flex items-center justify-between p-2">
              <span className="text-[10px] font-bold text-gray-600 uppercase">Attendance</span>
              <span className="font-bold">
                {student.attendancePresent || 0} / {settings.totalAttendanceDays || 0}
              </span>
            </div>
            <div className="col-span-2 flex items-center justify-between p-2">
              <span className="text-[10px] font-bold text-gray-600 uppercase">
                Next Term Begins
              </span>
              <span className="font-bold">{settings.nextTermStarts || "TBA"}</span>
            </div>
            <div className="p-2 text-center">
              <span className="text-xs font-bold">{attendanceRating}</span>
            </div>
          </div>
        </section>

        {/* --- ACADEMIC TABLE (Fixed Borders) --- */}
        <section className="flex-1">
          <table className="w-full border-collapse border border-black text-sm">
            <thead className="bg-gray-100">
              <tr className="divide-x divide-black border-b border-black">
                <th className="w-5/12 p-2 text-left text-xs font-bold uppercase">Subject</th>
                <th className="w-[10%] p-2 text-center text-xs font-bold uppercase">
                  Class
                  <br />({settings.classScoreMax || 30})
                </th>
                <th className="w-[10%] p-2 text-center text-xs font-bold uppercase">
                  Exam
                  <br />({settings.examScoreMax || 70})
                </th>
                <th className="w-[10%] p-2 text-center text-xs font-bold uppercase">
                  Total
                  <br />
                  (100)
                </th>
                <th className="w-[10%] p-2 text-center text-xs font-bold uppercase">Grade</th>
                <th className="w-3/12 p-2 text-left text-xs font-bold uppercase">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black border-b border-black">
              {student.subjects.map((sub) => (
                <tr key={sub.id} className="divide-x divide-black hover:bg-gray-50/50">
                  <td className="p-2 text-xs font-medium uppercase">{sub.name}</td>
                  <td className="p-2 text-center font-mono">{sub.classScore || "-"}</td>
                  <td className="p-2 text-center font-mono">{sub.examScore || "-"}</td>
                  <td className="p-2 text-center font-mono font-bold">{sub.totalScore}</td>
                  <td
                    className={`p-2 text-center font-bold ${sub.grade === "F9" || sub.grade === 9 ? "text-red-600" : "text-black"}`}
                  >
                    {sub.grade}
                  </td>
                  <td className="p-2 text-[10px] font-medium uppercase">{sub.remark}</td>
                </tr>
              ))}
              {/* Filler rows to maintain height if few subjects */}
              {Array.from({ length: Math.max(0, 9 - student.subjects.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8 divide-x divide-black">
                  <td colSpan={6}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {/* Summary Stats Box */}
        <div className="flex items-center justify-end gap-6 border-t-2 border-black pt-2 pr-4">
          {showAggregate && (
            <div className="text-right">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Aggregate</span>
              <span className="block text-xl font-black">{student.aggregate}</span>
            </div>
          )}
          <div className="text-right">
            <span className="block text-[10px] font-bold text-gray-500 uppercase">
              Overall Average
            </span>
            <span className="block text-xl font-black text-blue-900">{student.averageScore}%</span>
          </div>
        </div>

        {/* --- FOOTER (Remarks & Signatures) --- */}
        <footer className="mt-6 space-y-4">
          {/* Conduct / Remarks Box */}
          <div className="border border-black p-0">
            <div className="grid grid-cols-[120px_1fr] border-b border-black">
              <div className="flex items-center border-r border-black bg-gray-100 p-2 text-xs font-bold uppercase">
                Conduct
              </div>
              <div className="p-2 text-sm italic">{student.conduct || "Satisfactory"}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr] border-b border-black">
              <div className="flex items-center border-r border-black bg-gray-100 p-2 text-xs font-bold uppercase">
                Teacher's Remark
              </div>
              <div className="p-2 text-sm italic">{student.teacherRemark}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <div className="flex items-center border-r border-black bg-gray-100 p-2 text-xs font-bold uppercase">
                Head's Remark
              </div>
              <div className="p-2 text-sm italic">{headmasterRemark}</div>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex items-end justify-between px-8 pt-12">
            <div className="text-center">
              {settings.teacherSignature && (
                <img
                  src={settings.teacherSignature}
                  className="mx-auto -mb-2 block h-10"
                  alt="Sign"
                />
              )}
              <div className="w-48 border-t border-dashed border-black"></div>
              <p className="mt-1 text-[10px] font-bold uppercase">Class Teacher's Signature</p>
            </div>

            <div className="text-center">
              {settings.headTeacherSignature && (
                <img
                  src={settings.headTeacherSignature}
                  className="mx-auto -mb-4 block h-12"
                  alt="Sign"
                />
              )}
              {/* Only show stamp circle if image exists, otherwise empty space */}
              <div className="relative w-48 border-t border-dashed border-black">
                {/* Optional: Stamp Placeholder if needed */}
              </div>
              <p className="mt-1 text-[10px] font-bold uppercase">Head Teacher's Signature</p>
            </div>
          </div>

          {/* Promotion Banner */}
          {settings.term === "Third Term" && (
            <div className="mt-4 border-2 border-black bg-gray-100 p-2 text-center text-sm font-bold uppercase">
              {student.promotionStatus}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
