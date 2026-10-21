// src/hooks/useLeaveGuard.ts
//
// "You have unsaved progress" guard for create flows (Compose, CreateProject).
//
// While `when` is true, any in-app navigation to a different page — a link, the bottom nav, the Close
// button, the browser Back button — is held instead of happening, and `isBlocked` turns true so the screen can
// show <SaveProgressDialog>. The screen then settles it with one of:
//   proceed()  — let the held navigation happen (after saving a draft, or when the person chose Discard)
//   stay()     — drop the held navigation; the person keeps editing
//
// Closing or reloading the browser tab can't show our dialog, so that gets the browser's own "Leave site?"
// prompt instead.
//
// A screen that is about to navigate on its own after a SUCCESSFUL save/publish calls allowLeaving() first, so
// its own redirect (to the feed, the drafts list, ...) is never mistaken for walking away from unsaved work.
//
// Needs a data router (createBrowserRouter) — see App.tsx. useBlocker doesn't work under <BrowserRouter>.
import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

export function useLeaveGuard(when: boolean) {
  const whenRef = useRef(when);
  whenRef.current = when;
  const allowRef = useRef(false);

  // Only a change of PAGE counts. Same-path navigations (query string, location.state) and the history entries
  // overlays push at the same URL (see useBackDismiss) are not "leaving".
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      whenRef.current && !allowRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!when) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (allowRef.current) return;
      e.preventDefault();
      e.returnValue = ""; // required by some browsers to trigger the prompt
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  const proceed = useCallback(() => {
    if (blocker.state === "blocked") blocker.proceed();
  }, [blocker]);

  const stay = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  const allowLeaving = useCallback(() => {
    allowRef.current = true;
  }, []);

  return { isBlocked: blocker.state === "blocked", proceed, stay, allowLeaving };
}
