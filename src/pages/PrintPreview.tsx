import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Printer, AlertCircle, Image, Palette, X } from "lucide-react";
import { useSchoolSettings, useSchoolStudents } from "../hooks/useSchoolData";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfExportModal } from "../components/PdfExportModal";
import { ScrollButton } from "../components/ScrollButton";
import { usePdfShareFlow } from "../hooks/usePdfShareFlow";
import { getTemplateById } from "../templates/registry";
import type { PrintMode } from "../types";
import { buildPdfFilename, generateReportsPdfFile } from "../utils/pdfPrint";
import { captureEvent } from "../utils/analytics";
import { markPrintStarted } from "../utils/printHandler";
import {
  isDemoStudent,
  trackReportPrint,
  type PrintChannel,
  type PrintScope,
} from "../utils/reportAnalytics";
import { isStudentPending } from "../utils/studentValidation";

const PRINT_TRIGGER_COOLDOWN_MS = 1500;

export function PrintPreview() {
  const students = useSchoolStudents();
  const settings = useSchoolSettings();
  const { id } = useSearch({ from: "/print" });

  const [printMode, setPrintMode] = useState<PrintMode>("color");
  const [printFilter, setPrintFilter] = useState<"all" | "ready">("all");
  const [photoWarningDismissed, setPhotoWarningDismissed] = useState(false);
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
  const printableStudents = useMemo(
    () =>
      id
        ? students.filter((s) => s.id === id)
        : printFilter === "ready"
          ? readyStudents
          : students,
    [id, printFilter, readyStudents, students],
  );
  const printScope: PrintScope = id ? "single" : printFilter === "ready" ? "ready_filter" : "all";
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

  const latestPrintPayloadRef = useRef({
    students: printableStudents,
    settings,
    printMode,
    printScope,
  });
  const pendingButtonPrintRef = useRef<{ expiresAt: number } | null>(null);
  const lastButtonClickAtRef = useRef<number>(-Infinity);
  const lastNativePrintTrackedAtRef = useRef<number>(-Infinity);
  const hasTrackedPreviewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedPreviewRef.current || printableStudents.length === 0) return;
    hasTrackedPreviewRef.current = true;
    const realStudents = printableStudents.filter((s) => !isDemoStudent(s));
    const demoCount = printableStudents.length - realStudents.length;
    const readyCount = realStudents.filter((s) => !isStudentPending(s, settings)).length;
    captureEvent("Print_Preview_Opened", {
      students_count: printableStudents.length,
      real_students_count: realStudents.length,
      ready_count: readyCount,
      missing_photos_count: studentsWithMissingPhotos.length,
      print_scope: printScope,
      is_demo: demoCount > 0 && realStudents.length === 0,
      template_id: settings.templateId || "original_v1",
      school_level: settings.level || "unknown",
      school_type: settings.schoolType || "unknown",
    });
  }, [printableStudents, printScope, settings, studentsWithMissingPhotos.length]);

  useEffect(() => {
    latestPrintPayloadRef.current = {
      students: printableStudents,
      settings,
      printMode,
      printScope,
    };
  }, [printableStudents, settings, printMode, printScope]);

  const handlePdfCompleted = useCallback((method: "share" | "download") => {
    const payload = latestPrintPayloadRef.current;
    if (payload.students.length === 0) return;
    trackReportPrint({
      ...payload,
      printChannel: method === "share" ? "ios_pdf_share" : "ios_pdf_download",
    });
  }, []);

  const {
    modalProps: pdfModalProps,
    runPrintOrPdfFallback,
    isGenerating,
  } = usePdfShareFlow({
    cacheKey: contentKey,
    totalCount: printableStudents.length,
    itemLabel: "report card",
    buildPdf: buildReportCardsPdf,
    onPdfCompleted: handlePdfCompleted,
    analyticsSource: "report_cards",
  });

  useEffect(() => {
    const confirmNativePrint = (requireArmedButton: boolean) => {
      const now = Date.now();
      const payload = latestPrintPayloadRef.current;
      if (payload.students.length === 0) return;

      const isArmed = Boolean(
        pendingButtonPrintRef.current && now <= pendingButtonPrintRef.current.expiresAt,
      );
      if (requireArmedButton && !isArmed) return;

      if (now - lastNativePrintTrackedAtRef.current < PRINT_TRIGGER_COOLDOWN_MS) {
        pendingButtonPrintRef.current = null;
        return;
      }

      pendingButtonPrintRef.current = null;
      lastNativePrintTrackedAtRef.current = now;

      const printChannel: PrintChannel = isArmed ? "native_print" : "keyboard_print";
      trackReportPrint({
        ...payload,
        printChannel,
      });
    };

    const onBeforePrint = () => {
      confirmNativePrint(false);
    };

    const onMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        confirmNativePrint(false);
      }
    };

    const onWindowBlur = () => {
      confirmNativePrint(true);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        confirmNativePrint(true);
      }
    };

    const printMql = typeof window.matchMedia === "function" ? window.matchMedia("print") : null;

    window.addEventListener("beforeprint", onBeforePrint);
    printMql?.addEventListener?.("change", onMediaChange);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      printMql?.removeEventListener?.("change", onMediaChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const handlePrint = () => {
    const now = Date.now();
    if (isGenerating || now - lastButtonClickAtRef.current < PRINT_TRIGGER_COOLDOWN_MS) {
      return;
    }
    lastButtonClickAtRef.current = now;
    markPrintStarted();
    runPrintOrPdfFallback(() => {
      pendingButtonPrintRef.current = { expiresAt: Date.now() + PRINT_TRIGGER_COOLDOWN_MS };
      window.print();
    });
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
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans print:m-0 print:bg-white print:p-0">
      {/* 1. TOOLBAR (Hidden when printing) */}
      <div
        data-testid="print-sticky-toolbar"
        className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 p-3 backdrop-blur-md sm:p-4 print:hidden"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* LEFT: Back + Title */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link
              to="/"
              aria-label="Back to Home"
              className="shrink-0 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-main truncate text-base font-bold sm:text-lg">Print Preview</h1>
              <p className="text-muted truncate text-[11px] sm:text-xs">
                {printableStudents.length} report card{printableStudents.length !== 1 ? "s" : ""}{" "}
                &mdash; {settings.className || "Class"}
              </p>
            </div>
          </div>

          {/* RIGHT ACTIONS: Style shortcut + Print button */}
          <div className="flex shrink-0 items-center gap-2 sm:order-3">
            <Link
              to="/settings/templates"
              title="Customize report style & colors"
              aria-label="Customize report style"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 sm:px-3"
            >
              <Palette className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden md:inline">Style</span>
            </Link>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90 flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:px-5 sm:text-sm"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>Print</span>
            </button>
          </div>

          {/* FILTER & INK MODE STRIP */}
          <div className="flex w-full items-center justify-between gap-2 border-t border-gray-100 pt-2 sm:order-2 sm:w-auto sm:justify-start sm:gap-3 sm:border-t-0 sm:pt-0">
            {!id && students.length > 0 && (
              <div className="flex flex-col items-start gap-0.5 sm:items-center">
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
            <div className="flex flex-col items-end gap-0.5 sm:items-center">
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
                  type="button"
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
                  <span>Color</span>
                </button>

                {/* B&W button */}
                <button
                  type="button"
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
                  <span>B&W</span>
                </button>
              </div>
            </div>
            {/* ──────────────────────────────────────────────────────── */}
          </div>
        </div>
      </div>

      {/* VALIDATION WARNING FOR MISSING PHOTOS (Outside sticky toolbar so it scrolls naturally) */}
      {studentsWithMissingPhotos.length > 0 && !photoWarningDismissed && (
        <div className="mx-auto max-w-5xl px-3 pt-3 sm:px-4 print:hidden">
          <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3.5 shadow-xs sm:p-4">
            <Image className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-yellow-800">
                ⚠️ {studentsWithMissingPhotos.length} student
                {studentsWithMissingPhotos.length === 1 ? "" : "s"} missing photo
                {studentsWithMissingPhotos.length === 1 ? "" : "s"}
              </p>
              <p className="text-muted mt-0.5 text-xs">
                Reports will print without photos. Add student photos from Home for complete
                report cards.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPhotoWarningDismissed(true)}
              aria-label="Dismiss missing photo warning"
              className="shrink-0 rounded-lg p-1 text-yellow-700 transition-colors hover:bg-yellow-100 hover:text-yellow-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. THE PREVIEW AREA - All rendered upfront for fast printing */}
      <div
        ref={printAreaRef}
        className="overflow-hidden py-4 print:m-0 print:w-full print:overflow-visible print:p-0"
      >
        {printableStudents.map((student) => (
          <div
            key={student.id}
            className="report-wrapper ph-no-capture mb-3 flex h-[126mm] justify-center overflow-hidden sm:mb-4 sm:h-[225mm] lg:mb-6 lg:h-auto print:m-0 print:mb-0 print:block print:overflow-hidden print:p-0"
          >
            <div className="origin-top scale-[0.42] transform sm:scale-75 lg:scale-100 print:w-full print:scale-100 print:transform-none">
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
