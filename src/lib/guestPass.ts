// src/lib/guestPass.ts
//
// Guest Pass — a creator-minted, 6-hour link that lets anyone (signed in or not) open a project's content, private
// projects included. See supabase/ako_project_guest_passes.sql. The token in the URL is the credential; it is
// validated server-side on every read (get_guest_pass_view) and on every hosted-file request (guest-pass-file).

import { appUrl } from "./appUrl";

export const GUEST_PASS_HOURS = 6;

export function getGuestPassPath(token: string): string {
  return `/pass/${token}`;
}

export function getGuestPassUrl(token: string): string {
  return appUrl(getGuestPassPath(token));
}

/** "5h 59m" / "42m 10s" / "9s" — the countdown guests see. */
export function formatPassRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
