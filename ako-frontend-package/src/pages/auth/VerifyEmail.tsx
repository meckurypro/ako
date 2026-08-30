import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { OtpInput } from "../../components/OtpInput";

interface LocationState {
  email: string;
}

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  // If someone lands here directly without an email in state
  // (e.g. page refresh), bounce back to sign-up rather than show
  // a broken form.
  if (!state?.email) {
    return <Navigate to="/signup" replace />;
  }

  const { email } = state;

  async function handleComplete(code: string) {
    setError(null);
    setVerifying(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    setVerifying(false);

    if (verifyError) {
      setError("That code didn't work. Check it and try again.");
      return;
    }

    navigate("/onboarding/interests");
  }

  async function handleResend() {
    setResending(true);
    setError(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setResending(false);

    if (resendError) {
      setError("Couldn't resend the code. Try again in a moment.");
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
          We sent an 8-digit code to <span className="text-ink font-medium">{email}</span>
        </p>

        <OtpInput onComplete={handleComplete} error={error ?? undefined} />

        {verifying && <p className="text-ink-muted text-sm mt-4">Verifying…</p>}

        <button
          onClick={handleResend}
          disabled={resending}
          className="text-accent text-sm font-medium mt-8 hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : resent ? "Code sent" : "Resend code"}
        </button>
      </div>
    </div>
  );
}
