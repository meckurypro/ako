// src/lib/mediaFade.ts
//
// Item 3: "When music or video plays on the app, audio should fade in
// and fade out. Fade should be in 0.005 seconds." A 5ms ramp is too
// short to sound like a "fade" the way a DJ crossfade would — its job
// is to remove the click/pop of snapping .volume straight from 0→1 or
// 1→0 (the same reason audioBus.ts ramps a gain node instead of
// setting it directly). Centralized here so post-music playback
// (MusicAttribution.tsx) and the full-screen media viewer's <video>
// (MediaViewer.tsx) both fade the same way instead of each hand-rolling
// its own requestAnimationFrame loop.

export const FADE_SECONDS = 0.005;

function rampVolume(element: HTMLMediaElement, from: number, to: number, seconds: number, onDone?: () => void) {
  const durationMs = Math.max(0, seconds * 1000);
  const start = performance.now();
  element.volume = Math.min(1, Math.max(0, from));

  function step(now: number) {
    // Element may have been unmounted/swapped mid-ramp (slide change,
    // scroll-out) — bail quietly rather than throwing on a detached node.
    if (!element.isConnected) return;
    const elapsed = now - start;
    const progress = durationMs === 0 ? 1 : Math.min(1, elapsed / durationMs);
    element.volume = Math.min(1, Math.max(0, from + (to - from) * progress));
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onDone?.();
    }
  }

  requestAnimationFrame(step);
}

/**
 * Ramps volume from its current value to `target` without touching
 * play/pause state — for muting/unmuting audio that's already playing.
 */
export function fadeVolumeTo(element: HTMLMediaElement | null | undefined, target: number, seconds = FADE_SECONDS): void {
  if (!element) return;
  rampVolume(element, element.volume, target, seconds);
}

/**
 * Starts playback with a fade-in from silence up to `targetVolume`.
 * Sets volume to 0 before calling play() so there's never a frame of
 * full-volume audio before the ramp takes over.
 */
export function fadeInAndPlay(
  element: HTMLMediaElement,
  targetVolume = 1,
  seconds = FADE_SECONDS
): Promise<void> {
  element.volume = 0;
  rampVolume(element, 0, targetVolume, seconds);
  return element.play();
}

/**
 * Fades volume down to 0, then pauses. Safe to call on an element
 * that's already paused, muted, or about to be removed from the DOM.
 */
export function fadeOutAndPause(element: HTMLMediaElement | null | undefined, seconds = FADE_SECONDS): void {
  if (!element) return;
  const from = element.volume;
  rampVolume(element, from, 0, seconds, () => {
    element.pause();
  });
}
