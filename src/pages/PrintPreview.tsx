import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Printer, AlertCircle, Image } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { LazyReportCard } from "../components/LazyReportCard";
import { useEffect } from "react";
import { createPrintHandler } from "../utils/printHandler";
import { ScrollButton } from "../components/ScrollButton";
import { Button } from "../components/ui/Button";

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

  // Calculate validation warnings
  const studentsWithMissingPhotos = printableStudents.filter((student) => !student.pictureUrl);

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
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white print:hidden">
        {/* Safe area spacer */}
        <div className="safe-top bg-white" />
        <div className="p-4">
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

            <Button
              onClick={handlePrint}
              variant="primary"
              size="md"
              aria-label="Print all report cards"
            >
              <Printer className="h-4 w-4" /> Print All Reports
            </Button>
          </div>

          {/* VALIDATION WARNING FOR MISSING PHOTOS */}
          {studentsWithMissingPhotos.length > 0 && (
            <div className="mx-auto mt-4 max-w-5xl rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Image className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-800">
                    ⚠️ {studentsWithMissingPhotos.length} student
                    {studentsWithMissingPhotos.length === 1 ? "" : "s"} missing photo
                    {studentsWithMissingPhotos.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-muted mt-0.5 text-xs">
                    Reports will print without photos. Add student photos in the Dashboard for
                    complete report cards.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. THE PREVIEW AREA - Lazy loaded for performance */}
      <div className="overflow-x-hidden print:m-0 print:w-full print:p-0">
        {printableStudents.map((student, index) => (
          <LazyReportCard
            key={student.id}
            student={student}
            settings={settings}
            index={index}
            totalStudents={printableStudents.length}
          />
        ))}
      </div>

      {/* ✅ SCROLL BUTTON - Show when 3+ students (each report is long) */}
      {printableStudents.length >= 3 && <ScrollButton />}
    </div>
  );
}

export default PrintPreview;
