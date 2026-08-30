import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  useAdminCategories,
  useCreateCategory,
  useToggleCategoryActive,
  useAdminInterests,
  useCreateInterest,
  useToggleInterestActive,
} from "../../hooks/useAdmin";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function InterestsPanel({ categoryId }: { categoryId: string }) {
  const { data: interests, isLoading } = useAdminInterests(categoryId);
  const createInterest = useCreateInterest();
  const toggleActive = useToggleInterestActive();
  const [newName, setNewName] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createInterest.mutateAsync({ category_id: categoryId, name: newName.trim() });
    setNewName("");
  }

  return (
    <div className="bg-canvas rounded-lg p-3 mt-2 ml-4">
      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {interests?.map((interest) => (
            <div key={interest.id} className="flex items-center justify-between">
              <span className={`text-sm ${interest.is_active ? "text-ink" : "text-ink-muted line-through"}`}>
                {interest.name}
              </span>
              <button
                onClick={() => toggleActive.mutate({ id: interest.id, is_active: !interest.is_active })}
                className="text-xs text-accent font-medium"
              >
                {interest.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
          {interests?.length === 0 && (
            <p className="text-sm text-ink-muted">No interests yet.</p>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New interest name"
          className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-ink"
        />
        <button
          type="submit"
          disabled={createInterest.isPending}
          className="bg-accent text-canvas px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}

export function AdminCategories() {
  const navigate = useNavigate();
  const { data: categories, isLoading } = useAdminCategories();
  const createCategory = useCreateCategory();
  const toggleActive = useToggleCategoryActive();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const maxSortOrder = Math.max(0, ...(categories?.map((c) => c.sort_order) ?? [0]));

    await createCategory.mutateAsync({
      name: newCategoryName.trim(),
      slug: slugify(newCategoryName),
      sort_order: maxSortOrder + 1,
    });
    setNewCategoryName("");
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Categories</h2>
        </div>

        <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-ink"
          />
          <button
            type="submit"
            disabled={createCategory.isPending}
            className="bg-accent text-canvas px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </form>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-2">
            {categories?.map((category) => (
              <div key={category.id} className="bg-surface rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpandedId(expandedId === category.id ? null : category.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {expandedId === category.id ? (
                      <ChevronDown size={16} className="text-ink-muted" />
                    ) : (
                      <ChevronRight size={16} className="text-ink-muted" />
                    )}
                    <span className={`font-medium ${category.is_active ? "text-ink" : "text-ink-muted line-through"}`}>
                      {category.name}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      toggleActive.mutate({ id: category.id, is_active: !category.is_active })
                    }
                    className="text-xs text-accent font-medium flex-shrink-0"
                  >
                    {category.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {expandedId === category.id && <InterestsPanel categoryId={category.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
