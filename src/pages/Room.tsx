// src/pages/Room.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate, useSearchParams, useLocation, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { loginPathFor, returnPathOf } from "../lib/authRedirect";
import { formatUsd } from "../lib/money";
import { GROUP_KIND_LABEL, type GroupKind } from "../lib/groups";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  ArrowLeft,
  Send,
  Calendar,
  ClipboardList,
  Users,
  Lock,
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
  CheckCircle2,
  XCircle,
  Circle,
  Square,
  LogOut,
} from "lucide-react";
import { useProjectOwnership } from "../hooks/useProjectOwnership";
import { useProject, usePurchaseProject, type Project } from "../hooks/useProjects";
import { useCountdown, formatCountdown } from "../hooks/useCountdown";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useVoiceNotesEnabled } from "../hooks/useFeatureFlags";
import { VoiceRecordingBar } from "../components/VoiceRecordingBar";
import { VoicePreviewBar } from "../components/VoicePreviewBar";
import { VoiceMessageBubble } from "../components/VoiceMessageBubble";
import { Avatar } from "../components/Avatar";
import { useToast } from "../components/Toast";
import { decodeVoiceNote } from "../lib/voiceNotes";
import { MessageThread, type GroupThreadConfig } from "./MessageThread";
import { GroupInfoScreen, GroupMembersScreen, GroupScreenShell, type GroupView } from "../components/group/GroupScreens";
import { HostSettingsPanel } from "../components/group/GroupSettings";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { OptionItem } from "../components/OptionsModal";
import { useLiveKitRoom, type CallParticipantView } from "../hooks/useLiveKitRoom";
import { useStartMeetingRecording, useStopMeetingRecording } from "../hooks/useMeetingRecordings";
import {
  useIsRoomMember,
  useIsRoomHost,
  useRoomMemberCount,
  useRoomPeople,
  useRoomMembersList,
  useRoomDetails,
  useRoomIsClosed,
  useRoomConversationId,
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
  useLeaveRoom,
  useGroupPublicInfo,
  useJoinOpenRoom,
  invalidateRoomMembership,
  type GroupPublicInfo,
  type RoomMeeting,
} from "../hooks/useRoom";
import { SafeAudio } from "../components/MediaPlaceholder";


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
                <p className="text-ink font-medium">{m.title || "Group meeting"}</p>
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

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// Shown to someone who isn't in the room yet. Public free rooms take a request the host reviews; paid
// rooms are bought from the project page; private rooms are invitation-only (the host adds people).
// What anyone sees before they're in: the group itself, who it's for, and the one way in that applies to it.
//   private → invitation only · paid → buy access · open community → join · everything else → ask a host.
function GroupLanding({ project, info, isGuest }: { project: Project; info: GroupPublicInfo | null | undefined; isGuest: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const smartBack = useSmartBack();
  const toast = useToast();
  const queryClient = useQueryClient();
  const projectId = project.id;
  const { data: myRequest } = useMyRoomJoinRequest(projectId);
  const requestJoin = useRequestRoomJoin(projectId);
  const cancelRequest = useCancelRoomJoinRequest(projectId);
  const joinOpen = useJoinOpenRoom(projectId);
  const purchase = usePurchaseProject();

  const kind: GroupKind = info?.kind ?? "community";
  const price = Number(project.promo_price_usd ?? project.price_usd);
  const isFree = price <= 0;
  const status = myRequest?.status;
  const memberWord = kind === "cohort" ? "participants" : "members";
  const goLogin = () => navigate(loginPathFor(returnPathOf(location)));

  const fmt = (v: string) => new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const schedule =
    kind === "cohort" && info
      ? info.start_date && info.end_date
        ? `${fmt(info.start_date)} – ${fmt(info.end_date)}`
        : info.start_date
          ? `Starts ${fmt(info.start_date)}`
          : info.end_date
            ? `Ends ${fmt(info.end_date)}`
            : null
      : null;

  const primary = "px-5 py-2.5 rounded-full bg-cta text-white text-sm font-medium disabled:opacity-50";

  let action: React.ReactNode;
  if (info?.is_closed) {
    action = <p className="text-sm text-ink-muted">This cohort has ended.</p>;
  } else if (project.is_private) {
    action = (
      <div className="flex items-start gap-2 text-sm text-ink-muted">
        <Lock size={16} className="shrink-0 mt-0.5" />
        <p>This group is private. The host adds the people who can join.</p>
      </div>
    );
  } else if (!isFree) {
    action = (
      <button
        onClick={() => {
          if (isGuest) return goLogin();
          purchase.mutate(projectId, {
            onSuccess: () => {
              invalidateRoomMembership(queryClient, projectId);
              toast(`You're in. Welcome to ${project.title}.`, { variant: "success" });
            },
            onError: (err) => toast(errorMessage(err, "Couldn't complete your purchase."), { variant: "error" }),
          });
        }}
        disabled={purchase.isPending}
        className={primary}
      >
        {purchase.isPending ? "Joining…" : `Join · ${formatUsd(price)}`}
      </button>
    );
  } else if (kind === "community" && info?.join_mode === "open") {
    action = (
      <button
        onClick={() => {
          if (isGuest) return goLogin();
          joinOpen.mutate(undefined, {
            onSuccess: () => toast(`You joined ${project.title}.`, { variant: "success" }),
            onError: (err) => toast(errorMessage(err, "Couldn't join."), { variant: "error" }),
          });
        }}
        disabled={joinOpen.isPending}
        className={primary}
      >
        {joinOpen.isPending ? "Joining…" : "Join community"}
      </button>
    );
  } else if (status === "pending") {
    action = (
      <>
        <p className="text-sm text-ink-muted">Your request is waiting for a host to review it.</p>
        <button
          onClick={() =>
            cancelRequest.mutate(undefined, { onSuccess: () => toast("Request cancelled.", { variant: "success" }) })
          }
          disabled={cancelRequest.isPending}
          className="text-sm text-ink-muted font-medium"
        >
          Cancel request
        </button>
      </>
    );
  } else {
    action = (
      <>
        <p className="text-sm text-ink-muted">
          {status === "declined"
            ? "Your last request wasn't accepted. You can ask again."
            : "A host reviews every request to join this group."}
        </p>
        <button
          onClick={() => {
            if (isGuest) return goLogin();
            requestJoin.mutate(undefined, {
              onSuccess: () => toast("Request sent.", { variant: "success" }),
              onError: (err) => toast(errorMessage(err, "Couldn't send your request."), { variant: "error" }),
            });
          }}
          disabled={requestJoin.isPending}
          className={primary}
        >
          {status === "declined" ? "Ask again" : "Request to join"}
        </button>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        {project.thumbnail_url && (
          <img src={project.thumbnail_url} alt="" className="w-full aspect-video object-cover rounded-2xl mb-4" />
        )}
        <p className="text-[11px] uppercase tracking-wide text-accent font-medium">{GROUP_KIND_LABEL[kind]}</p>
        <h2 className="font-display text-2xl text-ink mt-1">{project.title}</h2>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-muted">
          {info && (
            <span className="flex items-center gap-1">
              <Users size={13} /> {info.member_count} {memberWord}
            </span>
          )}
          {schedule && (
            <span className="flex items-center gap-1">
              <Calendar size={13} /> {schedule}
            </span>
          )}
          {!isFree && !project.is_private && <span>{formatUsd(price)}</span>}
        </div>
        {project.description && <p className="text-sm text-ink-muted mt-4 whitespace-pre-line">{project.description}</p>}
        <div className="mt-6 flex flex-col items-start gap-2">{action}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Main page
// ---------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <p className="text-ink-muted">Loading…</p>
    </div>
  );
}

// Signed-out visitors get the group's landing page (shared links land here); joining sends them through login.
function GuestGroup({ projectId }: { projectId: string | undefined }) {
  const { data: project } = useProject(projectId);
  const { data: info } = useGroupPublicInfo(projectId);
  if (!project) return <LoadingScreen />;
  return <GroupLanding project={project} info={info} isGuest />;
}

// Old /rooms/:id links (notifications, shares) keep working.
export function RoomRedirect() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  return <Navigate to={{ pathname: `/groups/${projectId}`, search: location.search }} replace />;
}

// The group page, at /groups/:id and — through a group's custom slug — at /:slug.
export function Room({ projectId: projectIdProp }: { projectId?: string } = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <GuestGroup projectId={projectId} />;
  return <GroupPage projectId={projectId} />;
}

function GroupPage({ projectId }: { projectId: string | undefined }) {
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
  const { data: publicInfo } = useGroupPublicInfo(projectId);
  // A group is a cohort or a community. Members read it from the details; non-members from the public info.
  const kind: GroupKind = details?.kind ?? publicInfo?.kind ?? "community";
  const kindLabel = GROUP_KIND_LABEL[kind];
  const isCohort = kind === "cohort";
  const isClosed = useRoomIsClosed(details);
  const startCountdownMs = useCountdown(details?.start_date ?? undefined);
  const notYetStarted = !!details?.start_date && startCountdownMs !== null && startCountdownMs > 0;

  // A group opens on its chat — that's where the people are. Everything else (Updates / Classroom, Meetings,
  // Assignments, Members, Settings) is its own screen, reached from the group info list or the chat's ⋯ menu, and
  // kept in the URL (?view=…) so Back and deep links behave. Old ?settings=1 links still land on Settings.
  const navigate_ = navigate;
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const rawView = searchParams.get("view") ?? (searchParams.get("settings") === "1" ? "settings" : null);
  const showChat = !isClosed || isHost; // a finished cohort's chat is closed to everyone but its hosts
  const goView = (v: GroupView | null, opts: { replace?: boolean; from?: string } = {}) =>
    navigate_({ search: v ? `?view=${v}` : "" }, { replace: opts.replace, state: opts.from ? { from: opts.from } : undefined });
  const backFromView = () => {
    // Views are pushed, so the browser's Back is the natural way out; a deep link has nothing behind it.
    if ((window.history.state?.idx ?? 0) > 0) navigate_(-1);
    else goView(null, { replace: true });
  };

  const { data: pendingRequests } = useRoomJoinRequests(projectId, isHost);
  const { data: people, isLoading: peopleLoading } = useRoomPeople(hasAccess ? projectId : undefined);
  const leaveRoom = useLeaveRoom(projectId ?? "");
  const toast = useToast();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const getConversationId = useRoomConversationId(projectId ?? "");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const wantsChat = !rawView && showChat;
  useEffect(() => {
    if (wantsChat && hasAccess && !conversationId && !getConversationId.isPending) {
      getConversationId.mutate(undefined, { onSuccess: (id) => setConversationId(id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsChat, hasAccess]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return <GroupLanding project={project} info={publicInfo} isGuest={false} />;
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

  const everyone = people ?? [];
  const memberTotal = everyone.length || memberCount || 0;
  const canLeave = !isOwner && !isHost && !!isMember;
  const pendingCount = (pendingRequests ?? []).length;

  // Which screen? Anything the group can't show right now (meetings once a cohort has ended, assignments in a
  // community, settings for non-hosts) falls back to the info list rather than an empty page.
  const allowed: GroupView[] = ["info", "updates", "members", ...(!isClosed ? (["meetings"] as const) : []), ...(!isClosed && isCohort ? (["assignments"] as const) : []), ...(isHost ? (["settings"] as const) : [])];
  const view: GroupView | "chat" = rawView
    ? allowed.includes(rawView as GroupView) ? (rawView as GroupView) : "info"
    : showChat ? "chat" : "updates";

  const updatesLabel = isCohort ? "Classroom" : "Updates";

  const leaveDialog = confirmLeave && (
    <ConfirmDialog
      title={`Leave “${project.title}”?`}
      description="You'll stop seeing this group's chat and updates. Other members won't be notified."
      confirmLabel="Leave group"
      onCancel={() => setConfirmLeave(false)}
      onConfirm={() => {
        setConfirmLeave(false);
        leaveRoom.mutate(undefined, {
          onSuccess: () => {
            toast("You left the group.", { variant: "success" });
            navigate("/connect", { replace: true });
          },
          onError: (err) => toast(errorMessage(err, "Couldn't leave the group."), { variant: "error" }),
        });
      }}
    />
  );

  if (view === "chat") {
    // The ⋯ menu in the chat header: the group's screens, with Leave last (and only for people who can leave).
    const menuItems: (OptionItem | "divider")[] = [
      { key: "updates", label: updatesLabel, icon: <BookOpen />, onSelect: () => goView("updates", { from: "chat" }) },
      ...(!isClosed ? [{ key: "meetings", label: "Meetings", icon: <Calendar />, onSelect: () => goView("meetings", { from: "chat" }) } satisfies OptionItem] : []),
      ...(!isClosed && isCohort ? [{ key: "assignments", label: "Assignments", icon: <ClipboardList />, onSelect: () => goView("assignments", { from: "chat" }) } satisfies OptionItem] : []),
      { key: "members", label: `Members (${memberTotal})`, icon: <Users />, onSelect: () => goView("members", { from: "chat" }) },
      ...(isHost
        ? [
            {
              key: "settings",
              label: "Group settings",
              icon: <Settings />,
              badge: pendingCount > 0 ? <span className="rounded-full bg-cta px-1.5 text-[11px] font-semibold leading-5 text-white">{pendingCount}</span> : undefined,
              onSelect: () => goView("settings", { from: "chat" }),
            } satisfies OptionItem,
          ]
        : []),
      ...(canLeave
        ? ["divider" as const, { key: "leave", label: "Leave group", icon: <LogOut />, variant: "danger", onSelect: () => setConfirmLeave(true) } satisfies OptionItem]
        : []),
    ];
    const group: GroupThreadConfig = {
      projectId: project.id,
      title: project.title,
      avatarUrl: project.thumbnail_url ?? null,
      people: everyone,
      isHost,
      canPost: !isClosed && (isHost || !details?.hosts_only_chat) && !(details?.chat_muted && !isHost),
      cantPostReason: isClosed
        ? "This cohort has ended."
        : details?.chat_muted
          ? "Chat is muted."
          : details?.hosts_only_chat
            ? "Only hosts can post here."
            : undefined,
      onBack: smartBack,
      onOpenInfo: () => goView("info", { from: "chat" }),
      onOpenProfile: (username) => navigate(`/profile/${username}`),
      menuItems,
    };
    return (
      <>
        {conversationId ? <MessageThread conversationId={conversationId} group={group} /> : <LoadingScreen />}
        {leaveDialog}
      </>
    );
  }

  if (view === "info") {
    return (
      <>
        <GroupInfoScreen
          title={project.title}
          kind={kind}
          kindLabel={kindLabel}
          description={project.description ?? null}
          thumbnailUrl={project.thumbnail_url ?? null}
          people={everyone}
          isHost={isHost}
          isClosed={isClosed}
          showChat={showChat}
          pendingRequests={pendingCount}
          canLeave={canLeave}
          onBack={backFromView}
          onOpen={(v) => goView(v, { from: "info" })}
          onOpenChat={() => {
            // Came here from the chat → go back to it; otherwise open it fresh without stacking another entry.
            if (location.state?.from === "chat") navigate_(-1);
            else goView(null, { replace: true });
          }}
          onLeave={() => setConfirmLeave(true)}
        />
        {leaveDialog}
      </>
    );
  }

  if (view === "members") {
    return (
      <GroupMembersScreen
        projectId={project.id}
        title={project.title}
        isCohort={isCohort}
        people={everyone}
        isHost={isHost}
        isOwner={isOwner}
        loading={peopleLoading}
        onBack={backFromView}
      />
    );
  }

  const screenTitle = view === "updates" ? updatesLabel : view === "meetings" ? "Meetings" : view === "assignments" ? "Assignments" : "Group settings";
  return (
    <GroupScreenShell title={screenTitle} subtitle={project.title} onBack={backFromView}>
      {view === "updates" && <ClassroomTab projectId={project.id} isHost={isHost} />}
      {view === "meetings" && <MeetingsTab projectId={project.id} isHost={isHost} />}
      {view === "assignments" && <AssignmentsTab projectId={project.id} isHost={isHost} />}
      {view === "settings" && <HostSettingsPanel projectId={project.id} project={project} isOwner={isOwner} onOpenMembers={() => goView("members")} />}
    </GroupScreenShell>
  );
}
