// src/pages/admin/AdminSendNotification.tsx
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useAdminSendNotification, type AudienceInput } from "../../hooks/useAdminComms";
import { AudiencePicker } from "../../components/admin/AudiencePicker";
import { Button } from "../../components/Button";

const MAX_LENGTH = 500;

export function AdminSendNotification() {
  const smartBack = useSmartBack();
  const sendNotification = useAdminSendNotification();

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
      </div>
    </div>
  );
}
