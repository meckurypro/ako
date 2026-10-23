// src/lib/googleAuth.ts
//
// Google sign-in / sign-up (one and the same flow — Supabase creates the
// account on first use and signs the person in on every use after).
//
// signInWithOAuth() does a full-page redirect to Google and back to
// /auth/callback, which waits for SIGNED_IN and routes onward (see
// AuthCallback.tsx). Because the page is unloaded in between, the place the
// visitor was headed (?redirect=…) is parked in sessionStorage first — same
// per-tab mechanism the email sign-up flow already uses (lib/authRedirect.ts).
//
// Setup (Supabase dashboard → Authentication → Providers → Google, plus
// Google Cloud console OAuth client) is documented in docs/GOOGLE_AUTH_SETUP.md.
import { supabase } from "./supabase";
import { rememberReturnTo } from "./authRedirect";
import { setPendingAddAccount } from "./accountSessions";

/**
 * "Add account" via Google: the redirect unloads the page, and the new session replaces the live one when it
 * comes back — so the account that is active right now is parked first (same hand-off the email sign-up path
 * uses). AuthCallback picks it up on SIGNED_IN, keeps both accounts in the switcher and links them.
 */
async function parkCurrentAccountForAdd(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const previousSession = sessionData.session;
  if (!previousSession) return;
  const { data: previousProfile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", previousSession.user.id)
    .single();
  if (!previousProfile) return;
  setPendingAddAccount({
    user_id: previousProfile.id,
    username: previousProfile.username,
    display_name: previousProfile.display_name,
    avatar_url: previousProfile.avatar_url,
    access_token: previousSession.access_token,
    refresh_token: previousSession.refresh_token,
  });
}

/** Starts the Google redirect. Resolves to an error message, or null when the browser is navigating away. */
export async function signInWithGoogle(
  returnTo?: string | null,
  options?: { addAccount?: boolean }
): Promise<string | null> {
  rememberReturnTo(returnTo);
  if (options?.addAccount) await parkCurrentAccountForAdd();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // Always show the account chooser — people share devices, and without
      // this Google silently reuses whichever account is signed in.
      queryParams: { prompt: "select_account" },
    },
  });

  return error ? "Couldn't start Google sign-in. Please try again." : null;
}
