// src/components/CollaboratorsSheet.tsx
import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import {
  useCollaborators,
  useSendCollaborationRequest,
  useRemoveCollaborator,
  type CollaborationTarget,
} from "../hooks/useCollaboration";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import { PeoplePicker } from "./PeoplePicker";
import type { MentionCandidate } from "../hooks/useMentions";

const STATUS_LABEL: Record<string, string> = {
  invited: "Pending",
  accepted: "Collaborator",
  declined: "Declined",
};

export function CollaboratorsSheet({
  target,
  targetId,
  onClose,
}: {
  target: CollaborationTarget;
  targetId: string;
  onClose: () => void;
}) {
  const { data: collaborators, isLoading } = useCollaborators(target, targetId);
  const sendRequest = useSendCollaborationRequest(target);
  const removeCollaborator = useRemoveCollaborator(target);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBackDismiss(onClose);
  useScrollLock();

  // The picker starts blank, not pre-filled with current collaborators
  // — inviting is additive here (each confirm sends fresh requests),
  // unlike tagging where the picker sets the whole list at once.
  function handleInvite(selected: MentionCandidate[]) {
    setError(null);
    Promise.all(selected.map((p) => sendRequest.mutateAsync({ targetId, userId: p.id })))
      .then(() => setShowPicker(false))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't send one or more invites."));
  }

  return (
    <>
      <Portal>
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
          <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-display text-lg text-ink">Collaborators</h2>
                <p className="text-xs text-ink-muted">Invite others to be credited as collaborators on this {target}.</p>
              </div>
              <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3">
              {isLoading ? (
                <p className="text-ink-muted text-sm text-center py-10">Loading…</p>
              ) : !collaborators || collaborators.length === 0 ? (
                <p className="text-ink-muted text-sm text-center py-10">No collaborators yet.</p>
              ) : (
                <div className="space-y-1">
                  {collaborators.map((c) => (
                    <div key={c.user.id} className="flex items-center gap-3 py-2 px-1">
                      <Avatar src={c.user.avatar_url} name={c.user.display_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{c.user.display_name}</p>
                        <p className="text-xs text-ink-muted truncate">
                          {STATUS_LABEL[c.status] ?? c.status}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCollaborator.mutate({ targetId, userId: c.user.id })}
                        className="text-xs text-danger px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-danger mt-2">{error}</p>}
            </div>

            <div className="px-4 py-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowPicker(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-canvas text-sm font-medium"
              >
                <UserPlus size={16} />
                Invite collaborators
              </button>
            </div>
          </div>
        </div>
      </Portal>

      {showPicker && (
        <PeoplePicker
          title="Invite collaborators"
          subtitle="They'll get a request to accept before they're credited."
          confirmLabel="Send invites"
          onConfirm={handleInvite}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
