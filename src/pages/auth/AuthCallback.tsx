// src/pages/auth/AuthCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { saveAccount, takePendingAddAccount } from "../../lib/accountSessions";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";
import { AuthPattern } from "../../components/AuthPattern";

// Lands here from the link in the signup-confirmation or password-reset
// email. We don't route straight to a protected page (e.g.
// /onboarding/interests) because supabase-js processes the auth token in
// the URL asynchronously — a protected route's session check can run
// before that finishes and bounce the user to /login. Instead we wait
// for the specific auth event, then navigate ourselves.
export function AuthCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"waiting" | "error">("waiting");

  useEffect(() => {
    let settled = false;

    // Supabase returns errors (expired/invalid link, already-used link)
    // as hash params rather than throwing, e.g. #error=access_denied&
    // error_description=...
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("error")) {
      setStatus("error");
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;

      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        navigate("/reset-password", { replace: true, state: { fromRecovery: true } });
      } else if (event === "SIGNED_IN" && session) {
        settled = true;

        // Left behind by SignUp.tsx when this confirmation completes a
        // sign-up started from "Add account" rather than a fresh,
        // signed-out one — see lib/accountSessions.ts. Save the
        // account that was active before, cache this new one too (so
        // switching back to it later doesn't need the password again),
        // and best-effort link them server-side, same as the
        // login-path add-account flow.
        const pending = takePendingAddAccount();
        if (pending && pending.user_id !== session.user.id) {
          saveAccount(pending);
          void (async () => {
            const { data: newProfile } = await supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url")
              .eq("id", session.user.id)
              .single();
            if (newProfile) {
              saveAccount({
                user_id: newProfile.id,
                username: newProfile.username,
                display_name: newProfile.display_name,
                avatar_url: newProfile.avatar_url,
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              });
            }
            await supabase.rpc("link_accounts", { p_other_user_id: pending.user_id });
          })();
        }

        queryClient.clear();
        navigate("/onboarding/interests", { replace: true });
      }
    });

    // Fallback: if no relevant event fires in time (link already
    // consumed, malformed URL, etc.), stop showing a spinner forever.
    const timeout = setTimeout(() => {
      if (!settled) setStatus("error");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-canvas overflow-hidden">
      <AuthPattern />
      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="mb-8">
          <Wordmark size="sm" showTagline={false} />
        </div>

        {status === "waiting" && (
          <p className="text-ink-muted text-sm">Confirming your link…</p>
        )}

        {status === "error" && (
          <>
            <h2 className="font-display text-2xl text-ink mb-2">Link expired</h2>
            <p className="text-ink-muted mb-8 text-sm">
              This link is invalid or has already been used. Request a new one below.
            </p>
            <Button onClick={() => navigate("/login")}>Back to log in</Button>
          </>
        )}
      </div>
    </div>
  );
}
