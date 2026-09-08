// src/hooks/useVoiceRecorder.ts
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLiveAudioLevels } from "./useLiveAudioLevels";
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
export function useVoiceRecorder(onSend: (blob: Blob, durationSec: number, peaks: number[]) => Promise<void>) {
  const [phase, setPhase] = useState<VoiceRecorderPhase>("idle");
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [sending, setSending] = useState(false);
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

  const liveLevels = useLiveAudioLevels(micStream);

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
      setPhase("recording");
      recordingTimerRef.current = setInterval(() => {
        setElapsedMs(accumulatedMsRef.current + (Date.now() - segmentStartRef.current));
      }, 100);
    } catch {
      endedRef.current = true;
      setPhase("idle");
    }
  }, []);

  const cancelRecording = useCallback(() => {
    endedRef.current = true;
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
  }, []);

  const stopToPreview = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    endedRef.current = true;
    const finalElapsedMs = pausedRef.current
      ? accumulatedMsRef.current
      : accumulatedMsRef.current + (Date.now() - segmentStartRef.current);

    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      const durationSec = Math.max(1, Math.round(finalElapsedMs / 1000));
      setPreview({ blob, url, durationSec, peaks: [] });
      setPhase("preview");
      releaseMic();
      // Fills in a beat after the preview bar is already visible —
      // see the PreviewData.peaks comment above.
      computeWaveformPeaks(blob)
        .then((peaks) => setPreview((prev) => (prev && prev.url === url ? { ...prev, peaks } : prev)))
        .catch(() => {});
    };
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mr.stop();
  }, []);

  const togglePauseResume = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (pausedRef.current) {
      mr.resume();
      segmentStartRef.current = Date.now();
      pausedRef.current = false;
      setPaused(false);
    } else {
      mr.pause();
      accumulatedMsRef.current += Date.now() - segmentStartRef.current;
      pausedRef.current = true;
      setPaused(true);
    }
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
      await onSend(preview.blob, preview.durationSec, preview.peaks);
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
        window.removeEventListener("pointercancel", handleUp);
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
        stopToPreview();
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [startRecording, cancelRecording, stopToPreview]
  );

  return {
    phase,
    locked,
    paused,
    elapsedMs,
    drag,
    liveLevels,
    preview,
    sending,
    cancelThresholdPx: CANCEL_THRESHOLD_PX,
    lockThresholdPx: LOCK_THRESHOLD_PX,
    micHandlers: { onPointerDown },
    cancelRecording,
    stopToPreview,
    togglePauseResume,
    discardPreview,
    sendPreview,
  };
}
