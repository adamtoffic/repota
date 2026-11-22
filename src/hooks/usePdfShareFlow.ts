import { useCallback, useEffect, useRef, useState } from "react";
import { captureEvent } from "../utils/analytics";
import { useToast } from "./useToast";
import { isIOSPWA, shouldUseIOSPdfPrintFallback } from "../utils/iosInteraction";
import {
  downloadPdfFile,
  sharePdfFile,
  type PdfGenerationProgress,
} from "../utils/pdfPrint";

export type PdfExportStatus = "idle" | "generating" | "ready" | "error";

export interface PdfExportModalProps {
  isOpen: boolean;
  status: PdfExportStatus;
  progress: PdfGenerationProgress | null;
  totalCount: number;
  file: File | null;
  error: string | null;
  itemLabel?: string;
  onClose: () => void;
  onRetry: () => void;
  onShare: () => void;
  onDownload: () => void;
}

interface UsePdfShareFlowOptions {
  cacheKey: string;
  totalCount: number;
  itemLabel?: string;
  buildPdf: (opts: {
    onProgress: (progress: PdfGenerationProgress) => void;
    signal: AbortSignal;
  }) => Promise<File>;
  onPdfCompleted?: (method: "share" | "download") => void;
  analyticsSource?: "report_cards" | "analytics";
}

/**
 * Shared state machine for iOS 27+ standalone PWA PDF export + Share Sheet fallback,
 * plus a runtime print watchdog for older iOS standalone versions.
 */
export function usePdfShareFlow({
  cacheKey,
  totalCount,
  itemLabel,
  buildPdf,
  onPdfCompleted,
  analyticsSource,
}: UsePdfShareFlowOptions) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<PdfExportStatus>("idle");
  const [progress, setProgress] = useState<PdfGenerationProgress | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<{ key: string; file: File } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const watchdogCleanupRef = useRef<(() => void) | null>(null);
  const onPdfCompletedRef = useRef(onPdfCompleted);
  const triggerReasonRef = useRef<"ios27_auto" | "watchdog_recovery">("ios27_auto");

  const trackFallbackOutcome = useCallback(
    (outcome: "shared" | "downloaded" | "aborted" | "error") => {
      if (!analyticsSource) return;
      captureEvent("Ios_Pdf_Fallback_Used", {
        trigger_reason: triggerReasonRef.current,
        outcome,
        source: analyticsSource,
      });
    },
    [analyticsSource],
  );

  useEffect(() => {
    onPdfCompletedRef.current = onPdfCompleted;
  }, [onPdfCompleted]);

  useEffect(() => {
    cacheRef.current = null;
  }, [cacheKey]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      watchdogCleanupRef.current?.();
    };
  }, []);

  const closeModal = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsOpen(false);
    setStatus("idle");
    setProgress(null);
    setError(null);
  }, []);

  const triggerShare = useCallback(
    async (targetFile: File) => {
      try {
        const outcome = await sharePdfFile(targetFile);
        if (outcome === "shared") {
          trackFallbackOutcome("shared");
          onPdfCompletedRef.current?.("share");
          setIsOpen(false);
          setStatus("idle");
          return;
        }
        if (outcome === "aborted") {
          trackFallbackOutcome("aborted");
          setIsOpen(false);
          setStatus("idle");
          return;
        }
        setFile(targetFile);
        setStatus("ready");
        setIsOpen(true);
      } catch (err) {
        trackFallbackOutcome("error");
        setFile(targetFile);
        setError(err instanceof Error ? err.message : "Could not open the share sheet.");
        setStatus("ready");
        setIsOpen(true);
      }
    },
    [trackFallbackOutcome],
  );

  const startPdfFlow = useCallback(async () => {
    const cached = cacheRef.current;
    if (cached && cached.key === cacheKey) {
      await triggerShare(cached.file);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFile(null);
    setError(null);
    setStatus("generating");
    setProgress({ current: 0, total: totalCount });
    setIsOpen(true);

    try {
      const generated = await buildPdf({
        onProgress: setProgress,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      cacheRef.current = { key: cacheKey, file: generated };
      setFile(generated);
      await triggerShare(generated);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      trackFallbackOutcome("error");
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to build PDF.");
    }
  }, [buildPdf, cacheKey, totalCount, trackFallbackOutcome, triggerShare]);

  const armWatchdog = useCallback(() => {
    watchdogCleanupRef.current?.();

    let sawPrint = false;
    const mql = typeof window.matchMedia === "function" ? window.matchMedia("print") : null;
    const onBeforePrint = (e: Event) => {
      if (e.isTrusted) sawPrint = true;
    };
    const onMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) sawPrint = true;
    };
    const onBlur = () => {
      sawPrint = true;
    };

    window.addEventListener("beforeprint", onBeforePrint);
    mql?.addEventListener("change", onMediaChange);
    window.addEventListener("blur", onBlur);

    const timer = window.setTimeout(() => {
      cleanup();
      if (!sawPrint) {
        showToast("Print sheet did not open in this web app.", "info", {
          label: "Print / Save PDF",
          onClick: () => {
            triggerReasonRef.current = "watchdog_recovery";
            void startPdfFlow();
          },
        });
      }
    }, 1500);

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeprint", onBeforePrint);
      mql?.removeEventListener("change", onMediaChange);
      window.removeEventListener("blur", onBlur);
      if (watchdogCleanupRef.current === cleanup) {
        watchdogCleanupRef.current = null;
      }
    };
    watchdogCleanupRef.current = cleanup;
  }, [showToast, startPdfFlow]);

  /**
   * Dispatch native print or the iOS 27+ PDF Share Sheet flow depending on platform.
   * Returns `"pdf-fallback"` when the PDF flow was launched instead of native print.
   */
  const runPrintOrPdfFallback = useCallback(
    (triggerNativePrint: () => void): "native" | "pdf-fallback" => {
      if (shouldUseIOSPdfPrintFallback()) {
        triggerReasonRef.current = "ios27_auto";
        void startPdfFlow();
        return "pdf-fallback";
      }
      if (isIOSPWA()) {
        armWatchdog();
      }
      triggerNativePrint();
      return "native";
    },
    [armWatchdog, startPdfFlow],
  );

  const modalProps: PdfExportModalProps = {
    isOpen,
    status,
    progress,
    totalCount,
    file,
    error,
    itemLabel,
    onClose: closeModal,
    onRetry: () => void startPdfFlow(),
    onShare: () => {
      if (file) void triggerShare(file);
    },
    onDownload: () => {
      if (file) {
        downloadPdfFile(file);
        trackFallbackOutcome("downloaded");
        onPdfCompletedRef.current?.("download");
      }
    },
  };

  return {
    modalProps,
    startPdfFlow,
    runPrintOrPdfFallback,
    isGenerating: status === "generating",
  };
}
