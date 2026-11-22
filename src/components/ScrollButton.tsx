import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { triggerHaptic } from "../utils/iosInteraction";

export interface ScrollButtonProps {
  /**
   * Optional CSS selector for an inner scrollable region (e.g. virtualized tables) tracked
   * alongside `window` via capture-phase scroll events.
   */
  scrollTargetSelector?: string;
  /**
   * Reserves clearance above the mobile bottom navigation bar (`bottom-safe-nav`).
   * Pass `false` on shell-free routes like `/print`.
   */
  hasBottomNav?: boolean;
  /**
   * Optional compact non-PII position label rendered above the capsule (e.g. `"4 / 32"`).
   */
  statusLabel?: string;
  /** Scroll offset in pixels required before showing the navigator. */
  showThreshold?: number;
}

interface ScrollState {
  isVisible: boolean;
  isAtTop: boolean;
  isAtBottom: boolean;
  progress: number;
}

const EDGE_TOLERANCE_PX = 24;
const MIN_SCROLLABLE_SPAN_PX = 200;
const IDLE_DIM_MS = 2200;

const INITIAL_SCROLL_STATE: ScrollState = {
  isVisible: false,
  isAtTop: true,
  isAtBottom: false,
  progress: 0,
};

function getPreferredBehavior(): ScrollBehavior {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "auto";
    }
  }
  return "smooth";
}

function isUsableScrollElement(el: HTMLElement | null): el is HTMLElement {
  return Boolean(
    el && el.isConnected && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 40,
  );
}

/**
 * Frosted dual-action scroll navigator (`↑` | progress | `↓`) with inner-region tracking,
 * idle dimming, reduced-motion support, and optional page-position badge.
 */
