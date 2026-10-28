// src/pages/Room.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  ArrowLeft,
  Send,
  Calendar,
  ClipboardList,
  Users,
  Lock,
  MessageCircle,
  BookOpen,
  BarChart3,
  X,
  Mic,
  Video,
  VideoOff,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Settings,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Circle,
  Square,
  UserPlus,
  LogOut,
  Ban,
} from "lucide-react";
import { useProjectOwnership } from "../hooks/useProjectOwnership";
import { useProject } from "../hooks/useProjects";
import { useCountdown, formatCountdown } from "../hooks/useCountdown";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useVoiceNotesEnabled } from "../hooks/useFeatureFlags";
import { VoiceRecordingBar } from "../components/VoiceRecordingBar";
import { VoicePreviewBar } from "../components/VoicePreviewBar";
import { VoiceMessageBubble } from "../components/VoiceMessageBubble";
import { Avatar } from "../components/Avatar";
import { useToast } from "../components/Toast";
import { decodeVoiceNote } from "../lib/voiceNotes";
import { RoomChat } from "../components/RoomChat";
import { useLiveKitRoom, type CallParticipantView } from "../hooks/useLiveKitRoom";
import { useStartMeetingRecording, useStopMeetingRecording } from "../hooks/useMeetingRecordings";
import {
  useIsRoomMember,
  useIsRoomHost,
  useRoomMemberCount,
  useRoomMembersList,
  useRoomDetails,
  useRoomIsClosed,
  useUpdateRoomDetails,
  useRoomConversationId,
  useRoomModerators,
  useAddRoomModerator,
  useRemoveRoomModerator,
  useRoomPosts,
  usePostToRoom,
  usePostVoiceNoteToRoom,
  useRoomMeetings,
  useScheduleRoomMeeting,
  useRoomPolls,
  useCreateRoomPoll,
  useVoteOnPoll,
  useAssignments,
  useCreateAssignment,
  useMySubmission,
  useSubmitAssignment,
  useAssignmentSubmissions,
  useReviewSubmission,
  useMyRoomJoinRequest,
  useRoomJoinRequests,
  useRequestRoomJoin,
  useCancelRoomJoinRequest,
  useReviewRoomJoinRequest,
  useAddRoomMember,
  useLeaveRoom,
  useRemoveRoomMember,
  useRoomBlocklist,
  useUnblacklistRoomUser,
  findProfileByUsername,
  type RoomHistoryMode,
  type RoomMeeting,
} from "../hooks/useRoom";
import { SafeAudio } from "../components/MediaPlaceholder";

type Tab = "classroom" | "chat" | "meetings" | "assignments";

// ---------------------------------------------------------------
// Compact live-call view for a room meeting — same real
// useLiveKitRoom integration as the standalone Meeting type, just a
// smaller grid without the full device-preview lobby (a room meeting
// joins straight in with mic/camera on, same as most cohort calls).
// ---------------------------------------------------------------

function RoomCallTile({ participant }: { participant: CallParticipantView }) {
  const videoRef = useMemo(
    () => (el: HTMLVideoElement | null) => {
      if (!el || !participant.cameraTrack) return;
      participant.cameraTrack.attach(el);
      return () => {
        participant.cameraTrack?.detach(el);
      };
    },
    [participant.cameraTrack]
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
      {participant.cameraTrack && !participant.cameraMuted ? (
        <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className="w-full h-full object-cover" />
      ) : (
        <VideoOff size={18} className="text-ink-muted" />
      )}
      {!participant.isLocal && <audio ref={audioRef} autoPlay />}
      <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-canvas/80 text-[11px] text-ink">
        {participant.micMuted ? <MicOff size={10} /> : <Mic size={10} className="text-accent" />}
        {participant.name}
        {participant.isLocal && " (you)"}
      </div>
    </div>
  );
}

