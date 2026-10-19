// src/components/ForewordPreviewBar.tsx
// A slim bar shown to someone who was invited to write a foreword while they read the book or course: a reminder of why
// they can see it, and a one-tap way to write (or edit) the foreword without leaving.
import { useState } from "react";
import { PenLine } from "lucide-react";
import { ForewordInviteModal } from "./ForewordInviteModal";
import { isInviteOpen, useMyForeword } from "../hooks/useForewords";

export function ForewordPreviewBar({ projectId, isOwner = false }: { projectId: string; isOwner?: boolean }) {
  const { data: foreword } = useMyForeword(isOwner ? undefined : projectId);
  const [open, setOpen] = useState(false);

  const invited = !!foreword && isInviteOpen(foreword);
  const pending = foreword?.status === "submitted";
  if (isOwner || !foreword || (!invited && !pending)) return null;

  return (
    <>
      <div className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none">
        <div className="mx-auto max-w-md pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-surface/95 backdrop-blur px-4 py-2.5 shadow-lg">
          <p className="flex-1 min-w-0 text-xs text-ink-muted">
            {invited ? "You're previewing this to write a foreword." : "Your foreword is with the creator for review."}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 flex-shrink-0 px-3.5 py-1.5 rounded-full bg-accent text-canvas text-xs font-medium"
          >
            <PenLine size={13} />
            {invited ? "Write it" : "View"}
          </button>
        </div>
      </div>
      {open && <ForewordInviteModal projectId={projectId} onClose={() => setOpen(false)} />}
    </>
  );
}
