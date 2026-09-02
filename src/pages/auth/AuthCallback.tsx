// src/pages/auth/AuthCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";

// Lands here from the link in the signup-confirmation or password-reset
// email. We don't route straight to a protected page (e.g.
// /onboarding/interests) because supabase-js processes the auth token in
// the URL asynchronously — a protected route's session check can run
// before that finishes and bounce the user to /login. Instead we wait
// for the specific auth event, then navigate ourselves.
export function AuthCallback() {
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-canvas">
      <div className="w-full max-w-sm text-center">
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
