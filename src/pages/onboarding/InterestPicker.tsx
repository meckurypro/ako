import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../hooks/useCategories";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";

const MIN_INTERESTS = 3;

export function InterestPicker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: categories, isLoading, error } = useCategories();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

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
    if (!user || selected.size < MIN_INTERESTS) return;

    setSaving(true);

    const rows = Array.from(selected).map((interest_id) => ({
      user_id: user.id,
      interest_id,
    }));

    const { error: insertError } = await supabase.from("user_interests").insert(rows);

    setSaving(false);

    if (insertError) {
      console.error("Failed to save interests:", insertError);
      return;
    }

    navigate("/feed");
  }

  if (isLoading) {
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

        <h2 className="font-display text-2xl text-ink mb-2">What's on your mind?</h2>
        <p className="text-ink-muted mb-8">
          Pick at least {MIN_INTERESTS} topics. This shapes what shows up in your feed —
          you can change it anytime.
        </p>

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

      {/* Fixed bottom bar — keeps the continue action reachable without
          scrolling back up, standard pattern for long selection screens */}
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
              loading={saving}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
