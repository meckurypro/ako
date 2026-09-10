// src/components/PostCollaboratorsBadge.tsx
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useCollaborators, type CollaborationTarget } from "../hooks/useCollaboration";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";

/**
 * Sits absolutely-positioned on the corner of a post/project's avatar
 * (the parent needs `position: relative`) — only accepted
 * collaborators count (an outstanding invite isn't "posted with"
 * anyone yet), so this renders nothing until at least one has
 * actually accepted. Tapping it opens a small dropdown of everyone
 * credited, each linking to their profile.
 */
export function PostCollaboratorsBadge({
  target,
  targetId,
}: {
  target: CollaborationTarget;
  targetId: string;
}) {
  const { data: collaborators } = useCollaborators(target, targetId);
  const accepted = (collaborators ?? []).filter((c) => c.status === "accepted");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useBackDismiss(() => setOpen(false), open);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const width = 224; // w-56
    setStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: Math.min(Math.max(8, rect.left - 8), viewportW - width - 8),
    });
  }, [open]);

  if (accepted.length === 0) return null;

  return (
    <>
      <button
        ref={anchorRef}
        onClick={(e) => {
          // Avatar sits inside a <Link to profile> in PostCard/ProjectCard —
          // stop it navigating when the badge itself is tapped.
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={`Posted with ${accepted.length} ${accepted.length === 1 ? "collaborator" : "collaborators"}`}
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent text-canvas border-2 border-surface flex items-center justify-center"
      >
        <Users size={11} strokeWidth={2.5} />
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            style={style ?? { position: "fixed", opacity: 0 }}
            className="z-50 w-56 bg-canvas border border-border rounded-xl shadow-lg py-2"
          >
            <p className="px-3 pb-1.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">
              Posted with
            </p>
            {accepted.map((c) => (
              <Link
                key={c.user.id}
                to={`/profile/${c.user.username}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface"
              >
                <Avatar src={c.user.avatar_url} name={c.user.display_name} size="sm" />
                <span className="text-sm text-ink truncate">{c.user.display_name}</span>
              </Link>
            ))}
          </div>
        </Portal>
      )}
    </>
  );
}