function RoomCallView({ roomMeeting, isHost, onLeave }: { roomMeeting: RoomMeeting; isHost: boolean; onLeave: () => void }) {
  const call = useLiveKitRoom(roomMeeting.id);
  const joined = useRef(false);
  const startRecording = useStartMeetingRecording(roomMeeting.id);
  const stopRecording = useStopMeetingRecording(roomMeeting.id);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (joined.current) return;
    joined.current = true;
    void call.join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleRecording() {
    if (recording) {
      await stopRecording.mutateAsync();
      setRecording(false);
    } else {
      await startRecording.mutateAsync();
      setRecording(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {call.connectionState === "not_configured" && (
        <div className="p-3 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
          <p className="font-medium text-ink mb-0.5">Video calling isn't connected yet</p>
          <p>{call.errorMessage}</p>
        </div>
      )}
      {call.connectionState === "connecting" && <p className="text-sm text-ink-muted text-center">Connecting…</p>}
      {call.connectionState === "error" && <p className="text-sm text-danger">{call.errorMessage}</p>}

      {recording && (
        <div className="flex items-center gap-1.5 text-xs text-danger font-medium">
          <Circle size={10} fill="currentColor" />
          Recording
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {call.participants.map((p) => (
          <RoomCallTile key={p.identity} participant={p} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 py-1">
        <button
          onClick={() => void call.toggleMic()}
          className={`p-3 rounded-full ${call.micEnabled ? "bg-surface text-ink" : "bg-danger text-canvas"}`}
          aria-label="Toggle microphone"
        >
          {call.micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          onClick={() => void call.toggleCamera()}
          className={`p-3 rounded-full ${call.cameraEnabled ? "bg-surface text-ink" : "bg-danger text-canvas"}`}
          aria-label="Toggle camera"
        >
          {call.cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
        <button
          onClick={() => void call.toggleScreenShare()}
          className={`p-3 rounded-full ${call.screenShareEnabled ? "bg-cta text-white" : "bg-surface text-ink"}`}
          aria-label="Toggle screen share"
        >
          {call.screenShareEnabled ? <ScreenShareOff size={16} /> : <ScreenShare size={16} />}
        </button>
        {isHost && roomMeeting.recording_enabled && (
          <button
            onClick={() => void handleToggleRecording()}
            disabled={startRecording.isPending || stopRecording.isPending}
            className={`p-3 rounded-full ${recording ? "bg-danger text-canvas" : "bg-surface text-ink"} disabled:opacity-50`}
            aria-label="Toggle recording"
          >
            {recording ? <Square size={16} /> : <Circle size={16} />}
          </button>
        )}
        <button
          onClick={() => {
            void call.leave();
            onLeave();
          }}
          className="p-3 rounded-full bg-danger text-canvas"
          aria-label="Leave"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Classroom feed — lectures (text or voice note), and polls. A
// lecture's voice note reuses the exact same recorder/bubble pipeline
// as group chat (see the RoomChat comment) — the shared piece here is
// the hooks and components, not the surrounding page.
// ---------------------------------------------------------------

function PollComposer({ onCreate, onCancel, pending }: { onCreate: (q: string, opts: string[], multi: boolean) => void; onCancel: () => void; pending: boolean }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  return (
    <div className="p-3 rounded-xl border border-border bg-surface mb-3">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question…"
        className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
      />
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5 mb-1.5">
          <input
            value={opt}
            onChange={(e) => setOptions((prev) => prev.map((o, oi) => (oi === i ? e.target.value : o)))}
            placeholder={`Option ${i + 1}`}
            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-canvas text-sm text-ink"
          />
          {options.length > 2 && (
            <button onClick={() => setOptions((prev) => prev.filter((_, oi) => oi !== i))} className="text-ink-muted">
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <button onClick={() => setOptions((prev) => [...prev, ""])} className="text-xs text-accent font-medium mb-2">
        + Add option
      </button>
      <button
        type="button"
        onClick={() => setAllowMultiple((v) => !v)}
        className={`block text-xs mb-2 font-medium ${allowMultiple ? "text-accent" : "text-ink-muted"}`}
      >
        {allowMultiple ? "☑" : "☐"} Allow multiple choices
      </button>
      <div className="flex items-center gap-3">
        <button
          disabled={pending || !question.trim() || options.filter((o) => o.trim()).length < 2}
          onClick={() => onCreate(question.trim(), options.map((o) => o.trim()).filter(Boolean), allowMultiple)}
          className="px-4 py-2 rounded-full bg-cta text-white text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post poll"}
        </button>
        <button onClick={onCancel} className="text-sm text-ink-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

function PollCard({ projectId, poll }: { projectId: string; poll: ReturnType<typeof useRoomPolls>["data"] extends (infer T)[] | undefined ? T : never }) {
  const vote = useVoteOnPoll(projectId);
  const totalVotes = Object.values(poll.voteCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-3 rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart3 size={13} className="text-ink-muted" />
        <p className="text-sm font-medium text-ink">{poll.question}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {poll.options.map((opt) => {
          const count = poll.voteCounts[opt.id] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const mine = poll.myOptionIds.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() =>
                vote.mutate({ pollId: poll.id, optionId: opt.id, allowMultiple: poll.allow_multiple, currentVoteIds: poll.myOptionIds })
              }
              className={`relative overflow-hidden text-left px-3 py-2 rounded-lg border text-sm ${
                mine ? "border-accent" : "border-border"
              }`}
            >
              <div className="absolute inset-0 bg-accent-soft/50" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between">
                <span className="text-ink">{opt.label}</span>
                <span className="text-xs text-ink-muted">
                  {count} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClassroomTab({ projectId, isHost }: { projectId: string; isHost: boolean }) {
  const { data: posts } = useRoomPosts(projectId);
  const { data: members } = useRoomMembersList(projectId);
  const { data: polls } = useRoomPolls(projectId);
  const postToRoom = usePostToRoom(projectId);
  const postVoiceNote = usePostVoiceNoteToRoom(projectId);
  const createPoll = useCreateRoomPoll(projectId);
  const [draft, setDraft] = useState("");
  const [showPollComposer, setShowPollComposer] = useState(false);
  const memberByUserId = useMemo(() => new Map((members ?? []).map((m) => [m.user_id, m.profile])), [members]);

  const voiceNotesEnabled = useVoiceNotesEnabled();
  const voiceRecorder = useVoiceRecorder(async (blob, durationSec, peaks) => {
    await postVoiceNote.mutateAsync({ blob, durationSec, peaks });
  });

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await postToRoom.mutateAsync({ type: "text", content: draft.trim() });
    setDraft("");
  }

  return (
    <div>
      {isHost && (
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setShowPollComposer((s) => !s)} className="flex items-center gap-1 text-xs text-accent font-medium">
            <BarChart3 size={13} /> New poll
          </button>
        </div>
      )}
      {showPollComposer && (
        <PollComposer
          pending={createPoll.isPending}
          onCancel={() => setShowPollComposer(false)}
          onCreate={(q, opts, multi) => {
            createPoll.mutate(
              { question: q, options: opts, allowMultiple: multi },
              { onSuccess: () => setShowPollComposer(false) }
            );
          }}
        />
      )}

      <div className="flex flex-col gap-2 mb-3">
        {(polls ?? []).map((poll) => (
          <PollCard key={poll.id} projectId={projectId} poll={poll} />
        ))}

        {(posts ?? []).length === 0 && (polls ?? []).length === 0 && (
          <p className="text-xs text-ink-muted">Nothing posted yet.</p>
        )}
        {posts?.map((p) => {
          const sender = memberByUserId.get(p.sender_id);
          const voiceNote = p.type === "voice_note" && p.content ? decodeVoiceNote(p.content) : null;
          if ((voiceNote || p.type === "voice_note") && !voiceNotesEnabled) return null;
          return (
            <div key={p.id} className="p-3 rounded-xl border border-border bg-surface text-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Avatar src={sender?.avatar_url} name={sender?.display_name ?? "Host"} size="sm" />
                <span className="text-xs font-medium text-ink">{sender?.display_name ?? "Host"}</span>
              </div>
              {p.type === "text" && <p className="text-ink whitespace-pre-wrap">{p.content}</p>}
              {voiceNote && (
                <VoiceMessageBubble url={voiceNote.url} path={voiceNote.path} durationSec={voiceNote.durationSec} peaks={voiceNote.peaks} isMine={false} />
              )}
              {p.type === "video" && p.media_url && <video src={p.media_url} controls className="w-full rounded-lg max-h-72 mt-1" />}
              {p.type === "image" && p.media_url && <img src={p.media_url} alt="" className="w-full rounded-lg mt-1" />}
              {p.type === "audio" && p.media_url && !voiceNote && <SafeAudio src={p.media_url} className="w-full h-9 mt-1" />}
              <p className="text-xs text-ink-muted mt-1.5">{new Date(p.created_at).toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {isHost &&
        (voiceRecorder.phase === "recording" ? (
          <VoiceRecordingBar
            locked={voiceRecorder.locked}
            paused={voiceRecorder.paused}
            live={voiceRecorder.live}
            cancelThresholdPx={voiceRecorder.cancelThresholdPx}
            lockThresholdPx={voiceRecorder.lockThresholdPx}
            onCancel={voiceRecorder.cancelRecording}
            onTogglePause={voiceRecorder.togglePauseResume}
            onStop={voiceRecorder.stopToPreview}
          />
        ) : voiceRecorder.phase === "preview" && voiceRecorder.preview ? (
          <VoicePreviewBar
            url={voiceRecorder.preview.url}
            durationSec={voiceRecorder.preview.durationSec}
            peaks={voiceRecorder.preview.peaks}
            sending={voiceRecorder.sending}
            onDiscard={voiceRecorder.discardPreview}
            onSend={voiceRecorder.sendPreview}
          />
        ) : (
          <form onSubmit={handlePost} className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Post a lecture…"
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-canvas text-sm text-ink"
            />
            {draft.trim() || !voiceNotesEnabled ? (
              <button
                type="submit"
                disabled={postToRoom.isPending || !draft.trim()}
                className="p-2.5 rounded-full bg-cta text-white disabled:opacity-50"
                aria-label="Post"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={voiceRecorder.micHandlers.onPointerDown}
                className="p-2.5 rounded-full bg-cta text-white"
                aria-label="Hold to record a voice lecture"
              >
                <Mic size={16} />
              </button>
            )}
          </form>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------
// Meetings tab
// ---------------------------------------------------------------

function MeetingsTab({ projectId, isHost }: { projectId: string; isHost: boolean }) {
  const { data: meetings } = useRoomMeetings(projectId);
  const scheduleMeeting = useScheduleRoomMeeting(projectId);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeCallMeetingId, setActiveCallMeetingId] = useState<string | null>(null);

  async function handleSchedule(e: FormEvent) {
    e.preventDefault();
    if (!when) return;
    await scheduleMeeting.mutateAsync({ title: title.trim() || undefined, scheduled_at: when, recording_enabled: recordingEnabled });
    setTitle("");
    setWhen("");
    setRecordingEnabled(false);
    setShowScheduler(false);
  }

  const activeCall = (meetings ?? []).find((m) => m.id === activeCallMeetingId);
  if (activeCall) {
    return <RoomCallView roomMeeting={activeCall} isHost={isHost} onLeave={() => setActiveCallMeetingId(null)} />;
  }

  return (
    <div>
      {isHost && (
        <div className="flex justify-end mb-2">
          <button onClick={() => setShowScheduler((s) => !s)} className="text-xs text-accent font-medium">
            Schedule
          </button>
        </div>
      )}

      {showScheduler && (
        <form onSubmit={handleSchedule} className="mb-3 p-3 rounded-xl border border-border bg-surface">
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
          />
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            required
            className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
          />
          <button
            type="button"
            onClick={() => setRecordingEnabled((v) => !v)}
            className={`block text-xs mb-2 font-medium ${recordingEnabled ? "text-accent" : "text-ink-muted"}`}
          >
            {recordingEnabled ? "☑" : "☐"} Record this meeting
          </button>
          <button
            type="submit"
            disabled={scheduleMeeting.isPending}
            className="w-full py-2 rounded-lg bg-cta text-white text-sm font-medium disabled:opacity-50"
          >
            {scheduleMeeting.isPending ? "Scheduling…" : "Schedule meeting"}
          </button>
        </form>
      )}

      {(meetings ?? []).length === 0 ? (
        <p className="text-xs text-ink-muted">No meetings scheduled yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {meetings!.map((m) => {
            const remainingMs = new Date(m.scheduled_at).getTime() - Date.now();
            const isLive = remainingMs <= 0 && m.status !== "ended" && m.status !== "cancelled";
            return (
              <div key={m.id} className="p-3 rounded-xl border border-border bg-surface text-sm">
                <p className="text-ink font-medium">{m.title || "Cohort meeting"}</p>
                <p className="text-xs text-ink-muted">{new Date(m.scheduled_at).toLocaleString()}</p>
                {m.status === "ended" ? (
                  <p className="text-xs text-ink-muted mt-1">Ended{m.recording_url ? " — recording posted to Classroom" : ""}</p>
                ) : m.status === "cancelled" ? (
                  <p className="text-xs text-danger mt-1">Cancelled</p>
                ) : isLive ? (
                  <button
                    onClick={() => setActiveCallMeetingId(m.id)}
                    className="mt-1.5 px-3 py-1.5 rounded-full bg-cta text-white text-xs font-medium"
                  >
                    Join now
                  </button>
                ) : (
                  <p className="text-xs text-accent font-medium mt-1">Starts in {formatCountdown(remainingMs)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Assignments tab
// ---------------------------------------------------------------

function SubmissionReview({ assignmentId }: { assignmentId: string }) {
  const { data: submissions } = useAssignmentSubmissions(assignmentId);
  const review = useReviewSubmission(assignmentId);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});

  if (!submissions || submissions.length === 0) {
    return <p className="text-xs text-ink-muted mt-1">No submissions yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {submissions.map((s) => (
        <div key={s.id} className="p-2.5 rounded-lg bg-canvas border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Avatar src={s.profile.avatar_url} name={s.profile.display_name} size="sm" />
            <span className="text-xs font-medium text-ink">{s.profile.display_name}</span>
            {s.status === "approved" && <CheckCircle2 size={13} className="text-accent" />}
            {s.status === "needs_revision" && <XCircle size={13} className="text-danger" />}
          </div>
          {s.content && <p className="text-sm text-ink mb-1">{s.content}</p>}
          {s.media_url && s.format === "video" && <video src={s.media_url} controls className="w-full rounded-lg max-h-56 mb-1" />}
          {s.media_url && s.format === "image" && <img src={s.media_url} alt="" className="w-full rounded-lg mb-1" />}
          {s.media_url && s.format === "audio" && <SafeAudio src={s.media_url} className="w-full h-9 mb-1" />}
          {s.feedback && <p className="text-xs text-ink-muted italic mb-1">Feedback: {s.feedback}</p>}
          {s.status === "pending" && (
            <div className="flex flex-col gap-1.5 mt-1">
              <textarea
                value={feedbackDraft[s.id] ?? ""}
                onChange={(e) => setFeedbackDraft((prev) => ({ ...prev, [s.id]: e.target.value }))}
                placeholder="Feedback (optional)"
                rows={2}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-sm text-ink resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => review.mutate({ submissionId: s.id, status: "approved", feedback: feedbackDraft[s.id] })}
                  disabled={review.isPending}
                  className="px-3 py-1.5 rounded-full bg-cta text-white text-xs font-medium disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => review.mutate({ submissionId: s.id, status: "needs_revision", feedback: feedbackDraft[s.id] })}
                  disabled={review.isPending}
                  className="px-3 py-1.5 rounded-full bg-surface border border-border text-ink text-xs font-medium disabled:opacity-50"
                >
                  Needs revision
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AssignmentCard({ assignment, isHost }: { assignment: { id: string; title: string; required_format: "text" | "audio" | "video" | "image" }; isHost: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { data: mySubmission } = useMySubmission(assignment.id);
  const submitAssignment = useSubmitAssignment(assignment.id);
  const [content, setContent] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await submitAssignment.mutateAsync({ format: "text", content: content.trim() });
    setContent("");
  }

  return (
    <div className="p-3 rounded-xl border border-border bg-surface text-sm">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <p className="text-ink font-medium">{assignment.title}</p>
        <p className="text-xs text-ink-muted capitalize">{assignment.required_format} submission</p>
      </button>

      {expanded && isHost && <SubmissionReview assignmentId={assignment.id} />}

      {expanded && !isHost && (
        <div className="mt-2">
          {mySubmission ? (
            <div className="p-2.5 rounded-lg bg-canvas border border-border">
              <p className="text-xs text-ink-muted mb-1">
                Submitted {new Date(mySubmission.submitted_at).toLocaleDateString()}
                {mySubmission.status === "approved" && " · Approved"}
                {mySubmission.status === "needs_revision" && " · Needs revision"}
              </p>
              {mySubmission.content && <p className="text-sm text-ink">{mySubmission.content}</p>}
              {mySubmission.feedback && <p className="text-xs text-ink-muted italic mt-1">Feedback: {mySubmission.feedback}</p>}
            </div>
          ) : assignment.required_format === "text" ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="Your submission…"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-canvas text-sm text-ink resize-none"
              />
              <button
                type="submit"
                disabled={submitAssignment.isPending || !content.trim()}
                className="self-start px-3 py-1.5 rounded-full bg-cta text-white text-xs font-medium disabled:opacity-50"
              >
                {submitAssignment.isPending ? "Submitting…" : "Submit"}
              </button>
            </form>
          ) : (
            <p className="text-xs text-ink-muted">
              This assignment needs a {assignment.required_format} submission — uploading that isn't wired up yet, text only for now.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({ projectId, isHost }: { projectId: string; isHost: boolean }) {
  const { data: assignments } = useAssignments(projectId);
  const createAssignment = useCreateAssignment(projectId);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"text" | "audio" | "video" | "image">("text");
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createAssignment.mutateAsync({ title: title.trim(), required_format: format });
    setTitle("");
    setShowForm(false);
  }

  return (
    <div>
      {isHost && (
        <div className="flex justify-end mb-2">
          <button onClick={() => setShowForm((s) => !s)} className="text-xs text-accent font-medium">
            New
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-3 p-3 rounded-xl border border-border bg-surface">
          <input
            type="text"
            placeholder="Assignment title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
          />
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
          >
            <option value="text">Text submission</option>
            <option value="audio">Audio submission</option>
            <option value="video">Video submission</option>
            <option value="image">Image submission</option>
          </select>
          <button
            type="submit"
            disabled={createAssignment.isPending}
            className="w-full py-2 rounded-lg bg-cta text-white text-sm font-medium disabled:opacity-50"
          >
            {createAssignment.isPending ? "Posting…" : "Post assignment"}
          </button>
        </form>
      )}

      {(assignments ?? []).length === 0 ? (
        <p className="text-xs text-ink-muted">No assignments yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments!.map((a) => (
            <AssignmentCard key={a.id} assignment={a} isHost={isHost} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Host-only settings sheet — co-hosts + chat moderation toggles.
// ---------------------------------------------------------------

const HISTORY_OPTIONS: { value: RoomHistoryMode; label: string; hint: string }[] = [
  { value: "anchored", label: "Anchored only", hint: "New members see anchored messages and anything from when they joined." },
  { value: "admins_and_anchored", label: "Hosts + anchored", hint: "New members also see everything the hosts wrote." },
  { value: "all", label: "Everything", hint: "New members can read the whole chat history." },
];

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function PersonLink({ username, name, avatar }: { username: string; name: string; avatar: string | null }) {
  return (
    <Link to={`/profile/${username}`} className="flex items-center gap-1.5 min-w-0">
      <Avatar src={avatar} name={name} size="sm" />
      <span className="min-w-0">
        <span className="block text-sm text-ink truncate">{name}</span>
        <span className="block text-[11px] text-ink-muted truncate">@{username}</span>
      </span>
    </Link>
  );
}

function HostSettingsPanel({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const { data: details } = useRoomDetails(projectId);
  const { data: members } = useRoomMembersList(projectId);
  const { data: moderators } = useRoomModerators(projectId);
  const { data: requests } = useRoomJoinRequests(projectId);
  const { data: blocklist } = useRoomBlocklist(projectId);
  const updateDetails = useUpdateRoomDetails(projectId);
  const addModerator = useAddRoomModerator(projectId);
  const removeModerator = useRemoveRoomModerator(projectId);
  const review = useReviewRoomJoinRequest(projectId);
  const addMember = useAddRoomMember(projectId);
  const removeMember = useRemoveRoomMember(projectId);
  const unblacklist = useUnblacklistRoomUser(projectId);
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);

  const moderatorIds = new Set((moderators ?? []).map((m) => m.user_id));
  const historyMode = details?.history_mode ?? "anchored";

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setAdding(true);
    try {
      const profile = await findProfileByUsername(username);
      if (!profile) {
        toast("No one has that username.", { variant: "error" });
        return;
      }
      await addMember.mutateAsync(profile.id);
      toast(`${profile.display_name} was added.`, { variant: "success" });
      setUsername("");
    } catch (err) {
      toast(errorMessage(err, "Couldn't add them."), { variant: "error" });
    } finally {
      setAdding(false);
    }
  }

  function decide(userId: string, name: string, approve: boolean) {
    review.mutate(
      { userId, approve },
      {
        onSuccess: () => toast(approve ? `${name} joined the room.` : `Declined ${name}.`, { variant: "success" }),
        onError: (err) => toast(errorMessage(err, "Couldn't update that request."), { variant: "error" }),
      }
    );
  }

  function remove(userId: string, name: string, blacklist: boolean) {
    const ok = window.confirm(
      blacklist ? `Remove ${name} and stop them from joining again?` : `Remove ${name} from this room?`
    );
    if (!ok) return;
    removeMember.mutate(
      { userId, blacklist },
      {
        onSuccess: () => toast(blacklist ? `${name} was removed and blacklisted.` : `${name} was removed.`, { variant: "success" }),
        onError: (err) => toast(errorMessage(err, "Couldn't remove them."), { variant: "error" }),
      }
    );
  }

  return (
    <div className="p-3 rounded-xl border border-border bg-surface mb-4 flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <Shield size={14} className="text-ink-muted" />
        <p className="text-sm font-medium text-ink">Room settings</p>
      </div>

      {(requests ?? []).length > 0 && (
        <div>
          <p className="text-xs text-ink-muted mb-1.5">Requests to join ({requests!.length})</p>
          <div className="flex flex-col gap-2">
            {requests!.map((r) => (
              <div key={r.user_id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-canvas">
                <div className="flex items-center justify-between gap-2">
                  <PersonLink username={r.profile.username} name={r.profile.display_name} avatar={r.profile.avatar_url} />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => decide(r.user_id, r.profile.display_name, false)}
                      disabled={review.isPending}
                      className="px-2.5 py-1 rounded-full border border-border text-xs text-ink-muted"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => decide(r.user_id, r.profile.display_name, true)}
                      disabled={review.isPending}
                      className="px-2.5 py-1 rounded-full bg-cta text-white text-xs font-medium"
                    >
                      Accept
                    </button>
                  </div>
                </div>
                {r.message && <p className="text-xs text-ink-muted px-1">“{r.message}”</p>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-muted mt-1">Tap a name or photo to see their profile first.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={() => updateDetails.mutate({ hosts_only_chat: !details?.hosts_only_chat })}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-ink-muted">Only hosts can post in chat</span>
          <span className={details?.hosts_only_chat ? "text-accent font-medium" : "text-ink-muted"}>
            {details?.hosts_only_chat ? "On" : "Off"}
          </span>
        </button>
        <button
          onClick={() => updateDetails.mutate({ chat_muted: !details?.chat_muted })}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-ink-muted">Mute chat for everyone</span>
          <span className={details?.chat_muted ? "text-accent font-medium" : "text-ink-muted"}>
            {details?.chat_muted ? "On" : "Off"}
          </span>
        </button>
      </div>

      <div>
        <p className="text-xs text-ink-muted mb-1.5">What new members see</p>
        <div className="flex flex-col gap-1">
          {HISTORY_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => updateDetails.mutate({ history_mode: o.value })}
              className={`text-left px-2.5 py-1.5 rounded-lg border text-sm ${
                historyMode === o.value ? "border-accent bg-accent-soft/40 text-ink" : "border-border text-ink-muted"
              }`}
            >
              <span className="font-medium">{o.label}</span>
              <span className="block text-[11px] text-ink-muted">{o.hint}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink-muted mt-1">Anchored messages are always visible to new members.</p>
      </div>

      <form onSubmit={handleAdd}>
        <p className="text-xs text-ink-muted mb-1.5">Add someone</p>
        <div className="flex items-center gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
          />
          <button
            type="submit"
            disabled={adding || !username.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cta text-white text-sm font-medium disabled:opacity-50"
          >
            <UserPlus size={14} /> Add
          </button>
        </div>
      </form>

      <div>
        <p className="text-xs text-ink-muted mb-1.5">Members</p>
        <div className="flex flex-col gap-2">
          {(members ?? []).map((m) => {
            const isMod = moderatorIds.has(m.user_id);
            return (
              <div key={m.user_id} className="flex items-center justify-between gap-2">
                <PersonLink username={m.profile.username} name={m.profile.display_name} avatar={m.profile.avatar_url} />
                <div className="flex items-center gap-2 shrink-0 text-xs font-medium">
                  {isMod ? (
                    isOwner && (
                      <button
                        onClick={() =>
                          removeModerator.mutate(m.user_id, {
                            onSuccess: () => toast(`${m.profile.display_name} is no longer a co-host.`, { variant: "success" }),
                          })
                        }
                        className="text-danger"
                      >
                        Remove co-host
                      </button>
                    )
                  ) : (
                    <>
                      {isOwner && (
                        <button
                          onClick={() =>
                            addModerator.mutate(m.user_id, {
                              onSuccess: () => toast(`${m.profile.display_name} is now a co-host.`, { variant: "success" }),
                            })
                          }
                          className="text-accent"
                        >
                          Co-host
                        </button>
                      )}
                      <button onClick={() => remove(m.user_id, m.profile.display_name, false)} className="text-danger">
                        Remove
                      </button>
                      <button
                        onClick={() => remove(m.user_id, m.profile.display_name, true)}
                        className="text-danger"
                        aria-label={`Remove ${m.profile.display_name} and blacklist`}
                      >
                        <Ban size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {(members ?? []).length === 0 && <p className="text-xs text-ink-muted">No members yet.</p>}
        </div>
      </div>

      {(blocklist ?? []).length > 0 && (
        <div>
          <p className="text-xs text-ink-muted mb-1.5">Blacklisted ({blocklist!.length})</p>
          <div className="flex flex-col gap-2">
            {blocklist!.map((b) => (
              <div key={b.user_id} className="flex items-center justify-between gap-2">
                <PersonLink username={b.profile.username} name={b.profile.display_name} avatar={b.profile.avatar_url} />
                <button
                  onClick={() =>
                    unblacklist.mutate(b.user_id, {
                      onSuccess: () => toast(`${b.profile.display_name} can request to join again.`, { variant: "success" }),
                      onError: (err) => toast(errorMessage(err, "Couldn't update the blacklist."), { variant: "error" }),
                    })
                  }
                  className="text-xs text-accent font-medium shrink-0"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Shown to someone who isn't in the room yet. Public free rooms take a request the host reviews; paid
// rooms are bought from the project page; private rooms are invitation-only (the host adds people).
function JoinGate({ projectId, title, isPrivate, isFree }: { projectId: string; title: string; isPrivate: boolean; isFree: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: myRequest } = useMyRoomJoinRequest(projectId);
  const requestJoin = useRequestRoomJoin(projectId);
  const cancelRequest = useCancelRoomJoinRequest(projectId);
  const status = myRequest?.status;

  if (isPrivate) {
    return (
      <>
        <Lock size={28} className="text-ink-muted" />
        <p className="text-ink font-medium">Private room</p>
        <p className="text-sm text-ink-muted">“{title}” is invitation-only. The host adds the people who can join.</p>
      </>
    );
  }

  if (!isFree) {
    return (
      <>
        <Lock size={28} className="text-ink-muted" />
        <p className="text-ink font-medium">Members only</p>
        <p className="text-sm text-ink-muted">Buy access to “{title}” from its project page to join this room.</p>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="mt-2 text-accent text-sm font-medium">
          Go to project page
        </button>
      </>
    );
  }

  return (
    <>
      <Users size={28} className="text-ink-muted" />
      <p className="text-ink font-medium">{title}</p>
      {status === "pending" ? (
        <>
          <p className="text-sm text-ink-muted">Your request is waiting for a host to review it.</p>
          <button
            onClick={() =>
              cancelRequest.mutate(undefined, {
                onSuccess: () => toast("Request cancelled.", { variant: "success" }),
              })
            }
            disabled={cancelRequest.isPending}
            className="mt-2 text-sm text-ink-muted font-medium"
          >
            Cancel request
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {status === "declined"
              ? "Your last request wasn't accepted. You can ask again."
              : "A host reviews every request to join this room."}
          </p>
          <button
            onClick={() =>
              requestJoin.mutate(undefined, {
                onSuccess: () => toast("Request sent.", { variant: "success" }),
                onError: (err) => toast(errorMessage(err, "Couldn't send your request."), { variant: "error" }),
              })
            }
            disabled={requestJoin.isPending}
            className="mt-2 px-5 py-2 rounded-full bg-cta text-white text-sm font-medium disabled:opacity-50"
          >
            {status === "declined" ? "Ask again" : "Request to join"}
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------
// Main page
// ---------------------------------------------------------------

export function Room() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { data: project } = useProject(projectId);
  const ownership = useProjectOwnership();
  const isOwner = ownership.isOwner(project);

  const { data: isMember } = useIsRoomMember(projectId);
  const { data: isHostQuery } = useIsRoomHost(projectId);
  const isHost = isOwner || !!isHostQuery;
  const { data: memberCount } = useRoomMemberCount(projectId);
  const hasAccess = isOwner || !!isMember;

  const { data: details } = useRoomDetails(projectId);
  const isClosed = useRoomIsClosed(details);
  const startCountdownMs = useCountdown(details?.start_date ?? undefined);
  const notYetStarted = !!details?.start_date && startCountdownMs !== null && startCountdownMs > 0;

  const [tab, setTab] = useState<Tab>("classroom");
  // Kept in the URL so coming back from a requester's profile lands on the open panel again.
  const [searchParams, setSearchParams] = useSearchParams();
  const showSettings = searchParams.get("settings") === "1";
  const setShowSettings = (open: boolean) =>
    setSearchParams(open ? { settings: "1" } : {}, { replace: true });
  const { data: pendingRequests } = useRoomJoinRequests(projectId, isHost);
  const leaveRoom = useLeaveRoom(projectId ?? "");
  const toast = useToast();
  const [viewArchivedChat, setViewArchivedChat] = useState(false);
  const getConversationId = useRoomConversationId(projectId ?? "");
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "chat" && hasAccess && !conversationId && !getConversationId.isPending) {
      getConversationId.mutate(undefined, { onSuccess: (id) => setConversationId(id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hasAccess]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
        <div className="max-w-md mx-auto">
          <button onClick={smartBack} className="text-ink-muted mb-4">
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col items-center text-center gap-3 mt-16">
            <JoinGate
              projectId={project.id}
              title={project.title}
              isPrivate={project.is_private}
              isFree={Number(project.promo_price_usd ?? project.price_usd) <= 0}
            />
          </div>
        </div>
      </div>
    );
  }

  if (notYetStarted) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
        <div className="max-w-md mx-auto">
          <button onClick={smartBack} className="text-ink-muted mb-4">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-2xl text-ink mb-1">{project.title}</h2>
          <div className="flex flex-col items-center text-center gap-2 mt-16">
            <p className="text-xs text-ink-muted uppercase tracking-wide">Starts in</p>
            <p className="font-display text-4xl text-ink">{formatCountdown(startCountdownMs!)}</p>
          </div>
        </div>
      </div>
    );
  }

  const showChatTab = !isClosed || isHost;
  const chatUnlockedForMe = !isClosed || isHost || viewArchivedChat;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3">
            {!isOwner && !isHost && isMember && (
              <button
                onClick={() => {
                  if (!window.confirm(`Leave “${project.title}”?`)) return;
                  leaveRoom.mutate(undefined, {
                    onSuccess: () => {
                      toast("You left the room.", { variant: "success" });
                      navigate("/connect", { replace: true });
                    },
                    onError: (err) => toast(errorMessage(err, "Couldn't leave the room."), { variant: "error" }),
                  });
                }}
                className="flex items-center gap-1 text-xs text-ink-muted"
                aria-label="Leave room"
              >
                <LogOut size={16} /> Leave
              </button>
            )}
            {isHost && (
              <button onClick={() => setShowSettings(!showSettings)} className="relative text-ink-muted" aria-label="Room settings">
                <Settings size={20} />
                {(pendingRequests ?? []).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] leading-4 text-center">
                    {pendingRequests!.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl text-ink truncate">{project.title}</h2>
          <span className="flex items-center gap-1 text-xs text-ink-muted shrink-0 ml-2">
            <Users size={13} />
            {memberCount ?? 0}
          </span>
        </div>

        {isClosed && (
          <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
            <span>This room has ended — media stays here for people who were in it.</span>
            {isHost && (
              <button
                onClick={() => setViewArchivedChat((v) => !v)}
                className="flex items-center gap-1 text-accent font-medium shrink-0 ml-2"
              >
                {viewArchivedChat ? <EyeOff size={13} /> : <Eye size={13} />}
                {viewArchivedChat ? "Hide chat" : "View chat"}
              </button>
            )}
          </div>
        )}

        {showSettings && isHost && <HostSettingsPanel projectId={project.id} isOwner={isOwner} />}

        <div className="flex gap-1 mb-4 border-b border-border">
          {(
            [
              ["classroom", "Classroom", BookOpen],
              ...(showChatTab ? ([["chat", "Chat", MessageCircle]] as const) : []),
              ...(!isClosed ? ([["meetings", "Meetings", Calendar], ["assignments", "Assignments", ClipboardList]] as const) : []),
            ] as [Tab, string, typeof BookOpen][]
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border-b-2 -mb-px ${
                tab === key ? "border-accent text-accent" : "border-transparent text-ink-muted"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <div style={{ display: tab === "classroom" ? "block" : "none" }}>
          <ClassroomTab projectId={project.id} isHost={isHost} />
        </div>
        {showChatTab && (
          <div style={{ display: tab === "chat" ? "block" : "none" }} className="h-[60vh]">
            {!chatUnlockedForMe ? (
              <p className="text-xs text-ink-muted">Chat closed when the cohort ended.</p>
            ) : conversationId ? (
              <RoomChat
                projectId={project.id}
                conversationId={conversationId}
                isHost={isHost}
                canPost={!isClosed && (isHost || !details?.hosts_only_chat) && !(details?.chat_muted && !isHost)}
                cantPostReason={
                  isClosed
                    ? "This cohort has ended."
                    : details?.chat_muted
                      ? "Chat is muted."
                      : details?.hosts_only_chat
                        ? "Only hosts can post here."
                        : undefined
                }
              />
            ) : (
              <p className="text-xs text-ink-muted">Loading chat…</p>
            )}
          </div>
        )}
        {!isClosed && (
          <>
            <div style={{ display: tab === "meetings" ? "block" : "none" }}>
              <MeetingsTab projectId={project.id} isHost={isHost} />
            </div>
            <div style={{ display: tab === "assignments" ? "block" : "none" }}>
              <AssignmentsTab projectId={project.id} isHost={isHost} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
