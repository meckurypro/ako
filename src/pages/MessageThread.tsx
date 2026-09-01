// src/pages/MessageThread.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Search, ChevronUp, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useMarkMessagesRead,
  type MessageWithSender,
} from "../hooks/useMessaging";
import { Avatar } from "../components/Avatar";
import { MessageStatusTicks } from "../components/MessageStatusTicks";

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
        .select("profile:profiles!conversation_participants_user_id_fkey(username, display_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .neq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.profile as { username: string; display_name: string; avatar_url: string | null } | undefined;
    },
    enabled: !!conversationId && !!user,
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

export function MessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId!);
  const { data: otherParticipant } = useOtherParticipant(conversationId!);
  const sendMessage = useSendMessage(conversationId!);
  const markConversationRead = useMarkConversationRead(conversationId!);

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
    setContent("");
    try {
      await sendMessage.mutateAsync(text);
    } catch {
      setContent(text); // restore on failure so the user doesn't lose what they typed
    }
  }

  const currentMatchId = matches[matchIndex]?.id;

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
                <p className="font-medium text-ink flex-1 truncate">{otherParticipant.display_name}</p>
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
            return (
              <div key={m.id} className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  ref={(el) => {
                    messageRefs.current[m.id] = el;
                  }}
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words transition-shadow duration-300 ${
                    isMine ? "bg-accent text-canvas" : "bg-surface text-ink"
                  } ${isCurrentMatch ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : ""}`}
                >
                  <span>{searchQuery ? highlightMatches(m.content, searchQuery, isMine) : m.content}</span>
                  {isMine && (
                    <span className="flex justify-end mt-1">
                      <MessageStatusTicks deliveredAt={m.delivered_at} readAt={m.read_at} />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 bg-canvas border-t border-border px-4 py-3 flex items-center gap-2 max-w-xl mx-auto w-full"
      >
        <input
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
  );
}
