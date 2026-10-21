// src/pages/onboarding/CompleteProfile.tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useCompleteProfileSetup, useOnboardingStatus } from "../../hooks/useOnboarding";
import { Wordmark } from "../../components/Wordmark";
import { AuthPattern } from "../../components/AuthPattern";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

// First step for Google sign-ups, before Welcome. Google gives us a name but
// no username, and the one the database invents from the email is only a
// placeholder — so the person picks their own handle and confirms their name
// here. Email sign-ups choose both on the sign-up form and never see this.
export function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: onboarding } = useOnboardingStatus();
  const completeProfile = useCompleteProfileSetup();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const usernameCheckId = useRef(0);
  const prefilled = useRef(false);

  // Prefill the name Google gave us. The username starts empty on purpose:
  // the auto-generated one is derived from the email address.
  useEffect(() => {
    if (prefilled.current || !user) return;
    prefilled.current = true;
    const meta = user.user_metadata ?? {};
    setDisplayName(String(meta.full_name ?? meta.name ?? meta.display_name ?? "").trim());
  }, [user]);

  // Debounced availability check — a UX nicety; complete_profile_setup is the
  // real enforcement. Excludes the person's own row.
  useEffect(() => {
    if (username.length < 3 || !user) {
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
        .neq("id", user.id)
        .maybeSingle();
      if (checkId !== usernameCheckId.current) return;
      setUsernameStatus(checkError ? "error" : data ? "taken" : "available");
    }, 400);

    return () => clearTimeout(timeout);
  }, [username, user]);

  // Already done (stale tab, back button) — carry on with onboarding.
  if (onboarding?.profileSetupCompleted) {
    return <Navigate to="/onboarding/welcome" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const name = displayName.trim();
    if (!name) {
      setError("Enter the name you'd like people to see.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (usernameStatus === "taken") {
      setError("That username is already taken.");
      return;
    }

    try {
      await completeProfile.mutateAsync({ username, displayName: name });
      navigate("/onboarding/welcome", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "";
      if (message.includes("username_taken")) {
        setUsernameStatus("taken");
        setError("That username is already taken.");
      } else if (message.includes("invalid_username")) {
        setError("Usernames use lowercase letters, numbers and underscores (3–30 characters).");
      } else {
        setError("Couldn't save your profile. Please try again.");
      }
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-canvas overflow-hidden">
      <AuthPattern />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10">
          <Wordmark />
        </div>

        <h1 className="font-display text-2xl text-ink mb-2 text-center">Complete your profile</h1>
        <p className="text-ink-muted text-sm mb-8 text-center">
          Choose how you'll appear on Akọ.
        </p>

        <form onSubmit={handleSubmit}>
          <FormField
            id="display_name"
            label="Display name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What people will see"
            maxLength={60}
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
              maxLength={30}
              required
              pattern="[a-z0-9_]{3,30}"
              title="3–30 lowercase letters, numbers, or underscores"
              autoCapitalize="none"
              autoCorrect="off"
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

          {error && (
            <p role="alert" className="text-danger text-sm mb-4">
              {error}
            </p>
          )}

          <Button type="submit" loading={completeProfile.isPending}>
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
