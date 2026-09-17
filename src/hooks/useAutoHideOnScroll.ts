import { useEffect, useRef, useState } from "react";

// Mirrors the show/hide behavior apps like X use for their top app bar
// and bottom tab bar: scrolling down hides the bar, scrolling up (even
// a little) brings it right back, and it's always shown near the very
// top of the page so it doesn't flicker in and out while someone is
// just settling into a feed.
//
// `threshold` is how many pixels of scroll delta are needed before a
// direction change counts — this keeps small, jittery scroll events
// (rubber-banding, trackpad micro-scrolls, momentum settling) from
// flickering the bar in and out.
const SHOW_NEAR_TOP_PX = 8;

export function useAutoHideOnScroll(threshold = 6) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(typeof window !== "undefined" ? window.scrollY : 0);
  const ticking = useRef(false);

  useEffect(() => {
    function handleScroll() {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = Math.max(window.scrollY, 0);
        const delta = y - lastY.current;

        if (y <= SHOW_NEAR_TOP_PX) {
          setVisible(true);
        } else if (delta > threshold) {
          setVisible(false);
        } else if (delta < -threshold) {
          setVisible(true);
        }

        lastY.current = y;
        ticking.current = false;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return visible;
}
