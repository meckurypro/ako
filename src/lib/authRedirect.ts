// src/lib/authRedirect.ts
//
// "Log in to continue" plumbing. A signed-out visitor who lands on a
// shared project link (/:slug) can look at the page, but every action
// past it — Read, Buy, Download, opening the creator's profile — needs
// an account. These helpers carry the place they were trying to get to
// through the whole auth round trip, so they end up back there instead
// of on /feed:
//
//   • Login accepts ?redirect=<path> (Login.tsx already validated it).
//   • Sign-up has an email-confirmation step in the middle, and then
//     onboarding, so a query param alone can't survive it. The
//     destination is also parked in sessionStorage; BuildingAko (the
//     last onboarding step) picks it up. sessionStorage is per-tab, so
//     it survives the confirmation link opening in the same browser
//     tab/session and quietly does nothing if it doesn't.
//
// Only same-origin absolute paths are ever honoured — never a full URL
// — so a crafted ?redirect= can't turn login into an open redirect.

const STORAGE_KEY = "ako.return_to.v1";
const SIGNED_OUT_KEY = "ako.signed_out_at.v1";
/** How long after an intentional sign-out the "bounced to /login" redirect must not remember the page we left. */
const SIGNED_OUT_WINDOW_MS = 15_000;

// Pages that must never be a "return" target (we'd loop straight back
// into the auth flow).
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/reset-password", "/auth/"];

// Account-management screens are never somewhere a login should drop you: the place you log OUT from is exactly
// where the session disappears, and coming back to it after logging in again reads as a bug. Logging in lands on
// the Feed (the Discover home for restricted accounts), not here.
const NEVER_RETURN_PATHS = ["/settings"];

export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (AUTH_PATHS.some((p) => raw === p || raw.startsWith(`${p}?`) || raw.startsWith(`${p}/`) || (p.endsWith("/") && raw.startsWith(p)))) {
    return null;
  }
  if (NEVER_RETURN_PATHS.some((p) => raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`))) return null;
  return raw;
}

/**
 * Call right before an intentional sign-out (Log out, Deactivate). Signing out drops the session while the user is
 * still on a protected page, which makes RequireAuth bounce them to /login — and it used to carry that page along as
 * ?redirect=, so the next login "returned" them to wherever they logged out from. For a short window after this call
 * the bounce goes to a plain /login instead, so every fresh login lands on the Feed (Discover for restricted users).
 */
export function markSignedOut(): void {
  try {
    sessionStorage.setItem(SIGNED_OUT_KEY, String(Date.now()));
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — the /settings guard above still covers the case that mattered most
  }
}

/** True for a moment after markSignedOut() — see above. Safe to call during render. */
export function justSignedOut(): boolean {
  try {
    const at = Number(sessionStorage.getItem(SIGNED_OUT_KEY));
    return !!at && Date.now() - at < SIGNED_OUT_WINDOW_MS;
  } catch {
    return false;
  }
}

/** `/login?redirect=…` for a given destination (falls back to plain /login). */
export function loginPathFor(returnTo: string | null | undefined): string {
  const safe = safeReturnPath(returnTo);
  return safe ? `/login?redirect=${encodeURIComponent(safe)}` : "/login";
}

/** `/signup?redirect=…` for a given destination (falls back to plain /signup). */
export function signupPathFor(returnTo: string | null | undefined): string {
  const safe = safeReturnPath(returnTo);
  return safe ? `/signup?redirect=${encodeURIComponent(safe)}` : "/signup";
}

/** Path + query + hash of a router location — what to come back to. */
export function returnPathOf(location: { pathname: string; search?: string; hash?: string }): string {
  return `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
}

export function rememberReturnTo(path: string | null | undefined): void {
  const safe = safeReturnPath(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, safe);
  } catch {
    // Storage blocked (private mode, etc.) — the redirect just falls
    // back to /feed; nothing is lost beyond convenience.
  }
}

/** Reads and clears the remembered destination (one-shot). */
export function takeReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return safeReturnPath(value);
  } catch {
    return null;
  }
}

export function clearReturnTo(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
