// src/components/ForwardMessageSheet.tsx
import { useMemo, useState } from "react";
import { Search, X, Send } from "lucide-react";
import { useConversations, useForwardMessages } from "../hooks/useMessaging";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Avatar } from "./Avatar";

interface ForwardMessageSheetProps {
  /** Content of the message(s) being forwarded, in thread order. */
  messages: { content: string }[];
  onClose: () => void;
  onSent: () => void;
}

/**
 * In-app "share to another user" — picks from the current user's
 * existing conversations (same list ConversationList shows) and resends
 * the forwarded content as new messages there. Deliberately scoped to
 * existing conversations rather than a full user search: starting a
 * brand-new DM already has its own entry point from a profile page, and
 * reusing that here would duplicate it for little benefit.
 */
export function ForwardMessageSheet({ messages, onClose, onSent }: ForwardMessageSheetProps) {
  useBackDismiss(onClose);
  const { data: conversations, isLoading } = useConversations();
  const forwardMessages = useForwardMessages();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !conversations) return conversations ?? [];
    return conversations.filter((c) => {
      const { display_name, username } = c.other_participant;
      return display_name.toLowerCase().includes(q) || username.toLowerCase().includes(q);
    });
  }, [conversations, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (!selected.size) return;
    await forwardMessages.mutateAsync({
      messages,
      targetConversationIds: [...selected],
    });
    onSent();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[80vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-sm font-medium text-ink">
            Forward {messages.length > 1 ? `${messages.length} messages` : "message"}
          </p>
          <button onClick={onClose} className="text-ink-muted" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full pl-10 pr-3 py-2.5 rounded-full border border-border bg-canvas text-ink text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2">
          {isLoading ? (
            <p className="text-ink-muted text-center py-8 text-sm">Loading…</p>
          ) : !filtered.length ? (
            <p className="text-ink-muted text-center py-8 text-sm">No conversations to forward to.</p>
          ) : (
            filtered.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 text-left"
                >
                  <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} size="sm" />
                  <span className="flex-1 min-w-0 text-sm text-ink truncate">{c.other_participant.display_name}</span>
                  <span
                    className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                      isSelected ? "bg-accent border-accent" : "border-border"
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-canvas" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 pt-2 pb-4">
          <button
            onClick={handleSend}
            disabled={!selected.size || forwardMessages.isPending}
            className="w-full flex items-center justify-center gap-2 bg-accent text-canvas rounded-full py-3 text-sm font-medium disabled:opacity-50"
          >
            <Send size={16} />
            {forwardMessages.isPending
              ? "Sending…"
              : selected.size
                ? `Send to ${selected.size}`
                : "Select someone"}
          </button>
        </div>
      </div>
    </div>
  );
}
