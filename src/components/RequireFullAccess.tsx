import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { RESTRICTED_HOME, useIsRestricted } from "../hooks/useAccountAccess";

/**
 * Wraps surfaces a restricted (consumer-only) account must not reach:
 * the Feed and every create/edit-content flow. A restricted user is
 * silently sent to RESTRICTED_HOME — no message, no "locked" screen —
 * so from their side those pages simply don't exist. Everyone else
 * passes straight through. Place INSIDE <RequireAuth> (which resolves
 * the access query before rendering children).
 */
export function RequireFullAccess({ children }: { children: ReactNode }) {
  const restricted = useIsRestricted();
  if (restricted) return <Navigate to={RESTRICTED_HOME} replace />;
  return <>{children}</>;
}

/** "/" → Feed for everyone except restricted accounts. */
export function HomeRedirect() {
  const restricted = useIsRestricted();
  return <Navigate to={restricted ? RESTRICTED_HOME : "/feed"} replace />;
}
