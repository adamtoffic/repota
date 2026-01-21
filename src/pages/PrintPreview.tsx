import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Printer, AlertCircle } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { ReportTemplate } from "../components/ReportTemplate";
import { useEffect } from "react";
import { createPrintHandler } from "../utils/printHandler";

export function PrintPreview() {
  const { students, settings } = useSchoolData();
  const { id } = useSearch({ from: "/print" });

  // iOS-safe print handler
  const handlePrint = createPrintHandler();

  // Inject AGGRESSIVE print styles to FORCE zero margins
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0mm !important;
        }
        
        html {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
        }
        
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          min-height: 297mm !important;
        }
        
        .report-wrapper {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
        }
        
        .report-wrapper:last-child {
          page-break-after: auto !important;
        }
        
        .report-page {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          padding: 8mm !important;
          box-sizing: border-box !important;
          page-break-after: auto !important;
          page-break-inside: avoid !important;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const printableStudents = id ? students.filter((s) => s.id === id) : students;

  if (printableStudents.length === 0) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h2 className="text-main mb-2 text-xl font-bold">No Students Found</h2>
          <p className="mb-6 text-gray-600">
            Add students and enter their grades before generating reports.
          </p>
          <Link
            to="/"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-2 font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans print:m-0 print:bg-white print:p-0">
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
              <h1 className="text-main text-lg font-bold">Print Preview</h1>
              <p className="text-muted text-xs">
                Generating {printableStudents.length} report cards for{" "}
                {settings.className || "Class"}
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-6 py-2 font-bold text-white shadow-sm transition-all active:scale-95"
            aria-label="Print all report cards"
          >
            <Printer className="h-4 w-4" /> Print All Reports
          </button>
        </div>
      </div>

      {/* 2. THE PREVIEW AREA */}
      <div className="overflow-x-hidden print:m-0 print:w-full print:p-0">
        {printableStudents.map((student, index) => (
          <div
            key={student.id}
            className="report-wrapper mb-4 flex h-[130mm] justify-center overflow-hidden sm:h-[230mm] lg:h-auto print:m-0 print:mb-0 print:block print:h-auto print:overflow-visible print:p-0"
            style={{ pageBreakAfter: index < printableStudents.length - 1 ? "always" : "auto" }}
          >
            {/* MOBILE RESPONSIVE WRAPPER */}
            {/* ✅ FIXED: Changed scale from 0.45 to 0.40 to fit 320px screens */}
            <div className="origin-top scale-[0.40] transform sm:scale-75 lg:scale-100 print:h-full print:w-full print:scale-100 print:transform-none">
              <div className="shadow-2xl print:m-0 print:p-0 print:shadow-none">
                <ReportTemplate student={student} settings={settings} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
