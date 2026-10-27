// src/components/SongTalentField.tsx
// The "Talent" field on a song (a Media project). Every song lives under one of the owner's artist talents, so this is
// required. A musician with no talent yet gets "New talent" pre-selected: saving scaffolds their Music Artist talent, which
// they can set up properly later (see useEnsureArtistTalent).
import { useEffect } from "react";
import { useArtistTalents } from "../hooks/usePortfolio";

/** Stands in for "scaffold a Music Artist talent on save". Anything else in `value` is a real talent id. */
export const NEW_ARTIST_TALENT = "new";

interface SongTalentFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function SongTalentField({ value, onChange }: SongTalentFieldProps) {
  const { data: talents, isLoading } = useArtistTalents();
  // They only ever get one Music Artist talent (find_or_create_role_gig reuses it), so only offer a new one if missing.
  const hasMusicArtistTalent = talents.some((g) => g.role_label === "Music Artist");

  // Settle on a default once the list has loaded: their first talent, else a new one.
  useEffect(() => {
    if (isLoading || value) return;
    onChange(talents[0]?.id ?? NEW_ARTIST_TALENT);
  }, [isLoading, value, talents, onChange]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink-muted mb-1.5">Talent</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
      >
        {talents.map((g) => (
          <option key={g.id} value={g.id}>
            {g.role_label && g.role_label !== g.title ? `${g.title} · ${g.role_label}` : g.title}
          </option>
        ))}
        {!hasMusicArtistTalent && <option value={NEW_ARTIST_TALENT}>New talent · Music Artist</option>}
      </select>
      {value === NEW_ARTIST_TALENT && <p className="text-xs text-ink-muted mt-1.5">Set it up later.</p>}
    </div>
  );
}
