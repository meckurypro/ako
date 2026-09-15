// src/pages/Messages.tsx
//
// Composition wrapper for /messages and /messages/:conversationId. Renders
// the exact same ConversationList and MessageThread pages that already
// existed as two separate full-screen routes — no messaging logic, hooks,
// realtime subscriptions, or permissions are duplicated or reimplemented
// here, only how the two are arranged in space:
//
//   mobile (< md):  unchanged — exactly one of the two, full-screen, the
//                    other unmounted entirely (so no background realtime
//                    work happens for the screen you're not on).
//   desktop (>= md): conversation list | active thread, side by side,
//                    per audit doc section 15 ("one of the strongest
//                    opportunities for desktop-specific UX").
//
// Mounting (not just CSS visibility) is what's conditional on mobile —
// see useIsDesktop — specifically so ConversationList's realtime
// subscription doesn't keep running in the background while someone is
// reading a thread on their phone.
import { useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { useIsDesktop } from "../hooks/useMediaQuery";

function MessagesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-ink-muted">
      <MessageCircle size={40} strokeWidth={1.5} />
      <p className="text-sm">Select a conversation to start reading</p>
    </div>
  );
}

export function Messages() {
  const { conversationId } = useParams();
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    // Identical to the old two-route behavior: exactly one screen mounted.
    return conversationId ? <MessageThread /> : <ConversationList />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[380px] shrink-0 h-full overflow-y-auto border-r border-border">
        <ConversationList />
      </div>
      <div className="flex-1 h-full overflow-y-auto flex flex-col">
        {conversationId ? <MessageThread /> : <MessagesEmptyState />}
      </div>
    </div>
  );
}
