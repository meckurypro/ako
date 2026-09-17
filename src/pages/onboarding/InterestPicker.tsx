import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { useMyInterestIds, useSaveInterests } from "../../hooks/useOnboarding";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";
import { AuthPattern } from "../../components/AuthPattern";

const MIN_INTERESTS = 3;
const MAX_SUGGESTIONS = 8;

export function InterestPicker() {
  const navigate = useNavigate();
  const { data: categories, isLoading, error } = useCategories();
  const { data: existingInterestIds, isLoading: existingLoading } = useMyInterestIds();
  const saveInterests = useSaveInterests();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefilled = useRef(false);

  // Flat, searchable list of every interest across every category —
  // this is what powers the typeahead, so a match on "startups" finds
  // it regardless of which category it lives under.
  const flatInterests = useMemo(
    () =>
      (categories ?? []).flatMap((category) =>
        category.interests.map((interest) => ({ ...interest, categoryName: category.name }))
      ),
    [categories]
  );

  // Preserves selection order (Set iterates in insertion order) so
  // chips don't jump around as you add/remove them.
  const selectedInterests = useMemo(
    () => Array.from(selected).flatMap((id) => flatInterests.filter((i) => i.id === id)),
    [selected, flatInterests]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return flatInterests
      .filter((i) => !selected.has(i.id) && i.name.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, flatInterests, selected]);

  // Seed selections from whatever's already saved (resume case) —
  // once only, so it doesn't clobber the user's in-progress toggling
  // on a background refetch.
  useEffect(() => {
    if (prefilled.current || !existingInterestIds) return;
    if (existingInterestIds.length > 0) {
      setSelected(new Set(existingInterestIds));
    }
    prefilled.current = true;
  }, [existingInterestIds]);

  function toggleInterest(interestId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) {
        next.delete(interestId);
      } else {
        next.add(interestId);
      }
      return next;
    });
  }

  function selectSuggestion(interestId: string) {
    toggleInterest(interestId);
    setQuery("");
    inputRef.current?.focus();
  }

  // Backspace on an empty field pops the most recently added chip —
  // mirrors the FB/Instagram tag-input pattern.
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && query === "" && selectedInterests.length > 0) {
      toggleInterest(selectedInterests[selectedInterests.length - 1].id);
    }
  }

  async function handleContinue() {
    if (selected.size < MIN_INTERESTS) return;
    setSaveError(null);

    try {
      await saveInterests.mutateAsync(Array.from(selected));
      navigate("/onboarding/people");
    } catch (err) {
      console.error("Failed to save interests:", err);
      setSaveError("Couldn't save your interests. Check your connection and try again.");
    }
  }

  if (isLoading || existingLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-canvas overflow-hidden">
        <AuthPattern />
        <p className="relative z-10 text-ink-muted">Loading topics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-canvas px-6 overflow-hidden">
        <AuthPattern />
        <p className="relative z-10 text-danger text-center">
          Couldn't load topics. Check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-canvas px-6 py-10 pb-28 overflow-hidden">
      <AuthPattern />
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-8">
          <Wordmark />
        </div>

        <h2 className="font-display text-2xl text-ink mb-2">What do you reason about?</h2>
        <p className="text-ink-muted mb-8">
          Pick at least {MIN_INTERESTS} topics. We'll use them to help you find relevant people and
          shape your Akọ — you can change it anytime.
        </p>

        {saveError && (
          <p className="text-danger text-sm mb-4" role="alert">
            {saveError}
          </p>
        )}

        <div className="relative">
          <div
            className={`min-h-[52px] flex flex-wrap items-center gap-1.5 bg-surface rounded-2xl border px-3 py-2 transition-colors ${
              isFocused ? "border-accent/60" : "border-border"
            }`}
          >
            <Search size={16} className="text-ink-muted shrink-0 ml-1" />

            {selectedInterests.map((interest) => (
              <span
                key={interest.id}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-accent text-canvas text-xs font-medium"
              >
                {interest.name}
                <button
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                  aria-label={`Remove ${interest.name}`}
                  className="hover:bg-canvas/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={selectedInterests.length === 0 ? "Search topics — Music, Startups, Fitness…" : "Add more…"}
              className="flex-1 min-w-[120px] bg-transparent text-ink placeholder:text-ink-muted/60 focus:outline-none text-sm py-1"
            />
          </div>

          {isFocused && query.trim().length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-lg max-h-64 overflow-y-auto">
              {suggestions.length === 0 ? (
                <p className="text-sm text-ink-muted px-4 py-3">No topics match "{query.trim()}"</p>
              ) : (
                suggestions.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    // onMouseDown (not onClick) fires before the input's
                    // onBlur, so the dropdown doesn't close out from
                    // under the click.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(interest.id);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-canvas transition-colors"
                  >
                    <span className="text-sm text-ink">{interest.name}</span>
                    <span className="text-xs text-ink-muted">{interest.categoryName}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            {selected.size} selected
            {selected.size < MIN_INTERESTS && ` (${MIN_INTERESTS} minimum)`}
          </p>
          <div className="w-40">
            <Button
              onClick={handleContinue}
              disabled={selected.size < MIN_INTERESTS}
              loading={saveInterests.isPending}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
