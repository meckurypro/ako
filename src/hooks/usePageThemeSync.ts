// src/hooks/usePageThemeSync.ts
//
// Mounted once near the root (see App.tsx). Two jobs:
//
//   1. Keep .page-mode in sync with the real, server-confirmed identity
//      on every render — the source of truth for anything the cached
//      hint below can't cover (identity changed from another device/
//      tab, the cached hint was wrong, etc).
//   2. Cache the resolved mode to localStorage, which index.html's
//      inline pre-mount script reads to apply .page-mode BEFORE React
//      mounts on the next load — same trick useTheme.tsx already uses
//      for .dark. This is what actually closes the cold-load flash;
//      without it we'd only know the correct answer after this hook's
//      first run, which is always at least one query round-trip after
//      first paint.
//
// useLayoutEffect (not useEffect) so the class + meta-color update
// lands in the same commit as the identity data change, rather than a
// separate post-paint pass — matters most right after
// useSwitchActiveMode's mutation resolves, tightening the window
// between "LoadingOverlay would disappear" and "colors are correct"
// as much as this hook alone can (useSwitchActiveMode itself closes
// that gap directly rather than relying on this timing, but this is
// the fallback path for identity changes this hook didn't cause).
import { useLayoutEffect } from "react";
import { useActiveIdentity } from "./usePages";
import { syncThemeColorMeta } from "./useTheme";

const MODE_STORAGE_KEY = "ako-active-mode";

export function usePageThemeSync() {
  const { data: identity } = useActiveIdentity();
  const isPageMode = identity?.mode === "page";

  useLayoutEffect(() => {
    if (!identity) return; // still loading — don't overwrite the cached hint with a guess
    document.documentElement.classList.toggle("page-mode", isPageMode);
    syncThemeColorMeta();
    try {
      localStorage.setItem(MODE_STORAGE_KEY, isPageMode ? "page" : "personal");
    } catch {
      // localStorage unavailable (privacy mode) — cold-load flash-
      // prevention just doesn't apply for this session, no functional
      // impact otherwise.
    }
  }, [identity, isPageMode]);
}
