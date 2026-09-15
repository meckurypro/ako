// src/components/CollaboratorsSheet.tsx
import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import {
  useCollaborators,
  useSendCollaborationRequest,
  useRemoveCollaborator,
  type CollaborationTarget,
} from "../hooks/useCollaboration";
import { useGigRolesByCategory } from "../hooks/usePortfolio";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import { PeoplePicker } from "./PeoplePicker";
import { useToast } from "./Toast";
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
  const { grouped: roleGroups } = useGigRolesByCategory();
  const [showPicker, setShowPicker] = useState(false);
  // Projects only: after picking people, a short "assign a role"
  // step before anything is sent (spec §11 — role is what lets an
  // accepted invite surface as "Chidi — Cinematographer" and can
  // trigger automatic Gig setup for them). Posts skip straight to
  // sending, same as before — collaboration on a post has no role
  // concept. Untouched entries in this map just mean "no role
  // assigned", which is fine; role-tagging is optional.
  const [pendingInvitees, setPendingInvitees] = useState<MentionCandidate[] | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useBackDismiss(onClose);
  useScrollLock();

  // The picker starts blank, not pre-filled with current collaborators
  // — inviting is additive here (each confirm sends fresh requests),
  // unlike tagging where the picker sets the whole list at once.
  function handlePickerConfirm(selected: MentionCandidate[]) {
    if (target === "project") {
      setPendingInvitees(selected);
      setShowPicker(false);
      return;
    }
    sendInvites(selected, {});
  }

  function sendInvites(people: MentionCandidate[], roles: Record<string, string>) {
    setError(null);
    setSending(true);
    Promise.all(people.map((p) => sendRequest.mutateAsync({ targetId, userId: p.id, roleId: roles[p.id] })))
      .then(() => {
        setShowPicker(false);
        setPendingInvitees(null);
        setRoleAssignments({});
        toast(people.length > 1 ? "Invites sent." : "Invite sent.", { variant: "success" });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't send one or more invites."))
      .finally(() => setSending(false));
  }

  return (
    <>
      <Portal>
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
          <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-display text-lg text-ink">
                  {pendingInvitees ? "Assign roles" : "Collaborators"}
                </h2>
                <p className="text-xs text-ink-muted">
                  {pendingInvitees
                    ? "Optional — what each person contributed as. Helps their work surface on their profile."
                    : `Invite others to be credited as collaborators on this ${target}.`}
                </p>
              </div>
              <button
                onClick={pendingInvitees ? () => setPendingInvitees(null) : onClose}
                className="p-1 text-ink-muted"
                aria-label={pendingInvitees ? "Back" : "Close"}
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3">
              {pendingInvitees ? (
                <div className="space-y-2">
                  {pendingInvitees.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl border border-border bg-canvas">
                      <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{p.display_name}</p>
                        <select
                          value={roleAssignments[p.id] ?? ""}
                          onChange={(e) =>
                            setRoleAssignments((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="text-xs text-ink-muted bg-transparent border-0 p-0 focus:outline-none focus:ring-0 w-full"
                        >
                          <option value="">No role</option>
                          {[...roleGroups.entries()].map(([category, roles]) => (
                            <optgroup key={category} label={category}>
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isLoading ? (
                <p className="text-ink-muted text-sm text-center py-10">Loading…</p>
              ) : !collaborators || collaborators.length === 0 ? (
                <p className="text-ink-muted text-sm text-center py-10">No collaborators yet.</p>
              ) : (
                <div className="space-y-1">
                  {collaborators.map((c) => (
                    <div key={c.user.id} className="flex items-center gap-3 py-2 px-1">
                      <Avatar src={c.user.avatar_url} name={c.user.display_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">
                          {c.user.display_name}
                          {c.role_label && <span className="text-ink-muted font-normal"> — {c.role_label}</span>}
                        </p>
                        <p className="text-xs text-ink-muted truncate">
                          {STATUS_LABEL[c.status] ?? c.status}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          removeCollaborator.mutate(
                            { targetId, userId: c.user.id },
                            { onSuccess: () => toast(`${c.user.display_name} removed.`, { variant: "success" }) }
                          )
                        }
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
              {pendingInvitees ? (
                <button
                  onClick={() => sendInvites(pendingInvitees, roleAssignments)}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-60"
                >
                  {sending ? "Sending…" : pendingInvitees.length > 1 ? "Send invites" : "Send invite"}
                </button>
              ) : (
                <button
                  onClick={() => setShowPicker(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-canvas text-sm font-medium"
                >
                  <UserPlus size={16} />
                  Invite collaborators
                </button>
              )}
            </div>
          </div>
        </div>
      </Portal>

      {showPicker && (
        <PeoplePicker
          title="Invite collaborators"
          subtitle="They'll get a request to accept before they're credited."
          confirmLabel={target === "project" ? "Next" : "Send invites"}
          onConfirm={handlePickerConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
