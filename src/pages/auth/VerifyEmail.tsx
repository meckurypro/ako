// src/pages/auth/VerifyEmail.tsx
import { useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";

interface LocationState {
  email: string;
}

export function VerifyEmail() {
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  // If someone lands here directly without an email in state
  // (e.g. page refresh), bounce back to sign-up rather than show
  // a broken page.
  if (!state?.email) {
    return <Navigate to="/signup" replace />;
  }

  const { email } = state;

  async function handleResend() {
    setResending(true);
    setError(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setResending(false);

    if (resendError) {
      setError("Couldn't resend the link. Try again in a moment.");
      return;
    }

    setResent(true);
    setTimeout(() => setResent(false), 4000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-canvas">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <Wordmark size="sm" showTagline={false} />
        </div>

        <h2 className="font-display text-2xl text-ink mb-2">Check your email</h2>
        <p className="text-ink-muted mb-8 text-sm">
          We sent a confirmation link to{" "}
          <span className="text-ink font-medium">{email}</span>. Open it to activate your
          account.
        </p>

        {error && (
          <p className="text-danger text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        <button
          onClick={handleResend}
          disabled={resending}
          className="text-accent text-sm font-medium hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : resent ? "Link sent" : "Resend link"}
        </button>
      </div>
    </div>
  );
}
