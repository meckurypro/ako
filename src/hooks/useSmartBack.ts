// src/hooks/useSmartBack.ts
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Routes under src/pages/auth/ — landing "back" onto any of these
// means there's nothing meaningful to return to (the user followed a
// shared link while logged out, verified an email, reset a password,
// came back through an OAuth callback, etc.), not genuine prior
// in-app content. In that case "back" should land on the feed
// instead of re-showing an auth screen.
const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/verify-email",
  "/reset-password",
  "/auth/callback",
]);

// A tiny in-memory stack of visited pathnames for this SPA session,
// pushed to by <PathHistoryTracker /> (mounted once near the router
// root in App.tsx). Deliberately not persisted — a hard reload starts
// a fresh stack, which is fine since there's nothing in-app to go
// "back" to in that case anyway.
let pathStack: string[] = [];

export function pushPathToHistory(pathname: string) {
  if (pathStack[pathStack.length - 1] === pathname) return; // ignore no-op pushes (e.g. a replace)
  pathStack.push(pathname);
}

function previousPath(): string | undefined {
  return pathStack[pathStack.length - 2];
}

// Every page's back arrow (or close/dismiss button acting as one)
// should call this instead of `navigate(-1)` directly:
//  - Already on the feed? There's nothing to go back to — refresh it
//    in place instead of navigating anywhere.
//  - Would land on an auth page (login/signup/etc)? Skip it — send
//    the user to the feed instead, since an auth screen is never a
//    meaningful "back" destination once they're using the app.
//  - Otherwise, ordinary back navigation, unchanged.
export function useSmartBack() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.pathname === "/feed") {
      // history.go(0) — a plain refresh of the current page, not a
      // client-side re-render — is the simplest way to guarantee an
      // actual reset regardless of whatever local state Feed itself
      // is holding (accumulated pages, scroll position, active tab).
      navigate(0);
      return;
    }

    const prev = previousPath();
    if (!prev || AUTH_PATHS.has(prev)) {
      navigate("/feed", { replace: true });
      return;
    }

    navigate(-1);
  }, [location.pathname, navigate]);
}
