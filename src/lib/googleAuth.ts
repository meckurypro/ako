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

/** Starts the Google redirect. Resolves to an error message, or null when the browser is navigating away. */
export async function signInWithGoogle(returnTo?: string | null): Promise<string | null> {
  rememberReturnTo(returnTo);

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
