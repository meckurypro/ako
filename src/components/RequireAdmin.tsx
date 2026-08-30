import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsAdmin } from "../hooks/useAdmin";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
}
