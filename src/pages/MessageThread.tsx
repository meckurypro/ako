// src/pages/MessageThread.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Search, ChevronUp, ChevronDown, Smile, Keyboard, Reply, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useMarkMessagesRead,
  useDeleteMessage,
  type MessageWithSender,
} from "../hooks/useMessaging";
import {
  useConversationReactions,
  useSetReaction,
  useRemoveReaction,
  useUserTopEmojis,
  useMessageUserStates,
  useToggleMessageState,
  useTrackEmojiUsage,
  type MessageReaction,
} from "../hooks/useMessageReactions";
import { Avatar } from "../components/Avatar";
import { MessageStatusTicks } from "../components/MessageStatusTicks";
import { PresenceDot } from "../components/PresenceDot";
import { MessageActionMenu } from "../components/MessageActionMenu";
import { EmojiPickerSheet, removeLastGrapheme } from "../components/EmojiPickerSheet";
import { formatLastSeen } from "../lib/presence";

// Fetches the other participant's profile for the header — a small
// dedicated query since useConversations' list-summary shape isn't
// available when landing here directly (e.g. from a notification link).
function useOtherParticipant(conversationId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["other-participant", conversationId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(
          "profile:profiles!conversation_participants_user_id_fkey(username, display_name, avatar_url, last_seen_at)"
        )
        .eq("conversation_id", conversationId)
        .neq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.profile as
        | { username: string; display_name: string; avatar_url: string | null; last_seen_at: string | null }
        | undefined;
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 30_000, // keeps the header status dot from going stale on a long-open thread
  });
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps every case-insensitive occurrence of `query` in `text` with <mark>. */
function highlightMatches(text: string, query: string, isMine: boolean) {
  const q = query.trim();
  if (!q) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className={`rounded-sm ${isMine ? "bg-canvas/25 text-canvas" : "bg-accent-soft text-ink"}`}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/** Grouped reaction badges under a bubble — tap toggles the current user's own reaction. */
function ReactionsBar({
  reactions,
  myReaction,
  isMine,
  onToggle,
}: {
  reactions: MessageReaction[];
  myReaction: string | null;
  isMine: boolean;
  onToggle: (emoji: string) => void;
}) {
  if (!reactions.length) return null;
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
      {[...counts.entries()].map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
            myReaction === emoji ? "bg-accent-soft border-accent" : "bg-surface border-border"
          }`}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-ink-muted">{count}</span>}
        </button>
      ))}
    </div>
  );
}

// Subtle diamond-lattice texture in the brand accent, ~5% opacity —
// sits behind the message list only (header/input stay solid `canvas`
// for legibility). Deliberately abstract/geometric rather than a
// literal cultural-textile reproduction.
const CHAT_PATTERN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#3D5A45" stroke-width="1" opacity="0.06"/></svg>`
);
const chatBackgroundStyle = {
  backgroundImage: `url("data:image/svg+xml,${CHAT_PATTERN}")`,
  backgroundSize: "40px 40px",
};

// Swipe-to-reply tuning — mirrors WhatsApp's feel: the bubble tracks
// the finger 1:1 up to SWIPE_MAX, then resists further drag, and the
// reply fires the instant SWIPE_THRESHOLD is crossed (no need to
// release), snapping back immediately afterward.
const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 80;
const SWIPE_RESISTANCE = 0.2;

interface ActiveMessage {
  message: MessageWithSender;
  anchorRect: DOMRect;
}

type EmojiPickerTarget = { mode: "input" } | { mode: "reaction"; messageId: string } | null;

export function MessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId!);
  const { data: otherParticipant } = useOtherParticipant(conversationId!);
  const sendMessage = useSendMessage(conversationId!);
  const deleteMessage = useDeleteMessage(conversationId!);
  const markConversationRead = useMarkConversationRead(conversationId!);

  const messageIds = useMemo(() => messages?.map((m) => m.id) ?? [], [messages]);
  const { data: reactionsByMessage } = useConversationReactions(conversationId!, messageIds);
  const { data: userStates } = useMessageUserStates(conversationId!, messageIds);
  const setReaction = useSetReaction(conversationId!);
  const removeReaction = useRemoveReaction(conversationId!);
  const toggleStar = useToggleMessageState(conversationId!, "starred_at");
  const togglePin = useToggleMessageState(conversationId!, "pinned_at");
  const topEmojis = useUserTopEmojis();
  const trackEmojiUsage = useTrackEmojiUsage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Per-message read_at stamping (drives ticks) — separate mechanism
  // from markConversationRead above, which drives the conversation-list
  // unread dot via conversation_participants.last_read_at.
  useMarkMessagesRead(conversationId!, messages);

  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const [activeMessage, setActiveMessage] = useState<ActiveMessage | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<EmojiPickerTarget>(null);

  // The emoji sheet is an in-page overlay, not a route — without this,
  // the hardware/browser back button falls through to React Router's
  // history and leaves the thread entirely instead of just closing the
  // sheet. Pushing a dummy entry while it's open means "back" consumes
  // that entry first.
  useEffect(() => {
    if (!emojiPickerTarget) return;
    window.history.pushState({ modal: "emoji" }, "");
    const handlePopState = () => setEmojiPickerTarget(null);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Only pop our own dummy entry if it's still there — if the user
      // closed this via the back button, popstate already consumed it,
      // and calling history.back() again here would eat a real entry.
      if (window.history.state?.modal === "emoji") {
        window.history.back();
      }
    };
  }, [emojiPickerTarget]);

  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressStart = useRef<Record<string, { x: number; y: number }>>({});

  // --- Swipe-to-reply state ---
  const [replyTarget, setReplyTarget] = useState<MessageWithSender | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const swipeTriggered = useRef<Record<string, boolean>>({});
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashHighlight(id: string) {
    setFlashMessageId(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashMessageId(null), 700);
  }

  function startReply(m: MessageWithSender) {
    setReplyTarget(m);
    flashHighlight(m.id);
  }

  function scrollToMessage(id: string) {
    messageRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    flashHighlight(id);
  }

  useEffect(() => {
    markConversationRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (searchOpen) return; // don't fight the search-match scroll below
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, searchOpen]);

  const matches = useMemo((): MessageWithSender[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !messages) return [];
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  useEffect(() => {
    setMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!matches.length) return;
    const current = matches[matchIndex];
    messageRefs.current[current.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [matchIndex, matches]);

  function goToPrevMatch() {
    if (!matches.length) return;
    setMatchIndex((i) => (i - 1 + matches.length) % matches.length);
  }
  function goToNextMatch() {
    if (!matches.length) return;
    setMatchIndex((i) => (i + 1) % matches.length);
  }
  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setMatchIndex(0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const text = content;
    const replyingTo = replyTarget;
    setContent("");
    setReplyTarget(null);
    try {
      await sendMessage.mutateAsync({ content: text, replyToMessageId: replyingTo?.id ?? null });
    } catch {
      setContent(text); // restore on failure so the user doesn't lose what they typed
      setReplyTarget(replyingTo);
    }
  }

  // --- Long press + swipe-to-reply (no gesture library — hand-rolled pointer timers) ---
  function handlePointerDown(m: MessageWithSender, e: React.PointerEvent) {
    longPressStart.current[m.id] = { x: e.clientX, y: e.clientY };
    swipeTriggered.current[m.id] = false;
    longPressTimers.current[m.id] = setTimeout(() => {
      const el = messageRefs.current[m.id];
      if (!el) return;
      if (navigator.vibrate) navigator.vibrate(15);
      setActiveMessage({ message: m, anchorRect: el.getBoundingClientRect() });
    }, 450);
  }

  function cancelLongPressTimer(id: string) {
    const timer = longPressTimers.current[id];
    if (timer) clearTimeout(timer);
    longPressTimers.current[id] = null;
  }

  function handlePointerMove(m: MessageWithSender, e: React.PointerEvent) {
    const start = longPressStart.current[m.id];
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Any real movement cancels the long-press timer, but keeps the
    // gesture "live" so we can still track it as a swipe.
    if (adx > 10 || ady > 10) cancelLongPressTimer(m.id);

    // Rightward, predominantly-horizontal drag = swipe-to-reply.
    if (dx > 8 && adx > ady) {
      const display = dx <= SWIPE_MAX ? dx : SWIPE_MAX + (dx - SWIPE_MAX) * SWIPE_RESISTANCE;
      setActiveDragId(m.id);
      setDragOffsets((prev) => ({ ...prev, [m.id]: display }));

      if (dx > SWIPE_THRESHOLD && !swipeTriggered.current[m.id]) {
        swipeTriggered.current[m.id] = true;
        if (navigator.vibrate) navigator.vibrate(12);
        startReply(m);
      }
    }
  }

  /** Ends a gesture (pointer up/leave/cancel) — stops the long-press
   *  timer and springs any swipe offset back to 0. */
  function endGesture(id: string) {
    cancelLongPressTimer(id);
    delete longPressStart.current[id];
    swipeTriggered.current[id] = false;
    setActiveDragId(null);
    setDragOffsets((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  const currentMatchId = matches[matchIndex]?.id;

  const activeReactions = activeMessage ? reactionsByMessage?.[activeMessage.message.id] ?? [] : [];
  const activeMyReaction = activeMessage
    ? activeReactions.find((r) => r.user_id === user?.id)?.emoji ?? null
    : null;
  const activeState = activeMessage ? userStates?.[activeMessage.message.id] : undefined;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        {searchOpen ? (
          <>
            <button onClick={closeSearch} className="text-ink-muted flex-shrink-0" aria-label="Close search">
              <ArrowLeft size={22} />
            </button>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation…"
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none text-sm"
            />
            {searchQuery && (
              <>
                <span className="text-xs text-ink-muted flex-shrink-0 tabular-nums">
                  {matches.length ? `${matchIndex + 1}/${matches.length}` : "0/0"}
                </span>
                <button
                  onClick={goToPrevMatch}
                  disabled={!matches.length}
                  className="text-ink-muted disabled:opacity-30 flex-shrink-0"
                  aria-label="Previous match"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={goToNextMatch}
                  disabled={!matches.length}
                  className="text-ink-muted disabled:opacity-30 flex-shrink-0"
                  aria-label="Next match"
                >
                  <ChevronDown size={18} />
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button onClick={() => navigate("/messages")} className="text-ink-muted flex-shrink-0" aria-label="Back">
              <ArrowLeft size={22} />
            </button>
            {otherParticipant && (
              <>
                <Avatar src={otherParticipant.avatar_url} name={otherParticipant.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{otherParticipant.display_name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <PresenceDot lastSeenAt={otherParticipant.last_seen_at} />
                    {formatLastSeen(otherParticipant.last_seen_at)}
                  </p>
                </div>
              </>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              className="text-ink-muted flex-shrink-0"
              aria-label="Search in conversation"
            >
              <Search size={20} />
            </button>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full" style={chatBackgroundStyle}>
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !messages || messages.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Say hello.</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === user?.id;
            const isCurrentMatch = m.id === currentMatchId;
            const reactions = reactionsByMessage?.[m.id] ?? [];
            const myReaction = reactions.find((r) => r.user_id === user?.id)?.emoji ?? null;

            const offset = dragOffsets[m.id] ?? 0;
            const isDraggingThis = activeDragId === m.id;
            const isFlashed = flashMessageId === m.id;
            const repliedTo = m.reply_to?.[0];

            return (
              <div key={m.id} className={`relative flex flex-col mb-2 ${isMine ? "items-end" : "items-start"}`}>
                {/* Reply icon revealed in the gap uncovered by the swipe —
                    fades/scales in with drag progress, "locks" past threshold. */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft text-accent pointer-events-none"
                  style={{
                    opacity: Math.min(offset / SWIPE_THRESHOLD, 1),
                    transform: `translateY(-50%) scale(${offset >= SWIPE_THRESHOLD ? 1 : 0.7})`,
                    transition: isDraggingThis ? "none" : "opacity 150ms, transform 150ms",
                  }}
                >
                  <Reply size={16} />
                </div>

                <div
                  ref={(el) => {
                    messageRefs.current[m.id] = el;
                  }}
                  onPointerDown={(e) => handlePointerDown(m, e)}
                  onPointerMove={(e) => handlePointerMove(m, e)}
                  onPointerUp={() => endGesture(m.id)}
                  onPointerLeave={() => endGesture(m.id)}
                  onPointerCancel={() => endGesture(m.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words select-none ${
                    isMine ? "bg-accent text-canvas" : "bg-surface text-ink"
                  } ${
                    isCurrentMatch || isFlashed ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : ""
                  }`}
                  style={{
                    WebkitTouchCallout: "none",
                    transform: `translateX(${offset}px)`,
                    transition: isDraggingThis
                      ? "none"
                      : "transform 200ms ease-out, box-shadow 300ms, background-color 300ms",
                  }}
                >
                  {repliedTo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToMessage(repliedTo.id);
                      }}
                      className={`block w-full text-left mb-1.5 pl-2 border-l-2 rounded-sm text-xs ${
                        isMine
                          ? "border-canvas/50 text-canvas/80"
                          : "border-accent/50 text-ink-muted"
                      }`}
                    >
                      <span className="block font-medium">
                        {repliedTo.sender_id === user?.id ? "You" : otherParticipant?.display_name ?? "Them"}
                      </span>
                      <span className="block truncate">
                        {repliedTo.is_deleted ? "Original message deleted" : repliedTo.content}
                      </span>
                    </button>
                  )}
                  <span>{searchQuery ? highlightMatches(m.content, searchQuery, isMine) : m.content}</span>
                  {isMine && (
                    <span className="flex justify-end mt-1">
                      <MessageStatusTicks deliveredAt={m.delivered_at} readAt={m.read_at} />
                    </span>
                  )}
                </div>
                <ReactionsBar
                  reactions={reactions}
                  myReaction={myReaction}
                  isMine={isMine}
                  onToggle={(emoji) => {
                    if (myReaction === emoji) {
                      removeReaction.mutate(m.id);
                    } else {
                      setReaction.mutate({ messageId: m.id, emoji });
                    }
                  }}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 bg-canvas border-t border-border max-w-xl mx-auto w-full">
        {replyTarget && (
          <div className="flex items-start gap-2 px-4 pt-2.5">
            <div className="flex-1 min-w-0 border-l-2 border-accent pl-2 py-0.5">
              <p className="text-xs font-medium text-accent">
                Replying to {replyTarget.sender_id === user?.id ? "yourself" : otherParticipant?.display_name ?? "them"}
              </p>
              <p className="text-xs text-ink-muted truncate">{replyTarget.content}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-ink-muted flex-shrink-0 p-1"
              aria-label="Cancel reply"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              inputRef.current?.blur(); // stop the OS keyboard from lingering under our sheet
              setEmojiPickerTarget((current) => (current?.mode === "input" ? null : { mode: "input" }));
            }}
            className="text-ink-muted flex-shrink-0"
            aria-label={emojiPickerTarget?.mode === "input" ? "Switch to keyboard" : "Add emoji"}
          >
            {emojiPickerTarget?.mode === "input" ? <Keyboard size={22} /> : <Smile size={22} />}
          </button>
          <input
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            placeholder="Message…"
            className="flex-1 px-4 py-2.5 rounded-full border border-border bg-surface text-ink
              focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!content.trim() || sendMessage.isPending}
            className="bg-accent text-canvas rounded-full p-2.5 transition-colors hover:bg-accent-hover active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {activeMessage && (
        <MessageActionMenu
          content={activeMessage.message.content}
          isMine={activeMessage.message.sender_id === user?.id}
          anchorRect={activeMessage.anchorRect}
          isStarred={!!activeState?.starred_at}
          isPinned={!!activeState?.pinned_at}
          emojis={topEmojis}
          myReaction={activeMyReaction}
          onReact={(emoji) => setReaction.mutate({ messageId: activeMessage.message.id, emoji })}
          onRemoveReaction={() => removeReaction.mutate(activeMessage.message.id)}
          onOpenFullPicker={() => setEmojiPickerTarget({ mode: "reaction", messageId: activeMessage.message.id })}
          onCopy={() => navigator.clipboard.writeText(activeMessage.message.content)}
          onDelete={
            activeMessage.message.sender_id === user?.id
              ? () => deleteMessage.mutate(activeMessage.message.id)
              : undefined
          }
          onShare={() => {
            if (navigator.share) {
              navigator.share({ text: activeMessage.message.content }).catch(() => {});
            } else {
              navigator.clipboard.writeText(activeMessage.message.content);
            }
          }}
          onReply={() => startReply(activeMessage.message)}
          onToggleStar={() =>
            toggleStar.mutate({ messageId: activeMessage.message.id, active: !activeState?.starred_at })
          }
          onTogglePin={() =>
            togglePin.mutate({ messageId: activeMessage.message.id, active: !activeState?.pinned_at })
          }
          onClose={() => setActiveMessage(null)}
        />
      )}

      {emojiPickerTarget && (
        <EmojiPickerSheet
          mode={emojiPickerTarget.mode}
          content={emojiPickerTarget.mode === "input" ? content : undefined}
          onBackspace={() => setContent((c) => removeLastGrapheme(c))}
          onClose={() => setEmojiPickerTarget(null)}
          onSelect={(emoji) => {
            if (emojiPickerTarget.mode === "input") {
              setContent((c) => c + emoji);
              trackEmojiUsage.mutate(emoji);
            } else {
              setReaction.mutate({ messageId: emojiPickerTarget.messageId, emoji });
              setEmojiPickerTarget(null);
            }
          }}
        />
      )}
    </div>
  );
      }
