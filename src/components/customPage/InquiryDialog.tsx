// src/components/customPage/InquiryDialog.tsx
// The visitor-facing "Send a message" form. Works signed out (the RPC is open to anon and rate-limited server-side).
// The hidden `website` field is a honeypot: people never see it, bots fill it, the server quietly discards those.
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "../Modal";
import { submitCustomPageInquiry } from "../../hooks/useCustomPages";
import { friendlyError } from "../../lib/friendlyError";
import { useAuth } from "../../hooks/useAuth";

const FIELD =
  "w-full rounded-xl bg-overlay-surface-raised text-overlay-ink placeholder:text-overlay-ink-muted/60 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-overlay-accent";

export function InquiryDialog({ pageId, pageName, onClose }: { pageId: string; pageName: string; onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [contact, setContact] = useState(user?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitCustomPageInquiry({ pageId, name, contact, subject, message, honeypot: website });
      setSent(true);
    } catch (err) {
      setError(friendlyError(err, "Couldn't send your message. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} title={sent ? "Message sent" : `Message ${pageName}`} maxWidthClass="max-w-md">
      {sent ? (
        <div className="text-center py-2">
          <CheckCircle2 size={40} className="mx-auto text-overlay-accent mb-3" />
          <p className="text-sm text-overlay-ink-muted leading-relaxed">Thank you. Your message has been delivered and they'll get back to you using the contact you gave.</p>
          <button onClick={onClose} className="mt-6 w-full py-3 rounded-full bg-overlay-accent text-overlay-surface text-sm font-medium">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input className={FIELD} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoComplete="name" />
          <input className={FIELD} placeholder="Email or phone number" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} required autoComplete="email" />
          <input className={FIELD} placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
          <textarea className={`${FIELD} min-h-[110px] resize-y`} placeholder="Your message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required />
          {/* Honeypot — off-screen, skipped by tab order and assistive tech. */}
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            name="website"
            className="absolute -left-[9999px] w-px h-px opacity-0"
          />
          {error && <p className="text-sm text-overlay-danger">{error}</p>}
          <button type="submit" disabled={busy} className="mt-1 w-full py-3 rounded-full bg-overlay-accent text-overlay-surface text-sm font-medium disabled:opacity-60">
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </Modal>
  );
}
