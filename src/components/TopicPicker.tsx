// src/components/TopicPicker.tsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useMyInterestIds } from "../hooks/useOnboarding";
import { useTopicSuggestions } from "../hooks/useTags";

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
  text = "",
}: {
  selected: Set<string>;
  onToggle: (interestId: string) => void;
  /** What's being written (post text, project title + description…). Used to suggest matching topics. */
  text?: string;
}) {
  const { data: categories, isLoading } = useCategories();
  const { data: myInterestIds } = useMyInterestIds();
  const suggestions = useTopicSuggestions(useDebouncedValue(text, 700));
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoading && (!categories || categories.length === 0)) return null;

  const atLimit = selected.size >= MAX_TOPICS;

  // One-tap shortcuts: topics the text is about, and the writer's own interests.
  const suggested = (suggestions.data ?? []).filter((t) => !selected.has(t.id));
  const mine = (categories ?? [])
    .flatMap((c) => c.interests)
    .filter((i) => (myInterestIds ?? []).includes(i.id) && !selected.has(i.id) && !suggested.some((t) => t.id === i.id))
    .slice(0, 6);
  const quick = (label: string, items: Array<{ id: string; name: string }>) =>
    items.length > 0 && (
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-ink-muted">{label}</span>
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={atLimit}
            onClick={() => onToggle(t.id)}
            className="px-2.5 py-1 rounded-full text-xs border border-dashed border-accent/50 text-ink hover:border-accent disabled:opacity-40"
          >
            + {t.name}
          </button>
        ))}
      </div>
    );

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

      {!isOpen && quick("Suggested:", suggested)}

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-2">
            {quick("Suggested:", suggested)}
            {quick("Yours:", mine)}
            {(suggested.length > 0 || mine.length > 0) && <div className="mb-3" />}
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
                                        ? "bg-cta text-white border-cta"
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
              Helps people browsing find this, and powers recommendations for it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
