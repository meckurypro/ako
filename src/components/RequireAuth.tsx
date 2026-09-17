import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useOnboardingStatus } from "../hooks/useOnboarding";
import { useAccountAccess } from "../hooks/useAccountAccess";
import { AccountUnderReview } from "../pages/AccountUnderReview";

interface RequireAuthProps {
  children: ReactNode;
  /**
   * The onboarding step pages themselves route through RequireAuth too
   * (so a signed-out visit to /onboarding/people still bounces to
   * /login) but must NOT be redirected back into onboarding by the
   * check below — that's the loop this flag exists to break. Pass it
   * on every route under /onboarding/*.
   */
  skipOnboardingCheck?: boolean;
}

export function RequireAuth({ children, skipOnboardingCheck = false }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Only fetch onboarding status when it'll actually be used — no
  // sense doing the extra round trip for onboarding routes.
  const { data: onboarding, isLoading: onboardingLoading } = useOnboardingStatus();
  // Incubation Account Review & Access Gate (see useAccountAccess.ts).
  // Fetched for every signed-in user, onboarding routes included —
  // a pending account shouldn't be able to complete onboarding and
  // reach the app either, and the check is cheap/cached.
  const { data: access, isLoading: accessLoading, isError: accessError } = useAccountAccess();

  const stillResolving =
    loading || (!!user && !skipOnboardingCheck && onboardingLoading) || (!!user && accessLoading);

  if (stillResolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Fail CLOSED: if we couldn't verify access at all (network/DB
  // error), don't render the protected app — but this isn't a
  // permanent lockout, just a retry screen.
  if (accessError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center gap-3">
        <p className="text-ink-muted text-sm max-w-xs">
          We couldn't confirm your account access. Check your connection and try again.
        </p>
        <button onClick={() => window.location.reload()} className="text-accent text-sm font-medium">
          Retry
        </button>
      </div>
    );
  }

  // A pending account is locked to the review screen regardless of
  // onboarding state, deep links, or which route was requested — the
  // review screen IS the application for a pending user. Server-side
  // enforcement (RLS + edge-function checks) is the real backstop;
  // this just avoids ever rendering protected UI for them.
  if (access && !access.canAccess) {
    return <AccountUnderReview />;
  }

  // Direct navigation / a stale bookmark / hitting the main app before
  // finishing onboarding all land here — this is the single place that
  // enforces "incomplete onboarding never reaches the main app"
  // regardless of how the route was reached (NewUserOnboarding.md #4, #22).
  if (!skipOnboardingCheck && onboarding && !onboarding.completed) {
    return (
      <Navigate
        to={onboarding.hasInterests ? "/onboarding/people" : "/onboarding/welcome"}
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
}
