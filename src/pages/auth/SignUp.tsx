// src/pages/auth/SignUp.tsx
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { FormField } from "../../components/FormField";
import { PasswordField } from "../../components/PasswordField";
import { Button } from "../../components/Button";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

// Turns Supabase's raw auth error text into something a user can act
// on, and specifically catches "this email is already in use" so it
// reads like a normal validation error instead of a raw API message.
function friendlySignUpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("already in use")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (lower.includes("username") && (lower.includes("duplicate") || lower.includes("unique"))) {
    return "That username is already taken.";
  }
  return message;
}

export function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const usernameCheckId = useRef(0);

  // Debounced live availability check as the user types — this is a
  // UX nicety only. profiles.username is UNIQUE at the DB level, so
  // duplicates can never actually land there; this just catches the
  // common case early instead of making the user find out from a
  // failed submit.
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const checkId = ++usernameCheckId.current;
    setUsernameStatus("checking");

    const timeout = setTimeout(async () => {
      const { data, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      // Ignore stale responses if the user kept typing.
      if (checkId !== usernameCheckId.current) return;

      if (checkError) {
        setUsernameStatus("error");
      } else {
        setUsernameStatus(data ? "taken" : "available");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [username]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is already taken.");
      return;
    }

    setLoading(true);

    // Re-check right before submitting — the live check above can go
    // stale if someone else takes the name in the gap between typing
    // and hitting submit. profiles.username is UNIQUE in the DB
    // either way, so this is belt-and-suspenders, not the real
    // enforcement.
    const { data: existing, error: recheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (recheckError) {
      setLoading(false);
      setError("Couldn't verify that username right now. Please try again.");
      return;
    }
    if (existing) {
      setLoading(false);
      setUsernameStatus("taken");
      setError("That username is already taken.");
      return;
    }

    // The handle_new_user() trigger (see 00_foundation.sql) automatically
    // creates the profile + wallet rows once this succeeds — we just
    // pass along username/display_name as user metadata for it to use.
    //
    // emailRedirectTo points the confirmation link at /auth/callback,
    // which waits for the SIGNED_IN event and routes onward — see that
    // file for why we don't link straight to a protected page.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(friendlySignUpError(signUpError.message));
      return;
    }

    // When "Confirm email" is on, Supabase doesn't return an explicit
    // error for a pre-existing email (to avoid leaking which emails
    // are registered) — instead it returns a user object with an
    // empty `identities` array. That's the documented signal for
    // "this email already has an account."
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
      setError("An account with this email already exists. Try logging in instead.");
      return;
    }

    // signUp() does not establish a session until the email is
    // confirmed — send the user to check their inbox for the link.
    navigate("/verify-email", { state: { email } });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-canvas">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Wordmark />
        </div>

        <form onSubmit={handleSubmit}>
          <FormField
            id="display_name"
            label="Display name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What people will see"
            required
          />
          <div className="mb-4">
            <FormField
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yourname"
              required
              pattern="[a-z0-9_]+"
              title="Lowercase letters, numbers, and underscores only"
            />
            {usernameStatus === "checking" && (
              <p className="text-xs text-ink-muted mt-1.5">Checking availability…</p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-xs text-danger mt-1.5">That username is already taken.</p>
            )}
            {usernameStatus === "available" && (
              <p className="text-xs text-accent mt-1.5">Username is available.</p>
            )}
          </div>
          <FormField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          {error && (
            <p className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
