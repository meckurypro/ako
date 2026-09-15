// src/pages/admin/AdminSendNotification.tsx
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import {
  useAdminSendNotification,
  useAdminNotificationSends,
  useEditNotificationSend,
  useDeleteNotificationSend,
  type AudienceInput,
} from "../../hooks/useAdminComms";
import { AudiencePicker } from "../../components/admin/AudiencePicker";
import { Button } from "../../components/Button";

const MAX_LENGTH = 500;

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  tier: "By account type",
  page_followers: "Page followers",
  manual: "Selected users",
};

function formatSentAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationHistoryRow({
  send,
}: {
  send: { id: string; message: string; audience_type: string; recipient_count: number; created_at: string };
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(send.message);
  const editSend = useEditNotificationSend();
  const deleteSend = useDeleteNotificationSend();

  async function handleSave() {
    if (!draft.trim() || draft.trim() === send.message) return setEditing(false);
    await editSend.mutateAsync({ sendId: send.id, message: draft.trim() });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this notification for everyone who received it? This can't be undone.")) return;
    await deleteSend.mutateAsync(send.id);
  }

  return (
    <div className="border border-border rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-muted">
          {formatSentAt(send.created_at)} · {AUDIENCE_LABELS[send.audience_type] ?? send.audience_type} ·{" "}
          {send.recipient_count.toLocaleString()} recipients
        </span>
        {!editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setDraft(send.message);
                setEditing(true);
              }}
              className="text-ink-muted p-1"
              aria-label="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={deleteSend.isPending}
              className="text-danger p-1"
              aria-label="Delete"
            >
              {deleteSend.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm"
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <button onClick={() => setEditing(false)} className="text-ink-muted p-1.5" aria-label="Cancel">
              <X size={16} />
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={editSend.isPending}
              className="text-accent p-1.5"
              aria-label="Save"
            >
              {editSend.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink whitespace-pre-wrap">{send.message}</p>
      )}
    </div>
  );
}

export function AdminSendNotification() {
  const smartBack = useSmartBack();
  const sendNotification = useAdminSendNotification();
  const { data: sends, isLoading: sendsLoading } = useAdminNotificationSends();

  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<AudienceInput>({
    audience_type: "all",
    audience_filter: {},
    manual_recipient_ids: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function validate(): string | null {
    if (!message.trim()) return "Write a message first.";
    if (audience.audience_type === "tier" && !audience.audience_filter.tier) return "Pick an account type.";
    if (audience.audience_type === "page_followers" && !audience.audience_filter.page_id)
      return "Pick an organisation.";
    if (audience.audience_type === "manual" && audience.manual_recipient_ids.length === 0)
      return "Search and select at least one user.";
    return null;
  }

  async function handleSend() {
    setError(null);
    setSuccessMsg(null);
    const problem = validate();
    if (problem) return setError(problem);

    if (!confirm("Send this notification now? This can't be undone.")) return;

    try {
      const result = await sendNotification.mutateAsync({ message: message.trim(), ...audience });
      setSuccessMsg(`Sent to ${result.recipient_count.toLocaleString()} people.`);
      setMessage("");
    } catch (err: any) {
      setError(err.message ?? "Couldn't send notification.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Send notification</h2>
        </div>

        <p className="text-sm text-ink-muted mb-4">
          Sends an in-app notification from <span className="font-medium text-ink">Akọ.</span> It shows up on
          each recipient's Notifications page, not in their inbox.
        </p>

        <div className="mb-4">
          <label htmlFor="message" className="block text-sm font-medium text-ink-muted mb-1.5">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            rows={4}
            placeholder="What do you want to tell them?"
            className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink"
          />
          <p className="text-xs text-ink-muted mt-1 text-right">
            {message.length}/{MAX_LENGTH}
          </p>
        </div>

        <div className="mb-6">
          <AudiencePicker value={audience} onChange={setAudience} />
        </div>

        {error && (
          <p className="text-danger text-sm mb-4" role="alert">
            {error}
          </p>
        )}
        {successMsg && <p className="text-sm text-accent mb-4">{successMsg}</p>}

        <Button loading={sendNotification.isPending} onClick={handleSend}>
          Send
        </Button>

        <div className="mt-10">
          <h3 className="font-display text-lg text-ink mb-3">History</h3>
          {sendsLoading && <p className="text-ink-muted text-sm text-center py-6">Loading…</p>}
          {!sendsLoading && sends?.length === 0 && (
            <p className="text-ink-muted text-sm text-center py-6">Nothing sent yet.</p>
          )}
          <div className="space-y-2.5">
            {sends?.map((send) => (
              <NotificationHistoryRow key={send.id} send={send} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
