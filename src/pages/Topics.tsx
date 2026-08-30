import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";

export function Topics() {
  const { data: categories, isLoading } = useCategories();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    // Single-open accordion: tapping the active heading closes it,
    // tapping a different one closes whichever was open and opens the new one.
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <TopHeader />

      <div className="max-w-xl mx-auto px-4 pt-4">
        <h2 className="font-display text-2xl text-ink mb-1">Topics</h2>
        <p className="text-ink-muted text-sm mb-6">Explore by what you care about.</p>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="divide-y divide-border">
            {categories?.map((category) => {
              const isOpen = openId === category.id;
              return (
                <div key={category.id}>
                  <button
                    onClick={() => toggle(category.id)}
                    className="w-full flex items-center justify-between py-4 text-left"
                  >
                    <h3 className="font-display text-lg text-ink">{category.name}</h3>
                    <ChevronDown
                      size={18}
                      className={`text-ink-muted transition-transform duration-300 ease-in-out ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  {/* Grid-rows trick: animates from 0fr to 1fr smoothly without
                      needing to measure content height in JS. overflow-hidden
                      on the inner div clips content during the transition. */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-wrap gap-2 pb-4">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
