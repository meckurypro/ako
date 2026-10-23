// src/hooks/useRateHistory.ts
//
// Admin-only reads of the exchange-rate history (supabase/ako_exchange_rate_history.sql).
// Bucketing (day / week / month, in Africa/Lagos time) happens in the get_exchange_rate_history() RPC;
// the change log reads the raw table. Both are gated to admin_roles by the database, not by this file.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type RateKind = "deposit" | "withdrawal";
export type HistoryBucket = "day" | "week" | "month";
export type HistoryRange = "7d" | "30d" | "90d" | "1y" | "all";

const RANGE_DAYS: Record<HistoryRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365, all: null };

function rangeStart(range: HistoryRange): string | null {
  const days = RANGE_DAYS[range];
  return days === null ? null : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export interface RateHistoryBucketRow {
  /** Local (Africa/Lagos) calendar date the bucket starts on, "YYYY-MM-DD". */
  bucketStart: string;
  kind: RateKind;
  open: number;
  close: number;
  low: number;
  high: number;
  avg: number;
  marketAvg: number | null;
  /** How many rate records fell in this bucket (sync runs + manual saves). */
  records: number;
}

export function useRateHistory(bucket: HistoryBucket, range: HistoryRange) {
  return useQuery({
    queryKey: ["exchange-rate-history", bucket, range],
    queryFn: async (): Promise<RateHistoryBucketRow[]> => {
      const { data, error } = await supabase.rpc("get_exchange_rate_history", {
        p_from: rangeStart(range),
        p_bucket: bucket,
      });
      if (error) throw error;
      return (data ?? []).map(
        (r: Record<string, unknown>): RateHistoryBucketRow => ({
          bucketStart: String(r.bucket_start),
          kind: r.kind as RateKind,
          open: Number(r.open_rate),
          close: Number(r.close_rate),
          low: Number(r.low_rate),
          high: Number(r.high_rate),
          avg: Number(r.avg_rate),
          marketAvg: r.market_avg === null ? null : Number(r.market_avg),
          records: Number(r.change_count),
        })
      );
    },
    staleTime: 60 * 1000,
  });
}

export type ChangeSource = "auto" | "manual" | "baseline";

export interface RateChange {
  id: number;
  kind: RateKind;
  rate: number;
  previousRate: number | null;
  marketRate: number | null;
  source: ChangeSource;
  recordedAt: string;
}

/** Newest-first raw log of rate records within the range, optionally limited to one source. */
export function useRateChangeLog(range: HistoryRange, source: ChangeSource | "all") {
  return useQuery({
    queryKey: ["exchange-rate-change-log", range, source],
    queryFn: async (): Promise<RateChange[]> => {
      let query = supabase
        .from("exchange_rate_history")
        .select("id, kind, rate, previous_rate, market_rate, source, recorded_at")
        .order("recorded_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(60);
      const from = rangeStart(range);
      if (from) query = query.gte("recorded_at", from);
      if (source !== "all") query = query.eq("source", source);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: Number(r.id),
        kind: r.kind as RateKind,
        rate: Number(r.rate),
        previousRate: r.previous_rate === null ? null : Number(r.previous_rate),
        marketRate: r.market_rate === null ? null : Number(r.market_rate),
        source: r.source as ChangeSource,
        recordedAt: r.recorded_at,
      }));
    },
    staleTime: 60 * 1000,
  });
}
