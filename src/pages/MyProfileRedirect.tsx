import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useActiveIdentity } from "../hooks/usePages";

// /me — the bottom nav's Profile tab always points here. Where it lands
// depends on active_page_id (see useActiveIdentity/switch_active_mode):
// acting as a page sends you to that page's own PagePage instead of
// your personal ProfilePage, so "Profile" always means "wherever I'm
// currently posting from" — switching back to personal (or to a
// different page) happens from that page's own "…" menu, same as
// ProfilePage's owner menu is what switched you into it.
export function MyProfileRedirect() {
  const { profile, loading } = useAuth();
  const { data: identity, isLoading: identityLoading } = useActiveIdentity();

  if (loading || identityLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (identity?.mode === "page") {
    return <Navigate to={`/page/${identity.page.username}`} replace />;
  }

  return <Navigate to={`/profile/${profile.username}`} replace />;
}
