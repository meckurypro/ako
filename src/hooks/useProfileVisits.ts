// src/hooks/useProfileVisits.ts
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Records that the signed-in user visited `profileId`'s profile.
 * No-ops while signed out, before the profile has loaded, and for
 * self-visits (including the owner's "Visitor" preview mode, since
 * that's still the owner underneath) — none of those should ever
 * inflate someone's own visit count.
 *
 * Backed by public.profile_visits, upserted on (visited_id, visitor_id)
 * so repeat visits bump the timestamp instead of piling up rows — the
 * 30-day count is "distinct visitors in the window", not raw pageviews.
 * See supabase/migrations/20260905_profile_visits.sql for the table
 * and RLS policies (only the profile owner can ever read their own
 * rows back — that's what makes useProfileVisitCount below safe).
 */
export function useRecordProfileVisit(profileId: string | undefined) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !profileId || user.id === profileId) return;

    supabase
      .from("profile_visits")
      .upsert(
        { visited_id: profileId, visitor_id: user.id, visited_at: new Date().toISOString() },
        { onConflict: "visited_id,visitor_id" }
      )
      .then(({ error }) => {
        if (error) console.error("Failed to record profile visit:", error.message);
      });
  }, [user, profileId]);
}

/**
 * Distinct-visitor count for the trailing 30 days. Only ever meaningful
 * for the profile's own owner — RLS on profile_visits restricts SELECT
 * to auth.uid() = visited_id, so a visitor's client would just get 0
 * back even if this were called for someone else's profile. `enabled`
 * is still passed explicitly (wired to showOwnerView in ProfilePage) so
 * we don't fire the request at all on a visitor's screen.
 */
export function useProfileVisitCount(profileId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["profile-visit-count", profileId],
    queryFn: async (): Promise<number> => {
      const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
      const { count, error } = await supabase
        .from("profile_visits")
        .select("visitor_id", { count: "exact", head: true })
        .eq("visited_id", profileId!)
        .gte("visited_at", cutoff);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: enabled && !!profileId,
  });
}
