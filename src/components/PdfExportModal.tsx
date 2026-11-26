import { useRef } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, Share2, X } from "lucide-react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import type { PdfExportModalProps } from "../hooks/usePdfShareFlow";

export function PdfExportModal({
  isOpen,
  status,
  progress,
  totalCount,
  file,
  error,
  itemLabel = "page",
  onClose,
  onRetry,
  onShare,
  onDownload,
}: PdfExportModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const canDismiss = status !== "generating";

  useDialogA11y({
    isOpen,
    onClose,
    dialogRef,
    closeOnEscape: true,
  });

  if (!isOpen) return null;

  const total = progress?.total ?? totalCount;
  const current = progress?.current ?? 0;
  const pct = total > 0 ? Math.round((current / total) * 100) : 10;

  const modalContent = (
    <div
      onClick={(e) => {
        if (canDismiss && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-pdf-modal-title"
        className="bg-surface border-border w-full max-w-sm rounded-2xl border p-5 shadow-2xl focus:outline-none"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="ios-pdf-modal-title" className="text-main text-base font-bold">
              {status === "generating"
                ? "Preparing Print PDF…"
                : status === "error"
                  ? "PDF Preparation Failed"
                  : "PDF Ready to Print or Save"}
            </h2>
            <p
              role={status === "error" ? "alert" : undefined}
              className="text-muted mt-0.5 text-xs"
            >
              {status === "generating"
                ? `Rendering ${itemLabel} ${current} of ${total}`
                : status === "error"
                  ? error || "Something went wrong."
                  : "Tap Print / Share PDF below, then choose Print or Save to Files."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={status === "generating" ? "Cancel PDF generation" : "Close"}
            className="text-muted hover:bg-subtle hover:text-main rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {status === "generating" && (
          <div className="my-4" role="status" aria-live="polite">
            <div className="text-secondary flex items-center justify-center gap-2 py-2 text-sm font-medium">
              <Loader2 className="text-primary-text h-5 w-5 animate-spin" />
              <span>{total > 0 ? `${pct}%` : "Starting…"}</span>
            </div>
            <div className="bg-subtle h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {status === "ready" && file && (
          <div className="mt-4 flex flex-col gap-2">
            {error && (
              <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={onShare}
              className="bg-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
            >
              <Share2 className="h-4 w-4" />
              Print / Share PDF
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="border-border-strong bg-surface text-secondary hover:bg-subtle flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="bg-primary hover:bg-primary/90 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border-border-strong bg-surface text-secondary hover:bg-subtle rounded-xl border px-4 py-2.5 text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
