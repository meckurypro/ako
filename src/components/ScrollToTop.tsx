// src/components/ScrollToTop.tsx
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// React Router doesn't reset scroll position on navigation the way a full
// page load does, so a new page can mount already scrolled partway down —
// whatever position the visitor left the previous page at. Most visible on
// ProfilePage: the avatar/name sit at the very top, so visitors coming
// from a scrolled-down feed land mid-profile and have to scroll back up to
// see who they're even looking at. This resets scroll on every route
// change, not just profile, since the same issue applies everywhere.
//
// But "every route change" used to include navigating *back* too — so
// tapping into a post from partway down the feed, then hitting back,
// dropped you at the very top of the feed instead of where you'd been
// reading. Scroll position per history entry (keyed by React Router's
// location.key, which is stable for a given entry — going back always
// returns the same key you left, even though the pathname is shared with
// other visits to the same route) fixes that: a forward navigation
// (PUSH/REPLACE) is a genuinely new page and still resets to the top; a
// back/forward navigation (POP) restores wherever that entry was left.
// In-memory only for the session, same approach as the pathStack in
// useSmartBack.ts — a hard reload starting fresh is fine here too.
const scrollPositions = new Map<string, number>();

export function ScrollToTop() {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();

  // Continuously record this entry's scroll position while it's the one
  // showing, rather than reading it once at the moment of leaving — by
  // the time an effect keyed on the *new* location runs, the page has
  // already swapped and window.scrollY no longer reflects where the
  // outgoing entry was scrolled to.
  useEffect(() => {
    function handleScroll() {
      scrollPositions.set(key, window.scrollY);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [key]);

  useEffect(() => {
    if (navigationType === "POP") {
      window.scrollTo(0, scrollPositions.get(key) ?? 0);
    } else {
      window.scrollTo(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, key, navigationType]);

  return null;
}
