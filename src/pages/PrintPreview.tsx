import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Printer, AlertCircle, Image } from "lucide-react";
import { useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfExportModal } from "../components/PdfExportModal";
import posthog from "posthog-js";
import { ScrollButton } from "../components/ScrollButton";
import { usePdfShareFlow } from "../hooks/usePdfShareFlow";
import { getTemplateById } from "../templates/registry";
import type { PrintMode } from "../types";
import { buildPdfFilename, generateReportsPdfFile } from "../utils/pdfPrint";
import { markPrintStarted } from "../utils/printHandler";
import { isStudentPending } from "../utils/studentValidation";

export function PrintPreview() {
  const students = useSchoolStudents();
  const settings = useSchoolSettings();
  const { id } = useSearch({ from: "/print" });

  const [printMode, setPrintMode] = useState<PrintMode>("color");
  const [printFilter, setPrintFilter] = useState<"all" | "ready">("all");
  const printAreaRef = useRef<HTMLDivElement>(null);

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

  const readyStudents = useMemo(
    () => students.filter((s) => !isStudentPending(s, settings)),
    [students, settings],
  );
  const printableStudents = id
    ? students.filter((s) => s.id === id)
    : printFilter === "ready"
      ? readyStudents
      : students;
  const studentsWithMissingPhotos = printableStudents.filter((student) => !student.pictureUrl);

  const SelectedTemplate = getTemplateById(settings.templateId);

  const contentKey = useMemo(
    () =>
      `${printMode}|${printFilter}|${id ?? ""}|${settings.templateId ?? ""}|${
        settings.showClassPosition ?? true
      }|${settings.showSubjectPosition ?? true}|${settings.useCustomTemplateColor ?? false}|${
        settings.primaryColor ?? ""
      }|${settings.accentColor ?? ""}|${settings.showFeeSchedule ?? true}|${
        settings.showStudentFeeArrearsOnReport ?? false
      }|${JSON.stringify(settings.privateFeeItems ?? [])}|${printableStudents
        .map((s) => `${s.id}:${s.totalScore}:${s.pictureUrl ?? ""}:${s.feeArrears ?? 0}`)
        .join(",")}`,
    [
      printMode,
      printFilter,
      id,
      settings.templateId,
      settings.showClassPosition,
      settings.showSubjectPosition,
      settings.useCustomTemplateColor,
      settings.primaryColor,
      settings.accentColor,
      settings.showFeeSchedule,
      settings.showStudentFeeArrearsOnReport,
      settings.privateFeeItems,
      printableStudents,
    ],
  );

  const buildReportCardsPdf = useCallback(
    ({
      onProgress,
      signal,
    }: {
      onProgress: (p: { current: number; total: number }) => void;
      signal: AbortSignal;
    }) => {
      const container = printAreaRef.current;
      if (!container) {
        return Promise.reject(new Error("Report preview is not ready."));
      }
      return generateReportsPdfFile(container, {
        filename: buildPdfFilename(settings.className, printableStudents.length),
        onProgress,
        signal,
      });
    },
    [settings.className, printableStudents.length],
  );

  const { modalProps: pdfModalProps, runPrintOrPdfFallback } = usePdfShareFlow({
    cacheKey: contentKey,
    totalCount: printableStudents.length,
    itemLabel: "report card",
    buildPdf: buildReportCardsPdf,
  });

  const handlePrint = () => {
    try {
      posthog.capture("Printed_Reports", {
        students_count: printableStudents.length,
        template_id: settings.templateId || "original_v1",
        print_mode: printMode,
        school_level: settings.level || "unknown",
        school_type: settings.schoolType || "unknown",
      });
    } catch {
      // Analytics must never block printing
    }
    markPrintStarted();
    runPrintOrPdfFallback(() => window.print());
  };

  if (printableStudents.length === 0) {
    const isFilteredToReady = !id && printFilter === "ready" && students.length > 0;
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h2 className="text-main mb-2 text-xl font-bold">
            {isFilteredToReady ? "No Complete Report Cards Ready" : "No Students Found"}
          </h2>
          <p className="mb-6 text-gray-600">
            {isFilteredToReady
              ? `All ${students.length} students still have missing subjects or zero scores.`
              : "Add students and enter their grades before generating reports."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isFilteredToReady && (
              <button
                type="button"
                onClick={() => setPrintFilter("all")}
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white"
              >
                Show All Students ({students.length})
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
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

          {/* RIGHT: Ready filter + Mode toggle + Print button */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!id && students.length > 0 && (
              <div className="flex flex-col items-center gap-0.5">
                <p className="hidden text-[9px] font-black tracking-widest text-gray-400 uppercase sm:block">
                  Students
                </p>
                <div
                  role="group"
                  aria-label="Print readiness filter"
                  className="flex h-9 items-center rounded-xl border border-gray-200 bg-gray-100 p-0.5 shadow-inner"
                >
                  <button
                    type="button"
                    onClick={() => setPrintFilter("all")}
                    aria-pressed={printFilter === "all"}
                    className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      printFilter === "all"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    All ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFilter("ready")}
                    aria-pressed={printFilter === "ready"}
                    className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      printFilter === "ready"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Ready ({readyStudents.length})
                  </button>
                </div>
              </div>
            )}

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
              onClick={handlePrint}
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
      <div
        ref={printAreaRef}
        className="overflow-hidden print:m-0 print:w-full print:overflow-visible print:p-0"
      >
        {printableStudents.map((student) => (
          <div
            key={student.id}
            className="report-wrapper ph-no-capture mb-4 flex h-[130mm] justify-center overflow-hidden sm:h-[230mm] lg:h-auto print:m-0 print:mb-0 print:block print:overflow-hidden print:p-0"
          >
            <div className="origin-top scale-[0.40] transform sm:scale-75 lg:scale-100 print:w-full print:scale-100 print:transform-none">
              <div
                data-pdf-card="true"
                className="bg-white shadow-2xl print:m-0 print:p-0 print:shadow-none"
              >
                <SelectedTemplate student={student} settings={settings} printMode={printMode} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SCROLL BUTTON */}
      {printableStudents.length >= 3 && <ScrollButton />}

      <PdfExportModal {...pdfModalProps} />
    </div>
  );
}
