// src/components/ForewordsSheet.tsx
// The creator's Forewords panel for a book or course: invite someone to preview it and write a foreword, then
// approve, decline or remove what comes back. The creator never edits a foreword — only the writer can.
import { useState } from "react";
import { Lock, UserPlus, X } from "lucide-react";
import {
  FOREWORD_MAX_LIVE,
  FOREWORD_NOTE_MAX,
  FOREWORD_STATUS_LABEL,
  isInviteOpen,
  isLiveForeword,
  useInviteForeword,
  useProjectForewords,
  useReviewForeword,
  useRevokeForeword,
  type ForewordWithInvitee,
} from "../hooks/useForewords";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import { PeoplePicker } from "./PeoplePicker";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import type { MentionCandidate } from "../hooks/useMentions";
import { friendlyError } from "../lib/friendlyError";

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

function ForewordText({ text }: { text: string }) {
  return <p className="text-sm text-ink whitespace-pre-wrap break-words mt-2">{text}</p>;
}

function ForewordRow({
  f,
  busy,
  noun,
  onApprove,
  onReject,
  onRemove,
  onRevoke,
}: {
  f: ForewordWithInvitee;
  busy: boolean;
  noun: string;
  onApprove: () => void;
  onReject: () => void;
  onRemove: () => void;
  onRevoke: () => void;
}) {
  const person = f.invitee;
  const expired = f.status === "invited" && !isInviteOpen(f);
  const isUpdate = f.status === "submitted" && !!f.published_body;

  let label: string = FOREWORD_STATUS_LABEL[f.status];
  if (f.status === "invited") label = expired ? "Invite expired" : `Invited · ${daysLeft(f.expires_at)}d left`;
  if (isUpdate) label = "Edit awaiting your review";

  return (
    <div className="rounded-xl border border-border bg-canvas p-3">
      <div className="flex items-center gap-3">
        <Avatar src={person?.avatar_url ?? null} name={person?.display_name ?? "?"} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate">{person?.display_name ?? "Unknown"}</p>
          <p className={`text-xs truncate ${f.status === "submitted" ? "text-accent font-medium" : "text-ink-muted"}`}>
            {label}
          </p>
        </div>
        {f.status === "invited" && !expired && (
          <button onClick={onRevoke} disabled={busy} className="text-xs text-danger px-2 py-1 disabled:opacity-50">
            Cancel
          </button>
        )}
        {(f.status === "approved" || isUpdate) && (
          <button onClick={onRemove} disabled={busy} className="text-xs text-danger px-2 py-1 disabled:opacity-50">
            Remove
          </button>
        )}
      </div>

      {f.status === "submitted" && f.body && (
        <>
          <ForewordText text={f.body} />
          {(f.credit_line || f.disclosure) && (
            <p className="text-xs text-ink-muted mt-2 italic">
              {[f.credit_line, f.disclosure].filter(Boolean).join(" · ")}
            </p>
          )}
          {isUpdate && (
            <p className="text-xs text-ink-muted mt-2">
              The version already in your {noun} stays live until you approve this one.
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onReject}
              disabled={busy}
              className="flex-1 py-2 rounded-full border border-border text-sm font-medium text-ink disabled:opacity-60"
            >
              Decline
            </button>
            <button
              onClick={onApprove}
              disabled={busy}
              className="flex-1 py-2 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-60"
            >
              Approve
            </button>
          </div>
        </>
      )}

      {f.status === "approved" && f.published_body && (
        <>
          <ForewordText text={f.published_body} />
          {(f.published_credit_line || f.published_disclosure) && (
            <p className="text-xs text-ink-muted mt-2 italic">
              {[f.published_credit_line, f.published_disclosure].filter(Boolean).join(" · ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function ForewordsSheet({
  projectId,
  projectType,
  onClose,
}: {
  projectId: string;
  projectType: "book" | "course";
  onClose: () => void;
}) {
  const { data: forewords, isLoading } = useProjectForewords(projectId);
  const invite = useInviteForeword(projectId);
  const review = useReviewForeword(projectId);
  const revoke = useRevokeForeword(projectId);
  const toast = useToast();

  const [showPicker, setShowPicker] = useState(false);
  const [pending, setPending] = useState<MentionCandidate[] | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ForewordWithInvitee | null>(null);

  useBackDismiss(onClose);
  useScrollLock();

  const noun = projectType === "book" ? "book" : "course";
  const sectionNoun = projectType === "book" ? "chapter" : "module";
  const visible = (forewords ?? []).filter((f) => f.status !== "revoked");
  const live = (forewords ?? []).filter(isLiveForeword).length;
  const slotsLeft = Math.max(0, FOREWORD_MAX_LIVE - live);
  const busy = review.isPending || revoke.isPending;

  // Pending first (they need a decision), then published, then invited, then the rest.
  const rank = (f: ForewordWithInvitee) =>
    f.status === "submitted" ? 0 : f.status === "approved" ? 1 : isInviteOpen(f) ? 2 : 3;
  const sorted = visible.slice().sort((a, b) => rank(a) - rank(b));

  function handlePickerConfirm(selected: MentionCandidate[]) {
    const people = selected.filter((p) => p.kind === "profile");
    if (people.length === 0) {
      setShowPicker(false);
      return;
    }
    setError(null);
    if (people.length > slotsLeft) {
      setError(
        slotsLeft === 0
          ? `You already have ${FOREWORD_MAX_LIVE} forewords in progress.`
          : `You can invite ${slotsLeft} more right now.`
      );
      setShowPicker(false);
      return;
    }
    setPending(people);
    setShowPicker(false);
  }

  async function sendInvites() {
    if (!pending) return;
    setError(null);
    setSending(true);
    const failures: string[] = [];
    for (const person of pending) {
      try {
        await invite.mutateAsync({ inviteeId: person.id, note });
      } catch (err) {
        failures.push(`${person.display_name}: ${friendlyError(err, "couldn't invite.")}`);
      }
    }
    setSending(false);
    if (failures.length === 0) {
      toast(pending.length > 1 ? "Invites sent." : "Invite sent.", { variant: "success" });
      setPending(null);
      setNote("");
    } else {
      setError(failures.join(" "));
      // Keep only the ones that failed so a retry doesn't re-send the rest.
      setPending((prev) => (prev ? prev.filter((p) => failures.some((m) => m.startsWith(`${p.display_name}:`))) : prev));
    }
  }

  function decide(f: ForewordWithInvitee, action: "approve" | "reject" | "remove") {
    setError(null);
    review.mutate(
      { forewordId: f.id, action },
      {
        onSuccess: () =>
          toast(
            action === "approve" ? `Added to your ${noun}.` : action === "remove" ? "Foreword removed." : "Foreword declined.",
            { variant: "success" }
          ),
        onError: (err) => setError(friendlyError(err, "Couldn't update this foreword.")),
      }
    );
  }

  return (
    <>
      <Portal>
        <div className="fixed inset-0 ako-keyboard-aware z-[60] flex items-center justify-center px-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
          <div className="relative w-full max-w-xl bg-surface rounded-[28px] border border-border max-h-[calc(100dvh-10rem)] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <div className="min-w-0 pr-3">
                <h2 className="font-display text-lg text-ink">{pending ? "Add a note" : "Forewords"}</h2>
                <p className="text-xs text-ink-muted">
                  {pending
                    ? "Optional — tell them why you'd like their words."
                    : `Invite someone to read your ${noun} and write a few words to open it. It appears in a locked ${sectionNoun}.`}
                </p>
              </div>
              <button
                onClick={pending ? () => setPending(null) : onClose}
                className="p-1 text-ink-muted"
                aria-label={pending ? "Back" : "Close"}
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3">
              {pending ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {pending.map((p) => (
                      <span key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-border bg-canvas">
                        <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                        <span className="text-xs text-ink">{p.display_name}</span>
                      </span>
                    ))}
                  </div>
                  <div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, FOREWORD_NOTE_MAX))}
                      rows={4}
                      placeholder={`Why I'd love your words on this ${noun}…`}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink text-sm resize-none
                        focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    />
                    <p className="text-[11px] text-ink-muted text-right mt-1">
                      {note.length}/{FOREWORD_NOTE_MAX}
                    </p>
                  </div>
                  <p className="text-xs text-ink-muted">
                    They can read the {noun} before answering, and the invite lasts 30 days. If they decline, you won't be able to
                    ask again.
                  </p>
                </div>
              ) : isLoading ? (
                <p className="text-ink-muted text-sm text-center py-10">Loading…</p>
              ) : sorted.length === 0 ? (
                <p className="text-ink-muted text-sm text-center py-10">No forewords yet.</p>
              ) : (
                <div className="space-y-2">
                  {sorted.map((f) => (
                    <ForewordRow
                      key={f.id}
                      f={f}
                      busy={busy}
                      noun={noun}
                      onApprove={() => decide(f, "approve")}
                      onReject={() => decide(f, "reject")}
                      onRemove={() => setConfirmRemove(f)}
                      onRevoke={() =>
                        revoke.mutate(f.id, {
                          onSuccess: () => toast("Invite cancelled.", { variant: "success" }),
                          onError: (err) => setError(friendlyError(err, "Couldn't cancel the invite.")),
                        })
                      }
                    />
                  ))}
                </div>
              )}
              {!pending && sorted.length > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-ink-muted mt-4">
                  <Lock size={12} className="mt-0.5 flex-shrink-0" />
                  You can approve, decline or remove a foreword, but only its writer can edit it.
                </p>
              )}
              {error && <p className="text-sm text-danger mt-3">{error}</p>}
            </div>

            <div className="px-4 py-4 border-t border-border flex-shrink-0">
              {pending ? (
                <button
                  onClick={sendInvites}
                  disabled={sending}
                  className="w-full py-3 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-60"
                >
                  {sending ? "Sending…" : pending.length > 1 ? "Send invites" : "Send invite"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowPicker(true)}
                    disabled={slotsLeft === 0}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                    Invite someone
                  </button>
                  <p className="text-[11px] text-ink-muted text-center mt-2">
                    {slotsLeft === 0
                      ? `You have ${FOREWORD_MAX_LIVE} forewords in progress — remove or wait for one to invite another.`
                      : `${live} of ${FOREWORD_MAX_LIVE} in progress`}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Portal>

      {showPicker && (
        <PeoplePicker
          title="Invite for a foreword"
          subtitle="Choose people on Akọ. They'll get a request they can answer or decline."
          confirmLabel="Next"
          onConfirm={handlePickerConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove this foreword?"
          description={`It comes out of your ${noun} right away, and ${confirmRemove.invitee?.display_name ?? "the writer"} can't be asked to write again.`}
          confirmLabel="Remove"
          themed
          onConfirm={() => {
            const f = confirmRemove;
            setConfirmRemove(null);
            decide(f, "remove");
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </>
  );
}
