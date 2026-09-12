import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../hooks/useCategories";
import { useMyInterestIds, useSaveInterests } from "../../hooks/useOnboarding";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";

const MIN_INTERESTS = 3;

export function InterestPicker() {
  const navigate = useNavigate();
  const { data: categories, isLoading, error } = useCategories();
  const { data: existingInterestIds, isLoading: existingLoading } = useMyInterestIds();
  const saveInterests = useSaveInterests();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const prefilled = useRef(false);

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
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading topics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <p className="text-danger text-center">
          Couldn't load topics. Check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-6 py-10 pb-28">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Wordmark size="sm" showTagline={false} />
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

        <div className="space-y-8">
          {categories?.map((category) => (
            <div key={category.id}>
              <h3 className="font-display text-lg text-ink mb-3">{category.name}</h3>
              <div className="flex flex-wrap gap-2">
                {category.interests.map((interest) => {
                  const isSelected = selected.has(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
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
