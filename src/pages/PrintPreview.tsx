import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Printer, AlertCircle, Image } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { useEffect, useState } from "react";
import { ScrollButton } from "../components/ScrollButton";
import { getTemplateById } from "../templates/registry";
import type { PrintMode } from "../types";

export function PrintPreview() {
  const { students, settings } = useSchoolData();
  const { id } = useSearch({ from: "/print" });

  const [printMode, setPrintMode] = useState<PrintMode>("color");

  // Inject AGGRESSIVE print styles to FORCE zero margins
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0mm !important;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
        }
        
        .report-wrapper {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          overflow: hidden !important;
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
  const studentsWithMissingPhotos = printableStudents.filter((student) => !student.pictureUrl);

  const SelectedTemplate = getTemplateById(settings.templateId);

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
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 p-3 backdrop-blur-md sm:p-4 print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          {/* LEFT: Back + Title */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="shrink-0 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-main truncate text-base font-bold sm:text-lg">Print Preview</h1>
              <p className="text-muted hidden text-xs sm:block">
                {printableStudents.length} report card{printableStudents.length !== 1 ? "s" : ""}{" "}
                &mdash; {settings.className || "Class"}
              </p>
            </div>
          </div>

          {/* RIGHT: Mode toggle + Print button */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* ── INK MODE TOGGLE ───────────────────────────────────── */}
            <div className="flex flex-col items-center gap-0.5">
              <p className="hidden text-[9px] font-black tracking-widest text-gray-400 uppercase sm:block">
                Ink Mode
              </p>
              {/* Pill container */}
              <div className="relative flex h-9 items-center rounded-xl border border-gray-200 bg-gray-100 p-0.5 shadow-inner">
                {/* Animated sliding background pill */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-[10px] bg-white shadow-sm ring-1 ring-black/6 transition-transform duration-200 ease-in-out ${
                    printMode === "bw" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                  }`}
                />

                {/* Color button */}
                <button
                  onClick={() => setPrintMode("color")}
                  aria-pressed={printMode === "color"}
                  title="Full color print"
                  className={`relative z-10 flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors duration-150 sm:px-3 ${
                    printMode === "color" ? "text-primary" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {/* Color swatch dot */}
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-linear-to-br from-blue-500 via-amber-400 to-rose-500 transition-opacity ${
                      printMode === "color" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                  <span className="hidden sm:inline">Color</span>
                </button>

                {/* B&W button */}
                <button
                  onClick={() => setPrintMode("bw")}
                  aria-pressed={printMode === "bw"}
                  title="Black & white print"
                  className={`relative z-10 flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors duration-150 sm:px-3 ${
                    printMode === "bw" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {/* Greyscale dot */}
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-linear-to-br from-gray-300 to-gray-700 transition-opacity ${
                      printMode === "bw" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                  <span className="hidden sm:inline">B&W</span>
                </button>
              </div>
            </div>
            {/* ──────────────────────────────────────────────────────── */}

            <button
              onClick={() => window.print()}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-all active:scale-95 sm:px-6"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* VALIDATION WARNING FOR MISSING PHOTOS */}
        {studentsWithMissingPhotos.length > 0 && (
          <div className="mx-auto mt-4 max-w-5xl rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm print:hidden">
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

      {/* 2. THE PREVIEW AREA - All rendered upfront for fast printing */}
      <div className="overflow-hidden print:m-0 print:w-full print:overflow-visible print:p-0">
        {printableStudents.map((student) => (
          <div
            key={student.id}
            className="report-wrapper mb-4 flex h-[130mm] justify-center overflow-hidden sm:h-[230mm] lg:h-auto print:m-0 print:mb-0 print:block print:overflow-hidden print:p-0"
          >
            <div className="origin-top scale-[0.40] transform sm:scale-75 lg:scale-100 print:w-full print:scale-100 print:transform-none">
              <div className="bg-white shadow-2xl print:m-0 print:p-0 print:shadow-none">
                <SelectedTemplate student={student} settings={settings} printMode={printMode} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SCROLL BUTTON */}
      {printableStudents.length >= 3 && <ScrollButton />}
    </div>
  );
}
