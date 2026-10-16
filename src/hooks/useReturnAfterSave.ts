// src/hooks/useReturnAfterSave.ts
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getPreviousPath } from "./useSmartBack";

interface ReturnOptions {
  /**
   * Where to land when there is no page to go back to (the editor was
   * opened from a shared link, a fresh load, or via an auth screen).
   */
  fallback?: string;
  /**
   * Rewrites the previous page's path before landing on it. For saves
   * that change a URL the previous page lives at — e.g. a new username
   * turns /profile/old into a dead link. Return a new path to replace
   * the old entry, or undefined to keep ordinary back navigation.
   */
  rewritePrevious?: (previousPath: string) => string | undefined;
}

/**
 * The one way every "save / publish, then leave" screen exits.
 *
 * After a successful write the person should land back on the page
 * they came from, showing what they just changed — not on the editor
 * they just finished with, and not on a cached copy of the old data.
 *
 *  1. Every cached query is marked stale, so whichever page we land
 *     on refetches on mount rather than trusting what it cached
 *     before the edit (a project's status, for instance, is shown in
 *     lists, feeds, embeds and search, not just on its own page).
 *     Mutation hooks should still await a refetch of the keys they
 *     know about *before* resolving, so the page paints fresh data on
 *     its first frame — this is the safety net for everything else.
 *  2. Navigation is ordinary back navigation, so the history stack
 *     stays tidy — the editor isn't left behind the back button.
 */
export function useReturnAfterSave() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useCallback(
    async ({ fallback = "/feed", rewritePrevious }: ReturnOptions = {}) => {
      // refetchType "none": mark stale only. Refetching here would
      // hit every query still mounted on the editor for no reason.
      await queryClient.invalidateQueries({ refetchType: "none" });

      const previous = getPreviousPath();
      if (!previous) {
        navigate(fallback, { replace: true });
        return;
      }

      const rewritten = rewritePrevious?.(previous);
      if (rewritten && rewritten !== previous) {
        navigate(rewritten, { replace: true });
        return;
      }

      navigate(-1);
    },
    [navigate, queryClient]
  );
}
