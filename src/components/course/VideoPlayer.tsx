// src/components/course/VideoPlayer.tsx
// Lesson video player.
//  • 16:9 (landscape) video: plays inline; the fullscreen button opens it full screen turned sideways. Android locks the
//    screen to landscape, so the phone's own sensor picks clockwise or counter-clockwise. Where the browser can't lock
//    orientation (iPhone), the picture is turned with CSS instead, to whichever side the phone is tilted.
//  • 9:16 (portrait) video: plays inline as a tall frame; fullscreen simply fills the screen. No rotation.
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { formatDuration, isPortraitVideo } from "../../lib/courseTypes";

const RATES = [1, 1.25, 1.5, 2, 0.75];
const HIDE_CONTROLS_MS = 2800;

interface VideoPlayerProps {
  src: string;
  /** Known dimensions (uploaded videos). Otherwise read from the file once its metadata loads. */
  width?: number | null;
  height?: number | null;
  startAt?: number | null;
  onTime?: (seconds: number) => void;
  onEnded?: () => void;
  title?: string;
}

type DeviceOrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function VideoPlayer({ src, width, height, startAt, onTime, onEnded, title }: VideoPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReported = useRef(0);
  const hideTimer = useRef<number | null>(null);
  const orientationLocked = useRef(false);
  const usedNativeFullscreen = useRef(false);

  const [dims, setDims] = useState<{ w: number; h: number } | null>(width && height ? { w: width, h: height } : null);
  const portrait = isPortraitVideo(dims?.w, dims?.h);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [fs, setFs] = useState(false);
  const [failed, setFailed] = useState(false);
  const [seeking, setSeeking] = useState(false);

  // Viewport, for the sideways fallback.
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [turn, setTurn] = useState<90 | -90>(90);
  const [lockFailed, setLockFailed] = useState(false);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const viewportPortrait = viewport.h > viewport.w;
  // Landscape video, full screen, phone still upright and not lockable: turn the picture ourselves.
  const turnByCss = fs && !portrait && viewportPortrait && (lockFailed || !orientationLocked.current);

  // Which way to turn follows how the phone is tilted: left edge down → clockwise, right edge down → counter-clockwise.
  useEffect(() => {
    if (!turnByCss) return;
    const onTilt = (e: DeviceOrientationEvent) => {
      const g = e.gamma;
      if (g == null || Math.abs(g) < 35) return;
      setTurn(g < 0 ? 90 : -90);
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [turnByCss]);

  const pokeControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), HIDE_CONTROLS_MS);
  }, []);
  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    []
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }, []);

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || v.currentTime + delta);
    pokeControls();
  };

  // ── Fullscreen ──────────────────────────────────────────────────────────────────────────────────────────
  const exitFullscreen = useCallback(async () => {
    setFs(false);
    setLockFailed(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
    try {
      screen.orientation?.unlock?.();
    } catch {
      /* ignore */
    }
    orientationLocked.current = false;
    usedNativeFullscreen.current = false;
  }, []);

  const enterFullscreen = useCallback(async () => {
    // iOS only hands out motion access from inside a tap, so ask before anything is awaited.
    const DOE = window.DeviceOrientationEvent as DeviceOrientationCtor | undefined;
    if (!portrait && typeof DOE?.requestPermission === "function") void DOE.requestPermission().catch(() => {});

    setFs(true);
    setLockFailed(false);
    orientationLocked.current = false;
    const el = wrapRef.current;
    try {
      if (el?.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: "hide" });
        usedNativeFullscreen.current = true;
      }
    } catch {
      /* not supported here — the fixed overlay below still fills the screen */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      if (!orientation?.lock) throw new Error("no lock");
      // "landscape" (not a fixed side) lets the phone's sensor choose clockwise or counter-clockwise.
      await orientation.lock(portrait ? "portrait" : "landscape");
      orientationLocked.current = true;
    } catch {
      if (!portrait) setLockFailed(true);
    }
    pokeControls();
  }, [portrait, pokeControls]);

  // The system leaving fullscreen on its own (swipe down, back gesture) closes ours too.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && usedNativeFullscreen.current) void exitFullscreen();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [exitFullscreen]);

  useBackDismiss(() => void exitFullscreen(), fs);

  // Leaving the lesson while full screen must not strand the phone in landscape.
  useEffect(
    () => () => {
      try {
        if (document.fullscreenElement) void document.exitFullscreen();
        screen.orientation?.unlock?.();
      } catch {
        /* ignore */
      }
    },
    []
  );

  // ── Layout ──────────────────────────────────────────────────────────────────────────────────────────────
  const stageStyle: React.CSSProperties = turnByCss
    ? {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: viewport.h,
        height: viewport.w,
        transform: `translate(-50%, -50%) rotate(${turn}deg)`,
      }
    : { position: "absolute", inset: 0 };

  const inlineStyle: React.CSSProperties = portrait
    ? { aspectRatio: "9 / 16", width: "min(100%, 42vh)", margin: "0 auto" }
    : { aspectRatio: "16 / 9", width: "100%" };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  if (failed) {
    return (
      <div className="mb-2 flex aspect-video w-full items-center justify-center rounded-xl bg-surface px-4 text-center text-sm text-ink-muted">
        This video couldn't load. Check your connection and reopen the lesson.
      </div>
    );
  }

  return (
    <div className="mb-2">
      {/* Keeps the page from jumping while the player is lifted out to full screen. */}
      {fs && <div style={inlineStyle} className="rounded-xl bg-black" />}
      <div
        ref={wrapRef}
        style={fs ? undefined : inlineStyle}
        className={fs ? "fixed inset-0 z-[100] overflow-hidden bg-black" : "relative overflow-hidden rounded-xl bg-black"}
      >
        <div style={fs ? stageStyle : { position: "absolute", inset: 0 }} onPointerMove={pokeControls} onClick={() => (showControls ? togglePlay() : pokeControls())}>
          <video
            ref={videoRef}
            src={src}
            title={title}
            playsInline
            preload="metadata"
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setDuration(v.duration);
              if (v.videoWidth && v.videoHeight) setDims({ w: v.videoWidth, h: v.videoHeight });
              if (startAt && startAt > 1 && startAt < v.duration - 2) v.currentTime = startAt;
            }}
            onPlay={() => {
              setPlaying(true);
              pokeControls();
            }}
            onPause={() => {
              setPlaying(false);
              setShowControls(true);
              if (hideTimer.current) window.clearTimeout(hideTimer.current);
            }}
            onEnded={() => {
              setPlaying(false);
              setShowControls(true);
              onEnded?.();
            }}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              if (!seeking) setCurrent(t);
              if (onTime && Math.abs(t - lastReported.current) >= 4) {
                lastReported.current = t;
                onTime(t);
              }
            }}
            onError={() => setFailed(true)}
            // Portrait video fills the frame; landscape keeps its full picture.
            className={`h-full w-full ${portrait ? "object-cover" : "object-contain"}`}
          />

          {/* Controls */}
          <div className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0"}`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            <div className="pointer-events-auto absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-8" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => skip(-10)} aria-label="Back 10 seconds" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white">
                <RotateCcw size={20} />
              </button>
              <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white">
                {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={() => skip(10)} aria-label="Forward 10 seconds" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white">
                <RotateCw size={20} />
              </button>
            </div>

            <div
              className="pointer-events-auto absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-6 text-white"
              style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={current}
                aria-label="Seek"
                onPointerDown={() => setSeeking(true)}
                onChange={(e) => setCurrent(Number(e.target.value))}
                onPointerUp={(e) => {
                  const v = videoRef.current;
                  if (v) v.currentTime = Number((e.target as HTMLInputElement).value);
                  setSeeking(false);
                }}
                onKeyUp={(e) => {
                  const v = videoRef.current;
                  if (v) v.currentTime = Number((e.target as HTMLInputElement).value);
                }}
                className="h-1 w-full cursor-pointer appearance-none rounded-full accent-white"
                style={{ background: `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.3) ${pct}%)` }}
              />
              <div className="mt-1.5 flex items-center gap-3 text-xs">
                <span className="tabular-nums">
                  {formatDuration(current) || "0:00"} / {formatDuration(duration) || "0:00"}
                </span>
                <span className="flex-1" />
                <button
                  onClick={() => {
                    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
                    setRate(next);
                    if (videoRef.current) videoRef.current.playbackRate = next;
                  }}
                  aria-label="Playback speed"
                  className="min-w-9 rounded-md bg-white/15 px-1.5 py-0.5 font-medium tabular-nums"
                >
                  {rate}x
                </button>
                <button
                  onClick={() => {
                    setMuted(!muted);
                    if (videoRef.current) videoRef.current.muted = !muted;
                  }}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button onClick={() => (fs ? void exitFullscreen() : void enterFullscreen())} aria-label={fs ? "Exit full screen" : "Full screen"}>
                  {fs ? <Minimize size={19} /> : <Maximize size={19} />}
                </button>
              </div>
            </div>

            {turnByCss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTurn(turn === 90 ? -90 : 90);
                }}
                aria-label="Flip the other way"
                className="pointer-events-auto absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white"
              >
                Flip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
