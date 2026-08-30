import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";

export function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // The handle_new_user() trigger (see 00_foundation.sql) automatically
    // creates the profile + wallet rows once this succeeds — we just
    // pass along username/display_name as user metadata for it to use.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // signUp() does not establish a session until the email is
    // confirmed — send the user to enter the OTP we just triggered.
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
          <FormField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FormField
            id="password"
            label="Password"
            type="password"
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
