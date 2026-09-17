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

  // Full teardown used by every "this soundtrack should stop now" path
  // below (unmount, scroll-out, app backgrounded) — kept as one place
  // so all three stay in sync instead of drifting.
  const stopAndRelease = () => {
    stopPlayback();
    unduckAudioBus();
    clearMusicPlaying(stopPlayback);
  };

  useEffect(() => {
    return () => {
      // Belt-and-suspenders, same reasoning as useStopMediaWhenHidden's
      // own unmount cleanup: the observer's cleanup below already stops
      // playback in the common case, but if this component unmounts
      // outright (feed re-render, fast scroll past before the exit-
      // intersection callback lands) that cleanup may not get the
      // chance to run first. The audio is a plain `new Audio()`, never
      // attached to the DOM, so React removing this component does NOT
      // stop it by itself — only an explicit pause() does.
      stopAndRelease();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Leaving the app should stop the music" — minimizing, switching to
  // another app, or backgrounding the browser tab all fire
  // visibilitychange, but none of them move this row out of the
  // viewport, so the scroll IntersectionObserver below never sees a
  // reason to stop. Deliberately one-directional, same as
  // useStopMediaWhenHidden: coming back to the app never auto-resumes
  // playback — the person has to scroll the post out and back (or the
  // observer re-fires) to start it again, matching the rest of this
  // component's scroll-driven model.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) stopAndRelease();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
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
          stopAndRelease();
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      stopAndRelease();
    };
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
          // Bumped from size 15/no padding — too small to register as a
          // real control (or to tap comfortably) next to the song text.
          // Negative margin cancels the padding for layout purposes, so
          // this only grows the icon and its tap target, not the row.
          className="flex-shrink-0 text-ink-muted bg-transparent border-0 p-1.5 -m-1.5"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {discoveryOpen && <MusicDiscoverySheet catalogueId={entry.id} onClose={() => setDiscoveryOpen(false)} />}
    </>
  );
}
