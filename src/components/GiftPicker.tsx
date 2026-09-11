// src/components/GiftPicker.tsx
import { useMemo, useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { useGiftTypes, useWallet, useTopGiftTypeIds } from "../hooks/useWallet";
import { useSendGift } from "../hooks/useGifting";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import type { GiftType } from "../types/database";

interface GiftPickerProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  postId?: string;
  commentId?: string;
  onClose: () => void;
}

type Step = "catalog" | "confirm" | "sent";

// "a" vs "an" for the insufficient-balance message.
function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

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
  // Set when the user taps a gift they can't afford — shows a
  // dismissible full-screen notice instead of advancing to confirm.
  const [insufficientGift, setInsufficientGift] = useState<GiftType | null>(null);

  const { data: giftTypes, isLoading: loadingGifts } = useGiftTypes();
  const { data: wallet } = useWallet();
  const { data: topGiftTypeIds } = useTopGiftTypeIds(6);
  const sendGift = useSendGift();

  useBackDismiss(
    insufficientGift
      ? () => setInsufficientGift(null)
      : step === "confirm"
        ? () => setStep("catalog")
        : onClose
  );
  useScrollLock();

  const balance = Number(wallet?.balance ?? 0);

  // Default arrangement: most expensive first, cheapest last. Once the
  // user has sent gifts, their top 6 most-used gift types (by send
  // count, from useTopGiftTypeIds) take over the first two rows of the
  // 3-column grid, in usage order — everything else fills in behind
  // them, still most-expensive-first.
  const sortedGiftTypes = useMemo(() => {
    if (!giftTypes) return giftTypes;

    const byId = new Map(giftTypes.map((g) => [g.id, g]));
    const topUsed = (topGiftTypeIds ?? [])
      .map((id) => byId.get(id))
      .filter((g): g is GiftType => !!g);

    const usedIds = new Set(topUsed.map((g) => g.id));
    const rest = giftTypes
      .filter((g) => !usedIds.has(g.id))
      .sort((a, b) => b.cost_usd - a.cost_usd);

    return [...topUsed, ...rest];
  }, [giftTypes, topGiftTypeIds]);

  function handleSelect(gift: GiftType) {
    if (balance < gift.cost_usd) {
      setInsufficientGift(gift);
      return;
    }
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

  const insufficientBalance = !!selected && balance < selected.cost_usd;

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />

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
              ) : !sortedGiftTypes || sortedGiftTypes.length === 0 ? (
                <p className="text-ink-muted text-sm text-center py-10">No gifts available right now.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {sortedGiftTypes.map((gift) => (
                    <button
                      key={gift.id}
                      onClick={() => handleSelect(gift)}
                      aria-label={`${gift.name}, $${gift.cost_usd.toFixed(2)}`}
                      className="flex flex-col items-center gap-1.5"
                    >
                      {/* No box — the artifact sits directly on the sheet
                          background. object-contain (not object-cover in a
                          circle) so it renders whole — a staff or shield
                          silhouette shouldn't get corner-cropped the way a
                          generic icon could. */}
                      <div className="w-20 h-20 flex items-center justify-center">
                        {gift.icon_url ? (
                          <img src={gift.icon_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-2xl">🎁</span>
                        )}
                      </div>
                      <span className="text-xs text-ink-muted">${gift.cost_usd.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "confirm" && selected && (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-20 h-20 flex items-center justify-center">
                {selected.icon_url ? (
                  <img src={selected.icon_url} alt="" className="w-full h-full object-contain" />
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
                <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
                  <span className="text-ink-muted">Your balance</span>
                  <span className="text-ink">${balance.toFixed(2)}</span>
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
              <div className="relative w-16 h-16 flex items-center justify-center ako-gift-pop">
                {selected.icon_url ? (
                  <img src={selected.icon_url} alt="" className="w-full h-full object-contain" />
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

      {/* Insufficient-balance notice — sits above everything, including
          the sheet. Tap anywhere to dismiss. No box around the icon —
          it's shown large and unboxed above the message. */}
      {insufficientGift && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 px-10 bg-canvas/70 backdrop-blur-overlay"
          onClick={() => setInsufficientGift(null)}
          role="alert"
        >
          <div className="w-44 h-44 flex items-center justify-center">
            {insufficientGift.icon_url ? (
              <img src={insufficientGift.icon_url} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-8xl">🎁</span>
            )}
          </div>
          <p className="text-ink text-center text-base font-medium max-w-xs">
            Insufficient balance to gift {article(insufficientGift.name)} {insufficientGift.name}. Please fund your
            wallet.
          </p>
        </div>
      )}
    </div>
    </Portal>
  );
          }
