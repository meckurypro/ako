// src/hooks/useVoiceRecorder.ts
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IDLE_LEVELS, useLiveAudioLevels } from "./useLiveAudioLevels";
import { createRecorderLiveStore } from "../lib/recorderLiveStore";
import { durationOf, resolveInfiniteDuration } from "../lib/audioDuration";
import { computeWaveformPeaks } from "../lib/waveform";

/** How far left a hold has to drag before it's a cancel. */
const CANCEL_THRESHOLD_PX = 80;
/** How far up a hold has to drag before it locks hands-free. */
const LOCK_THRESHOLD_PX = 64;

export type VoiceRecorderPhase = "idle" | "recording" | "preview";

interface PreviewData {
  blob: Blob;
  url: string;
  durationSec: number;
  /** Starts empty and fills in a beat after recording stops — peaks
   *  are computed from the finished blob, so there's an unavoidable
   *  (sub-second, for a typical note) gap between "stopped" and
   *  "waveform ready". The preview bar renders flat placeholder bars
   *  in that gap rather than waiting to appear. */
  peaks: number[];
  /** WhatsApp's "1" toggle in the preview/locked bar — off by default,
   *  tapped on right before sending. */
  viewOnce: boolean;
}

/**
 * Full WhatsApp-style voice note lifecycle:
 *
 *  idle --(press mic)--> recording --(release)--> preview --(send)--> idle
 *                            |
 *                            |--(drag left past threshold)--> cancel --> idle
 *                            |--(drag up past threshold)--> locked (hands-free;
 *                                 release no longer ends anything — only the
 *                                 Trash/Stop buttons in the locked toolbar do)
 *
 * Every path that ends a recording (plain release, or Stop from the
 * locked toolbar) lands in "preview" rather than sending immediately —
 * matching WhatsApp's own post-2021 behavior of always letting you
 * listen back before it goes out.
 *
 * The hold/drag gesture is tracked with window-level pointermove/up
 * listeners rather than the more usual setPointerCapture on the mic
 * button itself: the button's surrounding UI swaps out entirely the
 * moment recording starts (timer + slide-to-cancel row replaces the
 * text input), and if that swap ever changes which DOM node the mic
 * icon actually is, native pointer capture is silently dropped by the
 * browser mid-gesture. Global listeners have no such dependency on a
 * particular element surviving the whole hold.
 */
interface VoiceRecorderOptions {
  /** Releasing an unlocked hold sends immediately (WhatsApp) instead of opening the preview.
   *  Off by default so existing callers (rooms) keep their preview-then-send flow. */
  sendOnRelease?: boolean;
  /** Called when a hold was too short to be a recording — show "Hold to record, release to send". */
  onTooShort?: () => void;
}

/** Holds shorter than this are treated as an accidental tap, not a recording. */
const TAP_CANCEL_MS = 500;

