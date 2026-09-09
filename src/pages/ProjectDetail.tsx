// src/pages/ProjectDetail.tsx
import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  ArrowLeft,
  ImageIcon,
  MapPin,
  Video,
  CalendarClock,
  Clock,
  CalendarPlus,
  Navigation,
  Play,
  Music,
  Trash2,
} from "lucide-react";
import { useProjectDetail, useSimilarProjects, PROJECT_TYPE_LABELS, type Project } from "../hooks/useProjects";
import { useEventDetails, useMeetingDetails, useGigDetails, useGigSamples } from "../hooks/useProjectTypeDetails";
import { useMarkProjectSeen } from "../hooks/useMarkProjectSeen";
import { useAuth } from "../hooks/useAuth";
import { useCountdown, formatCountdown } from "../hooks/useCountdown";
import { downloadIcsEvent } from "../lib/calendar";
import {
  useEventHighlights,
  useAddEventHighlight,
  useDeleteEventHighlight,
  type EventHighlight,
} from "../hooks/useEventHighlights";
import { Avatar } from "../components/Avatar";
import { TierBadge } from "../components/TierBadge";
import { RoleTags } from "../components/RoleTags";
import { ProjectCard } from "../components/ProjectCard";
import { BottomNav } from "../components/BottomNav";

// Compact, non-interactive project tile for the "similar projects"
// rails — just enough to identify it and tap through. The full
// ProjectCard (buy/download/menu) is reserved for the one project
// this page is actually about
function ProjectMiniCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex-shrink-0 w-36 bg-surface rounded-xl overflow-hidden border border-border"
    >
      <div className="w-full aspect-square bg-canvas flex items-center justify-center">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={24} className="text-ink-muted" />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm text-ink truncate">{project.title}</p>
        <p className="text-xs text-ink-muted">{PROJECT_TYPE_LABELS[project.project_type]}</p>
      </div>
    </Link>
  );
}

