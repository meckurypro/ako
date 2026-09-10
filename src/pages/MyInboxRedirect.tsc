import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useActiveIdentity } from "../hooks/usePages";

// /inbox — the bottom nav's Messages tab points here instead of directly
// at /messages, same reasoning as MyProfileRedirect.tsx: which inbox
// you land on depends on active_page_id. Acting as a page sends you to
// that page's own shared inbox (PageInbox) instead of your personal
// DMs — switching identity happens elsewhere (page's "…" menu / account
// switcher), same as Profile.
export function MyInboxRedirect() {
  const { loading } = useAuth();
  const { data: identity, isLoading: identityLoading } = useActiveIdentity();

  if (loading || identityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (identity?.mode === "page") {
    return <Navigate to="/page-inbox" replace />;
  }

  return <Navigate to="/messages" replace />;
}
