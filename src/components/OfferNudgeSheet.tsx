// src/components/OfferNudgeSheet.tsx
import { isFileType } from "../lib/fileProject";
import { FileFolderIcon } from "./FileFolderArt";
import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Button } from "./Button";
import { useToast } from "./Toast";
import { usePurchaseOffer, type Offer } from "../hooks/useOffers";
import { formatUsd } from "../lib/money";

interface OfferNudgeSheetProps {
  /** The project the viewer was about to buy. */
  projectId: string;
  projectTitle: string;
  /** What buying just this project costs (effective price). */
  singlePrice: number;
  /** Valid offers containing this project, best saving first (see useProjectOffers). */
  offers: Offer[];
  /** Carries on with the normal single-project purchase. */
  onBuySingle: () => void;
  onClose: () => void;
}

/**
 * Shown INSTEAD of buying immediately when the project the viewer taps "Buy" on
 * is part of one or more of the creator's offers. It is a suggestion, never a
 * wall: the bundle leads, each project's own price sits next to the offer
 * price so the saving is obvious, and "just this one" is always one quiet tap
 * away. Only ever opened by a caller that already checked the viewer is a
 * signed-in, non-owner buyer with no access yet.
 */
export function OfferNudgeSheet({ projectId, projectTitle, singlePrice, offers, onBuySingle, onClose }: OfferNudgeSheetProps) {
  useBackDismiss(onClose);
  const toast = useToast();
  const purchaseOffer = usePurchaseOffer();
  const [error, setError] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  async function handleBuyOffer(offer: Offer) {
    setError(null);
    setBuyingId(offer.id);
    try {
      const result = await purchaseOffer.mutateAsync(offer.id);
      const count = result.purchases.length;
      toast(`Unlocked ${count} projects 🎉`, { variant: "success" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't complete the purchase.");
    } finally {
      setBuyingId(null);
    }
  }

  const [best, ...others] = offers;
  if (!best) return null;
  const busy = purchaseOffer.isPending;

  return (
    <Portal>
      <div className="fixed inset-0 ako-keyboard-aware z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={busy ? undefined : onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-1 sticky top-0 bg-surface">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Better together</p>
              <p className="text-xs text-ink-muted truncate">Adding to “{projectTitle}”? Pay less for the set.</p>
            </div>
            <button onClick={onClose} disabled={busy} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pb-5 pt-2">
            <OfferCard offer={best} projectId={projectId} featured busy={busy} buying={buyingId === best.id} onBuy={() => void handleBuyOffer(best)} />

            {others.length > 0 && (
              <div className="mt-3 space-y-2">
                {others.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} projectId={projectId} busy={busy} buying={buyingId === offer.id} onBuy={() => void handleBuyOffer(offer)} />
                ))}
              </div>
            )}

            {error && <p className="text-danger text-sm mt-3">{error}</p>}

            <button
              onClick={() => {
                onClose();
                onBuySingle();
              }}
              disabled={busy}
              className="block mx-auto mt-4 text-xs text-ink-muted underline-offset-2 hover:underline disabled:opacity-50"
            >
              Just this one — {formatUsd(singlePrice)}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function OfferCard({
  offer,
  projectId,
  featured = false,
  busy,
  buying,
  onBuy,
}: {
  offer: Offer;
  projectId: string;
  featured?: boolean;
  busy: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${featured ? "border-accent/40 bg-accent-soft/40" : "border-border bg-canvas"}`}>
      <ul className="space-y-2">
        {offer.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-canvas overflow-hidden flex items-center justify-center shrink-0">
              {isFileType(item.project_type) ? (
                <FileFolderIcon size={36} className="w-full h-full" />
              ) : item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={14} className="text-ink-muted" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink truncate">{item.title}</span>
              {item.id === projectId && <span className="block text-[11px] text-ink-muted">The one you’re buying</span>}
            </span>
            <span className="text-sm text-ink-muted shrink-0">{formatUsd(item.price_usd)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 pt-3 border-t border-border/70 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">
            Separately <span className="line-through">{formatUsd(offer.sum_usd)}</span>
          </p>
          <p className="text-base font-semibold text-ink">
            {formatUsd(offer.price_usd)}{" "}
            <span className="ml-1 align-middle text-[11px] font-medium text-accent bg-accent-soft rounded-full px-2 py-0.5">
              Save {formatUsd(offer.savings_usd)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3">
        {featured ? (
          <Button onClick={onBuy} loading={buying} disabled={busy}>
            Get all {offer.items.length} for {formatUsd(offer.price_usd)}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onBuy} loading={buying} disabled={busy}>
            Get all {offer.items.length} for {formatUsd(offer.price_usd)}
          </Button>
        )}
      </div>
    </div>
  );
}
