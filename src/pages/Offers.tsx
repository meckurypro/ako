// src/pages/Offers.tsx
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Image as ImageIcon, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "../components/Portal";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import {
  MAX_OFFERS,
  useCreateOffer,
  useDeleteOffer,
  useMyOffers,
  useOfferableProjects,
  useUpdateOffer,
  type Offer,
} from "../hooks/useOffers";
import { PROJECT_TYPE_LABELS } from "../hooks/useProjects";
import { formatUsd } from "../lib/money";

// A creator's offers: bundles of their own paid projects at one price. Buying
// an offer unlocks every project in it, and shoppers about to buy one of them
// get the offer suggested (see OfferNudgeSheet). Rules live in ako_offers.sql.
export function Offers() {
  const smartBack = useSmartBack();
  const toast = useToast();
  const { data: offers, isLoading } = useMyOffers();
  const deleteOffer = useDeleteOffer();
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);

  const count = offers?.length ?? 0;
  const atLimit = count >= MAX_OFFERS;

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteOffer.mutateAsync(deleting.id);
      toast("Offer deleted.", { variant: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't delete the offer.", { variant: "error" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <div className="flex items-end justify-between mb-2">
          <h2 className="font-display text-2xl text-ink">Offers</h2>
          <span className="text-xs text-ink-muted pb-1">
            {count} of {MAX_OFFERS}
          </span>
        </div>
        <p className="text-sm text-ink-muted mb-5">
          Bundle two or more of your paid projects at one price. Buying an offer unlocks everything in it, and people about to
          buy one of its projects are shown the offer.
        </p>

        <Button onClick={() => setEditing("new")} disabled={atLimit} className="mb-5">
          <span className="inline-flex items-center justify-center gap-2">
            <Plus size={16} /> New offer
          </span>
        </Button>
        {atLimit && <p className="text-xs text-ink-muted -mt-3 mb-5">You’ve reached {MAX_OFFERS} offers. Delete one to add another.</p>}

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : count === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-12 text-ink-muted">
            <Tag size={24} />
            <p className="text-sm">No offers yet. You need at least two paid, published projects to make one.</p>
          </div>
        ) : (
          offers!.map((offer) => (
            <OfferRow key={offer.id} offer={offer} onEdit={() => setEditing(offer)} onDelete={() => setDeleting(offer)} />
          ))
        )}
      </div>

      {editing && <OfferEditorSheet offer={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Delete this offer?"
          description="People who already bought it keep their access. The offer just stops being sold."
          confirmLabel={deleteOffer.isPending ? "Deleting…" : "Delete"}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function OfferRow({ offer, onEdit, onDelete }: { offer: Offer; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
      <ul className="space-y-2 mb-3">
        {offer.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-canvas overflow-hidden flex items-center justify-center shrink-0">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={14} className="text-ink-muted" />
              )}
            </span>
            <span className={`min-w-0 flex-1 text-sm truncate ${item.available ? "text-ink" : "text-ink-muted line-through"}`}>
              {item.title}
            </span>
            <span className="text-sm text-ink-muted shrink-0">{formatUsd(item.price_usd)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-end justify-between gap-3 pt-3 border-t border-border/70">
        <div>
          <p className="text-xs text-ink-muted">
            Separately <span className="line-through">{formatUsd(offer.sum_usd)}</span>
          </p>
          <p className="text-base font-semibold text-ink">
            {formatUsd(offer.price_usd)}
            {offer.is_valid && (
              <span className="ml-2 align-middle text-[11px] font-medium text-accent bg-accent-soft rounded-full px-2 py-0.5">
                {offer.savings_pct}% off
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 text-ink-muted hover:text-ink" aria-label="Edit offer">
            <Pencil size={16} />
          </button>
          <button onClick={onDelete} className="p-2 text-ink-muted hover:text-danger" aria-label="Delete offer">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {!offer.is_valid && (
        <p className="mt-3 text-xs text-danger">
          {offer.problem === "not_discounted"
            ? "Not shown to buyers: the offer price is no longer lower than buying these projects separately. Edit the price."
            : "Not shown to buyers: a project in this offer is archived, private, free or unpublished. Edit the offer to fix it."}
        </p>
      )}
    </div>
  );
}

function OfferEditorSheet({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  useBackDismiss(onClose);
  const toast = useToast();
  const { data: offerable, isLoading } = useOfferableProjects();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();

  const [selected, setSelected] = useState<Set<string>>(() => new Set(offer?.items.map((i) => i.id) ?? []));
  const [price, setPrice] = useState(offer ? String(offer.price_usd) : "");
  const [error, setError] = useState<string | null>(null);
  const saving = createOffer.isPending || updateOffer.isPending;

  // Everything the creator can pick: their offerable projects, plus any project
  // already in this offer that has since become unavailable (so it can be removed).
  const rows = useMemo(() => {
    const list = (offerable ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      thumbnail_url: p.thumbnail_url,
      type: p.project_type,
      price: p.promo_price_usd ?? p.price_usd,
      available: true,
    }));
    const known = new Set(list.map((r) => r.id));
    for (const item of offer?.items ?? []) {
      if (!known.has(item.id)) {
        list.push({ id: item.id, title: item.title, thumbnail_url: item.thumbnail_url, type: item.project_type, price: item.price_usd, available: false });
      }
    }
    return list;
  }, [offerable, offer]);

  const total = rows.filter((r) => selected.has(r.id)).reduce((sum, r) => sum + r.price, 0);
  const priceNum = parseFloat(price);
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
  const pct = hasPrice && total > 0 ? Math.round(((total - priceNum) / total) * 100) : 0;

  let hint: string | null = null;
  if (selected.size < 2) hint = "Pick at least 2 projects.";
  else if (!hasPrice) hint = "Enter the offer price.";
  else if (priceNum >= total) hint = `Must be lower than the total (${formatUsd(total)}).`;
  const canSave = hint === null && !saving;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    const projectIds = [...selected];
    try {
      if (offer) {
        await updateOffer.mutateAsync({ offerId: offer.id, priceUsd: priceNum, projectIds });
        toast("Offer updated.", { variant: "success" });
      } else {
        await createOffer.mutateAsync({ priceUsd: priceNum, projectIds });
        toast("Offer created.", { variant: "success" });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the offer.");
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 ako-keyboard-aware z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={saving ? undefined : onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-surface z-10">
            <p className="text-sm font-medium text-ink">{offer ? "Edit offer" : "New offer"}</p>
            <button onClick={onClose} disabled={saving} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pb-6">
            <p className="text-xs text-ink-muted mb-2">Choose the projects to bundle</p>

            {isLoading ? (
              <p className="text-sm text-ink-muted py-4">Loading…</p>
            ) : rows.length < 2 ? (
              <p className="text-sm text-ink-muted py-4">
                You need at least two paid, published, public projects (books, courses, media, files, links or meetings) to make an offer.
              </p>
            ) : (
              <ul className="space-y-1.5 mb-4">
                {rows.map((r) => {
                  const on = selected.has(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left ${on ? "border-accent/50 bg-accent-soft/40" : "border-border bg-canvas"}`}
                      >
                        <span className="w-10 h-10 rounded-lg bg-canvas overflow-hidden flex items-center justify-center shrink-0">
                          {r.thumbnail_url ? (
                            <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={14} className="text-ink-muted" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-ink truncate">{r.title}</span>
                          <span className="block text-[11px] text-ink-muted">
                            {PROJECT_TYPE_LABELS[r.type]} · {formatUsd(r.price)}
                            {!r.available && " · no longer available"}
                          </span>
                        </span>
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-accent border-accent text-canvas" : "border-border"}`}
                        >
                          {on && <Check size={13} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <label className="block text-sm font-medium text-ink-muted mb-1.5">Offer price (USD)</label>
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />

            <div className="mt-2 mb-4 text-xs text-ink-muted min-h-[1.25rem]">
              {selected.size >= 2 && (
                <span>
                  Separately {formatUsd(total)}
                  {hasPrice && priceNum < total && <> · buyers save {pct}%</>}
                </span>
              )}
              {hint && selected.size >= 2 && <span className="block text-ink-muted/80">{hint}</span>}
              {selected.size < 2 && <span>{hint}</span>}
            </div>

            {error && <p className="text-danger text-sm mb-3">{error}</p>}

            <Button onClick={() => void handleSave()} loading={saving} disabled={!canSave}>
              {offer ? "Save changes" : "Create offer"}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