/** Ask a MediaRecorder to flush what it has so far and wait for that chunk to land (works while paused). */
function flushRecorder(mr: MediaRecorder): Promise<void> {
  return new Promise((resolve) => {
    if (mr.state === "inactive") return resolve();
    const done = () => {
      mr.removeEventListener("dataavailable", done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 400); // never hang the UI on a browser that doesn't answer
    mr.addEventListener("dataavailable", done, { once: true });
    try {
      mr.requestData();
    } catch {
      done();
    }
  });
}

export function useVoiceRecorder(
  onSend: (blob: Blob, durationSec: number, peaks: number[], viewOnce: boolean, localUrl: string) => Promise<void>,
  options: VoiceRecorderOptions = {}
) {
  const sendOnReleaseRef = useRef(!!options.sendOnRelease);
  sendOnReleaseRef.current = !!options.sendOnRelease;
  const onTooShortRef = useRef(options.onTooShort);
  onTooShortRef.current = options.onTooShort;
  const sendAfterStopRef = useRef(false);
  const [phase, setPhase] = useState<VoiceRecorderPhase>("idle");
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playingPaused, setPlayingPaused] = useState(false);
  // High-frequency values (timer, drag, waveform, playhead) live outside React state — see recorderLiveStore.ts.
  const [live] = useState(() => createRecorderLiveStore(IDLE_LEVELS));
  const setElapsedMs = useCallback((ms: number) => live.set({ elapsedMs: ms }), [live]);
  const setDrag = useCallback((d: { x: number; y: number }) => live.set({ drag: d }), [live]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [sending, setSending] = useState(false);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentStartRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const pausedRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const lockedRef = useRef(false); // mirrors `locked` for use inside the window listeners below
  const endedRef = useRef(false); // true once cancel/stop has resolved this hold, so a trailing pointerup is a no-op
  const micStreamRef = useRef<MediaStream | null>(null); // mirrors `micStream` for cleanup paths that can't wait on state

  const pausedAudioRef = useRef<HTMLAudioElement | null>(null);
  const pausedAudioUrlRef = useRef<string | null>(null);

  useLiveAudioLevels(micStream, live, pausedRef);

  /** Stop and discard the "listen to what I've recorded so far" clip (if any). */
  const stopPausedPlayback = useCallback(() => {
    const a = pausedAudioRef.current;
    if (a) {
      a.onended = null;
      a.ontimeupdate = null;
      a.onerror = null;
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    pausedAudioRef.current = null;
    if (pausedAudioUrlRef.current) {
      URL.revokeObjectURL(pausedAudioUrlRef.current);
      pausedAudioUrlRef.current = null;
    }
    live.set({ playbackMs: 0 });
    setPlayingPaused(false);
  }, [live]);

  useEffect(() => stopPausedPlayback, [stopPausedPlayback]);

  function releaseMic() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicStream(null);
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicStream(stream);
      recordedChunksRef.current = [];
      lockedRef.current = false;
      endedRef.current = false;
      pausedRef.current = false;
      setLocked(false);
      setPaused(false);
      setDrag({ x: 0, y: 0 });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.start();
      accumulatedMsRef.current = 0;
      segmentStartRef.current = Date.now();
      setElapsedMs(0);
      live.history.length = 0;
      live.set({ levels: IDLE_LEVELS, playbackMs: 0 });
      setPhase("recording");
      recordingTimerRef.current = setInterval(() => {
        // Paused: the clock must stand still (it used to keep counting — and double-count — while paused).
        if (pausedRef.current) return;
        const ms = accumulatedMsRef.current + (Date.now() - segmentStartRef.current);
        // The bar only shows whole seconds, so only publish when the second changes.
        if (Math.floor(ms / 1000) !== Math.floor(live.get().elapsedMs / 1000)) setElapsedMs(ms);
      }, 200);
    } catch {
      endedRef.current = true;
      setPhase("idle");
    }
  }, [live, setDrag, setElapsedMs]);

  const cancelRecording = useCallback(() => {
    endedRef.current = true;
    stopPausedPlayback();
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null;
      mr.stop();
    }
    releaseMic();
    recordedChunksRef.current = [];
    setPhase("idle");
    setLocked(false);
    lockedRef.current = false;
    setDrag({ x: 0, y: 0 });
  }, [setDrag, stopPausedPlayback]);

  const finishStop = useCallback((sendAfter: boolean) => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    endedRef.current = true;
    stopPausedPlayback();
    sendAfterStopRef.current = sendAfter;
    const finalElapsedMs = pausedRef.current
      ? accumulatedMsRef.current
      : accumulatedMsRef.current + (Date.now() - segmentStartRef.current);

    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      const durationSec = Math.max(1, Math.round(finalElapsedMs / 1000));
      releaseMic();
      if (sendAfterStopRef.current) {
        // Release-to-send: hand the composer back at once; the bubble shows optimistically while it uploads.
        sendAfterStopRef.current = false;
        setLocked(false);
        lockedRef.current = false;
        setDrag({ x: 0, y: 0 });
        setPhase("idle");
        void (async () => {
          const peaks = await computeWaveformPeaks(blob).catch(() => [] as number[]);
          try {
            await onSendRef.current(blob, durationSec, peaks, false, url);
            URL.revokeObjectURL(url);
          } catch {
            // Upload failed: keep the clip as a draft so nothing recorded is lost.
            setPreview({ blob, url, durationSec, peaks, viewOnce: false });
            setPhase("preview");
          }
        })();
        return;
      }
      setPreview({ blob, url, durationSec, peaks: [], viewOnce: false });
      setPhase("preview");
      // Fills in a beat after the preview bar is already visible —
      // see the PreviewData.peaks comment above.
      computeWaveformPeaks(blob)
        .then((peaks) => setPreview((prev) => (prev && prev.url === url ? { ...prev, peaks } : prev)))
        .catch(() => {});
    };
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mr.stop();
  }, [setDrag, stopPausedPlayback]);

  const stopToPreview = useCallback(() => finishStop(false), [finishStop]);
  /** Stop and send in one step — the "release to send" / locked-mode send button. */
  const stopAndSend = useCallback(() => finishStop(true), [finishStop]);

  const togglePauseResume = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (pausedRef.current) {
      stopPausedPlayback(); // resuming ends any "listen back" in progress
      mr.resume();
      segmentStartRef.current = Date.now();
      pausedRef.current = false;
      setPaused(false);
    } else {
      mr.pause();
      accumulatedMsRef.current += Date.now() - segmentStartRef.current;
      pausedRef.current = true;
      setElapsedMs(accumulatedMsRef.current);
      setPaused(true);
    }
  }, [setElapsedMs, stopPausedPlayback]);

  /**
   * While paused: build (once) an <audio> of what's been recorded so far, WITHOUT ending the recording, so the
   * user can listen and scrub, then Resume (keeps appending to the same note) or Send. Discarded on resume.
   * Returns null if the browser can't produce one (then callers fall back to the full preview).
   */
  const ensurePausedAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    if (pausedAudioRef.current) return pausedAudioRef.current;
    const mr = mediaRecorderRef.current;
    if (!mr || !pausedRef.current) return null;
    await flushRecorder(mr);
    if (!pausedRef.current || recordedChunksRef.current.length === 0) return null; // resumed/cancelled while flushing
    if (pausedAudioRef.current) return pausedAudioRef.current;

    const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || "audio/webm" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    pausedAudioRef.current = audio;
    pausedAudioUrlRef.current = url;
    const fallbackSec = accumulatedMsRef.current / 1000;
    let resolving = false;
    const toPreview = () => {
      stopPausedPlayback();
      finishStop(false);
    };
    // A still-open MediaRecorder clip has no duration header (Infinity) — learn it so scrubbing works.
    audio.addEventListener("loadedmetadata", () => {
      if (audio.duration !== Infinity) return;
      resolving = true;
      resolveInfiniteDuration(audio, () => {
        resolving = false;
      });
    });
    audio.ontimeupdate = () => {
      if (!resolving) live.set({ playbackMs: Math.min(audio.currentTime, durationOf(audio, fallbackSec)) * 1000 });
    };
    audio.onended = () => {
      audio.currentTime = 0;
      live.set({ playbackMs: 0 });
      setPlayingPaused(false);
    };
    audio.onpause = () => setPlayingPaused(false);
    audio.onplay = () => setPlayingPaused(true);
    audio.onerror = toPreview;
    return audio;
  }, [finishStop, live, stopPausedPlayback]);

  /** Play / pause the paused clip (pausing keeps its position; resuming the recording discards it). */
  const togglePausedPlayback = useCallback(async () => {
    const existing = pausedAudioRef.current;
    if (existing && !existing.paused) {
      existing.pause();
      return;
    }
    const audio = await ensurePausedAudio();
    if (!audio) return;
    audio.play().catch(() => {
      stopPausedPlayback();
      finishStop(false);
    });
  }, [ensurePausedAudio, finishStop, stopPausedPlayback]);

  /** Scrub the paused clip to a 0..1 position. */
  const seekPausedPlayback = useCallback(
    async (ratio: number) => {
      const audio = await ensurePausedAudio();
      if (!audio) return;
      const total = durationOf(audio, accumulatedMsRef.current / 1000);
      audio.currentTime = ratio * total;
      live.set({ playbackMs: ratio * total * 1000 });
    },
    [ensurePausedAudio, live]
  );

  const toggleViewOnce = useCallback(() => {
    setPreview((prev) => (prev ? { ...prev, viewOnce: !prev.viewOnce } : prev));
  }, []);

  const discardPreview = useCallback(() => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setPhase("idle");
  }, []);

  const sendPreview = useCallback(async () => {
    if (!preview) return;
    setSending(true);
    try {
      await onSend(preview.blob, preview.durationSec, preview.peaks, preview.viewOnce, preview.url);
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      setPhase("idle");
    } finally {
      setSending(false);
    }
  }, [preview, onSend]);

  // --- Press-and-hold gesture, attached to the mic trigger button ---
  // Window-level listeners (see the doc comment above) rather than
  // setPointerCapture on the button itself.

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      startPointRef.current = { x: e.clientX, y: e.clientY };
      void startRecording();

      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
      }
      function handleMove(ev: PointerEvent) {
        if (lockedRef.current || endedRef.current) return;
        const dx = ev.clientX - startPointRef.current.x;
        const dy = startPointRef.current.y - ev.clientY; // positive = finger moved up
        if (dy > LOCK_THRESHOLD_PX) {
          lockedRef.current = true;
          setLocked(true);
          setDrag({ x: 0, y: 0 });
          return;
        }
        if (dx < -CANCEL_THRESHOLD_PX) {
          cleanup();
          cancelRecording();
          return;
        }
        setDrag({ x: Math.min(0, dx), y: Math.max(0, dy) });
      }
      function handleUp() {
        cleanup();
        if (endedRef.current || lockedRef.current) return; // locked → hands-free, only the toolbar's own buttons end it now
        if (Date.now() - segmentStartRef.current + accumulatedMsRef.current < TAP_CANCEL_MS) {
          cancelRecording();
          onTooShortRef.current?.();
        } else if (sendOnReleaseRef.current) stopAndSend();
        else stopToPreview();
      }
      // A genuine pointerup (finger deliberately lifted) still goes to
      // preview even if it's short — that's a real, if brief, note.
      // pointercancel means something ELSE ended the gesture — the OS
      // showing a call/notification, the browser deciding this became
      // a different kind of touch, or (this was happening on every
      // single recording) the mic button's own DOM node briefly
      // disappearing out from under the still-active touch the instant
      // recording starts, which Chromium treats as an implicit cancel.
      // Treating that the same as a deliberate release meant every
      // note got committed at whatever near-zero elapsed time existed
      // at that instant, floored by stopToPreview's Math.max(1, …) to a
      // flat "0:01" — every time, regardless of how long anyone
      // actually held it. An interruption should discard the note, not
      // silently send a 1-second one.
      function handleCancel() {
        cleanup();
        if (endedRef.current || lockedRef.current) return;
        cancelRecording();
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
    },
    [startRecording, cancelRecording, stopToPreview, stopAndSend, setDrag]
  );

  return {
    phase,
    locked,
    paused,
    playingPaused,
    /** Timer, drag offset, live waveform and playhead — subscribe with useRecorderLive(live). */
    live,
    preview,
    sending,
    cancelThresholdPx: CANCEL_THRESHOLD_PX,
    lockThresholdPx: LOCK_THRESHOLD_PX,
    micHandlers: { onPointerDown },
    cancelRecording,
    stopToPreview,
    stopAndSend,
    togglePauseResume,
    togglePausedPlayback,
    seekPausedPlayback,
    toggleViewOnce,
    discardPreview,
    sendPreview,
  };
}
