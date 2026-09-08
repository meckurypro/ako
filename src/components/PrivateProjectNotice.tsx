// src/components/PrivateProjectNotice.tsx
import { Lock, MessageCircle } from "lucide-react";

interface PrivateProjectNoticeProps {
  onMessage: () => void;
  messagePending: boolean;
}

/**
 * Replaces a private project's description/media/buy-action region for
 * a non-member visitor (see ProjectCard's privacyBlocked). Mirrors the
 * existing private-profile lock treatment in ProfilePage — same idea,
 * scoped to one project instead of a whole profile: the title/price
 * stays visible above this, but nothing about the actual content or
 * how to unlock it does. The only way in is the owner adding the
 * visitor to project_members, which is why this offers a message
 * button rather than any kind of request-to-buy flow.
 */
export function PrivateProjectNotice({ onMessage, messagePending }: PrivateProjectNoticeProps) {
  return (
    <div className="mt-3 flex flex-col items-center text-center py-6 px-4 rounded-xl bg-canvas border border-border">
      <Lock size={22} className="text-accent mb-2" />
      <p className="text-sm font-medium text-ink">This project is private</p>
      <p className="text-xs text-ink-muted mt-1 max-w-xs">
        Only people the creator has given access to can view this. Message them to ask for access.
      </p>
      <button
        onClick={onMessage}
        disabled={messagePending}
        className="mt-4 flex items-center gap-1.5 bg-accent text-canvas px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
      >
        <MessageCircle size={15} />
        {messagePending ? "Opening…" : "Message for access"}
      </button>
    </div>
  );
}
