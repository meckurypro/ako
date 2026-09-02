// src/pages/auth/ResetPassword.tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { FormField } from "../../components/FormField";
import { PasswordField } from "../../components/PasswordField";
import { Button } from "../../components/Button";

interface LocationState {
  fromRecovery?: boolean;
}

type Step = "email" | "sent" | "new_password" | "done";

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  // /auth/callback sends us here with fromRecovery in nav state once it
  // confirms a PASSWORD_RECOVERY session — skip straight to setting a
  // new password. Anyone landing here any other way starts at "email".
  const [step, setStep] = useState<Step>(state?.fromRecovery ? "new_password" : "email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    setLoading(false);

    // Deliberately proceed to the "sent" step regardless of whether the
    // email exists — revealing "no account with that email" is an
    // account-enumeration leak. Supabase itself follows this pattern.
    if (resetError) {
      console.error("resetPasswordForEmail error:", resetError.message);
    }

    setStep("sent");
  }

  async function handleSetNewPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    // A valid recovery session (established via /auth/callback) is what
    // lets updateUser() work here.
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStep("done");
    setTimeout(() => navigate("/feed"), 1500);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-canvas">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Wordmark size="sm" showTagline={false} />
        </div>

        {step === "email" && (
          <>
            <h2 className="font-display text-2xl text-ink mb-2 text-center">Reset password</h2>
            <p className="text-ink-muted text-sm mb-6 text-center">
              Enter your email and we'll send you a link.
            </p>
            <form onSubmit={handleRequestLink}>
              <FormField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <Button type="submit" loading={loading}>
                Send link
              </Button>
            </form>
          </>
        )}

        {step === "sent" && (
          <div className="text-center">
            <h2 className="font-display text-2xl text-ink mb-2">Check your email</h2>
            <p className="text-ink-muted text-sm">
              If an account exists for{" "}
              <span className="text-ink font-medium">{email}</span>, we've sent a link to reset
              your password.
            </p>
          </div>
        )}

        {step === "new_password" && (
          <>
            <h2 className="font-display text-2xl text-ink mb-2 text-center">New password</h2>
            <p className="text-ink-muted text-sm mb-6 text-center">
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSetNewPassword}>
              <PasswordField
                id="new_password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
              {error && (
                <p className="text-danger text-sm mb-4" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" loading={loading}>
                Update password
              </Button>
            </form>
          </>
        )}

        {step === "done" && (
          <p className="text-center text-accent font-medium">
            Password updated. Taking you to your feed…
          </p>
        )}

        {step === "email" && (
          <p className="text-center text-sm text-ink-muted mt-6">
            Remembered it?{" "}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
