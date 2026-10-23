// src/lib/rateSync.ts
//
// The `sync-exchange-rate` pg_cron job runs at minute 0 of every 6th UTC hour ("0 */6 * * *" — 00:00,
// 06:00, 12:00, 18:00 UTC; see supabase/ako_exchange_rate_auto_sync.sql). Keep this in step with that
// schedule. Unix time is aligned to 00:00 UTC, so the next run is simply the next multiple of 6 hours.

export const RATE_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Epoch ms of the next scheduled automatic rate update after `now`. */
export function nextRateSyncAt(now: number = Date.now()): number {
  return Math.floor(now / RATE_SYNC_INTERVAL_MS) * RATE_SYNC_INTERVAL_MS + RATE_SYNC_INTERVAL_MS;
}

/** 12345000 -> "03:25:45". Never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
