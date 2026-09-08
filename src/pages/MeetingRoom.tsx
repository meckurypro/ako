// src/pages/MeetingRoom.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  ArrowLeft,
  Lock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Circle,
  Square,
  Send,
  Paperclip,
  Download,
  Link as LinkIcon,
  MessageCircle,
} from "lucide-react";
import { useProject, useHasPurchased, isProjectFree } from "../hooks/useProjects";
import { useMeetingDetails } from "../hooks/useProjectTypeDetails";
import { useAuth } from "../hooks/useAuth";
import { useStartConversation } from "../hooks/useMessaging";
import { useIsProjectMember } from "../hooks/useProjectMembers";
import { PrivateProjectNotice } from "../components/PrivateProjectNotice";
import { useLiveKitRoom, type CallParticipantView } from "../hooks/useLiveKitRoom";
import {
  useMeetingSharedItems,
  usePostMeetingMessage,
  useShareMeetingFile,
} from "../hooks/useMeetingSharedItems";
import {
  useMeetingRecordings,
  useGetRecordingUrl,
  useStartMeetingRecording,
  useStopMeetingRecording,
} from "../hooks/useMeetingRecordings";

function useCountdown(target: string | null | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setRemainingMs(new Date(target).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remainingMs;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// ---------------------------------------------------------------
// Lobby device preview — a plain getUserMedia call, entirely separate
// from the LiveKit room (which doesn't exist yet at this point). Same
// pattern as Zoom/Meet: check your camera/mic and decide whether
// they're on *before* actually joining, rather than joining hot.
// ---------------------------------------------------------------

function useDevicePreview() {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoElRef.current) videoElRef.current.srcObject = stream;
      })
      .catch(() => setDeviceError("Couldn't access your camera/mic — check your browser permissions."));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
  }, [cameraOn]);

  return { videoElRef, micOn, setMicOn, cameraOn, setCameraOn, deviceError };
}

// ---------------------------------------------------------------
// One tile in the call grid — attaches a LiveKit Track to a real
// <video>/<audio> element via the SDK's own attach()/detach(), using
// React 19's ref-callback cleanup so it detaches cleanly when the
// track changes or the tile unmounts.
// ---------------------------------------------------------------

