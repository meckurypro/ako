// src/pages/ArchivedConversations.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useArchivedConversations, useMarkArchiveSeen } from "../hooks/useMessaging";
import { Avatar } from "../components/Avatar";
import { PresenceDot } from "../components/PresenceDot";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ArchivedConversations() {
  const navigate = useNavigate();
  const { data: archived, isLoading } = useArchivedConversations();
  const markSeen = useMarkArchiveSeen();

  // Opening this screen clears the "new" badge on the Archive row —
  // items themselves stay right here until the user actually replies
  // (see the accept-on-reply logic in useSendMessage), so this only
  // ever touches the badge, never the list contents.
  useEffect(() => {
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Archive</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !archived || archived.length === 0 ? (
          <p className="text-ink-muted text-center py-16 text-sm">Nothing archived right now.</p>
        ) : (
          archived.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/messages/${c.id}`)}
              role="link"
              className="flex items-center gap-3 py-3.5 border-b border-border cursor-pointer"
            >
              <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${c.unread ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                    {c.other_participant.display_name}
                  </p>
                  <span className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                    <span className="text-xs text-ink-muted">{timeAgo(c.last_message_at)}</span>
                    <PresenceDot lastSeenAt={c.other_participant.last_seen_at} />
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.is_request && (
                    <span className="text-[11px] font-medium text-accent bg-accent-soft rounded-full px-2 py-0.5 flex-shrink-0">
                      Request
                    </span>
                  )}
                  <p className={`text-sm truncate min-w-0 flex-1 ${c.unread ? "text-ink" : "text-ink-muted"}`}>
                    {c.last_message?.content ?? "Say hello"}
                  </p>
                </div>
              </div>

              {c.unread && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
