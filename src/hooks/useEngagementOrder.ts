// src/hooks/useEngagementOrder.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export type EngagementActionKey =
  | "like"
  | "dislike"
  | "support"
  | "disagree"
  | "pushback"
  | "share"
  | "bookmark"
  | "gift";

// Matches the product mockup exactly: Like, Dislike, Support,
// Disagree, Pushback in the always-visible row; Share, Bookmark,
// Gift tucked into the kebab menu. This doubles as the fallback
// order for a user with no usage history yet, and for the moment
// before get_my_engagement_counts() is deployed/reachable.
const DEFAULT_ORDER: EngagementActionKey[] = [
  "like",
  "dislike",
  "support",
  "disagree",
  "pushback",
  "share",
  "bookmark",
  "gift",
];

const VISIBLE_COUNT = 5;

/**
 * Orders the 8 engagement actions by how often THIS user actually
 * uses each one — most-used first — so the always-visible row on a
 * post shows a given user's 5 most-used actions, left-to-right from
 * most- to least-used of that top 5. The rest live in the kebab menu.
 *
 * Backed by the get_my_engagement_counts() SQL function, which counts:
 *   - like/dislike/share  -> reactions.type, reactions.user_id
 *   - bookmark             -> bookmarks.user_id
 *   - support/disagree/pushback -> comments.stance, comments.author_id
 *   - gift                 -> gifts.sender_id
 *
 * If the RPC call fails for any reason (not deployed yet, offline,
 * etc.) this quietly falls back to DEFAULT_ORDER so the row still
 * renders something sensible instead of breaking.
 */
export function useEngagementOrder() {
  const { user } = useAuth();

  const { data: counts } = useQuery({
    queryKey: ["engagement-order", user?.id],
    queryFn: async (): Promise<Record<EngagementActionKey, number>> => {
      const { data, error } = await supabase.rpc("get_my_engagement_counts");
      if (error) throw error;

      const result = Object.fromEntries(DEFAULT_ORDER.map((k) => [k, 0])) as Record<
        EngagementActionKey,
        number
      >;
      for (const row of (data ?? []) as { action: string; usage_count: number }[]) {
        if ((DEFAULT_ORDER as string[]).includes(row.action)) {
          result[row.action as EngagementActionKey] = Number(row.usage_count);
        }
      }
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const ordered = counts
    ? [...DEFAULT_ORDER].sort((a, b) => {
        const diff = counts[b] - counts[a];
        // Stable tiebreak on equal counts (everyone starts at zero) —
        // fall back to the mockup's default relative order.
        return diff !== 0 ? diff : DEFAULT_ORDER.indexOf(a) - DEFAULT_ORDER.indexOf(b);
      })
    : DEFAULT_ORDER;

  return {
    visible: ordered.slice(0, VISIBLE_COUNT),
    overflow: ordered.slice(VISIBLE_COUNT),
  };
}
