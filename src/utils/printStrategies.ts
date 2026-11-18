// src/utils/printStrategies.ts
// Alternative ways of opening the print sheet, used to work around / diagnose
// iOS 27 Home Screen web apps where a plain window.print() opens nothing.
// See docs/reports/ios27-pwa-print-failure.md.
//
// IMPORTANT: every strategy must be called synchronously from a tap/click
// handler so the user gesture (transient activation) is preserved.

import posthog from "posthog-js";

export type PrintStrategyId = "direct" | "pause-analytics" | "iframe" | "new-window" | "share-file";

export interface PrintStrategyResult {
  ok: boolean;
  detail: string;
}

// Standalone shape (not extending Navigator) so it never conflicts with lib.dom
// typings, which declare userActivation as non-optional in newer TS versions.
interface NavigatorWithExtras {
  standalone?: boolean;
  userActivation?: { isActive: boolean; hasBeenActive: boolean };
}

export const isStandaloneDisplay = (): boolean => {
  const nav = window.navigator as NavigatorWithExtras;
  return (
    nav.standalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches)
  );
};

export const isIOSDevice = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS reports itself as Mac; detect touch support
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

export const getUserActivation = (): string => {
  const ua = (window.navigator as NavigatorWithExtras).userActivation;
  if (!ua) return "unsupported";
  return `isActive=${ua.isActive} hasBeenActive=${ua.hasBeenActive}`;
};

/** Collect all same-origin CSS currently applied to the page as plain text. */
const collectCss = (): string => {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      chunks.push(
        Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n"),
      );
    } catch {
      // Cross-origin stylesheet: cannot read rules, skip
    }
  }
  return chunks.join("\n").replace(/<\/style/gi, "<\\/style");
};

/**
 * Build a standalone HTML document containing only the printable reports,
 * with all CSS inlined (no network needed, so nothing delays the print).
 */
export const buildPrintableHtml = (source: HTMLElement, opts: { withPrintButton?: boolean } = {}) => {
  const printButton = opts.withPrintButton
    ? `<div class="repota-print-bar" style="position:sticky;top:0;z-index:10;padding:12px;background:#1e3a8a;text-align:center;">
         <button type="button" onclick="window.print()" style="font:600 16px system-ui;padding:10px 24px;border-radius:8px;border:0;background:#fff;color:#1e3a8a;">Tap to Print</button>
       </div>
       <style>@media print{.repota-print-bar{display:none!important}}</style>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Repota Reports</title><style>${collectCss()}</style></head>
<body style="margin:0;background:#fff">${printButton}${source.outerHTML}</body></html>`;
};

/** A: current behaviour — plain window.print(). */
const printDirect = (): PrintStrategyResult => {
  window.print();
  return { ok: true, detail: "window.print() returned" };
};

/**
 * B: stop PostHog session recording first, then print.
 * WebKit postpones window.print() while the page still has network requests
 * in flight; this rules analytics traffic in or out as the culprit.
 */
const printWithAnalyticsPaused = (): PrintStrategyResult => {
  let wasRecording = false;
  try {
    wasRecording = posthog.sessionRecordingStarted();
    posthog.stopSessionRecording();
  } catch {
    // analytics unavailable — still print
  }
  window.print();
  if (wasRecording) {
    // Resume later so replays keep working on this test branch
    window.setTimeout(() => {
      try {
        posthog.startSessionRecording();
      } catch {
        // ignore
      }
    }, 10_000);
  }
  return { ok: true, detail: `recording was ${wasRecording ? "on (paused 10s)" : "off"}; window.print() returned` };
};

let preparedFrame: HTMLIFrameElement | null = null;

/** Build (or rebuild) a hidden same-origin iframe holding just the reports. */
export const preparePrintFrame = (source: HTMLElement): void => {
  preparedFrame?.remove();
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  iframe.title = "print-frame";
  // Off-screen but laid out at A4 width (visibility:hidden can print blank)
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(buildPrintableHtml(source));
    doc.close();
  }
  preparedFrame = iframe;
};

