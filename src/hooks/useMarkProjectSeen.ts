// src/hooks/useMarkProjectSeen.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Records that the current user has seen this project — powers the
 * Activity hub's "History" tab (see useViewHistory.ts). Same pattern
 * as useMarkPostSeen for posts, backed by public.project_views
 * (mirrors post_views exactly — see the migration SQL). No-ops if the
 * viewer is the project's own owner.
 *
 * Upserts on (user_id, project_id) so a re-view bumps viewed_at,
 * giving most-recently-viewed order in History rather than
 * first-ever-viewed order.
 */
export function useMarkProjectSeen(projectId: string, ownerId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !user || !ownerId) return;
    if (user.id === ownerId) return; // don't track owners viewing their own project

    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/project_views?on_conflict=user_id,project_id`,
          {
            method: "POST",
            keepalive: true,
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`,
              Prefer: "resolution=merge-duplicates,return=minimal",
            },
            body: JSON.stringify({
              user_id: user.id,
              project_id: projectId,
              viewed_at: new Date().toISOString(),
            }),
          }
        );

        if (!res.ok && res.status !== 409) {
          console.error("Failed to mark project as seen:", await res.text());
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["view-history"] });
      } catch (err) {
        console.error("Failed to mark project as seen:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, user, ownerId, queryClient]);
}
