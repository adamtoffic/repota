// src/utils/pdfPrint.ts
// Offline-first multi-page A4 PDF generator + Share Sheet helper.
// Used on iOS 27+ Home Screen PWAs where window.print() is a silent no-op,
// and as a fallback whenever window.print() fails to trigger print events.

import { isIOSDevice, isIOSPWA } from "./iosInteraction";
import { normalizeChartSvgForLightExport } from "./theme";

export interface PdfGenerationProgress {
  current: number;
  total: number;
}

export type SharePdfOutcome = "shared" | "aborted" | "activation-expired" | "unsupported";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const BLOCK_MARGIN_MM = 10;
const BLOCK_GAP_MM = 4;
const WATERMARK_URL = "/assets/coat-of-arms.png";

const preloadImage = (src: string): Promise<void> =>
  new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = src;
    if (img.complete) resolve();
  });

const waitForImages = async (root: HTMLElement): Promise<void> => {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            if (typeof img.decode === "function") {
              img.decode().then(resolve, resolve);
            } else {
              resolve();
            }
            return;
          }
          const timer = window.setTimeout(resolve, 2500);
          const finish = () => {
            window.clearTimeout(timer);
            resolve();
          };
          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
        }),
    ),
  );
};

const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });

const freeCanvas = (canvas: HTMLCanvasElement | null): void => {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
};

export const resolvePdfCaptureScale = (pageCount: number): number => {
  if (isIOSDevice()) {
    if (pageCount >= 25) return 1.25;
    if (pageCount >= 12) return 1.5;
    return 1.75;
  }
  return pageCount >= 30 ? 1.5 : 2;
};

export const buildStageIgnoreElements = (stage: HTMLElement) => (el: Element): boolean =>
  el instanceof HTMLElement &&
  el.parentElement === document.body &&
  el !== stage &&
  el.tagName !== "STYLE" &&
  el.tagName !== "LINK";

const loadPdfDependencies = async () => {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
    document.fonts?.ready.catch(() => undefined),
    preloadImage(WATERMARK_URL),
  ]);
  return { jsPDF, html2canvas: html2canvasModule.default };
};