export const disposePrintFrame = (): void => {
  preparedFrame?.remove();
  preparedFrame = null;
};

/** C: print from a pre-built hidden iframe (different WebKit code path). */
const printViaIframe = (source: HTMLElement): PrintStrategyResult => {
  const reused = !!preparedFrame && preparedFrame.isConnected;
  if (!reused) {
    preparePrintFrame(source);
  }
  const win = preparedFrame?.contentWindow;
  if (!win) return { ok: false, detail: "iframe has no contentWindow" };
  win.focus();
  win.print();
  return {
    ok: true,
    detail: `${reused ? "used prepared iframe" : "built iframe at tap time"}; iframe.contentWindow.print() returned`,
  };
};

/**
 * D: open the reports in a new browsing context and print there.
 * In an iOS Home Screen app a new window opens in an in-app browser sheet,
 * which is hosted by Safari (where printing works). The page also shows its
 * own "Tap to Print" button in case the automatic print is dropped.
 */
const printViaNewWindow = (source: HTMLElement): PrintStrategyResult => {
  const win = window.open("", "_blank");
  if (!win) return { ok: false, detail: "window.open returned null (popup blocked)" };
  win.document.open();
  win.document.write(buildPrintableHtml(source, { withPrintButton: true }));
  win.document.close();
  try {
    win.focus();
    win.print();
  } catch (err) {
    return { ok: true, detail: `window opened; auto print threw: ${String(err)} — use the Tap to Print button` };
  }
  return { ok: true, detail: "window opened; print() called (if no sheet, tap 'Tap to Print' in the new window)" };
};

/**
 * E: hand the reports to the iOS share sheet as an HTML file.
 * The share sheet has its own "Print" action that does not use window.print().
 */
const printViaShareFile = (source: HTMLElement): PrintStrategyResult => {
  const html = buildPrintableHtml(source);
  const file = new File([html], "repota-reports.html", { type: "text/html" });
  const data: ShareData = { files: [file], title: "Repota Reports" };
  if (typeof navigator.share !== "function") {
    return { ok: false, detail: "navigator.share not supported" };
  }
  if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
    return { ok: false, detail: "navigator.canShare(files) returned false" };
  }
  navigator.share(data).catch((err: unknown) => {
    // AbortError = user dismissed the sheet; not a failure of the strategy
    console.warn("[print] share failed:", err);
  });
  return { ok: true, detail: `share sheet requested (${Math.round(html.length / 1024)} KB)` };
};

export const PRINT_STRATEGIES: { id: PrintStrategyId; label: string; description: string }[] = [
  { id: "direct", label: "A. Direct print", description: "Current behaviour: window.print()" },
  {
    id: "pause-analytics",
    label: "B. Pause analytics + print",
    description: "Stops PostHog recording first (tests the 'network still busy' theory)",
  },
  { id: "iframe", label: "C. Hidden iframe print", description: "Prints a copy from an off-screen iframe" },
  {
    id: "new-window",
    label: "D. New window print",
    description: "Opens reports in a new window (in-app Safari sheet) and prints there",
  },
  { id: "share-file", label: "E. Share sheet → Print", description: "Shares an HTML file; choose Print in the sheet" },
];

export const runPrintStrategy = (
  id: PrintStrategyId,
  source: HTMLElement,
): PrintStrategyResult & { elapsedMs: number } => {
  const t0 = performance.now();
  const result = executeStrategy(id, source);
  return { ...result, elapsedMs: Math.round(performance.now() - t0) };
};

const executeStrategy = (id: PrintStrategyId, source: HTMLElement): PrintStrategyResult => {
  try {
    switch (id) {
      case "direct":
        return printDirect();
      case "pause-analytics":
        return printWithAnalyticsPaused();
      case "iframe":
        return printViaIframe(source);
      case "new-window":
        return printViaNewWindow(source);
      case "share-file":
        return printViaShareFile(source);
    }
  } catch (err) {
    return { ok: false, detail: `threw: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}` };
  }
};
