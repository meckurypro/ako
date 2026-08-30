import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useMessages, useSendMessage, useMarkConversationRead } from "../hooks/useMessaging";
import { Avatar } from "../components/Avatar";

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

export function MessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId!);
  const { data: otherParticipant } = useOtherParticipant(conversationId!);
  const sendMessage = useSendMessage(conversationId!);
  const markRead = useMarkConversationRead(conversationId!);

  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate("/messages")} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        {otherParticipant && (
          <>
            <Avatar src={otherParticipant.avatar_url} name={otherParticipant.display_name} size="sm" />
            <p className="font-medium text-ink">{otherParticipant.display_name}</p>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !messages || messages.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Say hello.</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                    isMine ? "bg-accent text-canvas" : "bg-surface text-ink"
                  }`}
                >
                  {m.content}
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
          disabled={!content.trim()}
          className="bg-accent text-canvas rounded-full p-2.5 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
