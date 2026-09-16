import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useIsAdmin } from "../hooks/useAdmin";

// Redirects to /admin/login, not /feed — /admin/login is the actual
// admin entry point (see its own doc comment), and before this fix
// nothing in the app ever navigated there: it was reachable only by
// typing the exact URL from memory. See AKO_APP_CONNECTIVITY_AND_
// END_TO_END_FLOW_AUDIT.md — "no critical route exists only as a
// secret URL." state.from lets AdminLogin send the admin on to
// wherever they were actually headed once they sign in, instead of
// always landing on /admin.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
