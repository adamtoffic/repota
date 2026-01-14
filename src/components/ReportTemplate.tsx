// src/components/ReportTemplate.tsx
import type { ProcessedStudent, SchoolSettings } from "../types";
import { generateHeadmasterRemark } from "../utils/remarkGenerator";

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
}

export function ReportTemplate({ student, settings }: Props) {
  const isIslamic = settings.schoolType === "ISLAMIC";
  const headmasterRemark = generateHeadmasterRemark(student.averageScore, settings.term);

  // Logic to hide aggregate for KG
  const showAggregate = settings.level !== "KG" && student.aggregate !== null;

  // ---------------------------------------------------------------------------
  // 📐 DENSITY LOGIC (The "3 Gears" System)
  // This ensures the report looks "Full" for 8 subjects and "Neat" for 20.
  // ---------------------------------------------------------------------------
  const subjectCount = student.subjects.length;
  let density = {
    padding: "py-3", // Spacious (Default)
    textSize: "text-sm", // Big Text
    headerSize: "text-xs",
    fillerCount: 12, // Fill up to 12 rows
  };

  if (subjectCount > 10 && subjectCount <= 15) {
    // Gear 2: Comfortable (Private Schools)
    density = {
      padding: "py-1.5",
      textSize: "text-xs",
      headerSize: "text-[10px]",
      fillerCount: 15,
    };
  } else if (subjectCount > 15) {
    // Gear 3: Dense (Islamic / Large Schools)
    density = {
      padding: "py-[2px]",
      textSize: "text-[10px]",
      headerSize: "text-[9px]",
      fillerCount: 0,
    };
  }

  // Calculate filler rows to push footer down visually
  const fillersNeeded = Math.max(0, density.fillerCount - subjectCount);

  return (
    <div
      className={`report-page h-full w-full bg-white text-slate-900 ${isIslamic ? "font-arabic" : ""}`}
    >
      {/* 🛡️ WATERMARK - Subtle for both color and B&W */}
      <div className="watermark print:absolute print:inset-0 print:z-0 print:bg-[url('/assets/coat-of-arms.png')] print:bg-size-[50%] print:bg-center print:bg-no-repeat print:opacity-[0.04]" />

      {/* 🏗️ MAIN GRID CONTAINER */}
      <div className="relative z-10 grid h-full grid-rows-[auto_auto_1fr_auto_auto] gap-2">
        {/* =================================================================================
            SECTION 1: HEADER (Professional Navy/Slate)
           ================================================================================= */}
        <header className="border-b-[3px] border-blue-950 pb-2">
          {isIslamic && (
            <div className="mb-1 text-center">
              <p className="font-arabic text-sm font-bold text-slate-900">بسم الله الرحمن الرحيم</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center border-2 border-dashed border-slate-300 text-[10px] font-bold text-slate-400">
                  LOGO
                </div>
              )}
            </div>

            {/* School Details */}
            <div className="flex-1 text-center">
              <h1 className="font-serif text-3xl leading-none font-black tracking-wide text-slate-900 uppercase">
                {settings.schoolName || "SCHOOL NAME"}
              </h1>
              {settings.address && (
                <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                  {settings.address}
                </p>
              )}
              {settings.schoolMotto && (
                <p className="mt-1 text-xs font-semibold text-blue-900 italic">
                  "{settings.schoolMotto}"
                </p>
              )}

              <div className="mt-2 flex justify-center gap-6 border-t-2 border-blue-950 pt-1 text-xs font-bold tracking-wider text-slate-800 uppercase">
                <span>{settings.academicYear}</span>
                <span>•</span>
                <span>{settings.term}</span>
              </div>
            </div>

            {/* GES Logo */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center">
              <img
                src="/assets/ges-logo.png"
                alt="GES"
                className="h-full w-full object-contain mix-blend-multiply"
              />
            </div>
          </div>

          {/* Badge: Navy in color, Black in B&W */}
          <div className="mt-2 text-center">
            <span className="inline-block rounded-sm bg-blue-950 px-8 py-1.5 text-[11px] font-black tracking-[0.25em] text-white uppercase shadow-sm print:bg-black">
              STUDENT REPORT
            </span>
          </div>
        </header>

        {/* =================================================================================
            SECTION 2: STUDENT ID CARD (With Photo Support)
           ================================================================================= */}
        <section className="flex border-2 border-blue-950 bg-white">
          {/* ✅ 1. STUDENT PHOTO (Only renders if exists) */}
          {student.pictureUrl && (
            <div className="flex w-[110px] shrink-0 items-center justify-center border-r-2 border-blue-950 bg-slate-50 p-2">
              <img
                src={student.pictureUrl}
                alt="Student"
                className="h-24 w-24 rounded-md object-cover shadow-sm grayscale-0 print:grayscale"
              />
            </div>
          )}

          {/* ✅ 2. DETAILS GRID (Takes remaining space) */}
          <div className="flex-1">
            {/* Row 1: Main Identity */}
            <div className="grid grid-cols-[1fr_100px_80px_80px] divide-x-2 divide-blue-950 border-b-2 border-blue-950">
              <div className="p-2">
                <span className="block text-[9px] font-black text-slate-500 uppercase">
                  Name of Student
                </span>
                <span className="block truncate text-lg leading-tight font-black tracking-tight text-slate-900 uppercase">
                  {student.name}
                </span>
              </div>
              <div className="bg-slate-50 p-2 text-center print:bg-gray-100">
                <span className="block text-[9px] font-black text-slate-500 uppercase">Class</span>
                <span className="block text-lg leading-tight font-black text-slate-900">
                  {settings.className || student.className}
                </span>
              </div>
              <div className="p-2 text-center">
                <span className="block text-[9px] font-black text-slate-500 uppercase">
                  No. Roll
                </span>
                <span className="block text-lg leading-tight font-black text-slate-900">
                  {student.numberOnRoll || "-"}
                </span>
              </div>
              <div className="bg-blue-950 p-2 text-center text-white print:bg-black">
                <span className="block text-[9px] font-black uppercase opacity-90">Pos.</span>
                <span className="block text-xl leading-tight font-black">
                  {student.classPosition}
                </span>
              </div>
            </div>

            {/* Row 2: Secondary Stats */}
            <div className="grid grid-cols-2 divide-x-2 divide-blue-950">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase">Attendance</span>
                <span className="font-mono text-sm font-black text-slate-900">
                  {student.attendancePresent || "-"} / {settings.totalAttendanceDays || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase">Next Term</span>
                <span className="text-sm font-bold text-slate-900">
                  {settings.nextTermStarts || "TBA"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================================
            SECTION 3: GRADES TABLE (Best of Both Worlds)
           ================================================================================= */}
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
                  className={`divide-x-2 divide-blue-950 ${density.padding} ${idx % 2 === 1 ? "bg-slate-50 print:bg-gray-50" : "bg-white"}`}
                >
                  <td
                    className={`px-2 font-black text-slate-900 uppercase ${density.textSize} truncate`}
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
                  <td
                    className={`text-center font-mono font-black text-slate-900 ${density.textSize}`}
                  >
                    {sub.totalScore}
                  </td>

                  <td
                    className={`bg-slate-100 text-center font-mono font-black text-slate-900 print:bg-gray-100 ${density.textSize}`}
                  >
                    {sub.subjectPosition || "-"}
                  </td>

                  {/* 🔥 RED (color) + UNDERLINE (B&W) - Perfect hybrid! */}
                  <td
                    className={`text-center font-black ${density.textSize} ${
                      String(sub.grade).includes("9") || sub.grade === "F9"
                        ? "text-red-600 underline decoration-2 underline-offset-2 print:text-black"
                        : "text-slate-900"
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

              {/* FILLER ROWS */}
              {Array.from({ length: fillersNeeded }).map((_, i) => (
                <tr
                  key={`empty-${i}`}
                  className={`divide-x-2 divide-blue-950 ${density.padding} ${(student.subjects.length + i) % 2 === 1 ? "bg-slate-50 print:bg-gray-50" : "bg-white"}`}
                >
                  <td colSpan={7}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* =================================================================================
            SECTION 4: PERFORMANCE SUMMARY STRIP
           ================================================================================= */}
        <section className="grid grid-cols-[1fr_auto] border-2 border-blue-950 bg-slate-100 print:bg-gray-100">
          <div className="flex divide-x-2 divide-blue-950">
            <div className="flex flex-col justify-center px-4 py-2">
              <span className="text-[9px] font-black text-slate-500 uppercase">Overall Score</span>
              <span className="text-2xl leading-none font-black text-slate-900">
                {student.totalScore}
              </span>
            </div>
            <div className="flex flex-col justify-center px-4 py-2">
              <span className="text-[9px] font-black text-slate-500 uppercase">Average</span>
              <span className="text-2xl leading-none font-black text-slate-900">
                {student.averageScore}%
              </span>
            </div>
            {showAggregate && (
              <div className="flex flex-col justify-center bg-blue-950 px-4 py-2 text-white print:bg-black">
                <span className="text-[9px] font-black uppercase">Aggregate</span>
                <span className="text-center text-2xl leading-none font-black">
                  {student.aggregate}
                </span>
              </div>
            )}
          </div>

          {settings.term === "Third Term" && student.promotionStatus && (
            <div className="flex items-center border-l-2 border-blue-950 px-6 py-2">
              <div className="text-right">
                <span className="block text-[9px] font-black text-slate-500 uppercase">Status</span>
                <span className="block text-base font-black text-blue-900 uppercase underline decoration-2 underline-offset-2 print:text-black">
                  {student.promotionStatus}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* =================================================================================
            SECTION 5: FOOTER (Remarks & Signatures)
           ================================================================================= */}
        <footer className="flex flex-col gap-3">
          <div className="border-2 border-blue-950">
            {/* Conduct */}
            <div className="grid grid-cols-[130px_1fr] border-b-2 border-blue-950">
              <div className="flex items-center border-r-2 border-blue-950 bg-slate-100 p-2 text-[10px] font-black text-slate-700 uppercase print:bg-gray-200">
                Conduct
              </div>
              <div className="p-2 text-xs font-semibold text-slate-900">
                {student.conduct || "Satisfactory"}
              </div>
            </div>

            {/* Interest */}
            <div className="grid grid-cols-[130px_1fr] border-b-2 border-blue-950">
              <div className="flex items-center border-r-2 border-blue-950 bg-slate-100 p-2 text-[10px] font-black text-slate-700 uppercase print:bg-gray-200">
                Interest
              </div>
              <div className="p-2 text-xs font-semibold text-slate-900">
                {student.interest || "Reading, Sports"}
              </div>
            </div>

            {/* Teacher Remark */}
            <div className="grid grid-cols-[130px_1fr] border-b-2 border-blue-950">
              <div className="flex items-center border-r-2 border-blue-950 bg-slate-100 p-2 text-[10px] font-black text-slate-700 uppercase print:bg-gray-200">
                Class Teacher
              </div>
              <div className="p-2 text-xs font-semibold text-slate-900 italic">
                {student.teacherRemark}
              </div>
            </div>

            {/* Head Teacher Remark */}
            <div className="grid grid-cols-[130px_1fr]">
              <div className="flex items-center border-r-2 border-blue-950 bg-slate-100 p-2 text-[10px] font-black text-slate-700 uppercase print:bg-gray-200">
                Head Teacher
              </div>
              <div className="p-2 text-xs font-semibold text-slate-900 italic">
                {headmasterRemark}
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 px-8 pb-2">
            <div className="flex flex-col items-center justify-end">
              {settings.teacherSignature && (
                <img
                  src={settings.teacherSignature}
                  className="mb-[-10px] block h-12 object-contain mix-blend-multiply"
                  alt="Sign"
                />
              )}
              <div className="w-full border-t-2 border-dotted border-blue-950 pt-1" />
              <p className="mt-1 text-[9px] font-black tracking-wider text-slate-600 uppercase">
                Class Teacher's Signature
              </p>
            </div>

            <div className="flex flex-col items-center justify-end">
              {settings.headTeacherSignature && (
                <img
                  src={settings.headTeacherSignature}
                  className="mb-[-15px] block h-14 object-contain mix-blend-multiply"
                  alt="Sign"
                />
              )}
              <div className="relative w-full border-t-2 border-dotted border-blue-950 pt-1" />
              <p className="mt-1 text-[9px] font-black tracking-wider text-slate-600 uppercase">
                Head Teacher's Signature
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
