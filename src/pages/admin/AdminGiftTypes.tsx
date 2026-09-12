import { useState, type FormEvent } from "react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft, Plus, Pencil, X, Check } from "lucide-react";
import {
  useAdminGiftTypes,
  useCreateGiftType,
  useUpdateGiftType,
  useToggleGiftTypeActive,
  type AdminGiftType,
} from "../../hooks/useAdmin";

// Local edit-form shape, kept separate from AdminGiftType since the
// inputs are strings (cost_usd needs free typing, incl. a trailing
// "." or empty string mid-edit) while the row itself stores a number.
interface EditValue {
  name: string;
  cost_usd: string;
  icon_url: string;
}

function toEditValue(gift: AdminGiftType): EditValue {
  return { name: gift.name, cost_usd: String(gift.cost_usd), icon_url: gift.icon_url ?? "" };
}

export function AdminGiftTypes() {
  const smartBack = useSmartBack();
  const { data: giftTypes, isLoading } = useAdminGiftTypes();
  const createGiftType = useCreateGiftType();
  const updateGiftType = useUpdateGiftType();
  const toggleActive = useToggleGiftTypeActive();

  const [name, setName] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<EditValue | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cost = parseFloat(costUsd);
    if (!name.trim() || !cost || cost <= 0) {
      setError("Enter a name and a positive USD cost.");
      return;
    }

    const maxSortOrder = Math.max(0, ...(giftTypes?.map((g) => g.sort_order) ?? [0]));

    try {
      await createGiftType.mutateAsync({
        name: name.trim(),
        cost_usd: cost,
        icon_url: iconUrl.trim() || undefined,
        sort_order: maxSortOrder + 1,
      });
      setName("");
      setCostUsd("");
      setIconUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create gift type.");
    }
  }

  function startEdit(gift: AdminGiftType) {
    setEditingId(gift.id);
    setEditValue(toEditValue(gift));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!editValue) return;
    setEditError(null);
    const cost = parseFloat(editValue.cost_usd);
    if (!editValue.name.trim() || !cost || cost <= 0) {
      setEditError("Enter a name and a positive USD cost.");
      return;
    }
    try {
      await updateGiftType.mutateAsync({
        id,
        name: editValue.name.trim(),
        cost_usd: cost,
        icon_url: editValue.icon_url.trim() || null,
      });
      setEditingId(null);
      setEditValue(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Couldn't save changes.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Gift types</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-2">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-ink"
            />
            <input
              value={costUsd}
              onChange={(e) => setCostUsd(e.target.value)}
              placeholder="$"
              type="number"
              step="0.01"
              className="w-20 px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
            />
            <button
              type="submit"
              disabled={createGiftType.isPending}
              className="bg-accent text-canvas px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
            >
              <Plus size={18} />
            </button>
          </div>
          <input
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="px-4 py-2.5 rounded-xl border border-border bg-surface text-ink"
          />
        </form>
        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-2 mt-4">
            {giftTypes?.map((gift) =>
              editingId === gift.id && editValue ? (
                <div key={gift.id} className="bg-surface rounded-xl p-3 border border-accent flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      value={editValue.name}
                      onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                      placeholder="Name"
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm"
                    />
                    <input
                      value={editValue.cost_usd}
                      onChange={(e) => setEditValue({ ...editValue, cost_usd: e.target.value })}
                      placeholder="$"
                      type="number"
                      step="0.01"
                      className="w-20 px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm"
                    />
                  </div>
                  <input
                    value={editValue.icon_url}
                    onChange={(e) => setEditValue({ ...editValue, icon_url: e.target.value })}
                    placeholder="Image URL"
                    className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm"
                  />
                  {editError && <p className="text-danger text-xs">{editError}</p>}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-xs text-ink-muted font-medium flex items-center gap-1 px-2 py-1"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(gift.id)}
                      disabled={updateGiftType.isPending}
                      className="text-xs text-accent font-medium flex items-center gap-1 px-2 py-1 disabled:opacity-50"
                    >
                      <Check size={14} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={gift.id}
                  className="flex items-center justify-between bg-surface rounded-xl p-3 border border-border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {gift.icon_url && (
                      <img src={gift.icon_url} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className={`font-medium ${gift.is_active ? "text-ink" : "text-ink-muted line-through"}`}>
                        {gift.name}
                      </span>
                      <span className="text-sm text-ink-muted ml-2">${gift.cost_usd.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => startEdit(gift)} className="text-ink-muted">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: gift.id, is_active: !gift.is_active })}
                      className="text-xs text-accent font-medium"
                    >
                      {gift.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
