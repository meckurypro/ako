// src/hooks/useKeyboardInset.ts
import { useEffect, useState } from "react";

const STORAGE_KEY = "ako-keyboard-height";
const FALLBACK_HEIGHT = 320; // reasonable guess for the emoji tray before we've ever measured a real keyboard

/**
 * Everything the chat composer needs to stay glued above the on-screen
 * keyboard and swap smoothly with the emoji tray, all derived from
 * window.visualViewport — the one API iOS and Android both keep in
 * sync with the keyboard. CSS viewport units can't do this: 100dvh
 * tracks the browser's address bar showing/hiding but NOT the
 * keyboard on iOS Safari, so a layout pinned to it doesn't shrink
 * when the keyboard opens and its bottom (the sticky composer) ends
 * up stranded underneath the keyboard instead of sitting just above it.
 *
 * - viewportHeight: the page's actual visible height right now.
 * - insetHeight: how much of that shrinkage is the keyboard, live
 *   (0 when it's closed, animates as it opens/closes).
 * - lastKnownHeight: the keyboard's own height the last time it was
 *   genuinely open, persisted across reloads. The emoji tray sizes
 *   itself to this instead of an arbitrary vh guess, so it occupies
 *   exactly the space the keyboard would have — switching between the
 *   two never changes how much of the screen the message list gets,
 *   which is what makes the swap feel like one continuous panel
 *   instead of the layout re-jumping every time.
 */
export function useKeyboardInset() {
  const [viewportHeight, setViewportHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight
  );
  const [insetHeight, setInsetHeight] = useState(0);
  const [lastKnownHeight, setLastKnownHeight] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return stored > 100 ? stored : FALLBACK_HEIGHT;
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // very old browser — h-dvh's own fallback still applies

    function update() {
      setViewportHeight(vv!.height);
      const inset = Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop);
      setInsetHeight(inset);
      // A real keyboard is always well over 100px — filters out the
      // small deltas from the address bar showing/hiding so those
      // never get mistaken for a keyboard measurement.
      if (inset > 100) {
        setLastKnownHeight(inset);
        localStorage.setItem(STORAGE_KEY, String(inset));
      }
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return { viewportHeight, insetHeight, lastKnownHeight };
}
