// src/components/ForewordInviteModal.tsx
// What the person asked to write a foreword sees: the invite, a way to read the work first, decline (final), or write.
// The same modal handles the writer's later visits — edit a submitted or published foreword, or withdraw it.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { Portal } from "./Portal";
import { useToast } from "./Toast";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { useProject } from "../hooks/useProjects";
import {
  FOREWORD_CREDIT_MAX,
  FOREWORD_DISCLOSURE_MAX,
  FOREWORD_MAX,
  FOREWORD_MIN,
  canPreviewWithForeword,
  isInviteOpen,
  useDeclineForeword,
  useForewordInviter,
  useMyForeword,
  useSubmitForeword,
  useWithdrawForeword,
  validateForewordBody,
  type Foreword,
} from "../hooks/useForewords";
import { friendlyError } from "../lib/friendlyError";

type Mode = "overview" | "compose" | "confirm-decline" | "confirm-withdraw";

const inputClass =
  "w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

function ClosedNotice({ foreword, onClose }: { foreword: Foreword | null | undefined; onClose: () => void }) {
  let message = "This invite isn't open anymore.";
  if (!foreword) message = "We couldn't find an invite for this project.";
  else if (foreword.status === "declined") message = "You declined this invite.";
  else if (foreword.status === "withdrawn") message = "You withdrew your foreword.";
  else if (foreword.status === "rejected") message = "The creator chose not to publish this foreword.";
  else if (foreword.status === "revoked") message = "The creator cancelled this invite.";
  else if (foreword.status === "invited") message = "This invite has expired.";
  return (
    <div className="text-center py-4">
      <p className="text-sm text-ink-muted">{message}</p>
      <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-full border border-border text-sm font-medium text-ink">
        Close
      </button>
    </div>
  );
}

