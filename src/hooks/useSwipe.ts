import { useEffect, useRef, type RefObject } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  enabled?: boolean;
  targetRef?: RefObject<HTMLElement | null>;
}

const SWIPE_THRESHOLD = 72; // Minimum distance for swipe
const SWIPE_VELOCITY = 0.3; // Minimum velocity

function isFormInputElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function isSwipeIgnoredElement(target: EventTarget | null): boolean {
  if (isFormInputElement(target)) return true;
  return target instanceof HTMLElement && Boolean(target.closest('[data-swipe-ignore="true"]'));
}

export function useSwipe(handlers: SwipeHandlers) {
  const { enabled = true, targetRef } = handlers;
  const handlersRef = useRef(handlers);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    const target: Document | HTMLElement = targetRef?.current ?? document;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (isSwipeIgnoredElement(touchEvent.target)) {
        touchStart.current = null;
        return;
      }

      const touch = touchEvent.touches[0];
      if (!touch) return;
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: Event) => {
      if (!touchStart.current) return;

      const touchEvent = e as TouchEvent;
      const touch = touchEvent.changedTouches[0];
      if (!touch) {
        touchStart.current = null;
        return;
      }

      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const deltaTime = Math.max(Date.now() - touchStart.current.time, 1);

      const velocityX = Math.abs(deltaX) / deltaTime;
      const velocityY = Math.abs(deltaY) / deltaTime;

      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.8;
      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.8;

      if (isHorizontalSwipe) {
        if (Math.abs(deltaX) > SWIPE_THRESHOLD && velocityX > SWIPE_VELOCITY) {
          if (deltaX > 0) {
            handlersRef.current.onSwipeRight?.();
          } else {
            handlersRef.current.onSwipeLeft?.();
          }
        }
      } else if (isVerticalSwipe && Math.abs(deltaY) > SWIPE_THRESHOLD && velocityY > SWIPE_VELOCITY) {
        if (deltaY > 0) {
          handlersRef.current.onSwipeDown?.();
        } else {
          handlersRef.current.onSwipeUp?.();
        }
      }

      touchStart.current = null;
    };

    target.addEventListener("touchstart", handleTouchStart, { passive: true });
    target.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, targetRef]);
}
