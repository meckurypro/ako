// src/pages/ConversationList.tsx
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useConversations } from "../hooks/useMessaging";
import { useUnseenPosts } from "../hooks/useUnseenPosts";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ConversationList() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();
  const authorIds = conversations?.map((c) => c.other_participant.id) ?? [];
  const { data: unseenPosts } = useUnseenPosts(authorIds);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Messages</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">
            No conversations yet. Message someone from their profile.
          </p>
        ) : (
          conversations.map((c) => {
            const unseenPostId = unseenPosts?.[c.other_participant.id];

            return (
              <Link
                key={c.id}
                to={`/messages/${c.id}`}
                className="flex items-center gap-3 py-3.5 border-b border-border"
              >
                {unseenPostId ? (
                  <span
                    role="link"
                    aria-label={`View ${c.other_participant.display_name}'s new post`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/post/${unseenPostId}`);
                    }}
                    className="flex-shrink-0 rounded-full p-[2.5px]"
                    style={{
                      background: "linear-gradient(45deg, #ff00e5, #00f0ff, #39ff14)",
                      boxShadow: "0 0 6px rgba(0, 240, 255, 0.6)",
                    }}
                  >
                    <span className="block rounded-full bg-canvas p-[2px]">
                      <Avatar
                        src={c.other_participant.avatar_url}
                        name={c.other_participant.display_name}
                      />
                    </span>
                  </span>
                ) : (
                  <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${c.unread ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                      {c.other_participant.display_name}
                    </p>
                    <span className="text-xs text-ink-muted flex-shrink-0 ml-2">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${c.unread ? "text-ink" : "text-ink-muted"}`}>
                    {c.last_message?.content ?? "Say hello"}
                  </p>
                </div>
                {c.unread && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
              </Link>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
