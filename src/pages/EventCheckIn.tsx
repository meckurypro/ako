// src/pages/EventCheckIn.tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import jsQR from "jsqr";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, CheckCircle2, XCircle, Camera, Keyboard, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProjects";
import {
  useTicketByCode,
  useCheckInTicket,
  useEventTicketHolders,
} from "../hooks/useEventTickets";

// Host-only door scanner. Camera scanning (via jsqr, pure client-side
// — draws video frames to a hidden canvas and decodes them) is the
// primary path; manual code entry is the fallback for when a camera
// isn't available or a code won't scan, per standard check-in
// practice. Marking a ticket checked-in is a plain Supabase update —
// no edge function needed, since check-in isn't payment-critical and
// is gated by the owner-only RLS policy from
// ako_projects_v6_event_extras.sql.
export function EventCheckIn() {
  const { projectId } = useParams<{ projectId: string }>();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const isOwner = !!user && project?.owner_id === user.id;

  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const ticketQuery = useTicketByCode(projectId, scannedCode);
  const checkIn = useCheckInTicket(projectId ?? "");
  const holdersQuery = useEventTicketHolders(projectId);
  const checkedInCount = (holdersQuery.data ?? []).filter((t) => t.checked_in_at).length;
  const totalCount = holdersQuery.data?.length ?? 0;

  // Camera scan loop — only runs in camera mode, with no code already
  // pending review (pause scanning while showing a result, so the
  // same code doesn't get re-decoded on every frame).
  useEffect(() => {
    if (mode !== "camera" || scannedCode || !isOwner) return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }

        const tick = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const result = jsQR(imageData.data, imageData.width, imageData.height);
              if (result?.data) {
                setScannedCode(result.data);
                return; // stop the loop — effect cleanup handles the rest
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setCameraError("Couldn't access the camera — check permissions, or use manual entry."));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode, scannedCode, isOwner]);

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setScannedCode(manualCode.trim().toUpperCase());
  }

  function reset() {
    setScannedCode(null);
    setManualCode("");
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4 text-center">
        <p className="text-ink-muted">Only the event host can scan tickets here.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-1">Scan tickets</h2>
        <p className="text-sm text-ink-muted mb-1">{project.title}</p>
        <div className="flex items-center gap-1.5 text-sm text-ink-muted mb-4">
          <Users size={14} />
          {checkedInCount}/{totalCount} checked in
        </div>

        {!scannedCode && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode("camera")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border ${
                mode === "camera" ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
              }`}
            >
              <Camera size={14} /> Camera
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border ${
                mode === "manual" ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
              }`}
            >
              <Keyboard size={14} /> Enter code
            </button>
          </div>
        )}

        {!scannedCode && mode === "camera" && (
          <div className="rounded-xl overflow-hidden bg-canvas border border-border aspect-square">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
        {cameraError && <p className="text-sm text-danger mt-2">{cameraError}</p>}

        {!scannedCode && mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ticket code"
              autoCapitalize="characters"
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-surface text-sm text-ink font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
            >
              Look up
            </button>
          </form>
        )}

        {scannedCode && (
          <div className="rounded-xl border border-border bg-surface p-4">
            {ticketQuery.isLoading ? (
              <p className="text-sm text-ink-muted">Looking up…</p>
            ) : ticketQuery.data ? (
              <>
                <p className="font-mono text-sm text-ink mb-1">{ticketQuery.data.ticket_code}</p>
                <p className="text-sm text-ink-muted mb-3">{ticketQuery.data.recipient_email}</p>
                {ticketQuery.data.checked_in_at ? (
                  <div className="flex items-center gap-1.5 text-sm text-danger font-medium mb-3">
                    <XCircle size={16} />
                    Already checked in {new Date(ticketQuery.data.checked_in_at).toLocaleTimeString()}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-accent font-medium mb-3">
                    <CheckCircle2 size={16} />
                    Valid — not yet checked in
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {!ticketQuery.data.checked_in_at && (
                    <button
                      onClick={() => checkIn.mutate(ticketQuery.data!.id)}
                      disabled={checkIn.isPending}
                      className="px-4 py-2 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
                    >
                      {checkIn.isPending ? "Checking in…" : "Check in"}
                    </button>
                  )}
                  <button onClick={reset} className="text-sm text-ink-muted font-medium">
                    Scan next
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-sm text-danger font-medium mb-3">
                  <XCircle size={16} />
                  No ticket found for this code
                </div>
                <button onClick={reset} className="text-sm text-accent font-medium">
                  Try again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
