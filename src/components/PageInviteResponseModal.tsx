// src/components/PageInviteResponseModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./Avatar";
import { Modal } from "./Modal";
import { useMyPendingPageInvites, useRespondToPageInvite } from "../hooks/usePages";

// Opened from a tap on a page_role_invite notification (see
// Notifications.tsx) — this is the missing "accept or decline" step
// that team invites previously had no UI for at all. Looks up the
// specific invite by pageId from the same pending-invites list the
// notification came from, rather than a dedicated fetch, since that
// list is already the source of truth and likely already cached.
//
// Built on the shared <Modal> wrapper — see Modal.tsx.
export function PageInviteResponseModal({
  pageId,
  onClose,
}: {
  pageId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: invites, isLoading } = useMyPendingPageInvites();
  const respond = useRespondToPageInvite();
  const [error, setError] = useState<string | null>(null);

  const invite = invites?.find((i) => i.page.id === pageId);

  function handleRespond(accept: boolean) {
    setError(null);
    respond.mutate(
      { page_id: pageId, accept },
      {
        onSuccess: () => {
          if (accept && invite) {
            onClose();
            navigate(`/page/${invite.page.username}`);
          } else {
            onClose();
          }
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Couldn't respond to this invite.");
        },
      }
    );
  }

  return (
    <Modal onClose={onClose}>
      {isLoading ? (
        <p className="text-sm text-ink-muted text-center py-6">Loading…</p>
      ) : !invite ? (
        // Already responded to (e.g. from another device/tab) or the
        // invite was withdrawn — nothing left to act on here.
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
            <Avatar src={invite.page.avatar_url} name={invite.page.name} size="md" />
            <div className="min-w-0">
              <p className="font-medium text-ink truncate">{invite.page.name}</p>
              <p className="text-sm text-ink-muted truncate">
                Invited you as {invite.role_label}
              </p>
            </div>
          </div>

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
    </Modal>
  );
}
