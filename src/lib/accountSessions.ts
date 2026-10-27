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

const listeners = new Set<() => void>();

/** Subscribe to any change of the saved-accounts list (returns the unsubscribe). */
export function subscribeSavedAccounts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeAccounts(accounts: SavedAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  listeners.forEach((l) => l());
}

// Upserts by user_id — re-adding an account you've already saved just
// refreshes its cached tokens/profile snapshot rather than duplicating it.
export function saveAccount(account: SavedAccount): void {
  const accounts = listSavedAccounts().filter((a) => a.user_id !== account.user_id);
  accounts.push(account);
  writeAccounts(accounts);
}

export function removeSavedAccount(userId: string): void {
  const accounts = listSavedAccounts().filter((a) => a.user_id !== userId);
  writeAccounts(accounts);
}

export function getSavedAccount(userId: string): SavedAccount | undefined {
  return listSavedAccounts().find((a) => a.user_id === userId);
}

// Keeps a saved account's name / username / avatar snapshot current. The snapshot is taken when the account is
// added; without this, renaming an account later left the switcher listing (and the profile it opens) on the OLD
// values — which then 404'd as "account not found" because that username no longer exists. (Same function as in the
// native app's lib/accountSessions.ts; hooks/useAuth.tsx already imports it.)
export function updateSavedAccountProfile(
  userId: string,
  fields: { username?: string; display_name?: string; avatar_url?: string | null }
): void {
  const accounts = listSavedAccounts();
  const idx = accounts.findIndex((a) => a.user_id === userId);
  if (idx === -1) return;
  const cur = accounts[idx];
  const next = {
    ...cur,
    username: fields.username ?? cur.username,
    display_name: fields.display_name ?? cur.display_name,
    avatar_url: fields.avatar_url === undefined ? cur.avatar_url : fields.avatar_url,
  };
  if (next.username === cur.username && next.display_name === cur.display_name && next.avatar_url === cur.avatar_url) return;
  accounts[idx] = next;
  writeAccounts(accounts);
}

// Keeps a saved account's cached tokens in sync with whatever Supabase
// does to that session in the background. Supabase rotates the refresh
// token on every silent auto-refresh — without this, a saved account's
// cached token pair goes stale the moment it refreshes while active
// (even if the user never manually re-saves it), and switching back to
// it later fails on setSession with no obvious cause. No-ops if this
// user has nothing saved yet — there's nothing to keep in sync.
export function updateSavedAccountTokens(
  userId: string,
  tokens: { access_token: string; refresh_token: string }
): void {
  const accounts = listSavedAccounts();
  const idx = accounts.findIndex((a) => a.user_id === userId);
  if (idx === -1) return;
  accounts[idx] = { ...accounts[idx], ...tokens };
  writeAccounts(accounts);
}

// ------------------------------------------------------------
// Pending "add account via sign-up" handoff.
//
// Signing up doesn't establish a session until the confirmation link
// is clicked (see SignUp.tsx), so unlike the login path there's no
// single call where "the account that was active before this" can be
// captured and saved in one go — the confirmation click that finally
// creates the new session might even land in a different tab. This
// stashes the outgoing account in localStorage right before the
// sign-up call so AuthCallback can find it again once the new
// account's SIGNED_IN event actually fires, and finish the same
// save-both-accounts-and-link flow the login path does inline.
// ------------------------------------------------------------

const PENDING_ADD_KEY = "ako.pending_add_account.v1";

export function setPendingAddAccount(account: SavedAccount): void {
  localStorage.setItem(PENDING_ADD_KEY, JSON.stringify(account));
}

// Reads and clears in one step — this is only ever meant to be
// consumed once, by the next SIGNED_IN event after it's set.
export function takePendingAddAccount(): SavedAccount | null {
  try {
    const raw = localStorage.getItem(PENDING_ADD_KEY);
    localStorage.removeItem(PENDING_ADD_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedAccount;
  } catch {
    return null;
  }
}
