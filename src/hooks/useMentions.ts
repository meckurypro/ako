// src/hooks/useMentions.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { Profile } from "../types/database";

export type MentionCandidate = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

/**
 * Suggests accounts to @mention as the user types after an "@".
 * Runs two queries in parallel — the user's followings filtered by
 * the query client-side (small list, cheap), and a broader
 * username/display_name search — then merges with followings first,
 * per the product ask to prioritize people the user already follows.
 * Query can be empty (just typed "@") to show followings alone.
 */
export function useMentionSuggestions(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mention-suggestions", user?.id, query],
    queryFn: async (): Promise<MentionCandidate[]> => {
      if (!user) return [];

      const [followingRes, searchRes] = await Promise.all([
        supabase
          .from("follows")
          .select(`following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)`)
          .eq("follower_id", user.id),
        query.trim().length > 0
          ? supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url")
              .eq("is_deleted", false)
              .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
              .limit(15)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const followings = (followingRes.data ?? [])
        .map((row: any) => row.following as MentionCandidate)
        .filter((p) => p && matches(p, query));

      const searched = (searchRes.data ?? []) as MentionCandidate[];

      const seen = new Set<string>();
      const merged: MentionCandidate[] = [];
      for (const p of [...followings, ...searched]) {
        if (p.id === user.id || seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push(p);
      }

      return merged.slice(0, 8);
    },
    enabled: !!user,
  });
}

function matches(p: MentionCandidate, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return p.username.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q);
}
