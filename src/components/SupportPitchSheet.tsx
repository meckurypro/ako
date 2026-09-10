// src/components/SupportPitchSheet.tsx
import { useState } from "react";
import { X, Heart } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { useSupportPitch } from "../hooks/useProjectTypeDetails";

interface SupportPitchSheetProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  onSupported: () => void;
}

// Free-form pledge amount, no preset tiers and no minimum beyond
// >$0 — see PitchFields' note on why tiers were skipped (they frame
// this as buying something, which is the opposite of the point). A
// short optional message doubles as the first post in the supporter's
// relationship with the linked update Room they're about to join.
export function SupportPitchSheet({ projectId, projectTitle, onClose, onSupported }: SupportPitchSheetProps) {
  useBackDismiss(onClose);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supportPitch = useSupportPitch(projectId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountUsd = parseFloat(amount);
    if (!amount.trim() || Number.isNaN(amountUsd) || amountUsd <= 0) {
      setError("Enter an amount above $0.");
      return;
    }
    try {
      await supportPitch.mutateAsync({ amountUsd, message: message.trim() || undefined });
      onSupported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process your support.");
    }
  }

  // Portaled for the same reason as ManageAccessSheet — opened from
  // ProjectCard, which can sit inside a transformed ancestor pane.
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Support this idea</p>
              <p className="text-xs text-ink-muted truncate">{projectTitle}</p>
            </div>
            <button onClick={onClose} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-4 pb-6 pt-2">
            <label htmlFor="support_amount" className="block text-sm font-medium text-ink-muted mb-1.5">
              Amount (USD)
            </label>
            <input
              id="support_amount"
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent mb-3"
            />

            <label htmlFor="support_message" className="block text-sm font-medium text-ink-muted mb-1.5">
              Message (optional)
            </label>
            <textarea
              id="support_message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Good luck with this!"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink resize-none
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent mb-1"
            />
            <p className="text-xs text-ink-muted mb-4">
              This is support, not an investment — no equity, no return, no guarantee. You'll join
              the creator's update group once you back this.
            </p>

            {error && (
              <p className="text-danger text-sm mb-3" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={supportPitch.isPending}
              className="w-full flex items-center justify-center gap-1.5 bg-accent text-canvas px-4 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              <Heart size={15} />
              {supportPitch.isPending ? "Sending support…" : "Support"}
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}
