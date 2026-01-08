import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, AlertCircle } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { ReportTemplate } from "../components/ReportTemplate";

export function PrintPreview() {
  const { students, settings } = useSchoolData();

  // Filter out students who are "Pending" (No subjects or 0 score)
  // Optional: You might want to print everyone, but usually empty reports are waste.
  // For now, let's print everyone so you can see them.
  const printableStudents = students;

  if (printableStudents.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">No Students Found</h2>
          <p className="mb-6 text-gray-600">
            Add students and enter their grades before generating reports.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans print:bg-white">
      {/* 1. TOOLBAR (Hidden when printing) */}
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 p-4 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Print Preview</h1>
              <p className="text-xs text-gray-500">
                Generating {printableStudents.length} report cards for {settings.name || "Class"}
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
          >
            <Printer className="h-4 w-4" /> Print All Reports
          </button>
        </div>
      </div>

      {/* 2. THE PREVIEW AREA */}
      <div className="overflow-x-hidden print:w-full">
        {" "}
        {/* Prevent horizontal scrollbar on mobile */}
        {printableStudents.map((student) => (
          <div key={student.id} className="report-wrapper mb-8 flex justify-center print:mb-0">
            {/* MOBILE RESPONSIVE WRAPPER 
                1. 'scale-[0.45]': Shrinks paper to 45% size on phones
                2. 'origin-top': Anchors scaling to the top
                3. 'sm:scale-75': 75% size on tablets
                4. 'lg:scale-100': Full size on desktop
            */}
            <div className="origin-top scale-[0.45] transform sm:scale-75 lg:scale-100 print:w-full print:transform-none">
              <div className="shadow-2xl print:shadow-none">
                <ReportTemplate student={student} settings={settings} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
