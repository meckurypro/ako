// src/components/ScrollToTop.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't reset scroll position on navigation the way a full
// page load does, so a new page can mount already scrolled partway down —
// whatever position the visitor left the previous page at. Most visible on
// ProfilePage: the avatar/name sit at the very top, so visitors coming
// from a scrolled-down feed land mid-profile and have to scroll back up to
// see who they're even looking at. This resets scroll on every route
// change, not just profile, since the same issue applies everywhere.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
