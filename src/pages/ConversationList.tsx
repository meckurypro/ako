// src/pages/ConversationList.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { useConversations } from "../hooks/useMessaging";
import { useUnseenPosts } from "../hooks/useUnseenPosts";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";
import { MessageStatusTicks } from "../components/MessageStatusTicks";

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
  const { user } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const authorIds = conversations?.map((c) => c.other_participant.id) ?? [];
  const { data: unseenPosts } = useUnseenPosts(authorIds);

  const [searchQuery, setSearchQuery] = useState("");

  // Client-side filter over the already-fetched list — matches by
  // contact name/username or last-message content. Cheap enough at
  // conversation-list scale; no need for a server round trip.
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !conversations) return conversations;
    return conversations.filter((c) => {
      const { display_name, username } = c.other_participant;
      return (
        display_name.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q) ||
        (c.last_message?.content ?? "").toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Messages</h2>
      </header>

      {conversations && conversations.length > 0 && (
        <div className="max-w-xl mx-auto px-4 pt-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="w-full pl-10 pr-9 py-2.5 rounded-full border border-border bg-surface text-ink text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">
            No conversations yet. Message someone from their profile.
          </p>
        ) : filteredConversations && filteredConversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No conversations match your search.</p>
        ) : (
          filteredConversations?.map((c) => {
            const unseenPostId = unseenPosts?.[c.other_participant.id];
            // Only show ticks when the last message is one WE sent —
            // seeing your own message's delivery/read state in the list
            // preview, same as the double-tick-in-list pattern in WhatsApp.
            const showTicksInPreview = c.last_message?.sender_id === user?.id;

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
                    className="flex-shrink-0 rounded-full p-[2.5px] bg-accent shadow-[0_0_6px_rgba(61,90,69,0.45)]"
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
                  <p className={`text-sm truncate flex items-center gap-1 ${c.unread ? "text-ink" : "text-ink-muted"}`}>
                    {showTicksInPreview && c.last_message && (
                      <MessageStatusTicks
                        deliveredAt={c.last_message.delivered_at}
                        readAt={c.last_message.read_at}
                        variant="list"
                        size={13}
                      />
                    )}
                    <span className="truncate">{c.last_message?.content ?? "Say hello"}</span>
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
