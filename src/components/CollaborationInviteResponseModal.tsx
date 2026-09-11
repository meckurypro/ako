// src/components/CollaborationInviteResponseModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./Avatar";
import { Portal } from "./Portal";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import {
  useMyPendingCollaborationInvites,
  useRespondToCollaborationRequest,
  type CollaborationTarget,
} from "../hooks/useCollaboration";

// Same shape as PageInviteResponseModal — opened from a tap on a
// collaboration_invite notification (see Notifications.tsx), looking
// the specific invite up in the already-cached pending-invites list.
export function CollaborationInviteResponseModal({
  target,
  targetId,
  onClose,
}: {
  target: CollaborationTarget;
  targetId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: invites, isLoading } = useMyPendingCollaborationInvites();
  const respond = useRespondToCollaborationRequest(target);
  const [error, setError] = useState<string | null>(null);

  useBackDismiss(onClose);
  useScrollLock();

  const list = target === "post" ? invites?.posts : invites?.projects;
  const invite = list?.find((i: any) => (target === "post" ? i.post_id : i.project_id) === targetId);
  const previewContent = target === "post" ? (invite as any)?.post : (invite as any)?.project;

  function handleRespond(accept: boolean) {
    setError(null);
    respond.mutate(
      { targetId, accept },
      {
        onSuccess: () => {
          onClose();
          if (accept) navigate(target === "post" ? `/post/${targetId}` : `/projects/${targetId}`);
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't respond to this invite."),
      }
    );
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
        <div className="relative w-full max-w-sm bg-surface rounded-2xl border border-border p-5 shadow-xl">
          {isLoading ? (
            <p className="text-sm text-ink-muted text-center py-6">Loading…</p>
          ) : !invite ? (
            <div className="text-center py-4">
              <p className="text-sm text-ink-muted">
                This invite isn't pending anymore — it may have already been responded to.
              </p>
              <button
                onClick={onClose}
                className="mt-4 w-full py-2.5 rounded-full border border-border text-sm font-medium text-ink"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar src={invite.inviter.avatar_url} name={invite.inviter.display_name} size="md" />
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{invite.inviter.display_name}</p>
                  <p className="text-sm text-ink-muted truncate">
                    Invited you to collaborate on their {target}
                  </p>
                </div>
              </div>

              {/* What you're being asked to collaborate on — shown so
                  the decision isn't made blind. `previewContent` is
                  null when the post/project was deleted after the
                  invite was sent (the invite row itself survives). */}
              {target === "post" ? (
                !previewContent ? (
                  <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3 text-sm text-ink-muted">
                    This post is no longer available.
                  </div>
                ) : previewContent.is_archived ? (
                  <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3 text-sm text-ink-muted">
                    This post has been archived by its author.
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={previewContent.author.avatar_url}
                        name={previewContent.author.display_name}
                        size="sm"
                      />
                      <span className="font-display font-semibold text-sm text-ink truncate">
                        {previewContent.author.display_name}
                      </span>
                    </div>
                    {previewContent.content && (
                      <p className="text-sm text-ink mt-1.5 whitespace-pre-wrap break-words line-clamp-4">
                        {previewContent.content}
                      </p>
                    )}
                    {previewContent.media_urls?.length > 0 && (
                      <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-surface border border-border">
                        <img src={previewContent.media_urls[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )
              ) : !previewContent ? (
                <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3 text-sm text-ink-muted">
                  This project is no longer available.
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    {previewContent.thumbnail_url ? (
                      <img
                        src={previewContent.thumbnail_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-surface border border-border" />
                    )}
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm text-ink truncate">
                        {previewContent.title}
                      </p>
                      {previewContent.description && (
                        <p className="text-xs text-ink-muted truncate">{previewContent.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-danger mt-3">{error}</p>}

              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => handleRespond(false)}
                  disabled={respond.isPending}
                  className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-ink disabled:opacity-60"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleRespond(true)}
                  disabled={respond.isPending}
                  className="flex-1 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-60"
                >
                  Accept
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
