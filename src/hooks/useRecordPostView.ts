// src/hooks/useRecordPostView.ts
import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

// Posts already reported this session — a unique viewer counts once, so
// scrolling past the same card repeatedly never re-hits the backend.
const reported = new Set<string>();

const DWELL_MS = 1000; // must stay on screen this long to count as seen
const MIN_VISIBLE = 0.5; // at least half the card in view

/**
 * Counts a feed impression: when ≥50% of the card has been on screen for
 * ~1s, calls the record_post_view RPC (idempotent per user+post; the
 * author's own views are ignored server-side). Attach the returned ref to
 * the card's root element. The count shown on PostDetail comes from
 * get_post_view_count (see usePostViewCount), which unions these
 * impressions with post_views and reactions.
 */
export function useRecordPostView<T extends Element>(postId: string, enabled: boolean = true) {
  const { user } = useAuth();
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !user || !postId) return;
    const key = `${user.id}:${postId}`;
    if (reported.has(key)) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= MIN_VISIBLE) {
          if (timer) return;
          timer = setTimeout(async () => {
            reported.add(key);
            observer.disconnect();
            const { error } = await supabase.rpc("record_post_view", { p_post_id: postId });
            if (error) {
              reported.delete(key); // allow a retry next time it's seen
              console.error("Failed to record post view:", error);
            }
          }, DWELL_MS);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, MIN_VISIBLE] }
    );
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [postId, enabled, user]);

  return ref;
}
