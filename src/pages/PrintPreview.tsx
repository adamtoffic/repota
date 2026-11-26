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
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export function PrintPreview() {
  const students = useSchoolStudents();
  const settings = useSchoolSettings();
  const { id } = useSearch({ from: "/print" });

  const [printMode, setPrintMode] = useState<PrintMode>("color");
  const [printFilter, setPrintFilter] = useState<"all" | "ready">("all");
  const [previewZoom, setPreviewZoom] = useState<"fit" | "full">("fit");
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  const [photoWarningDismissed, setPhotoWarningDismissed] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(1);
  const printAreaRef = useRef<HTMLElement>(null);

  const fitScale = Math.min(1, Math.max(0.32, (containerWidth - 24) / A4_WIDTH_PX));
  const effectiveScale = previewZoom === "full" ? 1 : fitScale;
  const isCompactPreview = fitScale < 0.98;

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

  useEffect(() => {
    const el = printAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [printableStudents.length]);

  const contentKey = useMemo(
    () =>
      JSON.stringify({
        printMode,
        printFilter,
        id: id ?? "",
        settings: {
          templateId: settings.templateId ?? "",
          schoolName: settings.schoolName,
          schoolMotto: settings.schoolMotto ?? "",
          address: settings.address ?? "",
          phoneNumber: settings.phoneNumber ?? "",
          email: settings.email ?? "",
          academicYear: settings.academicYear,
          term: settings.term,
          className: settings.className,
          classSize: settings.classSize,
          totalAttendanceDays: settings.totalAttendanceDays,
          nextTermStarts: settings.nextTermStarts ?? "",
          schoolType: settings.schoolType,
          level: settings.level,
          examType: settings.examType,
          classScoreMax: settings.classScoreMax,
          examScoreMax: settings.examScoreMax,
          logoUrl: settings.logoUrl ?? "",
          classTeacherName: settings.classTeacherName ?? "",
          headTeacherName: settings.headTeacherName ?? "",
          teacherSignature: settings.teacherSignature ?? "",
          headTeacherSignature: settings.headTeacherSignature ?? "",
          showClassPosition: settings.showClassPosition ?? true,
          showSubjectPosition: settings.showSubjectPosition ?? true,
          useCustomTemplateColor: settings.useCustomTemplateColor ?? false,
          primaryColor: settings.primaryColor ?? "",
          accentColor: settings.accentColor ?? "",
          showFeeSchedule: settings.showFeeSchedule ?? true,
          showStudentFeeArrearsOnReport: settings.showStudentFeeArrearsOnReport ?? false,
          privateFeeItems: settings.privateFeeItems ?? [],
          feePaymentNote: settings.feePaymentNote ?? "",
        },
        students: printableStudents.map((s) => ({
          id: s.id,
          name: s.name,
          className: s.className,
          totalScore: s.totalScore,
          averageScore: s.averageScore,
          classPosition: s.classPosition,
          aggregate: s.aggregate,
          attendancePresent: s.attendancePresent,
          conduct: s.conduct ?? "",
          interest: s.interest ?? "",
          teacherRemark: s.teacherRemark ?? "",
          promotionStatus: s.promotionStatus ?? "",
          pictureUrl: s.pictureUrl ?? "",
          feeArrears: s.feeArrears ?? 0,
        })),
      }),
    [printMode, printFilter, id, settings, printableStudents],
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
    if (printableStudents.length < 3) return;

    let rafId: number | null = null;

    const updateActiveCard = () => {
      rafId = null;
      const container = printAreaRef.current;
      if (!container) return;

      const cards = container.querySelectorAll<HTMLElement>(".report-wrapper");
      if (cards.length === 0) return;

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0 && window.scrollY >= maxScroll - 32) {
        setActiveCardIndex((prev) => (prev === cards.length ? prev : cards.length));
        return;
      }

      const anchorY = window.innerHeight * 0.35;
      let current = 1;
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getBoundingClientRect().top <= anchorY) {
          current = i + 1;
        } else {
          break;
        }
      }

      setActiveCardIndex((prev) => (prev === current ? prev : current));
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateActiveCard);
    };

    updateActiveCard();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [printableStudents.length]);

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
    showFallbackNotice,
    dismissFallbackNotice,
    openPdfFallback,
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
      markPrintStarted();
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
    const isMissingStudentId = Boolean(id && students.length > 0);
    const isFilteredToReady = !id && printFilter === "ready" && students.length > 0;
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="bg-background flex min-h-dvh flex-col items-center justify-center p-8 text-center focus:outline-none"
      >
        <h1 className="sr-only">Print Preview</h1>
        <div className="border-border bg-surface max-w-md rounded-xl border p-8 shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h2 className="text-main mb-2 text-xl font-bold">
            {isMissingStudentId
              ? "Student Report Not Found"
              : isFilteredToReady
                ? "No Complete Report Cards Ready"
                : "No Students Found"}
          </h2>
          <p className="text-secondary mb-6">
            {isMissingStudentId
              ? "This student link is no longer active or the record was removed."
              : isFilteredToReady
                ? `All ${students.length} students still have missing subjects or zero scores.`
                : "Add students and enter their grades before generating reports."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isMissingStudentId && (
              <Link
                to="/print"
                search={{ id: undefined }}
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white"
              >
                View All Report Cards
              </Link>
            )}
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
              className="border-border-strong bg-surface text-secondary hover:bg-subtle inline-flex items-center gap-2 rounded-lg border px-5 py-2 text-sm font-bold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="bg-subtle dark:bg-background min-h-dvh font-sans print:m-0 print:h-auto print:min-h-0 print:bg-white print:p-0">
      {/* 1. TOOLBAR (Hidden when printing) */}
      <header
        data-testid="print-sticky-toolbar"
        className="border-border bg-surface/85 sticky top-0 z-50 border-b p-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur-md sm:p-4 sm:pt-[calc(1rem+env(safe-area-inset-top,0px))] print:hidden"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* LEFT: Back + Title */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link
              to="/"
              aria-label="Back to Home"
              className="text-secondary hover:bg-subtle shrink-0 rounded-full p-2 transition-colors"
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
            {isCompactPreview && (
              <div
                role="group"
                aria-label="Preview zoom"
                className="border-border bg-subtle flex min-h-10 items-center rounded-xl border p-0.5 shadow-inner sm:h-9 sm:min-h-0"
              >
                <button
                  type="button"
                  onClick={() => setPreviewZoom("fit")}
                  aria-pressed={previewZoom === "fit"}
                  className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    previewZoom === "fit"
                      ? "bg-elevated text-primary-text shadow-sm"
                      : "text-muted hover:text-main"
                  }`}
                >
                  Fit
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom("full")}
                  aria-pressed={previewZoom === "full"}
                  className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    previewZoom === "full"
                      ? "bg-elevated text-main shadow-sm"
                      : "text-muted hover:text-main"
                  }`}
                >
                  100%
                </button>
              </div>
            )}

            <Link
              to="/settings/templates"
              title="Customize report style & colors"
              aria-label="Customize report style"
              className="border-border bg-surface text-secondary hover:bg-subtle inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold shadow-2xs transition-colors sm:h-9 sm:min-h-0 sm:px-3"
            >
              <Palette className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Style</span>
            </Link>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90 flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:min-h-0 sm:gap-2 sm:px-5 sm:text-sm"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>Print</span>
            </button>
          </div>

          {/* FILTER & INK MODE STRIP */}
          <div className="border-border-subtle flex w-full items-center justify-between gap-2 border-t pt-2 sm:order-2 sm:w-auto sm:justify-start sm:gap-3 sm:border-t-0 sm:pt-0">
            {!id && students.length > 0 && (
              <div className="flex flex-col items-start gap-0.5 sm:items-center">
                <p className="text-muted hidden text-[11px] font-black tracking-widest uppercase sm:block">
                  Students
                </p>
                <div
                  role="group"
                  aria-label="Print readiness filter"
                  className="border-border bg-subtle flex min-h-10 items-center rounded-xl border p-0.5 shadow-inner sm:h-9 sm:min-h-0"
                >
                  <button
                    type="button"
                    onClick={() => setPrintFilter("all")}
                    aria-pressed={printFilter === "all"}
                    className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      printFilter === "all"
                        ? "bg-elevated text-main shadow-sm"
                        : "text-muted hover:text-main"
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
                        ? "bg-elevated text-emerald-700 shadow-sm dark:text-emerald-400"
                        : "text-muted hover:text-main"
                    }`}
                  >
                    Ready ({readyStudents.length})
                  </button>
                </div>
              </div>
            )}

            {/* ── INK MODE TOGGLE ───────────────────────────────────── */}
            <div className="flex flex-col items-end gap-0.5 sm:items-center">
              <p className="text-muted hidden text-[11px] font-black tracking-widest uppercase sm:block">
                Ink Mode
              </p>
              {/* Pill container */}
              <div
                role="group"
                aria-label="Ink mode"
                className="border-border bg-subtle relative grid min-h-10 grid-cols-2 items-center rounded-xl border p-0.5 shadow-inner sm:h-9 sm:min-h-0"
              >
                {/* Animated sliding background pill */}
                <div
                  aria-hidden="true"
                  className={`bg-elevated pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-[10px] shadow-sm ring-1 ring-black/6 transition-transform duration-200 ease-in-out dark:ring-white/10 ${
                    printMode === "bw" ? "translate-x-full" : "translate-x-0"
                  }`}
                />

                {/* Color button */}
                <button
                  type="button"
                  onClick={() => setPrintMode("color")}
                  aria-pressed={printMode === "color"}
                  title="Full color print"
                  className={`relative z-10 flex items-center justify-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors duration-150 sm:px-3 ${
                    printMode === "color"
                      ? "text-primary-text"
                      : "text-muted hover:text-main"
                  }`}
                >
                  {/* Color swatch dot */}
                  <span
                    aria-hidden="true"
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
                  className={`relative z-10 flex items-center justify-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors duration-150 sm:px-3 ${
                    printMode === "bw" ? "text-main" : "text-muted hover:text-main"
                  }`}
                >
                  {/* Greyscale dot */}
                  <span
                    aria-hidden="true"
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
      </header>

      {showFallbackNotice && (
        <div className="mx-auto max-w-5xl px-3 pt-3 sm:px-4 print:hidden">
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 shadow-xs dark:border-blue-800/70 dark:bg-blue-950/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
                Print dialog did not appear in this web app
              </p>
              <p className="text-muted mt-0.5 text-xs">
                Export a multi-page A4 PDF instead to share, save, or AirPrint cleanly.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openPdfFallback}
                className="bg-primary hover:bg-primary/90 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-2xs"
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={dismissFallbackNotice}
                aria-label="Dismiss PDF fallback banner"
                className="text-muted hover:bg-subtle hover:text-main rounded-lg p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION WARNING FOR MISSING PHOTOS (Outside sticky toolbar so it scrolls naturally) */}
      {studentsWithMissingPhotos.length > 0 && !photoWarningDismissed && (
        <div className="mx-auto max-w-5xl px-3 pt-3 sm:px-4 print:hidden">
          <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3.5 shadow-xs sm:p-4 dark:border-amber-800/70 dark:bg-amber-950/50">
            <Image className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-yellow-800 dark:text-amber-200">
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
              className="shrink-0 rounded-lg p-1 text-yellow-700 transition-colors hover:bg-yellow-100 hover:text-yellow-950 dark:text-amber-300 dark:hover:bg-amber-900/60 dark:hover:text-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. THE PREVIEW AREA - All rendered upfront for fast printing */}
      <main
        id="main-content"
        tabIndex={-1}
        ref={printAreaRef}
        className={`py-4 focus:outline-none print:m-0 print:w-full print:overflow-visible print:p-0 ${
          previewZoom === "full" && isCompactPreview ? "overflow-x-auto px-3" : "overflow-hidden"
        }`}
      >
        {printableStudents.map((student, idx) => (
          <div
            key={student.id}
            data-is-last={idx === printableStudents.length - 1 ? "true" : undefined}
            style={
              effectiveScale < 1
                ? { height: `${Math.ceil(A4_HEIGHT_PX * effectiveScale) + 12}px` }
                : undefined
            }
            className={`report-wrapper ph-no-capture mb-3 flex overflow-hidden sm:mb-4 lg:mb-6 lg:h-auto print:m-0 print:mb-0 print:block print:h-[296.5mm] print:overflow-hidden print:p-0 ${
              previewZoom === "full" && isCompactPreview
                ? "w-max min-w-full justify-start"
                : "justify-center"
            }`}
          >
            <div
              style={
                effectiveScale < 1 ? { transform: `scale(${effectiveScale})` } : undefined
              }
              className="report-scale-stage origin-top transform print:w-full print:scale-100 print:transform-none"
            >
              <div
                data-pdf-card="true"
                data-paper-surface="true"
                className="bg-white text-black shadow-2xl print:m-0 print:p-0 print:shadow-none"
              >
                <SelectedTemplate student={student} settings={settings} printMode={printMode} />
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* SCROLL BUTTON */}
      {printableStudents.length >= 3 && (
        <ScrollButton
          hasBottomNav={false}
          statusLabel={`${Math.min(activeCardIndex, printableStudents.length)} / ${printableStudents.length}`}
        />
      )}

      <PdfExportModal {...pdfModalProps} />
    </div>
  );
}
