// src/utils/pdfPrint.ts
// Offline-first multi-page A4 PDF generator + Share Sheet helper.
// Used on iOS 27+ Home Screen PWAs where window.print() is a silent no-op,
// and as a fallback whenever window.print() fails to trigger print events.

export interface PdfGenerationProgress {
  current: number;
  total: number;
}

export type SharePdfOutcome = "shared" | "aborted" | "activation-expired" | "unsupported";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
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

export const buildPdfFilename = (className?: string, count?: number): string => {
  const cleanClass = (className || "Repota")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = cleanClass || "Repota";
  const suffix = count === 1 ? "report-card" : "report-cards";
  return `${prefix}-${suffix}.pdf`;
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

  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
    document.fonts?.ready.catch(() => undefined),
    preloadImage(WATERMARK_URL),
  ]);
  const html2canvas = html2canvasModule.default;

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
    stage.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;min-height:297mm;background:#ffffff;margin:0;padding:0;pointer-events:none;z-index:-1;";
    const clone = sourceCard.cloneNode(true) as HTMLElement;
    stage.appendChild(clone);
    document.body.appendChild(stage);

    let canvas: HTMLCanvasElement | null = null;
    try {
      await waitForImages(clone);

      canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: clone.scrollWidth || 794,
      });

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
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
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
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
