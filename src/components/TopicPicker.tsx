// src/components/TopicPicker.tsx
import { useCategories } from "../hooks/useCategories";

// Compact, embeddable version of the onboarding InterestPicker's
// pill-toggle UI — same data source (useCategories), sized for a
// form section rather than a full page.
export function TopicPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (interestId: string) => void;
}) {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading topics…</p>;
  }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.id}>
          <p className="text-xs font-medium text-ink-muted mb-1.5">{category.name}</p>
          <div className="flex flex-wrap gap-2">
            {category.interests.map((interest) => {
              const isSelected = selected.has(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => onToggle(interest.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isSelected
                      ? "bg-accent text-canvas border-accent"
                      : "bg-surface text-ink border-border hover:border-accent/50"
                  }`}
                >
                  {interest.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
