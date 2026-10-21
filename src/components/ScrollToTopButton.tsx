// src/components/ScrollToTopButton.tsx
//
// App-wide "scroll to top" arrow. Mounted once by AppShell, so every page
// that scrolls gets it — no page needs to render its own.
//
// It sits at the exact spot of the floating chat button (see ChatFab in
// BottomNav) but one layer below it (z-30 vs the nav's z-40), so while the
// chat button is on screen it fully covers the arrow, and the arrow only
// shows once the chat button is gone — the nav auto-hiding on scroll-down,
// or a page where the chat button isn't shown. The arrow stays put when the
// nav slides away; it never moves with it.
//
// Position is derived from the bottom nav's measured height (#ako-bottom-nav)
// so it lines up with the chat button on any device/safe-area. Without a
// visible nav (desktop, or a page with none) it docks bottom-right instead.
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useHasPrimaryFloatingAction } from "../lib/floatingChrome";

// How far down the page (px, plain window.scrollY) before the arrow appears.
const SCROLL_TOP_THRESHOLD = 480;

// Chat button geometry (BottomNav): 56px square, right-4, 16px above the nav.
// The arrow is 44px, so centring it behind the chat button offsets it by
// (56 - 44) / 2 = 6px on both axes.
const FAB_RIGHT = 16;
const FAB_GAP = 16;
const CENTER_OFFSET = 6;

// Pages where the arrow would sit on top of a composer or has no purpose.
function isExcluded(pathname: string) {
  return (
    pathname.startsWith("/messages/") ||
    pathname.startsWith("/page-inbox/") ||
    pathname === "/compose" ||
    pathname === "/create" ||
    pathname.endsWith("/edit")
  );
}

export function ScrollToTopButton() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  // A screen with its own floating action (ProfilePage's "Back to post") owns the corner; no arrow beside it.
  const hasPrimaryAction = useHasPrimaryFloatingAction();

  useEffect(() => {
    function update() {
      setShow(window.scrollY > SCROLL_TOP_THRESHOLD);
      const nav = document.getElementById("ako-bottom-nav");
      // Nav is md:hidden — display:none on desktop, so don't align to it there.
      const navVisible = !!nav && getComputedStyle(nav).display !== "none";
      setNavHeight(navVisible ? nav.offsetHeight : 0);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  if (!show || hasPrimaryAction || isExcluded(pathname)) return null;

  const style =
    navHeight > 0
      ? { right: FAB_RIGHT + CENTER_OFFSET, bottom: navHeight + FAB_GAP + CENTER_OFFSET }
      : { right: 24, bottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" };

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={style}
      className="ako-pill-in fixed z-30 w-11 h-11 flex items-center justify-center bg-canvas border border-border text-ink rounded-full shadow-lg"
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
