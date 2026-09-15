// src/hooks/useMediaQuery.ts
import { useEffect, useState } from "react";

/**
 * Reactive matchMedia hook — same pattern useTheme.tsx already uses for
 * prefers-color-scheme, generalized to any query. Used where a responsive
 * decision needs to affect what actually MOUNTS (not just what's visually
 * hidden via CSS) — e.g. Messages.tsx deciding whether the conversation
 * list should stay mounted alongside an open thread. Plain CSS `hidden
 * md:block` is preferred everywhere else; reach for this only when hiding
 * isn't enough and unmounting matters (avoiding background work on
 * mobile — realtime subscriptions, polling, etc).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Matches the `md` breakpoint AppShell/Sidebar/BottomNav use throughout
// (Tailwind's default 768px) — kept in one place so a future breakpoint
// change only has to happen here.
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
