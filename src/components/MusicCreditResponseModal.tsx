// src/components/MusicCreditResponseModal.tsx
//
// Opened from a tap on a "music_credit_request" notification (see
// Notifications.tsx) — same shape as CollaborationInviteResponseModal,
// for the same reason: this needs a synchronous accept/decline step,
// not a plain link. Accepting runs respond_to_music_credit() server-
// side, which may start an incomplete Gig for this role (section 11)
// — declining never creates any Gig relationship (section 9).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./Avatar";
import { Portal } from "./Portal";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { useMyPendingMusicCredits, useRespondToMusicCredit } from "../hooks/useMusicCatalogue";
import { CONTRIBUTOR_ROLE_LABELS } from "../types/music";
import { useToast } from "./Toast";

export function MusicCreditResponseModal({
  catalogueId,
  onClose,
}: {
  catalogueId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: credits, isLoading } = useMyPendingMusicCredits();
  const respond = useRespondToMusicCredit();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  useBackDismiss(onClose);
  useScrollLock();

  const credit = credits?.find((c) => c.catalogue_id === catalogueId);

  function handleRespond(accept: boolean) {
    setError(null);
    respond.mutate(
      { catalogueId, accept },
      {
        onSuccess: (result) => {
          onClose();
          if (accept && result.gig_created && result.gig_id) {
            toast("Credit accepted — a Gig was started for you.", { variant: "success" });
            navigate(`/projects/${result.gig_id}`);
          } else if (accept) {
            toast("Credit accepted.", { variant: "success" });
          } else {
            toast("Credit declined.", { variant: "success" });
          }
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't respond to this credit."),
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
          ) : !credit ? (
            <div className="text-center py-4">
              <p className="text-sm text-ink-muted">
                This credit request isn't pending anymore — it may have already been responded to.
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
                <Avatar src={credit.creator.avatar_url} name={credit.creator.display_name} size="md" />
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{credit.creator.display_name}</p>
                  <p className="text-sm text-ink-muted truncate">
                    Credited you as {CONTRIBUTOR_ROLE_LABELS[credit.role]}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3">
                <div className="flex items-center gap-3">
                  {credit.cover_url ? (
                    <img
                      src={credit.cover_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-surface border border-border" />
                  )}
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm text-ink truncate">{credit.title}</p>
                    <p className="text-xs text-ink-muted truncate">{credit.primary_artist_name}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-ink-muted mt-3">
                Accepting may start a {CONTRIBUTOR_ROLE_LABELS[credit.role]} Gig for you if you don't already
                have one, with this song added as a portfolio sample.
              </p>

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
