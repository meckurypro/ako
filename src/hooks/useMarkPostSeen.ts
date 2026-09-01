// src/hooks/useMarkPostSeen.ts  (pulled out of PostDetail.tsx for clarity)
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Records that the current user has seen this post — powers the
 * unseen-post "ring" on chat avatars (see useUnseenPosts.ts). Fires
 * once per postId/user, silently no-ops on conflict (already seen)
 * or if the viewer is the post's own author.
 *
 * Uses a raw `fetch` with `keepalive: true` instead of the
 * supabase-js client so the write survives a fast back-navigation
 * on mobile — without keepalive, a request that's still in flight
 * when the user backs out can get cut off, leaving the ring stuck
 * "unseen" even though the user did view the post.
 */
export function useMarkPostSeen(postId: string, authorId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!postId || !user || !authorId) return;
    if (user.id === authorId) return; // don't track authors viewing their own post

    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/post_views`,
          {
            method: "POST",
            keepalive: true,
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`,
              // ignore-duplicates ~= upsert onConflict + ignoreDuplicates
              Prefer: "resolution=ignore-duplicates,return=minimal",
            },
            body: JSON.stringify({ user_id: user.id, post_id: postId }),
          }
        );

        if (!res.ok && res.status !== 409) {
          console.error("Failed to mark post as seen:", await res.text());
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["unseen-posts"] });
      } catch (err) {
        console.error("Failed to mark post as seen:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, user, authorId, queryClient]);
}
