import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useOnboardingStatus } from "../hooks/useOnboarding";

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

  const stillResolving = loading || (!!user && !skipOnboardingCheck && onboardingLoading);

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
