// src/hooks/useLongPress.ts
import { useRef, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface LongPressOptions {
  onLongPress: (e: ReactPointerEvent) => void;
  onClick?: (e: ReactPointerEvent) => void;
  delay?: number; // ms
  moveThreshold?: number; // px — cancels the press if the pointer drifts past this (scroll intent)
}

/**
 * Custom long-press via pointer events — no gesture library in the
 * project, so this is hand-rolled. Cancels on pointer move past
 * `moveThreshold` (treats it as a scroll, not a hold) and on
 * pointerup/pointerleave/pointercancel.
 */
export function useLongPress({ onLongPress, onClick, delay = 450, moveThreshold = 10 }: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startPos.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      firedRef.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        if (navigator.vibrate) navigator.vibrate(15);
        onLongPress(e);
      }, delay);
    },
    [onLongPress, delay]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!startPos.current) return;
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > moveThreshold || dy > moveThreshold) clear();
    },
    [clear, moveThreshold]
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const wasLongPress = firedRef.current;
      clear();
      if (!wasLongPress) onClick?.(e);
    },
    [clear, onClick]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
