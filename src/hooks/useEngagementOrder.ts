// src/hooks/useEngagementOrder.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

// 'share' removed — share now lives as a dedicated header button on PostCard.
// 'dislike' added — it's now part of the scrollable tray, ranked by usage.
// 'reshare' added — no longer a fixed left-side slot; ranked like everything
// else now that only Like (left) and Share (right) stay fixed.
export type SecondaryActionKey =
  | "support"
  | "disagree"
  | "pushback"
  | "dislike"
  | "gift"
  | "save"
  | "reshare";

const ALL_SECONDARY: SecondaryActionKey[] = [
  "support",
  "disagree",
  "pushback",
  "dislike",
  "gift",
  "save",
  "reshare",
];

// Tiebreaker for brand-new users (all counts = 0).
const DEFAULT_ORDER: SecondaryActionKey[] = [
  "support",
  "reshare",
  "gift",
  "save",
  "disagree",
  "pushback",
  "dislike",
];

type UsageCounts = Record<SecondaryActionKey, number>;

/**
 * Ranks the 6 secondary post actions by how often the current user
 * has used each one, most-used first.
 *
 * Usage sources:
 *   support / disagree / pushback  →  comments.stance authored by this user
 *   dislike                        →  reactions of type "dislike"
 *   gift                           →  gifts.sender_id
 *   save                           →  bookmarks.user_id
 *   reshare                        →  posts authored by this user with
 *                                      reshared_post_id set (plain reshares
 *                                      and quotes both count as "resharing")
 *
 * PostCard places Like first (fixed), then streams all 7 in this ranked
 * order into the horizontally-scrollable tray. The first few are visible;
 * the rest reveal on swipe. Cached 5 min — usage shifts slowly.
 */
export function useEngagementOrder() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["engagement-order", user?.id],
    queryFn: async (): Promise<SecondaryActionKey[]> => {
      const counts: UsageCounts = {
        support: 0,
        disagree: 0,
        pushback: 0,
        dislike: 0,
        gift: 0,
        save: 0,
        reshare: 0,
      };

      const [stanceRes, dislikeRes, giftRes, saveRes, reshareRes] = await Promise.all([
        // Support/Disagree/Pushback are stance-tagged comments.
        supabase
          .from("comments")
          .select("stance")
          .eq("author_id", user!.id)
          .eq("is_deleted", false)
          .not("stance", "is", null),

        supabase
          .from("reactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("type", "dislike"),

        supabase
          .from("gifts")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", user!.id),

        supabase
          .from("bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),

        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user!.id)
          .not("reshared_post_id", "is", null),
      ]);

      if (stanceRes.error) throw stanceRes.error;
      if (dislikeRes.error) throw dislikeRes.error;
      if (giftRes.error) throw giftRes.error;
      if (saveRes.error) throw saveRes.error;
      if (reshareRes.error) throw reshareRes.error;

      for (const row of stanceRes.data ?? []) {
        if (row.stance === "support") counts.support++;
        else if (row.stance === "disagree") counts.disagree++;
        else if (row.stance === "pushback") counts.pushback++;
      }
      counts.dislike = dislikeRes.count ?? 0;
      counts.gift = giftRes.count ?? 0;
      counts.save = saveRes.count ?? 0;
      counts.reshare = reshareRes.count ?? 0;

      return [...ALL_SECONDARY].sort((a, b) => {
        const diff = counts[b] - counts[a];
        return diff !== 0 ? diff : DEFAULT_ORDER.indexOf(a) - DEFAULT_ORDER.indexOf(b);
      });
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
