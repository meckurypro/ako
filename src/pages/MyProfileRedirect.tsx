import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function MyProfileRedirect() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return <Navigate to={`/profile/${profile.username}`} replace />;
}  return <Navigate to={`/profile/${profile.username}`} replace />;
}
