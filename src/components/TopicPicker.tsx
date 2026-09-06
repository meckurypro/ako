// src/components/TopicPicker.tsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCategories } from "../hooks/useCategories";

/** Shared with CreateProject/EditProject so the cap enforced in the
 *  toggle handler and the cap shown/enforced here never drift apart. */
export const MAX_TOPICS = 5;

// Compact, embeddable version of the onboarding InterestPicker's
// pill-toggle UI — same data source (useCategories), sized for a form
// section rather than a full page. The whole section starts folded
// behind its own "Topics (optional)" header (tap to expose the
// category list), and each category then stays collapsed under its
// own row until tapped too — two levels of fold so a form with many
// categories/interests doesn't read as a wall of pills by default.
export function TopicPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (interestId: string) => void;
}) {
  const { data: categories, isLoading } = useCategories();
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoading && (!categories || categories.length === 0)) return null;

  const atLimit = selected.size >= MAX_TOPICS;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-1"
      >
        <span className="text-sm font-medium text-ink-muted">
          Topics <span className="font-normal">(optional)</span>
          {selected.size > 0 && <span className="font-normal"> ({selected.size})</span>}
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-muted transition-transform duration-300 ease-in-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-2">
            {isLoading ? (
              <p className="text-sm text-ink-muted">Loading topics…</p>
            ) : (
              <>
                <p className="text-xs text-ink-muted mb-3">
                  {selected.size}/{MAX_TOPICS} selected
                  {atLimit ? " — remove one to pick another" : ""}
                </p>

                <div className="divide-y divide-border">
                  {categories!.map((category) => {
                    const isCategoryOpen = openCategoryId === category.id;
                    const selectedInCategory = category.interests.filter((i) => selected.has(i.id)).length;

                    return (
                      <div key={category.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCategoryId((curr) => (curr === category.id ? null : category.id))
                          }
                          className="w-full flex items-center justify-between py-3 text-left"
                        >
                          <span className="text-sm font-medium text-ink">
                            {category.name}
                            {selectedInCategory > 0 && (
                              <span className="text-ink-muted font-normal"> ({selectedInCategory})</span>
                            )}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-ink-muted transition-transform duration-300 ease-in-out ${
                              isCategoryOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                            isCategoryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="flex flex-wrap gap-2 pb-3">
                              {category.interests.map((interest) => {
                                const isSelected = selected.has(interest.id);
                                const disabled = !isSelected && atLimit;
                                return (
                                  <button
                                    key={interest.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onToggle(interest.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                      isSelected
                                        ? "bg-accent text-canvas border-accent"
                                        : disabled
                                        ? "bg-surface text-ink-muted/40 border-border cursor-not-allowed"
                                        : "bg-surface text-ink border-border hover:border-accent/50"
                                    }`}
                                  >
                                    {interest.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <p className="text-xs text-ink-muted mt-2">
              Helps people browsing find this project, and powers "similar projects" for it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
