import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useAdminGiftTypes, useCreateGiftType, useToggleGiftTypeActive } from "../../hooks/useAdmin";

export function AdminGiftTypes() {
  const navigate = useNavigate();
  const { data: giftTypes, isLoading } = useAdminGiftTypes();
  const createGiftType = useCreateGiftType();
  const toggleActive = useToggleGiftTypeActive();

  const [name, setName] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      await createGiftType.mutateAsync({ name: name.trim(), cost_usd: cost, sort_order: maxSortOrder + 1 });
      setName("");
      setCostUsd("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create gift type.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Gift types</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
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
        </form>
        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-2 mt-4">
            {giftTypes?.map((gift) => (
              <div
                key={gift.id}
                className="flex items-center justify-between bg-surface rounded-xl p-3 border border-border"
              >
                <div>
                  <span className={`font-medium ${gift.is_active ? "text-ink" : "text-ink-muted line-through"}`}>
                    {gift.name}
                  </span>
                  <span className="text-sm text-ink-muted ml-2">${gift.cost_usd.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => toggleActive.mutate({ id: gift.id, is_active: !gift.is_active })}
                  className="text-xs text-accent font-medium"
                >
                  {gift.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
