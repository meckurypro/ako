import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  useIncomingFollowRequests,
  useAcceptFollowRequest,
  useDeclineFollowRequest,
} from "../hooks/useFollowRequests";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function FollowRequests() {
  const navigate = useNavigate();
  const { data: requests, isLoading } = useIncomingFollowRequests();
  const accept = useAcceptFollowRequest();
  const decline = useDeclineFollowRequest();

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-xl text-ink">Follow requests</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !requests || requests.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No pending requests.</p>
        ) : (
          requests.map((req) => {
            const pending =
              (accept.isPending && accept.variables?.id === req.id) ||
              (decline.isPending && decline.variables?.id === req.id);

            return (
              <div key={req.id} className="flex items-center gap-3 py-3.5 border-b border-border">
                <Link to={`/profile/${req.requester.username}`} className="flex-shrink-0">
                  <Avatar src={req.requester.avatar_url} name={req.requester.display_name} />
                </Link>
                <Link to={`/profile/${req.requester.username}`} className="min-w-0 flex-1">
                  <p className="font-medium text-ink truncate">{req.requester.display_name}</p>
                  <p className="text-sm text-ink-muted truncate">
                    @{req.requester.username} · {timeAgo(req.created_at)}
                  </p>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => decline.mutate({ id: req.id, requesterId: req.requester.id })}
                    disabled={pending}
                    className="text-sm text-ink-muted border border-border rounded-full px-3.5 py-1.5 disabled:opacity-40"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => accept.mutate({ id: req.id, requesterId: req.requester.id })}
                    disabled={pending}
                    className="text-sm bg-accent text-canvas rounded-full px-3.5 py-1.5 font-medium disabled:opacity-40"
                  >
                    Accept
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
