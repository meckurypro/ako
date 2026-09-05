// src/hooks/useTabState.ts
import { useSearchParams } from "react-router-dom";

/**
 * Drop-in replacement for `useState` on a page's tab selection —
 * except the value lives in the URL (`?tab=projects`) instead of
 * component state, so:
 *
 *  - Refreshing the page lands back on the exact tab the user was on
 *    (ProfilePage's Posts/Projects, Feed's For You/Top/Following,
 *    Discover's People/Posts, Search's Posts/People) instead of
 *    always resetting to the first tab.
 *  - Switching tabs never grows browser history — it's a `replace`,
 *    same reasoning as bottom-nav taps: tab-switching is lateral
 *    movement within a page, not a new "place" to step back through.
 *  - A shared link with `?tab=projects` already works (ProfilePage
 *    relied on this before); now it's the general mechanism instead
 *    of a one-off read-on-mount.
 *
 * The default tab is never written into the URL (kept out of
 * `?tab=posts` clutter) — only a non-default selection shows up
 * there, and an unrecognized/missing value silently falls back to
 * `defaultValue` rather than erroring.
 *
 * Multiple call sites can call `useSearchParams()` in the same page
 * (e.g. Feed already reads `?interest=`) — react-router keeps them
 * all reading the same live location, so this hook composes safely
 * alongside a page's own unrelated search params without clobbering
 * them.
 */
export function useTabState<T extends string>(
  values: readonly T[],
  defaultValue: T,
  paramName: string = "tab"
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(paramName);
  const current = raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : defaultValue;

  function setTab(next: T) {
    const updated = new URLSearchParams(searchParams);
    if (next === defaultValue) {
      updated.delete(paramName);
    } else {
      updated.set(paramName, next);
    }
    setSearchParams(updated, { replace: true });
  }

  return [current, setTab];
}
