// src/pages/Room.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProjects";
import { useCountdown, formatCountdown } from "../hooks/useCountdown";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { VoiceRecordingBar } from "../components/VoiceRecordingBar";
import { VoicePreviewBar } from "../components/VoicePreviewBar";
import { VoiceMessageBubble } from "../components/VoiceMessageBubble";
import { Avatar } from "../components/Avatar";
import { decodeVoiceNote } from "../lib/voiceNotes";
import { RoomChat } from "../components/RoomChat";
import { useLiveKitRoom, type CallParticipantView } from "../hooks/useLiveKitRoom";
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
  type RoomMeeting,
} from "../hooks/useRoom";

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

function RoomCallView({ roomMeeting, onLeave }: { roomMeeting: RoomMeeting; onLeave: () => void }) {
  const call = useLiveKitRoom(roomMeeting.id);
  const joined = useRef(false);

  useEffect(() => {
    if (joined.current) return;
    joined.current = true;
    void call.join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          className={`p-3 rounded-full ${call.screenShareEnabled ? "bg-accent text-canvas" : "bg-surface text-ink"}`}
          aria-label="Toggle screen share"
        >
          {call.screenShareEnabled ? <ScreenShareOff size={16} /> : <ScreenShare size={16} />}
        </button>
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
          className="px-4 py-2 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
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
          return (
            <div key={p.id} className="p-3 rounded-xl border border-border bg-surface text-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Avatar src={sender?.avatar_url} name={sender?.display_name ?? "Host"} size="sm" />
                <span className="text-xs font-medium text-ink">{sender?.display_name ?? "Host"}</span>
              </div>
              {p.type === "text" && <p className="text-ink whitespace-pre-wrap">{p.content}</p>}
              {voiceNote && (
                <VoiceMessageBubble url={voiceNote.url} durationSec={voiceNote.durationSec} peaks={voiceNote.peaks} isMine={false} />
              )}
              {p.type === "video" && p.media_url && <video src={p.media_url} controls className="w-full rounded-lg max-h-72 mt-1" />}
              {p.type === "image" && p.media_url && <img src={p.media_url} alt="" className="w-full rounded-lg mt-1" />}
              {p.type === "audio" && p.media_url && !voiceNote && <audio src={p.media_url} controls className="w-full h-9 mt-1" />}
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
            elapsedMs={voiceRecorder.elapsedMs}
            drag={voiceRecorder.drag}
            cancelThresholdPx={voiceRecorder.cancelThresholdPx}
            lockThresholdPx={voiceRecorder.lockThresholdPx}
            liveLevels={voiceRecorder.liveLevels}
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
            {draft.trim() ? (
              <button
                type="submit"
                disabled={postToRoom.isPending}
                className="p-2.5 rounded-full bg-accent text-canvas disabled:opacity-50"
                aria-label="Post"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={voiceRecorder.micHandlers.onPointerDown}
                className="p-2.5 rounded-full bg-accent text-canvas"
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
    return <RoomCallView roomMeeting={activeCall} onLeave={() => setActiveCallMeetingId(null)} />;
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
            className="w-full py-2 rounded-lg bg-accent text-canvas text-sm font-medium disabled:opacity-50"
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
                    className="mt-1.5 px-3 py-1.5 rounded-full bg-accent text-canvas text-xs font-medium"
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
          {s.media_url && s.format === "audio" && <audio src={s.media_url} controls className="w-full h-9 mb-1" />}
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
                  className="px-3 py-1.5 rounded-full bg-accent text-canvas text-xs font-medium disabled:opacity-50"
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
                className="self-start px-3 py-1.5 rounded-full bg-accent text-canvas text-xs font-medium disabled:opacity-50"
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
            className="w-full py-2 rounded-lg bg-accent text-canvas text-sm font-medium disabled:opacity-50"
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

function HostSettingsPanel({ projectId }: { projectId: string }) {
  const { data: details } = useRoomDetails(projectId);
  const { data: members } = useRoomMembersList(projectId);
  const { data: moderators } = useRoomModerators(projectId);
  const updateDetails = useUpdateRoomDetails(projectId);
  const addModerator = useAddRoomModerator(projectId);
  const removeModerator = useRemoveRoomModerator(projectId);

  const moderatorIds = new Set((moderators ?? []).map((m) => m.user_id));

  return (
    <div className="p-3 rounded-xl border border-border bg-surface mb-4 flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Shield size={14} className="text-ink-muted" />
        <p className="text-sm font-medium text-ink">Cohort settings</p>
      </div>

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
        <p className="text-xs text-ink-muted mb-1.5">Co-hosts</p>
        <div className="flex flex-col gap-1.5">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="sm" />
                <span className="text-sm text-ink">{m.profile.display_name}</span>
              </div>
              {moderatorIds.has(m.user_id) ? (
                <button onClick={() => removeModerator.mutate(m.user_id)} className="text-xs text-danger font-medium">
                  Remove
                </button>
              ) : (
                <button onClick={() => addModerator.mutate(m.user_id)} className="text-xs text-accent font-medium">
                  Make co-host
                </button>
              )}
            </div>
          ))}
          {(members ?? []).length === 0 && <p className="text-xs text-ink-muted">No members yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Main page
// ---------------------------------------------------------------

export function Room() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const isOwner = !!user && project?.owner_id === user.id;

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
  const [showSettings, setShowSettings] = useState(false);
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
            <Lock size={28} className="text-ink-muted" />
            <p className="text-ink font-medium">Members only</p>
            <p className="text-sm text-ink-muted">
              Buy access to "{project.title}" from its project page to join this cohort.
            </p>
            <button onClick={() => navigate(`/projects/${projectId}`)} className="mt-2 text-accent text-sm font-medium">
              Go to project page
            </button>
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
          {isHost && (
            <button onClick={() => setShowSettings((s) => !s)} className="text-ink-muted" aria-label="Cohort settings">
              <Settings size={20} />
            </button>
          )}
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
            <span>This cohort has ended — media stays here for people who were in it.</span>
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

        {showSettings && isHost && <HostSettingsPanel projectId={project.id} />}

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
