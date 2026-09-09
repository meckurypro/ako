// src/components/GiftPicker.tsx
import { useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { useGiftTypes, useWallet } from "../hooks/useWallet";
import { useSendGift } from "../hooks/useGifting";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import type { GiftType } from "../types/database";

// Combined platform share (Google Play + Akọ) vs. what the creator
// keeps. Display-only — process-gift/process_gift() computes the
// real platform_fee/net_amount server-side; this only drives the
// "Creator receives $X" preview shown before sending.
const GIFT_FEE_SPLIT = {
  platform: 0.4, // Google Play + Akọ combined
  creator: 0.6,
};

interface GiftPickerProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  postId?: string;
  commentId?: string;
  onClose: () => void;
}

type Step = "catalog" | "confirm" | "sent";

// Portaled to document.body (see Portal.tsx) — opened from PostCard's
// Gift action while PostCard is rendered inside SwipeableTabs'
// translateX'd pane (Feed/ProfilePage/SavedHub/LikedHub). A transformed
// ancestor becomes the containing block for `fixed` descendants, so
// without this the sheet was clipped/offset inside that pane instead of
// filling the real viewport.
export function GiftPicker({
  recipientId,
  recipientName,
  recipientAvatar,
  postId,
  commentId,
  onClose,
}: GiftPickerProps) {
  const [step, setStep] = useState<Step>("catalog");
  const [selected, setSelected] = useState<GiftType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: giftTypes, isLoading: loadingGifts } = useGiftTypes();
  const { data: wallet } = useWallet();
  const sendGift = useSendGift();

  useBackDismiss(step === "confirm" ? () => setStep("catalog") : onClose);

  const balance = Number(wallet?.balance ?? 0);

  function handleSelect(gift: GiftType) {
    setSelected(gift);
    setError(null);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selected) return;
    setError(null);
    try {
      await sendGift.mutateAsync({
        recipient_id: recipientId,
        gift_type_id: selected.id,
        post_id: postId,
        comment_id: commentId,
      });
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send gift.");
    }
  }

  const creatorReceives = selected ? selected.cost_usd * GIFT_FEE_SPLIT.creator : 0;
  const insufficientBalance = !!selected && balance < selected.cost_usd;

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-canvas/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          {step === "confirm" ? (
            <button onClick={() => setStep("catalog")} className="p-1 -ml-1 text-ink-muted" aria-label="Back">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div>
              <h2 className="font-display text-lg text-ink">Send a gift</h2>
              <p className="text-xs text-ink-muted">Send a piece of heritage.</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {step === "catalog" && (
              <span className="text-xs text-ink-muted">
                Balance <span className="font-medium text-ink">${balance.toFixed(2)}</span>
              </span>
            )}
            <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {step === "catalog" && (
            <>
              {loadingGifts ? (
                <p className="text-ink-muted text-sm text-center py-10">Loading gifts…</p>
              ) : !giftTypes || giftTypes.length === 0 ? (
                <p className="text-ink-muted text-sm text-center py-10">No gifts available right now.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {giftTypes.map((gift) => (
                    <button
                      key={gift.id}
                      onClick={() => handleSelect(gift)}
                      className="flex flex-col items-center gap-1.5 bg-canvas rounded-xl border border-border p-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center overflow-hidden">
                        {gift.icon_url ? (
                          <img src={gift.icon_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">🎁</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-ink text-center leading-tight">{gift.name}</span>
                      <span className="text-xs text-ink-muted">${gift.cost_usd.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "confirm" && selected && (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center overflow-hidden">
                {selected.icon_url ? (
                  <img src={selected.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🎁</span>
                )}
              </div>

              <div>
                <p className="font-display text-lg text-ink">Send {selected.name}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Avatar src={recipientAvatar} name={recipientName} size="sm" />
                  <span className="text-sm text-ink-muted">to {recipientName}</span>
                </div>
              </div>

              <div className="w-full bg-canvas rounded-xl border border-border p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Gift value</span>
                  <span className="text-ink font-medium">${selected.cost_usd.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-ink-muted">Creator receives</span>
                  <span className="text-accent font-medium">${creatorReceives.toFixed(2)}</span>
                </div>
                <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
                  <span className="text-ink-muted">Your balance</span>
                  <span className="text-ink">${balance.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-ink-muted">After gifting</span>
                  <span className="text-ink">${Math.max(balance - selected.cost_usd, 0).toFixed(2)}</span>
                </div>
              </div>

              {insufficientBalance && (
                <div className="w-full text-sm text-danger bg-danger/10 rounded-xl p-3">
                  Insufficient balance. Fund your wallet to send this gift.
                </div>
              )}

              {error && !insufficientBalance && <p className="text-danger text-sm">{error}</p>}
            </div>
          )}

          {step === "sent" && selected && (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <div className="relative w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center overflow-hidden ako-gift-pop">
                {selected.icon_url ? (
                  <img src={selected.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🎁</span>
                )}
                {/* A second glyph rises and fades above the icon — the icon
                    itself pops in place, this is what carries the "sent"
                    motion upward toward the recipient. */}
                <span className="ako-gift-rise text-2xl" aria-hidden="true">
                  🎁
                </span>
              </div>
              <p className="font-display text-lg text-ink">Gift sent!</p>
              <p className="text-sm text-ink-muted">
                You sent a {selected.name} to {recipientName}.
                <br />
                ${selected.cost_usd.toFixed(2)} deducted from your wallet.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === "confirm" && (
          <div className="flex items-center gap-2 px-4 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={() => setStep("catalog")}
              className="flex-1 py-3 rounded-full border border-border text-sm font-medium text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={insufficientBalance || sendGift.isPending}
              className="flex-1 py-3 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
            >
              {sendGift.isPending ? "Sending…" : "Send gift"}
            </button>
          </div>
        )}

        {step === "sent" && (
          <div className="px-4 py-4 border-t border-border flex-shrink-0">
            <button onClick={onClose} className="w-full py-3 rounded-full bg-accent text-canvas text-sm font-medium">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}