function ParticipantTile({ participant, isScreenShare }: { participant: CallParticipantView; isScreenShare?: boolean }) {
  const track = isScreenShare ? participant.screenShareTrack : participant.cameraTrack;
  const videoRef = useMemo(
    () => (el: HTMLVideoElement | null) => {
      if (!el || !track) return;
      track.attach(el);
      return () => {
        track.detach(el);
      };
    },
    [track]
  );
  const audioRef = useMemo(
    () => (el: HTMLAudioElement | null) => {
      if (!el || !participant.micTrack || participant.isLocal) return;
      participant.micTrack.attach(el);
      return () => {
        participant.micTrack?.detach(el);
      };
    },
    [participant.micTrack, participant.isLocal]
  );

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-canvas border ${
        participant.isSpeaking ? "border-accent" : "border-border"
      } aspect-video flex items-center justify-center`}
    >
      {track && !participant.cameraMuted ? (
        <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1 text-ink-muted">
          <VideoOff size={20} />
          <span className="text-xs">Camera off</span>
        </div>
      )}
      {!participant.isLocal && <audio ref={audioRef} autoPlay />}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas/80 text-xs text-ink">
        {participant.micMuted ? <MicOff size={11} /> : <Mic size={11} className="text-accent" />}
        {participant.name}
        {participant.isLocal && " (you)"}
        {isScreenShare && " — sharing screen"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// In-call shared items — messages/links/files, real via Supabase +
// Realtime (see useMeetingSharedItems.ts), no video provider needed.
// ---------------------------------------------------------------

function SharedItemsPanel({ projectId }: { projectId: string }) {
  const { data: items } = useMeetingSharedItems(projectId);
  const postMessage = usePostMeetingMessage(projectId);
  const shareFile = useShareMeetingFile(projectId);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await postMessage.mutateAsync(draft.trim());
    setDraft("");
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError(null);
    try {
      await shareFile.mutateAsync(file);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Couldn't share that file.");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-sm font-medium text-ink mb-2">Shared in this meeting</p>
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto mb-2">
        {(items ?? []).length === 0 && <p className="text-xs text-ink-muted">Nothing shared yet.</p>}
        {(items ?? []).map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 text-sm text-ink">
            {item.kind === "link" ? (
              <a href={item.body ?? undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent truncate">
                <LinkIcon size={13} className="flex-shrink-0" />
                <span className="truncate">{item.body}</span>
              </a>
            ) : item.kind === "file" ? (
              <span className="flex items-center gap-1 truncate">
                <Paperclip size={13} className="flex-shrink-0 text-ink-muted" />
                <span className="truncate">{item.body}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 truncate">
                <MessageCircle size={13} className="flex-shrink-0 text-ink-muted" />
                <span className="truncate">{item.body}</span>
              </span>
            )}
          </div>
        ))}
      </div>
      {fileError && <p className="text-xs text-danger mb-1.5">{fileError}</p>}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={shareFile.isPending}
          className="p-2 rounded-full bg-canvas text-ink-muted flex-shrink-0 disabled:opacity-50"
          aria-label="Share a file"
        >
          <Paperclip size={15} />
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message or link…"
          className="flex-1 px-3 py-2 rounded-full border border-border bg-canvas text-sm text-ink min-w-0"
        />
        <button
          type="submit"
          disabled={postMessage.isPending || !draft.trim()}
          className="p-2 rounded-full bg-accent text-canvas flex-shrink-0 disabled:opacity-50"
          aria-label="Send"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------
// The finished recording(s) — real once meeting_recordings has rows,
// written by the livekit-webhook edge function in MEETING_INFRA.md.
// ---------------------------------------------------------------

function RecordingsSection({ projectId }: { projectId: string }) {
  const { data: recordings } = useMeetingRecordings(projectId);
  const getUrl = useGetRecordingUrl();
  const [openUrls, setOpenUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleOpen(recordingId: string) {
    setError(null);
    try {
      const url = await getUrl.mutateAsync(recordingId);
      setOpenUrls((prev) => ({ ...prev, [recordingId]: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the recording.");
    }
  }

  if (!recordings || recordings.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 mt-3">
      <p className="text-sm font-medium text-ink mb-2">Recording{recordings.length > 1 ? "s" : ""}</p>
      {error && <p className="text-xs text-danger mb-1.5">{error}</p>}
      <div className="flex flex-col gap-2">
        {recordings.map((r) => (
          <div key={r.id}>
            {openUrls[r.id] ? (
              <video controls src={openUrls[r.id]} className="w-full rounded-lg max-h-72 bg-canvas" />
            ) : (
              <button
                onClick={() => handleOpen(r.id)}
                disabled={getUrl.isPending}
                className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
              >
                <Download size={14} />
                {getUrl.isPending ? "Loading…" : `Recording — ${new Date(r.created_at).toLocaleDateString()}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Main page
// ---------------------------------------------------------------

export function MeetingRoom() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: details } = useMeetingDetails(projectId);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const isOwner = !!user && project?.owner_id === user.id;
  const isFree = !!project && isProjectFree(project);

  // Same privacy gate as ProjectCard/PrivateProjectNotice — a private
  // meeting's direct URL shouldn't be a side door around it.
  const isMemberQuery = useIsProjectMember(project?.id ?? "", !!project?.is_private);
  const isMember = isMemberQuery.data === true;
  const privacyBlocked = !!project?.is_private && !isOwner && !isMember;
  const hasAccess = !privacyBlocked && (isOwner || isFree || !!hasPurchasedQuery.data);
  const startConversation = useStartConversation();

  const remainingMs = useCountdown(details?.scheduled_at);
  const isLive = remainingMs !== null && remainingMs <= 0;
  const isEnded = details?.status === "ended";
  const isCancelled = details?.status === "cancelled";

  const [joined, setJoined] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(true);
  const devicePreview = useDevicePreview();
  const call = useLiveKitRoom(projectId);
  const startRecording = useStartMeetingRecording(projectId ?? "");
  const stopRecording = useStopMeetingRecording(projectId ?? "");
  const [recording, setRecording] = useState(false);

  async function handleRequestAccess() {
    if (!user || !project) {
      navigate(`/login?redirect=${encodeURIComponent(`/meetings/${projectId}`)}`);
      return;
    }
    const conversationId = await startConversation.mutateAsync(project.owner_id);
    navigate(`/messages/${conversationId}`, {
      state: { draftMessage: `Hi! I'd like access to "${project.title}".` },
    });
  }

  async function handleJoin() {
    setJoined(true);
    await call.join({ mic: devicePreview.micOn, camera: devicePreview.cameraOn });
  }

  async function handleLeave() {
    await call.leave();
    setJoined(false);
  }

  async function handleToggleRecording() {
    if (recording) {
      await stopRecording.mutateAsync();
      setRecording(false);
    } else {
      await startRecording.mutateAsync();
      setRecording(true);
    }
  }

  const screenSharer = call.participants.find((p) => p.screenShareTrack);

  if (!project || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className={`mx-auto ${joined ? "max-w-2xl" : "max-w-md"}`}>
        <button
          onClick={() => {
            if (joined) void handleLeave();
            smartBack();
          }}
          className="text-ink-muted mb-3"
        >
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-1">{project.title}</h2>
        <p className="text-sm text-ink-muted mb-6">{new Date(details.scheduled_at).toLocaleString()}</p>

        {privacyBlocked ? (
          <PrivateProjectNotice onMessage={() => void handleRequestAccess()} messagePending={startConversation.isPending} />
        ) : !hasAccess ? (
          <div className="flex flex-col items-center text-center gap-2 mt-10">
            <Lock size={24} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">Buy access to this meeting to join.</p>
            <button onClick={() => navigate(`/projects/${projectId}`)} className="text-accent text-sm font-medium">
              Go to project page
            </button>
          </div>
        ) : isCancelled ? (
          <p className="text-sm text-ink-muted text-center mt-10">This meeting was cancelled.</p>
        ) : isEnded ? (
          <>
            <p className="text-sm text-ink-muted text-center mb-3">This meeting has ended.</p>
            <RecordingsSection projectId={project.id} />
            <div className="mt-3">
              <SharedItemsPanel projectId={project.id} />
            </div>
          </>
        ) : !isLive ? (
          <div className="flex flex-col items-center text-center gap-2 mt-10">
            <p className="text-xs text-ink-muted uppercase tracking-wide">Starts in</p>
            <p className="font-display text-4xl text-ink">{remainingMs !== null ? formatCountdown(remainingMs) : "…"}</p>
          </div>
        ) : !joined ? (
          // ---- Lobby: device preview + recording consent ----
          <div className="flex flex-col gap-3">
            <div className="relative rounded-xl overflow-hidden bg-canvas border border-border aspect-video flex items-center justify-center">
              {devicePreview.cameraOn ? (
                <video ref={devicePreview.videoElRef} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />
              ) : (
                <VideoOff size={24} className="text-ink-muted" />
              )}
            </div>
            {devicePreview.deviceError && <p className="text-xs text-danger">{devicePreview.deviceError}</p>}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => devicePreview.setMicOn((v) => !v)}
                className={`p-3 rounded-full ${devicePreview.micOn ? "bg-surface text-ink" : "bg-danger text-canvas"}`}
                aria-label="Toggle microphone"
              >
                {devicePreview.micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={() => devicePreview.setCameraOn((v) => !v)}
                className={`p-3 rounded-full ${devicePreview.cameraOn ? "bg-surface text-ink" : "bg-danger text-canvas"}`}
                aria-label="Toggle camera"
              >
                {devicePreview.cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </div>

            {details.recording_enabled && showRecordingConsent && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
                <Circle size={14} className="shrink-0 mt-0.5 text-danger" fill="currentColor" />
                <div className="flex-1">
                  <p>This meeting may be recorded (audio, video, and screen share) by the host.</p>
                  <button onClick={() => setShowRecordingConsent(false)} className="text-accent font-medium mt-1">
                    Got it
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => void handleJoin()} className="w-full py-3 rounded-full bg-accent text-canvas font-medium">
              Join meeting
            </button>
          </div>
        ) : (
          // ---- Live call ----
          <div className="flex flex-col gap-3">
            {call.connectionState === "not_configured" && (
              <div className="p-3 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
                <p className="font-medium text-ink mb-0.5">Video calling isn't connected yet</p>
                <p>{call.errorMessage}</p>
              </div>
            )}
            {call.connectionState === "error" && (
              <p className="text-sm text-danger">{call.errorMessage}</p>
            )}
            {call.connectionState === "connecting" && <p className="text-sm text-ink-muted text-center">Connecting…</p>}

            {recording && (
              <div className="flex items-center gap-1.5 text-xs text-danger font-medium">
                <Circle size={10} fill="currentColor" />
                Recording
              </div>
            )}

            {screenSharer && (
              <div className="mb-1">
                <ParticipantTile participant={screenSharer} isScreenShare />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {call.participants.map((p) => (
                <ParticipantTile key={p.identity} participant={p} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 py-2">
              <button
                onClick={() => void call.toggleMic()}
                className={`p-3 rounded-full ${call.micEnabled ? "bg-surface text-ink" : "bg-danger text-canvas"}`}
                aria-label="Toggle microphone"
              >
                {call.micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={() => void call.toggleCamera()}
                className={`p-3 rounded-full ${call.cameraEnabled ? "bg-surface text-ink" : "bg-danger text-canvas"}`}
                aria-label="Toggle camera"
              >
                {call.cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button
                onClick={() => void call.toggleScreenShare()}
                className={`p-3 rounded-full ${call.screenShareEnabled ? "bg-accent text-canvas" : "bg-surface text-ink"}`}
                aria-label="Toggle screen share"
              >
                {call.screenShareEnabled ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
              </button>
              {isOwner && details.recording_enabled && (
                <button
                  onClick={() => void handleToggleRecording()}
                  disabled={startRecording.isPending || stopRecording.isPending}
                  className={`p-3 rounded-full ${recording ? "bg-danger text-canvas" : "bg-surface text-ink"} disabled:opacity-50`}
                  aria-label="Toggle recording"
                >
                  {recording ? <Square size={18} /> : <Circle size={18} />}
                </button>
              )}
              <button onClick={() => void handleLeave()} className="p-3 rounded-full bg-danger text-canvas" aria-label="Leave meeting">
                <PhoneOff size={18} />
              </button>
            </div>

            <SharedItemsPanel projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  );
}
