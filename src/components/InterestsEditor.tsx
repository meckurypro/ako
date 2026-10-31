// src/components/InterestsEditor.tsx
//
// Settings → Interests. The same tags chosen at onboarding, editable any time. They drive the Discover chips,
// what's ranked first, and who is suggested to you, so changes take effect straight away.
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useMyInterestIds, useSaveInterests } from "../hooks/useOnboarding";
import { Button } from "./Button";
import { InterestBrowser } from "./InterestBrowser";

const MIN_INTERESTS = 3;

export function InterestsEditor() {
  const { data: saved, isLoading } = useMyInterestIds();
  const save = useSaveInterests();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedNote, setSavedNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !saved) return;
    setSelected(new Set(saved));
    seeded.current = true;
  }, [saved]);

  const dirty = !!saved && (saved.length !== selected.size || saved.some((id) => !selected.has(id)));

  function toggle(id: string) {
    setSavedNote(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    try {
      await save.mutateAsync(Array.from(selected));
      setSavedNote(true);
    } catch {
      setError("Couldn't save your interests. Check your connection and try again.");
    }
  }

  if (isLoading) return <p className="mt-3 text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="mt-3">
      <p className="mb-4 text-sm text-ink-muted">
        Pick the topics you reason about. They shape the chips on Discover, what's shown first, and who we suggest.
      </p>
      <InterestBrowser selected={selected} onToggle={toggle} />

      <div className="sticky bottom-0 -mx-4 mt-5 border-t border-border bg-canvas px-4 py-3">
        {error && <p className="mb-2 text-sm text-danger" role="alert">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {selected.size} selected{selected.size < MIN_INTERESTS && ` (${MIN_INTERESTS} minimum)`}
          </p>
          <div className="w-36">
            {savedNote && !dirty ? (
              <p className="flex items-center justify-end gap-1 text-sm text-accent"><Check size={15} /> Saved</p>
            ) : (
              <Button onClick={handleSave} disabled={!dirty || selected.size < MIN_INTERESTS} loading={save.isPending}>
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
