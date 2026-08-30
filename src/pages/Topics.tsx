import { useNavigate } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";

export function Topics() {
  const { data: categories, isLoading } = useCategories();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <TopHeader />

      <div className="max-w-xl mx-auto px-4 pt-4">
        <h2 className="font-display text-2xl text-ink mb-1">Topics</h2>
        <p className="text-ink-muted text-sm mb-6">Explore by what you care about.</p>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-6">
            {categories?.map((category) => (
              <div key={category.id}>
                <h3 className="font-display text-lg text-ink mb-2">{category.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {category.interests.map((interest) => (
                    <button
                      key={interest.id}
                      onClick={() => navigate(`/feed?interest=${interest.id}`)}
                      className="px-3.5 py-2 rounded-full text-sm bg-surface text-ink border border-border hover:border-accent/50"
                    >
                      {interest.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
