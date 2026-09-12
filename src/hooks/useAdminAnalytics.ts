// src/hooks/useAdminAnalytics.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

const DAYS = 30;
// Same business timezone used for the wallet's withdrawal schedule
// (Africa/Lagos, WAT, UTC+1, no DST) — kept consistent so "a day"
// means the same thing everywhere in the admin dashboard.
const BUSINESS_TIMEZONE = "Africa/Lagos";

function lagosDateParts(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  return {
    y: Number(parts.find((p) => p.type === "year")!.value),
    m: Number(parts.find((p) => p.type === "month")!.value),
    day: Number(parts.find((p) => p.type === "day")!.value),
  };
}

/** The calendar-day key (Lagos-local) a given instant falls on, e.g. "2026-09-12". */
function lagosDateKey(d: Date): string {
  const { y, m, day } = lagosDateParts(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The last 30 Lagos-local calendar days, oldest first, as a fixed
 * list of date keys — this is what guarantees every day shows up in
 * the chart even with zero signups, and that "day" boundaries can't
 * drift based on the admin's own browser timezone. Arithmetic is
 * done against a UTC anchor purely as a calendar-date counter (Lagos
 * has no DST, so this never misaligns with the real Lagos date).
 */
function last30DayKeys(): string[] {
  const today = lagosDateParts(new Date());
  const anchorUtc = Date.UTC(today.y, today.m - 1, today.day);
  const keys: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const dayUtc = new Date(anchorUtc - i * 86_400_000);
    keys.push(
      `${dayUtc.getUTCFullYear()}-${String(dayUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(
        dayUtc.getUTCDate()
      ).padStart(2, "0")}`
    );
  }
  return keys;
}

export interface DailySignups {
  date: string; // YYYY-MM-DD, Lagos-local
  count: number;
}

export interface UserGrowth {
  totalUsers: number;
  newLast30Days: number;
  dailySignups: DailySignups[];
}

/**
 * Total (non-deleted) users, plus a zero-filled daily signup count
 * for each of the last 30 days. Two lightweight queries against the
 * existing `profiles` table — same RLS admins already rely on for
 * useAdminSearchAccounts, no new table or edge function needed.
 */
export function useUserGrowth() {
  return useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: async (): Promise<UserGrowth> => {
      const { count: totalUsers, error: totalError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false);
      if (totalError) throw totalError;

      const dayKeys = last30DayKeys();
      // Fetch from a little before the window starts (UTC vs Lagos
      // offset) to be safe, then bucket precisely in JS below.
      const windowStart = new Date(Date.now() - (DAYS + 1) * 86_400_000).toISOString();

      const { data: recentProfiles, error: recentError } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("is_deleted", false)
        .gte("created_at", windowStart);
      if (recentError) throw recentError;

      const counts = new Map<string, number>(dayKeys.map((k) => [k, 0]));
      let newLast30Days = 0;

      for (const profile of recentProfiles ?? []) {
        const key = lagosDateKey(new Date(profile.created_at));
        if (counts.has(key)) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
          newLast30Days++;
        }
      }

      return {
        totalUsers: totalUsers ?? 0,
        newLast30Days,
        dailySignups: dayKeys.map((date) => ({ date, count: counts.get(date) ?? 0 })),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
