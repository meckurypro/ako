// src/components/RequireGroupCreator.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCanCreateGroup } from "../hooks/useCanCreateGroup";

/** Guard for /groups/new: only verified, unrestricted accounts (and admins) may start a group. Place INSIDE <RequireAuth>. */
export function RequireGroupCreator({ children }: { children: ReactNode }) {
  const { allowed, loading } = useCanCreateGroup();
  if (loading) return null;
  if (!allowed) return <Navigate to="/connect" replace />;
  return <>{children}</>;
}
