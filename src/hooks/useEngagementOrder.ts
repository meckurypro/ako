// src/hooks/useEngagementOrder.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export type SecondaryActionKey =
  | "support"
  | "disagree"
  | "pushback"
  | "share"
  | "gift"
  | "save";

const ALL_SECONDARY: SecondaryActionKey[] = [
  "support",
  "disagree",
  "pushback",
  "share",
  "gift",
  "save",
];

// Tiebreaker order for brand-new users (all counts = 0) so the tray
// has a stable, sensible default layout instead of arbitrary iteration order.
const DEFAULT_ORDER: SecondaryActionKey[] = [
  "support",
  "gift",
  "save",
  "disagree",
  "pushback",
  "share",
];

type UsageCounts = Record<SecondaryActionKey, number>;

/**
 * Ranks the 6 non-Like/Dislike post actions by how often the current
 * user has used each one, most-used first.
 *
 * Usage sources:
 *   support / disagree / pushback  →  comments.stance authored by this user
 *   share                          →  reactions of type "share"
 *   gift                           →  gifts.sender_id
 *   save                           →  bookmarks.user_id
 *
 * PostCard takes the top 3 for the visible tray (positions 3-5, after
 * the fixed Like and Dislike) and puts the remaining 3 in the ⋯ menu.
 *
 * Cached for 5 minutes — usage patterns shift slowly and this runs on
 * every PostCard mount, so we don't want a round-trip per card.
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
        share: 0,
        gift: 0,
        save: 0,
      };

      const [stanceRes, shareRes, giftRes, saveRes] = await Promise.all([
        // Support/Disagree/Pushback live as stance-tagged comments —
        // count each stance this user has authored, across all posts.
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
          .eq("type", "share"),

        supabase
          .from("gifts")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", user!.id),

        supabase
          .from("bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
      ]);

      if (stanceRes.error) throw stanceRes.error;
      if (shareRes.error) throw shareRes.error;
      if (giftRes.error) throw giftRes.error;
      if (saveRes.error) throw saveRes.error;

      for (const row of stanceRes.data ?? []) {
        if (row.stance === "support") counts.support++;
        else if (row.stance === "disagree") counts.disagree++;
        else if (row.stance === "pushback") counts.pushback++;
      }
      counts.share = shareRes.count ?? 0;
      counts.gift = giftRes.count ?? 0;
      counts.save = saveRes.count ?? 0;

      return [...ALL_SECONDARY].sort((a, b) => {
        const diff = counts[b] - counts[a];
        // Break ties with the stable default order so the tray
        // doesn't jitter when two actions have the same count.
        return diff !== 0 ? diff : DEFAULT_ORDER.indexOf(a) - DEFAULT_ORDER.indexOf(b);
      });
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
