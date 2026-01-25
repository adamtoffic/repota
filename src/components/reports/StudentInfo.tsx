// Shared Student Info Card Component
import type { ProcessedStudent, SchoolSettings } from "../../types";

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
}

export function StudentInfo({ student, settings }: Props) {
  return (
    <section className="flex border-2 border-blue-950 bg-white">
      {/* Student Photo */}
      {student.pictureUrl && (
        <div className="flex w-27.5 shrink-0 items-center justify-center border-r-2 border-blue-950 bg-slate-50 p-2">
          <img
            src={student.pictureUrl}
            alt="Student"
            className="h-24 w-24 rounded-md object-cover mix-blend-multiply shadow-sm"
          />
        </div>
      )}

      {/* Details Grid */}
      <div className="flex-1">
        {/* Row 1: Main Identity */}
        <div className="grid grid-cols-[1fr_minmax(70px,100px)_minmax(60px,80px)_minmax(60px,80px)] divide-x-2 divide-blue-950 border-b-2 border-blue-950 sm:grid-cols-[1fr_100px_80px_80px]">
          <div className="p-2">
            <span className="text-muted block text-[9px] font-black uppercase">
              Name of Student
            </span>
            <span className="text-main block truncate text-lg leading-tight font-black tracking-tight uppercase">
              {student.name}
            </span>
          </div>
          <div className="bg-slate-50 p-2 text-center print:bg-gray-100">
            <span className="text-muted block text-[9px] font-black uppercase">Class</span>
            <span className="text-main block text-lg leading-tight font-black">
              {settings.className || student.className}
            </span>
          </div>
          <div className="p-2 text-center">
            <span className="text-muted block text-[9px] font-black uppercase">No. On Roll</span>
            <span className="text-main block text-lg leading-tight font-black">
              {settings.classSize || "-"}
            </span>
          </div>
          <div className="bg-primary p-2 text-center text-white print:bg-black">
            <span className="block text-[9px] font-black uppercase opacity-90">Pos.</span>
            <span className="block text-xl leading-tight font-black">{student.classPosition}</span>
          </div>
        </div>

        {/* Row 2: Secondary Stats */}
        <div className="grid grid-cols-[1fr_2fr] divide-x-2 divide-blue-950">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-muted text-[10px] font-black uppercase">Attendance</span>
            <span className="text-main font-mono text-sm font-black">
              {student.attendancePresent || "-"} / {settings.totalAttendanceDays || "-"}
            </span>
          </div>
          <div className="px-3 py-1.5">
            {student.dateOfBirth ? (
              <div className="grid grid-cols-2 gap-2 divide-x-2 divide-blue-950 sm:gap-4">
                <div className="flex items-center justify-between pr-2 sm:pr-4">
                  <span className="text-muted text-[10px] font-black uppercase">DOB</span>
                  <span className="text-main text-sm font-bold">{student.dateOfBirth}</span>
                </div>
                <div className="flex items-center justify-between pl-2 sm:pl-4">
                  <span className="text-muted text-[10px] font-black uppercase">Next Term</span>
                  <span className="text-main text-sm font-bold">
                    {settings.nextTermStarts || "TBA"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-muted text-[10px] font-black uppercase">Next Term</span>
                <span className="text-main text-sm font-bold">
                  {settings.nextTermStarts || "TBA"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
