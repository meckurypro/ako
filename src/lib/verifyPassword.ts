// src/lib/verifyPassword.ts
//
// Checks an email + password pair WITHOUT touching the signed-in session. signInWithPassword on the app's own client
// fires SIGNED_IN across the whole app (auth listeners, cache resets, remounts), which wiped the Settings form's
// loading/success state mid-change. A throwaway client with no storage keeps the check invisible to the app.
import { createClient } from "@supabase/supabase-js";

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "ako-verify-password" },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}
