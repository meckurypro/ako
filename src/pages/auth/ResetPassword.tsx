import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";
import { OtpInput } from "../../components/OtpInput";

type Step = "email" | "otp" | "new_password" | "done";

export function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    setLoading(false);

    // Deliberately proceed to the OTP step regardless of whether the
    // email exists — revealing "no account with that email" is an
    // account-enumeration leak. Supabase itself follows this pattern.
    if (resetError) {
      console.error("resetPasswordForEmail error:", resetError.message);
    }

    setStep("otp");
  }

  async function handleVerifyOtp(code: string) {
    setError(null);
    setLoading(true);

    // A successful recovery OTP verification signs the user in with
    // a temporary session, which is what lets updateUser() work next.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    setLoading(false);

    if (verifyError) {
      setError("That code didn't work. Check it and try again.");
      return;
    }

    setStep("new_password");
  }

  async function handleSetNewPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
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
              Enter your email and we'll send you a code.
            </p>
            <form onSubmit={handleRequestCode}>
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
                Send code
              </Button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="font-display text-2xl text-ink mb-2 text-center">Enter the code</h2>
            <p className="text-ink-muted text-sm mb-6 text-center">
              We sent an 8-digit code to <span className="text-ink font-medium">{email}</span>
            </p>
            <OtpInput onComplete={handleVerifyOtp} error={error ?? undefined} />
            {loading && <p className="text-ink-muted text-sm mt-4 text-center">Verifying…</p>}
          </>
        )}

        {step === "new_password" && (
          <>
            <h2 className="font-display text-2xl text-ink mb-2 text-center">New password</h2>
            <p className="text-ink-muted text-sm mb-6 text-center">
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSetNewPassword}>
              <FormField
                id="new_password"
                label="New password"
                type="password"
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
