// src/components/PrintDiagnostics.tsx
// On-device print diagnostics for the iOS 27 Home Screen print issue.
// Installed web apps have no URL bar or console, so everything is logged
// on screen with a "Copy log" button. See docs/reports/ios27-pwa-print-failure.md.

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Trash2, X } from "lucide-react";
import {
  PRINT_STRATEGIES,
  disposePrintFrame,
  getUserActivation,
  isIOSDevice,
  isStandaloneDisplay,
  preparePrintFrame,
  runPrintStrategy,
  type PrintStrategyId,
} from "../utils/printStrategies";
import { markPrintStarted } from "../utils/printHandler";

const DIALOG_WATCHDOG_MS = 2500;

interface PrintDiagnosticsProps {
  getSource: () => HTMLElement | null;
  /** Changes whenever the printable content changes, to rebuild the iframe copy */
  contentKey: string;
  onClose: () => void;
}

const stamp = () => {
  const d = new Date();
  return `${d.toLocaleTimeString([], { hour12: false })}.${String(d.getMilliseconds()).padStart(3, "0")}`;
};

const environmentLines = (): string[] => {
  const nav = navigator as Navigator & { standalone?: boolean };
  return [
    `UA: ${navigator.userAgent}`,
    `iOS=${isIOSDevice()} standalone=${isStandaloneDisplay()} navigator.standalone=${String(nav.standalone)}`,
    `readyState=${document.readyState} visibility=${document.visibilityState} hasFocus=${document.hasFocus()}`,
    `userActivation API: ${getUserActivation()}`,
    `share=${typeof navigator.share === "function"} canShare=${typeof navigator.canShare === "function"}`,
  ].map((line) => `${stamp()}  ${line}`);
};

export function PrintDiagnostics({ getSource, contentKey, onClose }: PrintDiagnosticsProps) {
  const [lines, setLines] = useState<string[]>(environmentLines);
  const [copied, setCopied] = useState(false);
  const lastAttemptRef = useRef<{ id: PrintStrategyId; at: number; sawPrint: boolean } | null>(null);

  const log = useCallback((msg: string) => {
    setLines((prev) => [...prev, `${stamp()}  ${msg}`]);
  }, []);

  // Print lifecycle listeners (logging only happens inside event callbacks)
  useEffect(() => {
    const markSeen = () => {
      if (lastAttemptRef.current) lastAttemptRef.current.sawPrint = true;
    };
    const onBeforePrint = (e: Event) => {
      if (e.isTrusted) markSeen();
      log(`EVENT beforeprint (trusted=${e.isTrusted})`);
    };
    const onAfterPrint = (e: Event) => log(`EVENT afterprint (trusted=${e.isTrusted})`);
    const mql = window.matchMedia("print");
    const onMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) markSeen();
      log(`EVENT matchMedia(print) matches=${e.matches}`);
    };
    const onVisibility = () => log(`EVENT visibilitychange -> ${document.visibilityState}`);
    const onBlur = () => log("EVENT window blur");
    const onFocus = () => log("EVENT window focus");
    const onPageHide = () => log("EVENT pagehide");
    const onError = (e: ErrorEvent) => log(`EVENT error: ${e.message}`);

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    mql.addEventListener("change", onMediaChange);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      mql.removeEventListener("change", onMediaChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("error", onError);
    };
  }, [log]);

  // Pre-build the hidden iframe so strategy C does no work at tap time.
  // Rebuilt whenever the printable content changes (ink mode, filter, students).
  // (Result is reported in strategy C's log line, not here.)
  useEffect(() => {
    const source = getSource();
    if (source) {
      try {
        preparePrintFrame(source);
      } catch (err) {
        console.warn("[print] iframe prepare failed:", err);
      }
    }
    return () => disposePrintFrame();
  }, [getSource, contentKey]);

  // Must stay fully synchronous up to runPrintStrategy() to keep the user gesture
  const handleRun = (id: PrintStrategyId) => {
    const source = getSource();
    if (!source) {
      log(`[${id}] no printable content found`);
      return;
    }
    log(
      `[${id}] TAP userActivation(${getUserActivation()}) readyState=${document.readyState} hasFocus=${document.hasFocus()}`,
    );
    lastAttemptRef.current = { id, at: performance.now(), sawPrint: false };
    markPrintStarted();
    const t0 = performance.now();
    const result = runPrintStrategy(id, source);
    const elapsed = Math.round(performance.now() - t0);
    log(`[${id}] ${result.ok ? "OK" : "FAIL"} in ${elapsed}ms: ${result.detail}`);

    window.setTimeout(() => {
      const attempt = lastAttemptRef.current;
      if (attempt && attempt.id === id && !attempt.sawPrint) {
        log(
          id === "direct" || id === "pause-analytics"
            ? `[${id}] ⚠ no print activity detected within ${DIALOG_WATCHDOG_MS}ms`
            : `[${id}] (main page saw no print event — normal for this option; note whether a sheet appeared)`,
        );
      }
    }, DIALOG_WATCHDOG_MS);
  };

  const handleCopy = () => {
    const text = lines.join("\n");
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => log("copy failed — long-press the log to select"));
    } else {
      log("clipboard API unavailable — long-press the log to select");
    }
  };

  return (
    <div className="mx-auto mt-3 max-w-5xl rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-left shadow-sm print:hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-indigo-900">Print diagnostics (test build)</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close diagnostics"
          className="rounded-full p-1 text-indigo-700 hover:bg-indigo-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-2 text-xs text-indigo-800">
        Try each option. Note which ones open a print or share sheet (cancel it, then try the
        next). Then tap <b>Copy log</b> and send it back with your notes.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRINT_STRATEGIES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleRun(s.id)}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-left active:scale-[0.98]"
          >
            <span className="block text-sm font-bold text-indigo-900">{s.label}</span>
            <span className="block text-xs text-gray-600">{s.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="bg-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy log"}
        </button>
        <button
          type="button"
          onClick={() => setLines([])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <pre
        className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900 p-2 font-mono text-[11px] leading-snug whitespace-pre-wrap text-green-200 select-text"
        data-testid="print-diagnostics-log"
      >
        {lines.join("\n") || "(no log yet)"}
      </pre>
    </div>
  );
}
