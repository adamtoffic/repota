import { useEffect, useRef } from "react";

interface UseIdleTimerOptions {
  timeout: number; // milliseconds
  onIdle: () => void;
  enabled: boolean;
}

/**
 * Hook to detect user inactivity and trigger callback
 * Tracks mouse, keyboard, touch, and scroll events
 */
export function useIdleTimer({ timeout, onIdle, enabled }: UseIdleTimerOptions) {
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(onIdle, timeout);
    };

    // Events that indicate user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

    // Start initial timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [timeout, onIdle, enabled]);
}
