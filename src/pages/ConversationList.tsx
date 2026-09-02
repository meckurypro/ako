// src/pages/ConversationList.tsx
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, Pin } from "lucide-react";
import { useConversations, useUpdateConversationState, type ConversationSummary } from "../hooks/useMessaging";
import { useUnseenPosts } from "../hooks/useUnseenPosts";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";
import { MessageStatusTicks } from "../components/MessageStatusTicks";
import { PresenceDot } from "../components/PresenceDot";
import { ConversationActionSheet } from "../components/ConversationActionSheet";

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

  // --- Long press to open pin/archive/delete actions (same hand-rolled
  // pointer-timer approach used for messages — no gesture library). ---
  const updateConversationState = useUpdateConversationState();
  const [actionTarget, setActionTarget] = useState<ConversationSummary | null>(null);
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressStart = useRef<Record<string, { x: number; y: number }>>({});
  const longPressFired = useRef<Record<string, boolean>>({});

  function handlePointerDown(c: ConversationSummary, e: React.PointerEvent) {
    longPressStart.current[c.id] = { x: e.clientX, y: e.clientY };
    longPressFired.current[c.id] = false;
    longPressTimers.current[c.id] = setTimeout(() => {
      longPressFired.current[c.id] = true;
      if (navigator.vibrate) navigator.vibrate(15);
      setActionTarget(c);
    }, 450);
  }
  function cancelLongPressTimer(id: string) {
    const timer = longPressTimers.current[id];
    if (timer) clearTimeout(timer);
    longPressTimers.current[id] = null;
  }
  function handlePointerMove(c: ConversationSummary, e: React.PointerEvent) {
    const start = longPressStart.current[c.id];
    if (!start) return;
    if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) {
      cancelLongPressTimer(c.id);
    }
  }
  function endGesture(id: string) {
    cancelLongPressTimer(id);
    delete longPressStart.current[id];
  }
  function handleRowClick(c: ConversationSummary, e: React.MouseEvent) {
    if (longPressFired.current[c.id]) {
      e.preventDefault();
      longPressFired.current[c.id] = false;
      return;
    }
    navigate(`/messages/${c.id}`);
  }

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
              <div
                key={c.id}
                onPointerDown={(e) => handlePointerDown(c, e)}
                onPointerMove={(e) => handlePointerMove(c, e)}
                onPointerUp={() => endGesture(c.id)}
                onPointerLeave={() => endGesture(c.id)}
                onPointerCancel={() => endGesture(c.id)}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => handleRowClick(c, e)}
                role="link"
                className="flex items-center gap-3 py-3.5 border-b border-border select-none cursor-pointer"
                style={{ WebkitTouchCallout: "none" }}
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
                    <p className={`text-sm truncate flex items-center gap-1 ${c.unread ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                      {c.pinned_at && <Pin size={12} className="text-ink-muted flex-shrink-0" />}
                      <span className="truncate">{c.other_participant.display_name}</span>
                    </p>
                    <span className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <span className="text-xs text-ink-muted">{timeAgo(c.last_message_at)}</span>
                      <PresenceDot lastSeenAt={c.other_participant.last_seen_at} />
                    </span>
                  </div>
                  <p className={`text-sm flex items-center gap-1 min-w-0 ${c.unread ? "text-ink" : "text-ink-muted"}`}>
                    {showTicksInPreview && c.last_message && (
                      <span className="flex-shrink-0 inline-flex">
                        <MessageStatusTicks
                          deliveredAt={c.last_message.delivered_at}
                          readAt={c.last_message.read_at}
                          variant="list"
                          size={13}
                        />
                      </span>
                    )}
                    <span className="truncate min-w-0 flex-1">{c.last_message?.content ?? "Say hello"}</span>
                  </p>
                </div>
                {c.unread && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />

      {actionTarget && (
        <ConversationActionSheet
          displayName={actionTarget.other_participant.display_name}
          isPinned={!!actionTarget.pinned_at}
          onTogglePin={() =>
            updateConversationState.mutate({
              conversationId: actionTarget.id,
              pinned_at: actionTarget.pinned_at ? null : new Date().toISOString(),
            })
          }
          onArchive={() =>
            updateConversationState.mutate({
              conversationId: actionTarget.id,
              archived_at: new Date().toISOString(),
            })
          }
          onDelete={() =>
            updateConversationState.mutate({
              conversationId: actionTarget.id,
              hidden_at: new Date().toISOString(),
            })
          }
          onClose={() => setActionTarget(null)}
        />
      )}
    </div>
  );
}
