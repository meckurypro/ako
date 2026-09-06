// src/lib/accountSessions.ts
// ============================================================
// Per-device "accounts signed into on this browser" cache — what
// actually powers instant account switching (Instagram/TikTok-style).
// Nothing here talks to the server; see hooks/useAccountSwitcher.ts
// for the mutations that call supabase.auth on top of this.
//
// Storing refresh tokens in localStorage is not a new risk this
// introduces — it's exactly what @supabase/supabase-js already does
// for the single active session by default. This just keeps more than
// one around instead of overwriting the previous one on sign-in.
//
// Deliberately NOT React state / a hook of its own: reads and writes
// are synchronous and cheap, and the couple of places that need to
// react to changes (AccountSwitcher's list) just re-read after a
// mutation succeeds rather than needing a subscription.
// ============================================================

const STORAGE_KEY = "ako.saved_accounts.v1";

export interface SavedAccount {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  access_token: string;
  refresh_token: string;
}

export function listSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Upserts by user_id — re-adding an account you've already saved just
// refreshes its cached tokens/profile snapshot rather than duplicating it.
export function saveAccount(account: SavedAccount): void {
  const accounts = listSavedAccounts().filter((a) => a.user_id !== account.user_id);
  accounts.push(account);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeSavedAccount(userId: string): void {
  const accounts = listSavedAccounts().filter((a) => a.user_id !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function getSavedAccount(userId: string): SavedAccount | undefined {
  return listSavedAccounts().find((a) => a.user_id === userId);
}