function ProjectRail({ title, projects }: { title: string; projects: Project[] }) {
  if (projects.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="font-display text-base text-ink mb-3">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
        {projects.map((p) => (
          <ProjectMiniCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}

// One highlight tile — a photo, an inline video, or an audio row.
// Owner-only delete button; everyone can view.
function HighlightTile({
  highlight,
  isOwner,
  onDelete,
  deletePending,
}: {
  highlight: EventHighlight;
  isOwner: boolean;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-canvas border border-border">
      {highlight.media_type === "photo" && (
        <img src={highlight.file_url} alt={highlight.caption ?? ""} className="w-full aspect-square object-cover" />
      )}
      {highlight.media_type === "video" && (
        <video src={highlight.file_url} controls className="w-full aspect-square object-cover" />
      )}
      {highlight.media_type === "audio" && (
        <div className="p-3 flex items-center gap-2">
          <Music size={16} className="text-ink-muted flex-shrink-0" />
          <audio src={highlight.file_url} controls className="w-full h-9" />
        </div>
      )}
      {highlight.caption && (
        <p className="px-2 py-1.5 text-xs text-ink-muted truncate">{highlight.caption}</p>
      )}
      {isOwner && (
        <button
          onClick={onDelete}
          disabled={deletePending}
          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-canvas/80 text-danger disabled:opacity-50"
          aria-label="Remove highlight"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// Post-event recap gallery — public (no ticket required to view, see
// the RLS in ako_projects_v6_event_extras.sql), since this is
// promotional material for the host's future events, not paid
// content. Only the host can add or remove items.
function EventHighlightsSection({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const { data: highlights } = useEventHighlights(projectId);
  const addHighlight = useAddEventHighlight(projectId);
  const deleteHighlight = useDeleteEventHighlight(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    try {
      await addHighlight.mutateAsync({ file });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't upload that file.");
    }
  }

  if (!highlights || (highlights.length === 0 && !isOwner)) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base text-ink flex items-center gap-1.5">
          <Play size={15} /> From the event
        </h3>
        {isOwner && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={addHighlight.isPending}
            className="text-sm text-accent font-medium disabled:opacity-50"
          >
            {addHighlight.isPending ? "Uploading…" : "Add"}
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" onChange={handleFileSelect} className="hidden" />
      {uploadError && <p className="text-xs text-danger mb-2">{uploadError}</p>}
      {highlights.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Upload photos, video, or audio from the event once it's happened — it stays here for anyone to see.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {highlights.map((h) => (
            <HighlightTile
              key={h.id}
              highlight={h}
              isOwner={isOwner}
              onDelete={() => deleteHighlight.mutate(h.id)}
              deletePending={deleteHighlight.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: project, isLoading } = useProjectDetail(projectId);
  const { data: similar } = useSimilarProjects(project);
  const { data: eventDetails } = useEventDetails(project?.project_type === "event" ? projectId : undefined);
  const { data: meetingDetails } = useMeetingDetails(project?.project_type === "meeting" ? projectId : undefined);
  const { data: gigDetails } = useGigDetails(project?.project_type === "gig" ? projectId : undefined);
  const { data: gigSamples } = useGigSamples(project?.project_type === "gig" ? projectId : undefined);
  const isOwner = !!user && !!project && project.owner.id === user.id;
  const eventCountdownMs = useCountdown(project?.project_type === "event" ? eventDetails?.event_date : undefined);

  // Powers the Activity hub's "History" tab (see useViewHistory) —
  // same idea as useMarkPostSeen for posts.
  useMarkProjectSeen(projectId!, project?.owner?.id);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="max-w-xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        {isLoading || !project ? (
          <p className="text-ink-muted">Loading…</p>
        ) : (
          <>
            <ProjectCard project={project} />

            {/* Event/Meeting browsing info — shown to everyone, purchase
                is what unlocks the ticket/join page, not this block. */}
            {project.project_type === "event" && eventDetails && (
              <div className="flex flex-col gap-2 -mt-2 mb-4">
                <div className="flex flex-col gap-1.5 text-sm text-ink-muted">
                  {eventDetails.event_date && (
                    <span className="flex items-center gap-1.5">
                      <CalendarClock size={14} /> {new Date(eventDetails.event_date).toLocaleString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {eventDetails.location_type === "physical" ? eventDetails.location_value : "Online"}
                  </span>
                </div>

                {eventDetails.event_date && eventCountdownMs !== null && eventCountdownMs > 0 && (
                  <p className="text-sm font-medium text-accent">Starts in {formatCountdown(eventCountdownMs)}</p>
                )}

                <div className="flex items-center gap-4">
                  {eventDetails.event_date && (
                    <button
                      onClick={() =>
                        downloadIcsEvent({
                          title: project.title,
                          description: project.description ?? undefined,
                          location: eventDetails.location_value || undefined,
                          startIso: eventDetails.event_date!,
                        })
                      }
                      className="flex items-center gap-1.5 text-sm text-accent font-medium"
                    >
                      <CalendarPlus size={15} /> Add to calendar
                    </button>
                  )}
                  {eventDetails.location_type === "physical" && eventDetails.location_value && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventDetails.location_value)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-accent font-medium"
                    >
                      <Navigation size={15} /> Directions
                    </a>
                  )}
                </div>
              </div>
            )}
            {project.project_type === "meeting" && meetingDetails && (
              <div className="flex items-center gap-1.5 -mt-2 mb-4 text-sm text-ink-muted">
                <Video size={14} /> {new Date(meetingDetails.scheduled_at).toLocaleString()}
              </div>
            )}

            {/* Gig browsing info — tagline/delivery estimate up top,
                proof-of-work samples as a rail below. Message/Book
                CTAs live on the ProjectCard above, not here. */}
            {project.project_type === "gig" && gigDetails?.tagline && (
              <p className="-mt-2 mb-2 text-sm font-medium text-ink">{gigDetails.tagline}</p>
            )}
            {project.project_type === "gig" && gigDetails?.delivery_estimate && (
              <div className="flex items-center gap-1.5 mb-4 text-sm text-ink-muted">
                <Clock size={14} /> {gigDetails.delivery_estimate}
              </div>
            )}
            {project.project_type === "gig" && gigSamples && gigSamples.length > 0 && (
              <div className="mb-4">
                <h3 className="font-display text-base text-ink mb-3">Work samples</h3>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
                  {gigSamples.map((sample) => (
                    <ProjectMiniCard key={sample.id} project={sample} />
                  ))}
                </div>
              </div>
            )}

            {project.project_type === "event" && <EventHighlightsSection projectId={project.id} isOwner={isOwner} />}

            {project.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 -mt-2 mb-4">
                {project.topics.map((topic) => (
                  <span
                    key={topic.id}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface border border-border text-ink-muted"
                  >
                    {topic.name}
                  </span>
                ))}
              </div>
            )}

            {/* Creator byline — tapping any part of it opens the
                creator's profile, per the "fanlink" behavior. */}
            <Link
              to={`/profile/${project.owner.username}`}
              className="flex items-center gap-3 bg-surface rounded-2xl border border-border p-4"
            >
              <Avatar src={project.owner.avatar_url} name={project.owner.display_name} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink">{project.owner.display_name}</span>
                  <TierBadge tier={project.owner.tier} />
                </div>
                {project.owner.roles.length > 0 && (
                  <RoleTags roles={project.owner.roles} className="text-xs text-ink-muted block mt-0.5" />
                )}
                <span className="text-sm text-ink-muted">@{project.owner.username}</span>
              </div>
            </Link>

            <ProjectRail title={`More from ${project.owner.display_name}`} projects={similar?.moreFromCreator ?? []} />
            <ProjectRail title="Similar topics" projects={similar?.moreOnTopic ?? []} />
            <ProjectRail
              title={`More ${PROJECT_TYPE_LABELS[project.project_type]}s`}
              projects={similar?.moreOfType ?? []}
            />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
