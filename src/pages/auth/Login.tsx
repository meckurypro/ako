// src/pages/auth/Login.tsx
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { useAddAccount } from "../../hooks/useAccountSwitcher";
import { Wordmark } from "../../components/Wordmark";
import { AuthPattern } from "../../components/AuthPattern";
import { FormField } from "../../components/FormField";
import { PasswordField } from "../../components/PasswordField";
import { Button } from "../../components/Button";
import { AuthOrDivider, GoogleAuthButton } from "../../components/GoogleAuthButton";
import { safeReturnPath, signupPathFor } from "../../lib/authRedirect";

export function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const returnTo = safeReturnPath(redirectParam);
  const redirectTo = returnTo ?? "/feed";
  // ?add=1 — arrived here from AccountSwitcher/ProfilePage to sign
  // into an ADDITIONAL personal account rather than replace the
  // current one. Changes both the redirect-if-already-signed-in guard
  // below (that guard exists for the normal case, but here being
  // signed in already is the whole point) and what submit does.
  const addMode = searchParams.get("add") === "1";
  const addAccount = useAddAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  // Google is the primary way in; the email form is a secondary option the
  // visitor opens on purpose. Add-account mode has no Google button (see the
  // note below), so there the form is simply always visible.
  const [showEmail, setShowEmail] = useState(false);
  const emailVisible = addMode || showEmail;

  // Already signed in — most commonly hit via the browser's back
  // button: /login sits behind a primary page in history once the
  // user has logged in, so back-navigation can land here even though
  // the session is still valid. Bounce straight past the form instead
  // of showing it again. `replace: true` here too, so back/forward
  // doesn't just bounce the user between this redirect and /login.
  if (!addMode && !authLoading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setLoading(true);

    if (addMode) {
      try {
        const newProfile = await addAccount.mutateAsync({ email, password });
        setLoading(false);
        // Matches the modal it replaced: land on the newly-added
        // account's own profile, not back on the one that was active
        // before — same as Instagram/TikTok dropping you into the
        // account you just added.
        navigate(`/profile/${newProfile.username}`, { replace: true });
      } catch (err: any) {
        setLoading(false);
        setError(err.message ?? "Incorrect email or password.");
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      // "Email not confirmed" is a distinct failure from a bad
      // password/email — surface it separately instead of collapsing
      // every error into the generic message below, which was masking
      // this case entirely.
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        setUnconfirmed(true);
        setError("Confirm your email first. Check your inbox for the link we sent you.");
      } else {
        // Generic message deliberately — don't reveal whether the email
        // exists or the password was wrong, standard practice against
        // account enumeration.
        setError("Incorrect email or password.");
      }
      return;
    }

    // replace: true — a login shouldn't leave /login sitting in browser
    // history behind the page it lands on. Without this, clicking the
    // browser back button from a primary page takes the user straight
    // back to the login form (even though they're still authenticated),
    // since this route has no other guard against direct visits.
    navigate(redirectTo, { replace: true });
  }

  async function handleResend() {
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);

    if (!resendError) {
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-canvas overflow-hidden">
      <AuthPattern />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10">
          <Wordmark />
        </div>

        {!addMode && returnTo && (
          <p className="text-center text-sm text-ink-muted mb-6">Log in to continue.</p>
        )}

        {addMode && (
          <p className="text-center text-sm text-ink-muted mb-6">
            Sign into another personal account. Your current account stays saved on this
            device — switch back to it anytime.
          </p>
        )}

        {!addMode && (
          <>
            <GoogleAuthButton returnTo={returnTo} />
            <AuthOrDivider />
          </>
        )}

        {!emailVisible && (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="w-full h-12 px-6 rounded-xl border border-border bg-surface text-ink font-body font-medium transition-colors hover:bg-accent-soft/50"
          >
            Continue with email
          </button>
        )}

        {emailVisible && (
        <form onSubmit={handleSubmit} className="animate-ako-fade-up">
          <FormField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={!addMode}
          />
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          {unconfirmed && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="block text-sm text-accent font-medium mb-4 hover:underline disabled:opacity-50"
            >
              {resending ? "Sending…" : resent ? "Link sent" : "Resend confirmation link"}
            </button>
          )}

          <Button type="submit" loading={loading}>
            {addMode ? "Add account" : "Log in"}
          </Button>

          {!addMode && (
            <Link
              to="/reset-password"
              className="block text-center text-sm text-accent mt-4 hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </form>
        )}

        {/* Add-account mode swaps the active session; the Google redirect
            can't carry the "previous account" snapshot that needs, so it's
            email/password only there (no Google button above). */}

        <p className="text-center text-sm text-ink-muted mt-6">
          New to Akọ?{" "}
          <Link to={addMode ? "/signup?add=1" : signupPathFor(returnTo)} className="text-accent font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