export function ScrollButton({
  scrollTargetSelector,
  hasBottomNav = true,
  statusLabel,
  showThreshold = 160,
}: ScrollButtonProps) {
  const [scrollState, setScrollState] = useState<ScrollState>(INITIAL_SCROLL_STATE);
  const [isActiveScroll, setIsActiveScroll] = useState(false);

  const activeTargetRef = useRef<"window" | HTMLElement>("window");
  const rafIdRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const syncMetrics = () => {
      let target = activeTargetRef.current;

      if (target !== "window" && !isUsableScrollElement(target)) {
        target = "window";
        activeTargetRef.current = "window";
      }

      if (target === "window" && window.scrollY <= 20 && scrollTargetSelector) {
        const candidates = document.querySelectorAll<HTMLElement>(scrollTargetSelector);
        for (const candidate of candidates) {
          if (isUsableScrollElement(candidate) && candidate.scrollTop > showThreshold) {
            target = candidate;
            activeTargetRef.current = candidate;
            break;
          }
        }
      }

      const scrollTop = target === "window" ? window.scrollY : target.scrollTop;
      const clientHeight = target === "window" ? window.innerHeight : target.clientHeight;
      const scrollHeight =
        target === "window" ? document.documentElement.scrollHeight : target.scrollHeight;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0;

      const next: ScrollState = {
        isVisible: maxScroll > MIN_SCROLLABLE_SPAN_PX && scrollTop > showThreshold,
        isAtTop: scrollTop <= EDGE_TOLERANCE_PX,
        isAtBottom: maxScroll <= 0 || scrollTop >= maxScroll - EDGE_TOLERANCE_PX,
        progress,
      };

      setScrollState((prev) =>
        prev.isVisible === next.isVisible &&
        prev.isAtTop === next.isAtTop &&
        prev.isAtBottom === next.isAtBottom &&
        Math.abs(prev.progress - next.progress) < 0.01
          ? prev
          : next,
      );
    };

    const scheduleSync = (markActive = false) => {
      if (markActive) {
        setIsActiveScroll(true);
        if (idleTimerRef.current !== null) {
          window.clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = window.setTimeout(() => {
          setIsActiveScroll(false);
          idleTimerRef.current = null;
        }, IDLE_DIM_MS);
      }

      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        syncMetrics();
      });
    };

    const handleWindowScroll = () => {
      activeTargetRef.current = "window";
      scheduleSync(true);
    };

    const handleDocumentScrollCapture = (event: Event) => {
      const target = event.target;
      if (
        target === document ||
        target === document.documentElement ||
        target === document.body
      ) {
        activeTargetRef.current = "window";
        scheduleSync(true);
        return;
      }

      if (scrollTargetSelector && target instanceof HTMLElement) {
        const matched = target.matches(scrollTargetSelector)
          ? target
          : target.closest<HTMLElement>(scrollTargetSelector);
        if (matched && isUsableScrollElement(matched)) {
          activeTargetRef.current = matched;
          scheduleSync(true);
        }
      }
    };

    const handleResize = () => {
      scheduleSync(false);
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    document.addEventListener("scroll", handleDocumentScrollCapture, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", handleResize, { passive: true });
    syncMetrics();

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      document.removeEventListener("scroll", handleDocumentScrollCapture, { capture: true });
      window.removeEventListener("resize", handleResize);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [scrollTargetSelector, showThreshold]);

  const scrollToEdge = (edge: "top" | "bottom") => {
    triggerHaptic("light");
    const behavior = getPreferredBehavior();
    const target = activeTargetRef.current;

    if (target !== "window" && isUsableScrollElement(target)) {
      const destination = edge === "top" ? 0 : target.scrollHeight;
      if (typeof target.scrollTo === "function") {
        target.scrollTo({ top: destination, behavior });
      } else {
        target.scrollTop = destination;
      }
      if (edge === "top" && window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior });
      }
      return;
    }

    const destination = edge === "top" ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({ top: destination, behavior });
  };

  const { isVisible, isAtTop, isAtBottom, progress } = scrollState;
  const bottomPositionClass = hasBottomNav
    ? "bottom-safe-nav"
    : "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] md:bottom-6";
  const visibilityClass = !isVisible
    ? "pointer-events-none translate-y-3 opacity-0"
    : `translate-y-0 ${isActiveScroll ? "opacity-100" : "opacity-75 hover:opacity-100 focus-within:opacity-100"}`;

  return (
    <div
      aria-hidden={!isVisible}
      className={`fixed right-4 z-30 flex flex-col items-end gap-1.5 transition-all duration-200 md:right-6 print:hidden ${bottomPositionClass} ${visibilityClass}`}
    >
      {statusLabel && (
        <div className="text-secondary rounded-full border border-white/80 bg-white/75 px-2.5 py-1 text-[11px] font-bold tracking-tight tabular-nums shadow-[0_6px_20px_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-[180%] dark:border-white/[0.14] dark:bg-[#131926]/75 dark:shadow-[0_8px_24px_rgba(0,0,0,0.55),inset_0_1px_0.5px_rgba(255,255,255,0.18)]">
          {statusLabel}
        </div>
      )}

      <div
        role="group"
        aria-label="Quick scroll navigation"
        className="flex w-10 flex-col items-center overflow-hidden rounded-full border border-white/80 bg-white/75 p-0.5 shadow-[0_8px_28px_rgba(15,23,42,0.14),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-2xl backdrop-saturate-[180%] dark:border-white/[0.14] dark:bg-[#131926]/75 dark:shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_0.5px_rgba(255,255,255,0.18)]"
      >
        <button
          type="button"
          onClick={() => scrollToEdge("top")}
          disabled={isAtTop || !isVisible}
          tabIndex={isVisible ? 0 : -1}
          aria-label="Scroll to top"
          title="Back to top"
          className="text-main hover:bg-subtle hover:text-primary-text flex h-9 w-full cursor-pointer items-center justify-center rounded-t-full transition-colors active:scale-90 disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>

        <div
          aria-hidden="true"
          className="bg-border-strong/60 my-0.5 h-0.5 w-5 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary-text h-full rounded-full transition-[width] duration-100"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <button
          type="button"
          onClick={() => scrollToEdge("bottom")}
          disabled={isAtBottom || !isVisible}
          tabIndex={isVisible ? 0 : -1}
          aria-label="Scroll to bottom"
          title="Jump to bottom"
          className="text-main hover:bg-subtle hover:text-primary-text flex h-9 w-full cursor-pointer items-center justify-center rounded-b-full transition-colors active:scale-90 disabled:pointer-events-none disabled:opacity-30"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
