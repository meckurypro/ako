// src/pages/admin/AdminLogin.tsx
//
// A dedicated entry point for admins, kept separate from the regular
// /login screen. Same credential check (Supabase auth) plus a follow-
// up admin_roles lookup — if the signed-in account isn't an admin, we
// sign it back out immediately rather than leaving a non-admin
// session sitting around from an admin-login attempt.
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useIsAdmin } from "../../hooks/useAdmin";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { AuthPattern } from "../../components/AuthPattern";
import { FormField } from "../../components/FormField";
import { PasswordField } from "../../components/PasswordField";
import { Button } from "../../components/Button";

export function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Where RequireAdmin sent this admin from, if that's how they got
  // here — always an internal Location our own app constructed (see
  // RequireAdmin.tsx), never a user-controlled string, so there's no
  // open-redirect risk in trusting it directly.
  const from = (location.state as { from?: Location } | null)?.from;
  const destination = from ? `${from.pathname}${from.search}` : "/admin";

  // Already signed in as a confirmed admin — skip the form.
  if (!authLoading && user && !adminLoading && isAdmin) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError("Incorrect email or password.");
      return;
    }

    const { data: adminRow } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    setLoading(false);

    if (!adminRow) {
      await supabase.auth.signOut();
      setError("This account doesn't have admin access.");
      return;
    }

    navigate(destination, { replace: true });
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-canvas overflow-hidden">
      <AuthPattern />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-2">
          <Wordmark />
          <p className="text-sm text-ink-muted">Admin</p>
        </div>

        <form onSubmit={handleSubmit}>
          <FormField
            id="email"
            label="Admin email"
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

          <Button type="submit" loading={loading}>
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
}
