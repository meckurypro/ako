// src/pages/HiddenMessages.tsx
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Undo2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useHiddenMessages, useUnhideMessage } from "../hooks/useMessageReactions";

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Everything the current user has hidden from their own view of this
 * conversation (message_user_state.hidden_at) — the other participant
 * never knows a message was hidden, and hiding never touches their
 * copy. Each row can be restored individually, which puts it straight
 * back in its original position in the thread.
 */
export function HiddenMessages() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: hidden, isLoading } = useHiddenMessages(conversationId!);
  const unhide = useUnhideMessage(conversationId!);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Hidden messages</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !hidden || hidden.length === 0 ? (
          <p className="text-ink-muted text-center py-16 text-sm">
            Nothing hidden here. Messages you hide from a chat show up in this list, only for you.
          </p>
        ) : (
          hidden.map((m) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className="flex items-start gap-3 py-3.5 border-b border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-muted mb-0.5">
                    {isMine ? "You" : "Them"} · {formatTime(m.created_at)}
                  </p>
                  <p className={`text-sm text-ink truncate ${m.is_deleted ? "italic opacity-70" : ""}`}>
                    {m.is_deleted ? "This message was deleted" : m.content}
                  </p>
                </div>
                <button
                  onClick={() => unhide.mutate(m.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-accent flex-shrink-0 py-1"
                >
                  <Undo2 size={14} />
                  Restore
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
