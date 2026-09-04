// src/pages/CreateProject.tsx
import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon } from "lucide-react";
import {
  useCreateProject,
  PROJECT_TYPE_OPTIONS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_HINTS,
  type ProjectType,
} from "../hooks/useProjects";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { TopicPicker, MAX_TOPICS } from "../components/TopicPicker";
import { FormatToolbar } from "../components/FormatToolbar";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";
import { EventFields, EMPTY_EVENT_FIELDS, type EventFieldsValue } from "../components/project-types/EventFields";
import { MeetingFields, EMPTY_MEETING_FIELDS, type MeetingFieldsValue } from "../components/project-types/MeetingFields";
import { RoomFields } from "../components/project-types/RoomFields";
import { CourseFields } from "../components/project-types/CourseFields";
import {
  DeliverableFields,
  EMPTY_DELIVERABLE_FIELDS,
  type DeliverableFieldsValue,
} from "../components/project-types/DeliverableFields";

// Types that use the shared link-or-upload block.
const DELIVERABLE_TYPES: ProjectType[] = ["audio", "video", "file"];

export function CreateProject() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const uploadThumbnail = useUploadProjectThumbnail();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [projectType, setProjectType] = useState<ProjectType>("file");
  const [topicIds, setTopicIds] = useState<Set<string>>(new Set());
  const [priceUsd, setPriceUsd] = useState("0");
  const [showPromo, setShowPromo] = useState(false);
  const [promoPriceUsd, setPromoPriceUsd] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailRatio, setThumbnailRatio] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Type-specific state — only the block matching projectType is
  // read/validated/sent; switching types keeps the others' state
  // around harmlessly rather than resetting it, in case the host
  // switches back.
  const [deliverable, setDeliverable] = useState<DeliverableFieldsValue>(EMPTY_DELIVERABLE_FIELDS);
  const [eventFields, setEventFields] = useState<EventFieldsValue>(EMPTY_EVENT_FIELDS);
  const [meetingFields, setMeetingFields] = useState<MeetingFieldsValue>(EMPTY_MEETING_FIELDS);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  function toggleTopic(interestId: string) {
    setTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) {
        next.delete(interestId);
      } else {
        // TopicPicker already disables the pill past the cap — this is
        // a second guard at the state layer so the two never drift.
        if (next.size >= MAX_TOPICS) return prev;
        next.add(interestId);
      }
      return next;
    });
  }

  async function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url, width, height } = await uploadThumbnail.mutateAsync(file);
      setThumbnailUrl(url);
      setThumbnailRatio({ width, height });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thumbnail upload failed.");
    }
  }

  function validateTypeSpecific(price: number): string | null {
    if (DELIVERABLE_TYPES.includes(projectType)) {
      if (!deliverable.external_url.trim() && !deliverable.file_path) {
        return "Add a link or upload a file — at least one is required.";
      }
      if (price > 0 && !deliverable.file_path && !deliverable.external_url.trim()) {
        return "Paid projects need something to unlock — a link or a file.";
      }
    }
    if (projectType === "event") {
      if (!eventFields.location_value.trim()) {
        return eventFields.location_type === "physical" ? "Add the event address." : "Add the join link.";
      }
    }
    if (projectType === "meeting") {
      if (!meetingFields.scheduled_at) {
        return "Set when this meeting happens.";
      }
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const price = parseFloat(priceUsd) || 0;

    const typeError = validateTypeSpecific(price);
    if (typeError) {
      setError(typeError);
      return;
    }

    let promoPrice: number | null = null;
    if (showPromo && promoPriceUsd.trim() !== "") {
      promoPrice = parseFloat(promoPriceUsd);
      if (Number.isNaN(promoPrice) || promoPrice < 0) {
        setError("Promo price must be a valid amount.");
        return;
      }
      if (promoPrice >= price) {
        setError("Promo price must be lower than the actual price.");
        return;
      }
    }

    try {
      await createProject.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        project_type: projectType,
        // Deliverable types only — Event/Meeting/Room/Course don't use these.
        external_url: DELIVERABLE_TYPES.includes(projectType)
          ? deliverable.external_url.trim() || undefined
          : undefined,
        file_path: DELIVERABLE_TYPES.includes(projectType) ? deliverable.file_path ?? undefined : undefined,
        thumbnail_url: thumbnailUrl ?? undefined,
        thumbnail_width: thumbnailRatio?.width,
        thumbnail_height: thumbnailRatio?.height,
        price_usd: price,
        promo_price_usd: promoPrice,
        // Course always starts as a draft, no matter what — it can't
        // be purchased until the host publishes it from the builder.
        status: projectType === "course" ? "draft" : undefined,
        topic_ids: Array.from(topicIds),
        event_details:
          projectType === "event"
            ? {
                event_date: eventFields.event_date || undefined,
                location_type: eventFields.location_type,
                location_value: eventFields.location_value.trim(),
                ticket_template_url: eventFields.ticket_template_url || undefined,
              }
            : undefined,
        meeting_details:
          projectType === "meeting" ? { scheduled_at: meetingFields.scheduled_at } : undefined,
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create project.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">New project</h2>

        <form onSubmit={handleSubmit}>
          {/* Thumbnail — aspect ratio matches whatever was actually
              uploaded, not a hardcoded 16:9. Falls back to 16:9 only
              as the empty-state placeholder before anything is chosen. */}
          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            style={{
              aspectRatio: thumbnailRatio
                ? `${thumbnailRatio.width} / ${thumbnailRatio.height}`
                : "16 / 9",
            }}
            className="w-full bg-surface border border-border rounded-xl flex items-center justify-center mb-4 overflow-hidden"
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-ink-muted flex flex-col items-center gap-1">
                <ImageIcon size={24} />
                <span className="text-sm">
                  {uploadThumbnail.isPending ? "Uploading…" : "Add thumbnail"}
                </span>
              </div>
            )}
          </button>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleThumbnailSelect}
            className="hidden"
          />

          <FormField
            id="title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Project type drives everything below it — this is the
              one field that changes what the rest of the form shows. */}
          <div className="mb-1.5">
            <label htmlFor="project_type" className="block text-sm font-medium text-ink-muted mb-1.5">
              Project type
            </label>
            <select
              id="project_type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as ProjectType)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            >
              {PROJECT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {PROJECT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-ink-muted mb-4">{PROJECT_TYPE_HINTS[projectType]}</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Description</label>
            <FormatToolbar
              textareaRef={descriptionRef}
              value={description}
              onChange={setDescription}
              className="mb-1.5"
            />
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={CONTENT_LIMIT}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink resize-none
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <p className={`text-xs mt-1.5 text-right ${contentCounterClass(description.length)}`}>
              {description.length}/{CONTENT_LIMIT}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              Topics <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <TopicPicker selected={topicIds} onToggle={toggleTopic} />
            <p className="text-xs text-ink-muted mt-1.5">
              Helps people browsing find this project, and powers "similar projects" for it.
            </p>
          </div>

          {/* ---- Type-specific block ---- */}
          {DELIVERABLE_TYPES.includes(projectType) && (
            <DeliverableFields
              kind={projectType as "audio" | "video" | "file"}
              value={deliverable}
              onChange={setDeliverable}
              onError={setError}
            />
          )}
          {projectType === "event" && <EventFields value={eventFields} onChange={setEventFields} />}
          {projectType === "meeting" && <MeetingFields value={meetingFields} onChange={setMeetingFields} />}
          {projectType === "room" && <RoomFields />}
          {projectType === "course" && <CourseFields />}
          {/* ---- end type-specific block ---- */}

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Price (USD)</label>
            <input
              type="number"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              min={0}
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <p className="text-xs text-ink-muted mt-1">Set to 0 for a free project.</p>
          </div>

          {/* Promo price — optional. Leaving it off shows only the
              main price with no strikethrough, exactly as before. */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-ink-muted mb-2">
              <input
                type="checkbox"
                checked={showPromo}
                onChange={(e) => {
                  setShowPromo(e.target.checked);
                  if (!e.target.checked) setPromoPriceUsd("");
                }}
                className="rounded border-border"
              />
              Add a promo price
            </label>

            {showPromo && (
              <>
                <input
                  type="number"
                  value={promoPriceUsd}
                  onChange={(e) => setPromoPriceUsd(e.target.value)}
                  min={0}
                  step="0.01"
                  placeholder="Promo price"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                    focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
                <p className="text-xs text-ink-muted mt-1">
                  Shown next to the actual price, which will appear crossed out. Must be lower than the actual price.
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={createProject.isPending}>
            {projectType === "course" ? "Create draft" : "Publish project"}
          </Button>
        </form>
      </div>
    </div>
  );
}
