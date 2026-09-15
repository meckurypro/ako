// src/components/music/AddMusicSheet.tsx
//
// Composer's "♫ Add music" control (see
// done/AKO_FEED_COMPOSER_SLIDES_MUSIC_UX_AUDIT.md §6). Searches the
// existing Akọ catalogue — deliberately not a full streaming
// application: search, artwork, title, artist, featured artists,
// preview, select. Uses the catalogue's existing one-minute clip
// rather than creating another clip-selection system here.

import { useEffect, useRef, useState } from "react";
import { Search, X, Play, Pause, Music as MusicIcon } from "lucide-react";
import { Portal } from "../Portal";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useMusicCatalogueSearch } from "../../hooks/useMusicCatalogue";
import type { MusicSearchResult } from "../../types/music";

interface AddMusicSheetProps {
  onSelect: (song: MusicSearchResult) => void;
  onClose: () => void;
}

export function AddMusicSheet({ onSelect, onClose }: AddMusicSheetProps) {
  const [query, setQuery] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: results, isLoading } = useMusicCatalogueSearch(query);

  useBackDismiss(onClose);
  useScrollLock();

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  function togglePreview(song: MusicSearchResult) {
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = song.clip_url;
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(song.id);
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />

        <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <h2 className="font-display text-lg text-ink">Add music</h2>
            <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pt-3 flex-shrink-0">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs or artists…"
                className="w-full pl-10 pr-3 py-2.5 rounded-full border border-border bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-3">
            {isLoading && <p className="text-sm text-ink-muted text-center py-8">Searching…</p>}
            {!isLoading && (results ?? []).length === 0 && (
              <p className="text-sm text-ink-muted text-center py-8">
                {query.trim() ? "No songs match that search." : "No music in the catalogue yet."}
              </p>
            )}
            <div className="space-y-1">
              {(results ?? []).map((song) => (
                <div key={song.id} className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-canvas">
                  <button
                    onClick={() => togglePreview(song)}
                    className="relative w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={song.cover_url ? { backgroundImage: `url(${song.cover_url})`, backgroundSize: "cover" } : undefined}
                    aria-label={playingId === song.id ? "Pause preview" : "Preview"}
                  >
                    {song.cover_url ? (
                      <span className="absolute inset-0 bg-canvas/40 flex items-center justify-center">
                        {playingId === song.id ? <Pause size={13} className="text-canvas" /> : <Play size={13} className="text-canvas" />}
                      </span>
                    ) : playingId === song.id ? (
                      <Pause size={14} className="text-accent" />
                    ) : (
                      <MusicIcon size={14} className="text-accent" />
                    )}
                  </button>
                  <button onClick={() => onSelect(song)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-ink truncate">{song.title}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {song.primary_artist_name}
                      {song.featured_artist_names.length > 0 && ` · feat. ${song.featured_artist_names.join(", ")}`}
                    </p>
                  </button>
                  <button
                    onClick={() => onSelect(song)}
                    className="text-xs font-medium text-accent px-3 py-1.5 rounded-full bg-accent-soft flex-shrink-0"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