const sanitizeFilenamePart = (value: string | undefined, fallback: string): string => {
  const clean = (value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || fallback;
};

export const buildPdfFilename = (className?: string, count?: number): string => {
  const prefix = sanitizeFilenamePart(className, "Repota");
  const suffix = count === 1 ? "report-card" : "report-cards";
  return `${prefix}-${suffix}.pdf`;
};

export const buildAnalyticsPdfFilename = (className?: string, viewName?: string): string => {
  const prefix = sanitizeFilenamePart(className, "Repota");
  const view = sanitizeFilenamePart(viewName, "overview");
  return `${prefix}-analytics-${view}.pdf`;
};

/**
 * Render each report card node into an unscaled off-screen A4 host and combine
 * them into a single multi-page A4 PDF File. Runs 100% offline.
 */
export async function generateReportsPdfFile(
  container: HTMLElement,
  options: {
    filename?: string;
    onProgress?: (progress: PdfGenerationProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<File> {
  const cardHosts = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-card="true"]'));
  if (cardHosts.length === 0) {
    throw new Error("No report cards found to export.");
  }

  const { jsPDF, html2canvas } = await loadPdfDependencies();
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const total = cardHosts.length;

  for (let i = 0; i < total; i++) {
    if (options.signal?.aborted) {
      throw new DOMException("PDF generation cancelled", "AbortError");
    }

    options.onProgress?.({ current: i + 1, total });

    const host = cardHosts[i];
    const sourceCard = (host.firstElementChild as HTMLElement | null) ?? host;

    // Clone into an unscaled off-screen A4 host so mobile preview scaling
    // (scale-[0.40]) never shrinks the captured canvas.
    const stage = document.createElement("div");
    stage.setAttribute("aria-hidden", "true");
    stage.dataset.paperSurface = "true";
    stage.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;min-height:297mm;background:#ffffff;margin:0;padding:0;pointer-events:none;z-index:-1;";
    const clone = sourceCard.cloneNode(true) as HTMLElement;
    stage.appendChild(clone);
    document.body.appendChild(stage);

    let canvas: HTMLCanvasElement | null = null;
    try {
      await waitForImages(clone);
      if (options.signal?.aborted) {
        throw new DOMException("PDF generation cancelled", "AbortError");
      }

      canvas = await html2canvas(clone, {
        scale: resolvePdfCaptureScale(total),
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: clone.scrollWidth || 794,
        ignoreElements: buildStageIgnoreElements(stage),
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove("dark");
          clonedDoc.documentElement.style.colorScheme = "light";
        },
      });
      if (options.signal?.aborted) {
        throw new DOMException("PDF generation cancelled", "AbortError");
      }

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const rawHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

      if (rawHeightMm <= A4_HEIGHT_MM) {
        pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, rawHeightMm, undefined, "FAST");
      } else {
        // Fit uniformly if content slightly exceeds 297mm so nothing clips
        const fittedWidthMm = (A4_HEIGHT_MM * canvas.width) / canvas.height;
        const offsetX = (A4_WIDTH_MM - fittedWidthMm) / 2;
        pdf.addImage(imgData, "JPEG", offsetX, 0, fittedWidthMm, A4_HEIGHT_MM, undefined, "FAST");
      }
    } finally {
      freeCanvas(canvas);
      stage.remove();
    }

    if (i < total - 1) {
      await yieldToMain();
    }
  }

  const blob = pdf.output("blob");
  const filename = options.filename || "repota-report-cards.pdf";
  return new File([blob], filename, { type: "application/pdf" });
}

/**
 * Render an array of flow-layout section blocks (e.g. Analytics header + cards)
 * into a multi-page A4 PDF without splitting cards mid-chart across page breaks.
 */
export async function generateBlocksPdfFile(
  blocks: HTMLElement[],
  options: {
    filename?: string;
    onProgress?: (progress: PdfGenerationProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<File> {
  const validBlocks = blocks.filter((b) => b && b.offsetHeight > 0);
  if (validBlocks.length === 0) {
    throw new Error("No content sections found to export.");
  }

  const { jsPDF, html2canvas } = await loadPdfDependencies();
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const printableWidthMm = A4_WIDTH_MM - BLOCK_MARGIN_MM * 2;
  const printableHeightMm = A4_HEIGHT_MM - BLOCK_MARGIN_MM * 2;
  let cursorY = BLOCK_MARGIN_MM;
  const total = validBlocks.length;

  for (let i = 0; i < total; i++) {
    if (options.signal?.aborted) {
      throw new DOMException("PDF generation cancelled", "AbortError");
    }

    options.onProgress?.({ current: i + 1, total });

    const block = validBlocks[i];
    const baseWidth = Math.max(block.offsetWidth, 320);

    const stage = document.createElement("div");
    stage.setAttribute("aria-hidden", "true");
    stage.dataset.paperSurface = "true";
    stage.style.cssText = `position:fixed;left:-10000px;top:0;width:${baseWidth}px;background:#ffffff;color:#0f172a;margin:0;padding:4px;pointer-events:none;z-index:-1;`;

    // Freeze GPU chart/page animations at final visible frame during capture
    const noAnimStyle = document.createElement("style");
    noAnimStyle.textContent =
      "*{animation:none!important;transition:none!important;} .recharts-bar-rectangle,.recharts-pie,.recharts-radar-polygon,.recharts-line,.recharts-area{opacity:1!important;transform:none!important;}";
    stage.appendChild(noAnimStyle);

    const clone = block.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-no-print="true"]').forEach((el) => el.remove());
    clone.querySelectorAll<HTMLElement>(".overflow-x-auto").forEach((el) => {
      el.style.overflow = "visible";
      el.style.marginLeft = "0";
      el.style.marginRight = "0";
    });
    normalizeChartSvgForLightExport(clone);
    stage.appendChild(clone);
    document.body.appendChild(stage);

    // Expand stage if an unclipped wide table needs more horizontal room
    const captureWidth = Math.max(baseWidth, clone.scrollWidth + 8);
    stage.style.width = `${captureWidth}px`;

    let canvas: HTMLCanvasElement | null = null;
    try {
      await waitForImages(clone);
      if (options.signal?.aborted) {
        throw new DOMException("PDF generation cancelled", "AbortError");
      }

      canvas = await html2canvas(clone, {
        scale: resolvePdfCaptureScale(total),
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: captureWidth,
        ignoreElements: buildStageIgnoreElements(stage),
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove("dark");
          clonedDoc.documentElement.style.colorScheme = "light";
        },
      });
      if (options.signal?.aborted) {
        throw new DOMException("PDF generation cancelled", "AbortError");
      }

      const blockHeightMm = (canvas.height * printableWidthMm) / canvas.width;

      if (blockHeightMm <= printableHeightMm) {
        if (cursorY > BLOCK_MARGIN_MM && cursorY + blockHeightMm > A4_HEIGHT_MM - BLOCK_MARGIN_MM) {
          pdf.addPage("a4", "portrait");
          cursorY = BLOCK_MARGIN_MM;
        }
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(
          imgData,
          "JPEG",
          BLOCK_MARGIN_MM,
          cursorY,
          printableWidthMm,
          blockHeightMm,
          undefined,
          "FAST",
        );
        cursorY += blockHeightMm + BLOCK_GAP_MM;
      } else {
        // Oversized single block (e.g. a very long table): slice cleanly across pages
        if (cursorY > BLOCK_MARGIN_MM) {
          pdf.addPage("a4", "portrait");
          cursorY = BLOCK_MARGIN_MM;
        }
        const sliceHeightPx = Math.floor((printableHeightMm * canvas.width) / printableWidthMm);
        let offsetY = 0;
        while (offsetY < canvas.height) {
          if (options.signal?.aborted) {
            throw new DOMException("PDF generation cancelled", "AbortError");
          }
          const currentSlicePx = Math.min(sliceHeightPx, canvas.height - offsetY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = currentSlicePx;
          const ctx = sliceCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              offsetY,
              canvas.width,
              currentSlicePx,
              0,
              0,
              canvas.width,
              currentSlicePx,
            );
            const sliceHeightMm = (currentSlicePx * printableWidthMm) / canvas.width;
            const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
            pdf.addImage(
              sliceData,
              "JPEG",
              BLOCK_MARGIN_MM,
              BLOCK_MARGIN_MM,
              printableWidthMm,
              sliceHeightMm,
              undefined,
              "FAST",
            );
            cursorY = BLOCK_MARGIN_MM + sliceHeightMm + BLOCK_GAP_MM;
          }
          freeCanvas(sliceCanvas);
          offsetY += currentSlicePx;
          if (offsetY < canvas.height) {
            pdf.addPage("a4", "portrait");
            cursorY = BLOCK_MARGIN_MM;
          }
        }
      }
    } finally {
      freeCanvas(canvas);
      stage.remove();
    }

    if (i < total - 1) {
      await yieldToMain();
    }
  }

  const blob = pdf.output("blob");
  const filename = options.filename || "repota-analytics.pdf";
  return new File([blob], filename, { type: "application/pdf" });
}

/**
 * Present the iOS / OS native Share Sheet for a generated PDF file.
 * On iOS, the Share Sheet provides AirPrint ("Print") and "Save to Files".
 */
export async function sharePdfFile(file: File): Promise<SharePdfOutcome> {
  if (typeof navigator.share !== "function") {
    return "unsupported";
  }
  const shareData: ShareData = {
    files: [file],
    title: file.name.replace(/\.pdf$/i, ""),
  };
  if (typeof navigator.canShare === "function" && !navigator.canShare(shareData)) {
    return "unsupported";
  }

  try {
    await navigator.share(shareData);
    return "shared";
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") return "aborted";
      if (err.name === "NotAllowedError") return "activation-expired";
    }
    throw err;
  }
}

export function downloadPdfFile(file: File): void {
  const url = URL.createObjectURL(file);
  if (isIOSPWA()) {
    // Opening in a separate viewer sheet avoids trapping standalone iOS PWAs on a blob: URL with no back bar
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
