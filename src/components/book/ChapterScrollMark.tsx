// src/components/book/ChapterScrollMark.tsx
// A faint vertical mark on the left edge that shows where you are in the chapter. It appears only while
// the reader is scrolling and fades a moment after the pointer or finger lets go (and any glide stops).
// The track has a fixed length; the mark is shorter in a long chapter and longer in a short one, so its
// size tells you what kind of chapter you're in before you've read it.
// Updates go straight to the DOM (no re-render per scroll event).
import { useCallback, useEffect, useRef } from "react";

export const MARK_TRACK_H = 168;
const MARK_MIN_H = 14;
const HIDE_AFTER_MS = 500;

export function useChapterScrollMark() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const user = useRef(false); // set by a real scroll gesture (touch, wheel, keys, drag), cleared once hidden
  const timer = useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const setOpacity = (v: number, ms: number) => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.transition = `opacity ${ms}ms ease-out`;
    el.style.opacity = String(v);
  };
  const scheduleHide = useCallback(() => {
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      user.current = false;
      setOpacity(0, 260);
    }, HIDE_AFTER_MS);
  }, []);

  useEffect(() => clearTimer, []);

  /** Feed every scroll event of the chapter's scroller. */
  const onScroll = useCallback(
    (el: HTMLElement) => {
      const range = el.scrollHeight - el.clientHeight;
      if (range <= 0 || el.scrollHeight <= 0) {
        setOpacity(0, 0); // the whole chapter fits on screen: nothing to track
        return;
      }
      const f = Math.min(1, Math.max(0, el.scrollTop / range));
      const h = Math.min(MARK_TRACK_H, Math.max(MARK_MIN_H, (MARK_TRACK_H * el.clientHeight) / el.scrollHeight));
      const thumb = thumbRef.current;
      if (thumb) {
        thumb.style.height = `${h}px`;
        thumb.style.transform = `translateY(${f * (MARK_TRACK_H - h)}px)`;
      }
      if (!user.current) return;
      setOpacity(1, 120);
      if (!down.current) scheduleHide();
    },
    [scheduleHide]
  );

  /** Wheel, touch, keys and pointer drags all count as the reader scrolling. */
  const gesture = useCallback(() => {
    user.current = true;
  }, []);
  const pointerDown = useCallback(() => {
    down.current = true;
    user.current = true;
    clearTimer();
  }, []);
  const pointerUp = useCallback(() => {
    down.current = false;
    if (user.current) scheduleHide();
  }, [scheduleHide]);

  /** A new chapter starts with the mark hidden. */
  const reset = useCallback(() => {
    clearTimer();
    down.current = false;
    user.current = false;
    setOpacity(0, 0);
    if (thumbRef.current) thumbRef.current.style.transform = "translateY(0)";
  }, []);

  return { wrapRef, thumbRef, onScroll, gesture, pointerDown, pointerUp, reset };
}

export function ChapterScrollMark({ mark, color, top }: { mark: ReturnType<typeof useChapterScrollMark>; color: string; top: string }) {
  return (
    <div
      ref={mark.wrapRef}
      aria-hidden="true"
      className="pointer-events-none absolute z-10"
      style={{ left: 5, top, width: 3, height: MARK_TRACK_H, opacity: 0 }}
    >
      {/* Track: barely there. */}
      <div style={{ position: "absolute", left: 1, top: 0, bottom: 0, width: 1, borderRadius: 1, background: color, opacity: 0.16 }} />
      {/* Mark: where you are. */}
      <div ref={mark.thumbRef} style={{ position: "absolute", left: 0, top: 0, width: 3, height: MARK_TRACK_H, borderRadius: 2, background: color, opacity: 0.5, willChange: "transform" }} />
    </div>
  );
}
