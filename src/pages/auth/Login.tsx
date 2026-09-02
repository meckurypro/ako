// src/pages/auth/Login.tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { FormField } from "../../components/FormField";
import { PasswordField } from "../../components/PasswordField";
import { Button } from "../../components/Button";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setLoading(true);

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

    navigate("/feed");
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-canvas">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Wordmark />
        </div>

        <form onSubmit={handleSubmit}>
          <FormField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
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
            Log in
          </Button>

          <Link
            to="/reset-password"
            className="block text-center text-sm text-accent mt-4 hover:underline"
          >
            Forgot password?
          </Link>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          New to Akọ?{" "}
          <Link to="/signup" className="text-accent font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
