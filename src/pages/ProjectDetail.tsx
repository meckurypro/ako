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
  Star,
  ChevronDown,
  RefreshCw,
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
import { useGigReviews, useGigRatingSummary, useCanReviewGig, useAddGigReview } from "../hooks/useGigReviews";
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

// Collapsed-by-default FAQ list — reduces the repetitive "wait, does
// this include X?" DMs a host would otherwise field one at a time.
function GigFaqSection({ faq }: { faq: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="mb-4">
      <h3 className="font-display text-base text-ink mb-2">FAQ</h3>
      <div className="flex flex-col gap-1.5">
        {faq.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
              <span className="text-sm text-ink font-medium">{item.question}</span>
              <ChevronDown
                size={15}
                className={`text-ink-muted flex-shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
              />
            </button>
            {openIndex === i && <p className="px-3 pb-2.5 text-sm text-ink-muted">{item.answer}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? "text-accent" : "text-border"}
          fill={n <= Math.round(rating) ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

// Reviews are the trust signal that actually moves a buyer to message
// a seller they've never worked with — the single highest-leverage
// addition a small service listing can make (this is Fiverr's own
// stated view of what its "primary quality signal" is). Anyone can
// read them; only someone who's actually booked the gig (checked
// against `purchases`, enforced by RLS, not just this UI) can leave
// one, once.
function GigReviewsSection({ projectId }: { projectId: string }) {
  const { data: reviews } = useGigReviews(projectId);
  const { average, count } = useGigRatingSummary(projectId);
  const canReview = useCanReviewGig(projectId);
  const addReview = useAddGigReview(projectId);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  async function handleSubmit() {
    await addReview.mutateAsync({ rating, reviewText: reviewText.trim() || undefined });
    setShowForm(false);
    setReviewText("");
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-base text-ink">Reviews</h3>
        {canReview && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-sm text-accent font-medium">
            Leave a review
          </button>
        )}
      </div>

      {count > 0 && average !== null && (
        <div className="flex items-center gap-2 mb-3">
          <StarRow rating={average} />
          <span className="text-sm text-ink-muted">
            {average.toFixed(1)} · {count} review{count === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {showForm && (
        <div className="mb-3 p-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n} stars`}>
                <Star size={20} className={n <= rating ? "text-accent" : "text-border"} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="How did it go? (optional)"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink resize-none mb-2"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleSubmit()}
              disabled={addReview.isPending}
              className="px-4 py-2 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
            >
              {addReview.isPending ? "Posting…" : "Post review"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-ink-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!reviews || reviews.length === 0 ? (
        <p className="text-sm text-ink-muted">No reviews yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <Avatar src={r.reviewer.avatar_url} name={r.reviewer.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink truncate">{r.reviewer.display_name}</span>
                  <StarRow rating={r.rating} size={11} />
                </div>
                {r.review_text && <p className="text-sm text-ink-muted mt-0.5">{r.review_text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
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
              <div className="flex items-center gap-1.5 mb-1.5 text-sm text-ink-muted">
                <Clock size={14} /> {gigDetails.delivery_estimate}
                {gigDetails.revisions_included !== null && gigDetails.revisions_included !== undefined && (
                  <span className="flex items-center gap-1">
                    · <RefreshCw size={12} /> {gigDetails.revisions_included} revision
                    {gigDetails.revisions_included === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
            {project.project_type === "gig" &&
              !gigDetails?.delivery_estimate &&
              gigDetails?.revisions_included !== null &&
              gigDetails?.revisions_included !== undefined && (
                <div className="flex items-center gap-1.5 mb-1.5 text-sm text-ink-muted">
                  <RefreshCw size={12} /> {gigDetails.revisions_included} revision
                  {gigDetails.revisions_included === 1 ? "" : "s"}
                </div>
              )}
            {project.project_type === "gig" && gigDetails?.deliverables && gigDetails.deliverables.length > 0 && (
              <ul className="mb-4 flex flex-col gap-1">
                {gigDetails.deliverables.map((item, i) => (
                  <li key={i} className="text-sm text-ink-muted flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">✓</span> {item}
                  </li>
                ))}
              </ul>
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
            {project.project_type === "gig" && gigDetails?.faq && gigDetails.faq.length > 0 && (
              <GigFaqSection faq={gigDetails.faq} />
            )}
            {project.project_type === "gig" && <GigReviewsSection projectId={project.id} />}

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
