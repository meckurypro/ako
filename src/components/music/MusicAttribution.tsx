// src/components/music/MusicAttribution.tsx
//
// "Post music UI" — kept minimal, never competes with the post's own
// content (see done/AKO_FEED_COMPOSER_SLIDES_MUSIC_UX_AUDIT.md §7 and
// done/AKO_MUSIC_CATALOGUE_AND_CREATOR_DISCOVERY_SYSTEM.md §11-12):
//
//   ○ Song Title
//     Artist · feat. Artist
//
// Tapping the pill (outside the play button) opens the music
// discovery surface — Music → Artist → Profile → Projects. The whole
// row never implies the poster owns the music.
//
// Playback: real audio state (loading/playing/paused/failed), single
// active soundtrack across the whole Feed (see feedAudioPlayback.ts),
// and ducks the app's UI sound bus while playing so a "like" chime
// never talks over it.

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { useMusicCatalogueEntry, useRecordMusicUsageEvent } from "../../hooks/useMusicCatalogue";
import { announceMusicPlaying, clearMusicPlaying } from "../../lib/feedAudioPlayback";
import { duckAudioBus, unduckAudioBus, resumeAudioBus } from "../../lib/audioBus";
import { MusicDiscoverySheet } from "./MusicDiscoverySheet";

interface MusicAttributionProps {
  catalogueId: string;
  postId: string;
}

type PlaybackState = "idle" | "loading" | "playing" | "paused" | "failed";

export function MusicAttribution({ catalogueId, postId }: MusicAttributionProps) {
  const { data: entry } = useMusicCatalogueEntry(catalogueId);
  const recordUsage = useRecordMusicUsageEvent();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlaybackState>("idle");
  const [discoveryOpen, setDiscoveryOpen] = useState(false);

  const stopPlayback = () => {
    audioRef.current?.pause();
    setState((s) => (s === "playing" ? "paused" : s));
  };

  useEffect(() => {
    return () => {
      clearMusicPlaying(stopPlayback);
      unduckAudioBus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!entry) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(entry.clip_url);
      audioRef.current.addEventListener("ended", () => {
        setState("paused");
        unduckAudioBus();
        clearMusicPlaying(stopPlayback);
      });
      audioRef.current.addEventListener("error", () => setState("failed"));
    }

    if (state === "playing") {
      stopPlayback();
      unduckAudioBus();
      clearMusicPlaying(stopPlayback);
      return;
    }

    resumeAudioBus();
    announceMusicPlaying(stopPlayback);
    setState("loading");
    duckAudioBus();
    audioRef.current
      .play()
      .then(() => setState("playing"))
      .catch(() => setState("failed"));
  }

  function openDiscovery(e: React.MouseEvent) {
    e.stopPropagation();
    if (!entry) return;
    recordUsage.mutate({ catalogueId: entry.id, eventType: "attribution_tap", postId });
    setDiscoveryOpen(true);
  }

  if (!entry) return null;

  const featured = entry.contributors.filter((c) => c.role === "featured_artist");

  return (
    <>
      <button
        onClick={openDiscovery}
        className="w-full flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-full bg-surface border border-border max-w-fit text-left"
      >
        <span
          onClick={togglePlay}
          role="button"
          aria-label={state === "playing" ? "Pause" : "Play"}
          className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={entry.cover_url ? { backgroundImage: `url(${entry.cover_url})`, backgroundSize: "cover" } : undefined}
        >
          {!entry.cover_url &&
            (state === "loading" ? (
              <Loader2 size={11} className="text-accent animate-spin" />
            ) : state === "playing" ? (
              <Pause size={11} className="text-accent" />
            ) : (
              <Play size={11} className="text-accent" />
            ))}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-ink truncate">{entry.title}</span>
          <span className="block text-[11px] text-ink-muted truncate">
            {entry.primary_artist_name}
            {featured.length > 0 && ` · feat. ${featured.map((f) => f.contributor.display_name).join(", ")}`}
          </span>
        </span>
      </button>

      {discoveryOpen && <MusicDiscoverySheet catalogueId={entry.id} onClose={() => setDiscoveryOpen(false)} />}
    </>
  );
}
