import { useState } from "react";
import { X, Gift as GiftIcon } from "lucide-react";
import { useGiftTypes } from "../hooks/useWallet";
import { useSendGift } from "../hooks/useGifting";

interface GiftPickerProps {
  recipientId: string;
  postId?: string;
  commentId?: string;
  onClose: () => void;
}

export function GiftPicker({ recipientId, postId, commentId, onClose }: GiftPickerProps) {
  const { data: giftTypes, isLoading } = useGiftTypes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const sendGift = useSendGift();

  async function handleSend() {
    if (!selectedId) return;
    setError(null);

    try {
      await sendGift.mutateAsync({
        recipient_id: recipientId,
        gift_type_id: selectedId,
        post_id: postId,
        comment_id: commentId,
      });
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send this gift.");
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 px-4">
      <div className="bg-canvas rounded-2xl w-full max-w-md p-5 mb-safe">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-ink">Send a gift</h3>
          <button onClick={onClose} className="text-ink-muted">
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <p className="text-accent text-center py-6 font-medium">Gift sent 🎁</p>
        ) : isLoading ? (
          <p className="text-ink-muted text-center py-6">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {giftTypes?.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => setSelectedId(gift.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                    selectedId === gift.id
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface"
                  }`}
                >
                  <GiftIcon size={22} className="text-accent" />
                  <span className="text-xs font-medium text-ink">{gift.name}</span>
                  <span className="text-xs text-ink-muted">${gift.cost_usd.toFixed(2)}</span>
                </button>
              ))}
            </div>

            {error && <p className="text-danger text-sm mb-3">{error}</p>}

            <button
              onClick={handleSend}
              disabled={!selectedId || sendGift.isPending}
              className="w-full bg-accent text-canvas py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {sendGift.isPending ? "Sending…" : "Send gift"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