export function ForewordInviteModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: foreword, isLoading } = useMyForeword(projectId);
  const { data: project } = useProject(foreword && canPreviewWithForeword(foreword) ? projectId : undefined);
  const { data: inviter } = useForewordInviter(foreword?.invited_by);
  const submit = useSubmitForeword(projectId);
  const decline = useDeclineForeword(projectId);
  const withdraw = useWithdrawForeword(projectId);

  const [mode, setMode] = useState<Mode>("overview");
  const [body, setBody] = useState("");
  const [creditLine, setCreditLine] = useState("");
  const [disclosure, setDisclosure] = useState("");
  const [error, setError] = useState<string | null>(null);

  useBackDismiss(onClose);
  useScrollLock();

  const isBook = project?.project_type === "book";
  const noun = project ? (isBook ? "book" : "course") : "project";
  const readPath = project ? (isBook ? `/books/${projectId}` : `/courses/${projectId}`) : `/projects/${projectId}`;
  const open = !!foreword && canPreviewWithForeword(foreword);
  const hasWritten = foreword?.status === "submitted" || foreword?.status === "approved";
  const busy = submit.isPending || decline.isPending || withdraw.isPending;

  function startCompose() {
    setError(null);
    setBody(foreword?.body ?? "");
    setCreditLine(foreword?.credit_line ?? "");
    setDisclosure(foreword?.disclosure ?? "");
    setMode("compose");
  }

  function handleSubmit() {
    const problem = validateForewordBody(body);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    submit.mutate(
      { body: body.trim(), creditLine, disclosure },
      {
        onSuccess: () => {
          toast(hasWritten ? "Sent for the creator to review." : "Foreword sent to the creator.", { variant: "success" });
          onClose();
        },
        onError: (err) => setError(friendlyError(err, "Couldn't send your foreword.")),
      }
    );
  }

  function handleDecline() {
    setError(null);
    decline.mutate(undefined, {
      onSuccess: () => {
        toast("Invite declined.", { variant: "success" });
        onClose();
      },
      onError: (err) => setError(friendlyError(err, "Couldn't decline this invite.")),
    });
  }

  function handleWithdraw() {
    setError(null);
    withdraw.mutate(undefined, {
      onSuccess: () => {
        toast("Foreword withdrawn.", { variant: "success" });
        onClose();
      },
      onError: (err) => setError(friendlyError(err, "Couldn't withdraw your foreword.")),
    });
  }

  return (
    <Portal>
      <div className="fixed inset-0 ako-keyboard-aware z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
        <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto bg-surface rounded-2xl border border-border p-5 shadow-xl">
          <button onClick={onClose} className="absolute top-3 right-3 p-1 text-ink-muted" aria-label="Close">
            <X size={18} />
          </button>

          {isLoading ? (
            <p className="text-sm text-ink-muted text-center py-6">Loading…</p>
          ) : !foreword || !open ? (
            <ClosedNotice foreword={foreword} onClose={onClose} />
          ) : (
            <>
              <div className="flex items-center gap-3 pr-6">
                <Avatar src={inviter?.avatar_url ?? null} name={inviter?.display_name ?? "?"} size="md" />
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{inviter?.display_name ?? "A creator"}</p>
                  <p className="text-sm text-ink-muted">
                    {hasWritten ? `Your foreword for their ${noun}` : `Asked you to write a foreword for their ${noun}`}
                  </p>
                </div>
              </div>

              {project && (
                <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3 flex items-center gap-3">
                  {project.thumbnail_url ? (
                    <img
                      src={project.thumbnail_url}
                      alt=""
                      className={`w-12 ${isBook ? "h-[72px]" : "h-12"} rounded-lg object-cover flex-shrink-0 border border-border`}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-surface border border-border" />
                  )}
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm text-ink truncate">{project.title}</p>
                    {project.description && <p className="text-xs text-ink-muted line-clamp-2">{project.description}</p>}
                  </div>
                </div>
              )}

              {mode === "overview" && (
                <>
                  {foreword.invite_note && (
                    <p className="mt-3 text-sm text-ink bg-canvas rounded-xl border border-border px-3.5 py-3 whitespace-pre-wrap break-words">
                      {foreword.invite_note}
                    </p>
                  )}

                  {hasWritten && (
                    <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-3">
                      <p className="text-xs font-medium text-ink-muted mb-1">
                        {foreword.status === "approved"
                          ? "Published"
                          : foreword.published_body
                            ? "Your edit is waiting for review — the published version stays live"
                            : "Waiting for the creator's review"}
                      </p>
                      <p className="text-sm text-ink whitespace-pre-wrap break-words">{foreword.body}</p>
                    </div>
                  )}

                  {isInviteOpen(foreword) && (
                    <p className="mt-3 text-xs text-ink-muted">
                      You can read the {noun} first. Declining is final, and the creator isn't told why.
                    </p>
                  )}

                  {error && <p className="text-sm text-danger mt-3">{error}</p>}

                  <button
                    onClick={() => {
                      onClose();
                      navigate(readPath);
                    }}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-border text-sm font-medium text-ink"
                  >
                    <BookOpen size={15} />
                    {isBook ? "Read the book" : project ? "Open the course" : "Open"}
                  </button>

                  <div className="flex items-center gap-2 mt-2">
                    {hasWritten ? (
                      <>
                        <button
                          onClick={() => setMode("confirm-withdraw")}
                          className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-danger"
                        >
                          Withdraw
                        </button>
                        <button onClick={startCompose} className="flex-1 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium">
                          Edit
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setMode("confirm-decline")}
                          className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-ink"
                        >
                          Decline
                        </button>
                        <button onClick={startCompose} className="flex-1 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium">
                          Write it
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {mode === "compose" && (
                <div className="mt-4 space-y-3">
                  <div>
                    <textarea
                      autoFocus
                      value={body}
                      onChange={(e) => setBody(e.target.value.slice(0, FOREWORD_MAX))}
                      rows={9}
                      placeholder={`Why does this ${noun} matter, and who is it for? Speak as yourself.`}
                      className={`${inputClass} resize-none`}
                    />
                    <p
                      className={`text-[11px] text-right mt-1 ${
                        body.trim().length > 0 && body.trim().length < FOREWORD_MIN ? "text-danger" : "text-ink-muted"
                      }`}
                    >
                      {body.trim().length}/{FOREWORD_MAX.toLocaleString()} · at least {FOREWORD_MIN}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">Credit line (optional)</label>
                    <input
                      value={creditLine}
                      onChange={(e) => setCreditLine(e.target.value.slice(0, FOREWORD_CREDIT_MAX))}
                      placeholder="e.g. Author of Things Fall Apart"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">Connection to disclose (optional)</label>
                    <input
                      value={disclosure}
                      onChange={(e) => setDisclosure(e.target.value.slice(0, FOREWORD_DISCLOSURE_MAX))}
                      placeholder="e.g. The author is a close friend."
                      className={inputClass}
                    />
                    <p className="text-[11px] text-ink-muted mt-1">
                      Readers trust a foreword more when they know any relationship you have with the creator.
                    </p>
                  </div>

                  <p className="text-xs text-ink-muted">
                    No links. {hasWritten
                      ? "Your edit goes back to the creator for approval; the current version stays live until then."
                      : "The creator approves it before it appears, and they can't change your words."}
                  </p>

                  {error && <p className="text-sm text-danger">{error}</p>}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setError(null);
                        setMode("overview");
                      }}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-ink disabled:opacity-60"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-60"
                    >
                      {submit.isPending ? "Sending…" : hasWritten ? "Send edit" : "Send foreword"}
                    </button>
                  </div>
                </div>
              )}

              {(mode === "confirm-decline" || mode === "confirm-withdraw") && (
                <div className="mt-4">
                  <p className="text-sm text-ink">
                    {mode === "confirm-decline"
                      ? "Decline this invite? This is final — the creator won't be able to ask you again."
                      : `Withdraw your foreword? It comes out of the ${noun}, and you'd need a new invite to write it again.`}
                  </p>
                  {error && <p className="text-sm text-danger mt-2">{error}</p>}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        setError(null);
                        setMode("overview");
                      }}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-ink disabled:opacity-60"
                    >
                      Keep it
                    </button>
                    <button
                      onClick={mode === "confirm-decline" ? handleDecline : handleWithdraw}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-full bg-danger text-canvas text-sm font-medium disabled:opacity-60"
                    >
                      {mode === "confirm-decline" ? "Decline" : "Withdraw"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
