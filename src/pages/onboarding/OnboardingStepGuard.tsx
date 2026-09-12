import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useOnboardingStatus } from "../../hooks/useOnboarding";

/**
 * The inverse of RequireAuth's onboarding check: keeps someone who has
 * ALREADY completed onboarding from re-entering it by navigating
 * straight to e.g. /onboarding/welcome (browser history, a stale tab,
 * a bookmark). Wrap every /onboarding/* page element with this.
 */
export function OnboardingStepGuard({ children }: { children: ReactNode }) {
  const { data: onboarding, isLoading } = useOnboardingStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (onboarding?.completed) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
}
