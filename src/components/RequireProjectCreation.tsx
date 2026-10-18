// src/components/RequireProjectCreation.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { RESTRICTED_HOME, useIsRestricted } from "../hooks/useAccountAccess";
import { useCanCreateAnyProject } from "../hooks/useCreatorKinds";

/**
 * Guard for /projects/new. Unrestricted accounts pass straight through. A
 * restricted (consumer-only) account is let in only when an admin has allowed
 * restricted accounts to create at least one project type (Admin → Project
 * types → "Who can create this"); otherwise it is silently sent home, same
 * as every other creation surface. Place INSIDE <RequireAuth>.
 */
export function RequireProjectCreation({ children }: { children: ReactNode }) {
  const restricted = useIsRestricted();
  const canCreate = useCanCreateAnyProject();
  if (restricted && !canCreate) return <Navigate to={RESTRICTED_HOME} replace />;
  return <>{children}</>;
}
