// src/components/PathHistoryTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pushPathToHistory } from "../hooks/useSmartBack";

// Feeds useSmartBack's in-memory history stack — mounted once near
// the router root (see App.tsx), same mounting pattern as
// ScrollToTop. Renders nothing; it only exists to observe route
// changes.
export function PathHistoryTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    pushPathToHistory(pathname);
  }, [pathname]);

  return null;
}
