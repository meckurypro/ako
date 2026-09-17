// src/components/music/MusicAttribution.tsx
//
// "Post music UI" — kept minimal, never competes with the post's own
// content (see done/AKO_FEED_COMPOSER_SLIDES_MUSIC_UX_AUDIT.md §7 and
// done/AKO_MUSIC_CATALOGUE_AND_CREATOR_DISCOVERY_SYSTEM.md §11-12):
//
//   ♩ Song Title · Artist · feat. Artist              🔊
//
// A single line, not a button — no pill background/border like a
// tappable chip. Tapping the icon/title/artist text still opens the
// music discovery surface (Music → Artist → Profile → Projects); the
// row never implies the poster owns the music. The speaker icon at
// the extreme right is the only real control — it mutes/unmutes,
// nothing more (playback itself is automatic, see below).
//
// Playback is scroll-driven, not tap-driven: this card's music starts
// the moment the post scrolls into view and stops the moment it
// scrolls out (IntersectionObserver, same threshold convention as
// ProfileAdSlot's background-video autoplay), so there's deliberately
// no play/pause button anywhere in this UI. Real audio state (loading/
// playing/failed), single active soundtrack across the whole Feed
// (see feedAudioPlayback.ts), and ducks the app's UI sound bus while
// playing so a "like" chime never talks over it.

import { useEffect, useRef, useState } from "react";
import { Music2, Volume2, VolumeX } from "lucide-react";
import { useMusicCatalogueEntry, useRecordMusicUsageEvent } from "../../hooks/useMusicCatalogue";
import { announceMusicPlaying, clearMusicPlaying } from "../../lib/feedAudioPlayback";
import { duckAudioBus, unduckAudioBus, resumeAudioBus } from "../../lib/audioBus";
import { fadeInAndPlay, fadeOutAndPause, fadeVolumeTo, FADE_SECONDS } from "../../lib/mediaFade";
import { MusicDiscoverySheet } from "./MusicDiscoverySheet";

interface MusicAttributionProps {
  catalogueId: string;
  postId: string;
}

// Matches ProfileAdSlot's own autoplay threshold — "enough of the post
// is on screen that this clearly is the thing the person is looking
// at" — rather than firing the instant one pixel scrolls into view.
const VISIBILITY_THRESHOLD = 0.6;

export function MusicAttribution({ catalogueId, postId }: MusicAttributionProps) {
  const { data: entry } = useMusicCatalogueEntry(catalogueId);
  const recordUsage = useRecordMusicUsageEvent();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const hasRecordedPlayRef = useRef(false);

  const stopPlayback = () => {
    fadeOutAndPause(audioRef.current);
  };

  useEffect(() => {
    return () => {
      clearMusicPlaying(stopPlayback);
      unduckAudioBus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll into view → play. Scroll out → pause. No button anywhere
  // in this component ever calls play()/pause() directly — this
  // observer is the only thing that starts or stops the audio.
  useEffect(() => {
    const node = rowRef.current;
    if (!node || !entry) return;

    const observer = new IntersectionObserver(
      ([intersectionEntry]) => {
        if (intersectionEntry.isIntersecting) {
          if (!audioRef.current) {
            const audio = new Audio(entry.clip_url);
            audio.loop = true;
            audio.muted = muted;
            audio.addEventListener("error", () => clearMusicPlaying(stopPlayback));
            audioRef.current = audio;
          }
          const audio = audioRef.current;

          resumeAudioBus();
          announceMusicPlaying(stopPlayback);
          duckAudioBus();
          fadeInAndPlay(audio)
            .then(() => {
              if (!hasRecordedPlayRef.current) {
                hasRecordedPlayRef.current = true;
                recordUsage.mutate({ catalogueId: entry.id, eventType: "play", postId });
              }
            })
            .catch(() => {
              // Autoplay-with-sound was blocked — fall back to a
              // muted autoplay (which browsers always allow) rather
              // than leaving the post silent-and-stopped with no way
              // to start it, since there's no play button to retry
              // from. The speaker icon reflects the fallback so the
              // person can see it's muted and un-mute it themselves.
              // No fade needed here — muted playback is silent either way.
              audio.muted = true;
              setMuted(true);
              audio.play().catch(() => clearMusicPlaying(stopPlayback));
            });
        } else {
          stopPlayback();
          unduckAudioBus();
          clearMusicPlaying(stopPlayback);
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, entry?.clip_url]);

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    const audio = audioRef.current;
    if (!audio) return;
    if (next) {
      // Fade down to silence, then engage the mute flag itself.
      fadeVolumeTo(audio, 0);
      setTimeout(() => {
        audio.muted = true;
      }, FADE_SECONDS * 1000);
    } else {
      audio.muted = false;
      fadeVolumeTo(audio, 1);
    }
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
      <div ref={rowRef} className="flex items-center gap-2 mt-2 min-w-0">
        <button
          onClick={openDiscovery}
          className="flex-1 flex items-center gap-1.5 min-w-0 bg-transparent border-0 p-0 text-left"
        >
          <Music2 size={14} className="text-ink-muted flex-shrink-0" />
          <span className="min-w-0 truncate text-xs text-ink-muted">
            <span className="font-medium text-ink">{entry.title}</span>
            {" · "}
            {entry.primary_artist_name}
            {featured.length > 0 && ` · feat. ${featured.map((f) => f.contributor.display_name).join(", ")}`}
          </span>
        </button>

        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex-shrink-0 text-ink-muted bg-transparent border-0 p-0"
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      {discoveryOpen && <MusicDiscoverySheet catalogueId={entry.id} onClose={() => setDiscoveryOpen(false)} />}
    </>
  );
}
