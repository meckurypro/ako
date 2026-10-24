// src/components/SongGigField.tsx
// The "Gig" field on a song (a Media project). Every song lives under one of the owner's artist gigs, so this is
// required. A musician with no gig yet gets "New gig" pre-selected: saving scaffolds their Music Artist gig, which
// they can set up properly later (see useEnsureArtistGig).
import { useEffect } from "react";
import { useArtistGigs } from "../hooks/usePortfolio";

/** Stands in for "scaffold a Music Artist gig on save". Anything else in `value` is a real gig id. */
export const NEW_ARTIST_GIG = "new";

interface SongGigFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function SongGigField({ value, onChange }: SongGigFieldProps) {
  const { data: gigs, isLoading } = useArtistGigs();
  // They only ever get one Music Artist gig (find_or_create_role_gig reuses it), so only offer a new one if missing.
  const hasMusicArtistGig = gigs.some((g) => g.role_label === "Music Artist");

  // Settle on a default once the list has loaded: their first gig, else a new one.
  useEffect(() => {
    if (isLoading || value) return;
    onChange(gigs[0]?.id ?? NEW_ARTIST_GIG);
  }, [isLoading, value, gigs, onChange]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink-muted mb-1.5">Gig</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
      >
        {gigs.map((g) => (
          <option key={g.id} value={g.id}>
            {g.role_label && g.role_label !== g.title ? `${g.title} · ${g.role_label}` : g.title}
          </option>
        ))}
        {!hasMusicArtistGig && <option value={NEW_ARTIST_GIG}>New gig · Music Artist</option>}
      </select>
      {value === NEW_ARTIST_GIG && <p className="text-xs text-ink-muted mt-1.5">Set it up later.</p>}
    </div>
  );
}
