// src/pages/Room.tsx
import { useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Calendar, ClipboardList, Users, Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProjects";
import {
  useIsRoomMember,
  useRoomMemberCount,
  useRoomPosts,
  usePostToRoom,
  useRoomMeetings,
  useScheduleRoomMeeting,
  useAssignments,
  useCreateAssignment,
} from "../hooks/useRoom";

// Single page for a Room, with host-only controls shown inline
// rather than a separate manage screen — keeps the member and host
// experience visually consistent (a host is also effectively "in"
// their own room) and avoids maintaining two parallel layouts.
//
// STUB: room_posts of type audio/video/image/voice_note render as a
// generic <audio>/<video>/link — there's no in-browser recorder for
// voice notes yet, and no upload picker wired into the composer below
// (only text). That's the same "pick a video/upload provider" gap
// flagged for Meeting/room_meetings recordings — voice/video posting
// needs a media-upload hook plumbed in once that's decided.
export function Room() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const isOwner = !!user && project?.owner_id === user.id;

  const { data: isMember } = useIsRoomMember(projectId);
  const { data: memberCount } = useRoomMemberCount(projectId);
  const hasAccess = isOwner || !!isMember;

  const { data: posts } = useRoomPosts(projectId);
  const postToRoom = usePostToRoom(projectId ?? "");
  const [draft, setDraft] = useState("");

  const { data: meetings } = useRoomMeetings(projectId);
  const scheduleMeeting = useScheduleRoomMeeting(projectId ?? "");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingWhen, setMeetingWhen] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);

  const { data: assignments } = useAssignments(projectId);
  const createAssignment = useCreateAssignment(projectId ?? "");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentFormat, setAssignmentFormat] = useState<"text" | "audio" | "video" | "image">("text");
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await postToRoom.mutateAsync({ type: "text", content: draft.trim() });
    setDraft("");
  }

  async function handleSchedule(e: FormEvent) {
    e.preventDefault();
    if (!meetingWhen) return;
    await scheduleMeeting.mutateAsync({ title: meetingTitle.trim() || undefined, scheduled_at: meetingWhen });
    setMeetingTitle("");
    setMeetingWhen("");
    setShowScheduler(false);
  }

  async function handleCreateAssignment(e: FormEvent) {
    e.preventDefault();
    if (!assignmentTitle.trim()) return;
    await createAssignment.mutateAsync({ title: assignmentTitle.trim(), required_format: assignmentFormat });
    setAssignmentTitle("");
    setShowAssignmentForm(false);
  }

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
          <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col items-center text-center gap-3 mt-16">
            <Lock size={28} className="text-ink-muted" />
            <p className="text-ink font-medium">Members only</p>
            <p className="text-sm text-ink-muted">
              Buy access to "{project.title}" from its project page to join this room.
            </p>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="mt-2 text-accent text-sm font-medium"
            >
              Go to project page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-ink truncate">{project.title}</h2>
          <span className="flex items-center gap-1 text-xs text-ink-muted shrink-0 ml-2">
            <Users size={13} />
            {memberCount ?? 0}
          </span>
        </div>

        {/* Meetings */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
              <Calendar size={15} /> Meetings
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowScheduler((s) => !s)}
                className="text-xs text-accent font-medium"
              >
                Schedule
              </button>
            )}
          </div>

          {showScheduler && (
            <form onSubmit={handleSchedule} className="mb-3 p-3 rounded-xl border border-border bg-surface">
              <input
                type="text"
                placeholder="Title (optional)"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
              />
              <input
                type="datetime-local"
                value={meetingWhen}
                onChange={(e) => setMeetingWhen(e.target.value)}
                required
                className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
              />
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
              {meetings!.map((m) => (
                <div key={m.id} className="p-3 rounded-xl border border-border bg-surface text-sm">
                  <p className="text-ink font-medium">{m.title || "Room meeting"}</p>
                  <p className="text-xs text-ink-muted">{new Date(m.scheduled_at).toLocaleString()}</p>
                  <p className="text-xs text-ink-muted capitalize mt-0.5">{m.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignments */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
              <ClipboardList size={15} /> Assignments
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowAssignmentForm((s) => !s)}
                className="text-xs text-accent font-medium"
              >
                New
              </button>
            )}
          </div>

          {showAssignmentForm && (
            <form onSubmit={handleCreateAssignment} className="mb-3 p-3 rounded-xl border border-border bg-surface">
              <input
                type="text"
                placeholder="Assignment title"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                required
                className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
              />
              <select
                value={assignmentFormat}
                onChange={(e) => setAssignmentFormat(e.target.value as typeof assignmentFormat)}
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
                <div key={a.id} className="p-3 rounded-xl border border-border bg-surface text-sm">
                  <p className="text-ink font-medium">{a.title}</p>
                  <p className="text-xs text-ink-muted capitalize">{a.required_format} submission</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements / chat feed */}
        <div>
          <h3 className="text-sm font-medium text-ink mb-2">Announcements</h3>
          <div className="flex flex-col gap-2 mb-3">
            {(posts ?? []).length === 0 && (
              <p className="text-xs text-ink-muted">Nothing posted yet.</p>
            )}
            {posts?.map((p) => (
              <div key={p.id} className="p-3 rounded-xl border border-border bg-surface text-sm">
                {p.type === "text" && <p className="text-ink whitespace-pre-wrap">{p.content}</p>}
                {p.type !== "text" && p.media_url && (
                  <p className="text-xs text-ink-muted">
                    [{p.type}] {p.media_url} — stream only, not downloadable
                  </p>
                )}
                <p className="text-xs text-ink-muted mt-1">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handlePost} className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Post an announcement…"
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-canvas text-sm text-ink"
            />
            <button
              type="submit"
              disabled={postToRoom.isPending || !draft.trim()}
              className="p-2.5 rounded-full bg-accent text-canvas disabled:opacity-50"
              aria-label="Post"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
