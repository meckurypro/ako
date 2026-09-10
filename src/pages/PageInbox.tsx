// src/pages/PageInbox.tsx
//
// Page-mode counterpart to ConversationList.tsx — deliberately simpler
// (no pin/archive/multi-select/search) for this first version. See the
// scope note at the top of usePageInbox.ts.
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import { useActiveIdentity } from "../hooks/usePages";
import { usePageConversations, type PageConversationSummary } from "../hooks/usePageInbox";
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

function ConversationRow({ c }: { c: PageConversationSummary }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/page-inbox/${c.id}`)}
      className="w-full flex items-center gap-3 py-3 text-left"
    >
      <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${c.unreadCount > 0 ? "font-semibold text-ink" : "font-medium text-ink"}`}>
            {c.other_participant.display_name}
          </p>
          <span className="text-xs text-ink-muted flex-shrink-0 ml-2">{timeAgo(c.last_message_at)}</span>
        </div>
        <p className={`text-sm truncate ${c.unreadCount > 0 ? "text-ink" : "text-ink-muted"}`}>
          {c.last_message
            ? `${c.last_message.sender_type === "page" ? "You: " : ""}${c.last_message.content}`
            : "Say hello"}
        </p>
      </div>
      {c.unreadCount > 0 && (
        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-canvas text-xs font-semibold flex items-center justify-center flex-shrink-0">
          {c.unreadCount > 99 ? "99+" : c.unreadCount}
        </span>
      )}
    </button>
  );
}

export function PageInbox() {
  const smartBack = useSmartBack();
  const { data: identity } = useActiveIdentity();
  const pageId = identity?.mode === "page" ? identity.page.id : undefined;
  const { data: conversations, isLoading } = usePageConversations(pageId);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={smartBack} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink flex-1">
          {identity?.mode === "page" ? `${identity.page.name}'s Messages` : "Messages"}
        </h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">
            No conversations yet for this page.
          </p>
        ) : (
          conversations.map((c) => <ConversationRow key={c.id} c={c} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}
