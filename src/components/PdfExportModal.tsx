import { Download, Loader2, Share2, X } from "lucide-react";
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
  if (!isOpen) return null;

  const total = progress?.total ?? totalCount;
  const current = progress?.current ?? 0;
  const pct = total > 0 ? Math.round((current / total) * 100) : 10;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-pdf-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="ios-pdf-modal-title" className="text-main text-base font-bold">
              {status === "generating"
                ? "Preparing Print PDF…"
                : status === "error"
                  ? "PDF Preparation Failed"
                  : "PDF Ready to Print or Save"}
            </h2>
            <p className="text-muted mt-0.5 text-xs">
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
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {status === "generating" && (
          <div className="my-4">
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-700">
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
              <span>{total > 0 ? `${pct}%` : "Starting…"}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {status === "ready" && file && (
          <div className="mt-4 flex flex-col gap-2">
            {error && <p className="text-xs text-amber-700">{error}</p>}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
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
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
