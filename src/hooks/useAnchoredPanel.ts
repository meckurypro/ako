// src/hooks/useAnchoredPanel.ts
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const EDGE = 16; // breathing room to the top of the screen and to the bottom chrome
const MIN_AVAILABLE = 120;

/**
 * Placement for every centred overlay panel (Modal, OptionsModal, DropdownMenu and the sheets built on them).
 *
 * The panel is centred on the screen when it opens, based on its natural height, and that TOP EDGE THEN STAYS WHERE
 * IT IS. If the content later grows (a list loads in, a section expands) the panel extends downward — never upward —
 * until it reaches the bottom navigation bar (or the screen's bottom margin where there isn't one), after which its
 * body scrolls. Re-measured only when the container itself resizes (rotation, keyboard), never because the content
 * changed, which is what keeps the top edge from jumping.
 *
 * Usage: put `containerRef` on the fixed full-screen wrapper (flex, justify-center, items-start, with
 * `pt-[env(safe-area-inset-top)]`), `panelRef` + `style` + `data-anchored-panel` on the card.
 */
export function useAnchoredPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    function measure() {
      if (!container || !panel) return;
      const cs = getComputedStyle(container);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const contentH = container.clientHeight - padTop - padBottom;

      // The bottom nav only matters while the keyboard is closed — when it's open the nav sits behind it.
      const keyboardOpen = document.documentElement.hasAttribute("data-kb-open");
      const navH = keyboardOpen ? 0 : document.getElementById("ako-bottom-nav")?.getBoundingClientRect().height ?? 0;
      const bottomReserve = Math.max(EDGE, navH + 12);

      const available = Math.max(MIN_AVAILABLE, contentH - EDGE - bottomReserve);

      // Natural height = what the panel would be with no cap at all.
      const previousMax = panel.style.maxHeight;
      panel.style.maxHeight = "none";
      const natural = panel.offsetHeight;
      panel.style.maxHeight = previousMax;

      const height = Math.min(natural, available);
      const top = Math.round(EDGE + (available - height) / 2);
      const maxHeight = Math.max(MIN_AVAILABLE, Math.floor(contentH - top - bottomReserve));

      setStyle((prev) =>
        prev.marginTop === top && prev.maxHeight === maxHeight && prev.visibility === "visible"
          ? prev
          : { marginTop: top, maxHeight, visibility: "visible" }
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return { containerRef, panelRef, style };
}
