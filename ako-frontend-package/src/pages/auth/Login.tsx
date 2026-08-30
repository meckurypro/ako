import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      // Generic message deliberately — don't reveal whether the email
      // exists or the password was wrong, standard practice against
      // account enumeration.
      setError("Incorrect email or password.");
      return;
    }

    navigate("/feed");
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
          <FormField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
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
