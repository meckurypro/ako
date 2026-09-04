// src/pages/EditProject.tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon } from "lucide-react";
import {
  useProject,
  useProjectTopics,
  useUpdateProject,
  PROJECT_TYPE_LABELS,
  type ProjectStatus,
} from "../hooks/useProjects";
import { useEventDetails, useMeetingDetails, useMediaDetails } from "../hooks/useProjectTypeDetails";
import { supabase } from "../lib/supabase";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { PrivacyToggle } from "../components/PrivacyToggle";
import { TopicPicker, MAX_TOPICS } from "../components/TopicPicker";
import { FormatToolbar } from "../components/FormatToolbar";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";
import { EventFields, EMPTY_EVENT_FIELDS, type EventFieldsValue } from "../components/project-types/EventFields";
import { MeetingFields, EMPTY_MEETING_FIELDS, type MeetingFieldsValue } from "../components/project-types/MeetingFields";
import { FileFields, EMPTY_FILE_FIELDS, type FileFieldsValue } from "../components/project-types/FileFields";
import { UrlFields, EMPTY_URL_FIELDS, type UrlFieldsValue } from "../components/project-types/UrlFields";
import {
  MediaFields,
  EMPTY_MEDIA_FIELDS,
  mediaFieldsAreValid,
  type MediaFieldsValue,
} from "../components/project-types/MediaFields";

// 'cancelled' is deliberately not offered here — it only happens
// through the (not-yet-built) Event/Meeting cancellation flow, which
// also handles the host's per-cancellation refund choice. Exposing
// it as a plain status radio here would skip that entirely.
const STATUS_OPTIONS: { value: ProjectStatus; label: string; hint: string }[] = [
  { value: "active", label: "Published", hint: "Visible to everyone" },
  { value: "draft", label: "Draft", hint: "Only visible to you, not published yet" },
  { value: "archived", label: "Archived", hint: "Hidden — was published before" },
];

export function EditProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useProject(projectId);
  const { data: existingTopicIds } = useProjectTopics(projectId);
  const { data: existingEventDetails } = useEventDetails(project?.project_type === "event" ? projectId : undefined);
  const { data: existingMeetingDetails } = useMeetingDetails(
    project?.project_type === "meeting" ? projectId : undefined
  );
  const { data: existingMediaDetails } = useMediaDetails(
    project?.project_type === "media" ? projectId : undefined
  );
  const updateProject = useUpdateProject();
  const uploadThumbnail = useUploadProjectThumbnail();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [topicIds, setTopicIds] = useState<Set<string>>(new Set());
  const [priceUsd, setPriceUsd] = useState("0");
  const [showPromo, setShowPromo] = useState(false);
  const [promoPriceUsd, setPromoPriceUsd] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [isPrivate, setIsPrivate] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailRatio, setThumbnailRatio] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [topicsHydrated, setTopicsHydrated] = useState(false);

  const [fileFields, setFileFields] = useState<FileFieldsValue>(EMPTY_FILE_FIELDS);
  const [urlFields, setUrlFields] = useState<UrlFieldsValue>(EMPTY_URL_FIELDS);
  const [mediaFields, setMediaFields] = useState<MediaFieldsValue>(EMPTY_MEDIA_FIELDS);
  const [eventFields, setEventFields] = useState<EventFieldsValue>(EMPTY_EVENT_FIELDS);
  const [meetingFields, setMeetingFields] = useState<MeetingFieldsValue>(EMPTY_MEETING_FIELDS);
  const [typeDetailsHydrated, setTypeDetailsHydrated] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  function toggleTopic(interestId: string) {
    setTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) next.delete(interestId);
      else {
        // TopicPicker already disables the pill past the cap — this is
        // a second guard at the state layer so the two never drift.
        if (next.size >= MAX_TOPICS) return prev;
        next.add(interestId);
      }
      return next;
    });
  }

  useEffect(() => {
    if (existingTopicIds && !topicsHydrated) {
      setTopicIds(new Set(existingTopicIds));
      setTopicsHydrated(true);
    }
  }, [existingTopicIds, topicsHydrated]);

  useEffect(() => {
    if (project && !hydrated) {
      setTitle(project.title);
      setDescription(project.description ?? "");
      setPriceUsd(String(project.price_usd));
      setStatus(project.status === "cancelled" ? "archived" : project.status);
      setIsPrivate(project.is_private);
      setThumbnailUrl(project.thumbnail_url);
      if (project.thumbnail_width && project.thumbnail_height) {
        setThumbnailRatio({ width: project.thumbnail_width, height: project.thumbnail_height });
      }
      if (project.project_type === "file") {
        setFileFields({ file_path: project.file_path, file_name: null });
      }
      if (project.project_type === "url") {
        setUrlFields({ url: project.external_url ?? "" });
      }
      if (project.promo_price_usd !== null) {
        setShowPromo(true);
        setPromoPriceUsd(String(project.promo_price_usd));
      }
      setHydrated(true);
    }
  }, [project, hydrated]);

  // Type-detail hydration waits on its own query (undefined until the
  // relevant useEventDetails/useMeetingDetails/useMediaDetails call
  // resolves), guarded separately so it doesn't block the rest of the
  // form's hydration.
  useEffect(() => {
    if (!project || typeDetailsHydrated) return;
    if (project.project_type === "event" && existingEventDetails) {
      setEventFields({
        event_date: existingEventDetails.event_date?.slice(0, 16) ?? "",
        location_type: existingEventDetails.location_type,
        location_value: existingEventDetails.location_value,
        ticket_template_url: existingEventDetails.ticket_template_url ?? "",
      });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "meeting" && existingMeetingDetails) {
      setMeetingFields({ scheduled_at: existingMeetingDetails.scheduled_at.slice(0, 16) });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "media" && existingMediaDetails) {
      setMediaFields({
        audio: {
          enabled: existingMediaDetails.has_audio,
          source: existingMediaDetails.audio_source ?? "link",
          url: existingMediaDetails.audio_url ?? "",
          file_path: existingMediaDetails.audio_file_path,
          file_name: null,
        },
        video: {
          enabled: existingMediaDetails.has_video,
          source: existingMediaDetails.video_source ?? "link",
          url: existingMediaDetails.video_url ?? "",
          file_path: existingMediaDetails.video_file_path,
          file_name: null,
        },
      });
      setTypeDetailsHydrated(true);
    } else if (!["event", "meeting", "media"].includes(project.project_type)) {
      setTypeDetailsHydrated(true);
    }
  }, [project, existingEventDetails, existingMeetingDetails, existingMediaDetails, typeDetailsHydrated]);

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

  function validateTypeSpecific(): string | null {
    if (!project) return null;
    if (project.project_type === "file" && !fileFields.file_path) {
      return "Upload a file to continue.";
    }
    if (project.project_type === "url" && !urlFields.url.trim()) {
      return "Add the link you're sharing access to.";
    }
    if (project.project_type === "media" && !mediaFieldsAreValid(mediaFields)) {
      if (!mediaFields.audio.enabled && !mediaFields.video.enabled) {
        return "Turn on Audio, Video, or both.";
      }
      return "Add a link or upload a file for each channel you turned on.";
    }
    if (project.project_type === "event" && !eventFields.location_value.trim()) {
      return eventFields.location_type === "physical" ? "Add the event address." : "Add the join link.";
    }
    if (project.project_type === "meeting" && !meetingFields.scheduled_at) {
      return "Set when this meeting happens.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId || !project) return;

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const price = parseFloat(priceUsd) || 0;

    const typeError = validateTypeSpecific();
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
      await updateProject.mutateAsync({
        id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        project_type: project.project_type, // fixed — see note near the type display below
        external_url: project.project_type === "url" ? urlFields.url.trim() || null : project.external_url,
        file_path: project.project_type === "file" ? fileFields.file_path : project.file_path,
        thumbnail_url: thumbnailUrl,
        thumbnail_width: thumbnailRatio?.width ?? null,
        thumbnail_height: thumbnailRatio?.height ?? null,
        price_usd: price,
        promo_price_usd: promoPrice,
        status,
        is_private: isPrivate,
        topic_ids: Array.from(topicIds),
      });

      if (project.project_type === "event") {
        const { error: detailsError } = await supabase
          .from("project_event_details")
          .update({
            event_date: eventFields.event_date || null,
            location_type: eventFields.location_type,
            location_value: eventFields.location_value.trim(),
            ticket_template_url: eventFields.ticket_template_url || null,
          })
          .eq("project_id", projectId);
        if (detailsError) throw detailsError;
      }
      if (project.project_type === "meeting") {
        const { error: detailsError } = await supabase
          .from("project_meeting_details")
          .update({ scheduled_at: meetingFields.scheduled_at })
          .eq("project_id", projectId);
        if (detailsError) throw detailsError;
      }
      if (project.project_type === "media") {
        // Upsert, not update: a project created before this row
        // existed (migrated from the old audio/video types) already
        // has one from the migration script, but upsert covers both
        // that case and any future edge case cleanly either way.
        const { error: detailsError } = await supabase.from("project_media_details").upsert({
          project_id: projectId,
          has_audio: mediaFields.audio.enabled,
          has_video: mediaFields.video.enabled,
          audio_source: mediaFields.audio.enabled ? mediaFields.audio.source : null,
          audio_url:
            mediaFields.audio.enabled && mediaFields.audio.source === "link"
              ? mediaFields.audio.url.trim()
              : null,
          audio_file_path:
            mediaFields.audio.enabled && mediaFields.audio.source === "upload"
              ? mediaFields.audio.file_path
              : null,
          video_source: mediaFields.video.enabled ? mediaFields.video.source : null,
          video_url:
            mediaFields.video.enabled && mediaFields.video.source === "link"
              ? mediaFields.video.url.trim()
              : null,
          video_file_path:
            mediaFields.video.enabled && mediaFields.video.source === "upload"
              ? mediaFields.video.file_path
              : null,
        });
        if (detailsError) throw detailsError;
      }

      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    }
  }

  if (isLoading || !project || !typeDetailsHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">Edit project</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Status</label>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer ${
                    status === opt.value ? "border-accent bg-accent-soft" : "border-border bg-canvas"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={() => setStatus(opt.value)}
                    className="accent-current"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{opt.label}</span>
                    <span className="block text-xs text-ink-muted">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            style={{
              aspectRatio: thumbnailRatio ? `${thumbnailRatio.width} / ${thumbnailRatio.height}` : "16 / 9",
            }}
            className="w-full bg-surface border border-border rounded-xl flex items-center justify-center mb-4 overflow-hidden"
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-ink-muted flex flex-col items-center gap-1">
                <ImageIcon size={24} />
                <span className="text-sm">{uploadThumbnail.isPending ? "Uploading…" : "Add thumbnail"}</span>
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

          <FormField id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

          {/* Project type is fixed after creation — Event/Meeting/Media
              have their own detail tables, and Room/Course have member
              rosters and content tied to that type. Changing it here
              would orphan that data, so it's shown, not editable. */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Project type</label>
            <p className="px-4 py-3 rounded-xl border border-border bg-surface text-ink-muted text-sm">
              {PROJECT_TYPE_LABELS[project.project_type]} — can't be changed after creation
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Description</label>
            <FormatToolbar textareaRef={descriptionRef} value={description} onChange={setDescription} className="mb-1.5" />
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
          </div>

          {/* ---- Type-specific block ---- */}
          {project.project_type === "media" && (
            <MediaFields value={mediaFields} onChange={setMediaFields} onError={setError} />
          )}
          {project.project_type === "file" && (
            <FileFields value={fileFields} onChange={setFileFields} onError={setError} />
          )}
          {project.project_type === "url" && <UrlFields value={urlFields} onChange={setUrlFields} />}
          {project.project_type === "event" && <EventFields value={eventFields} onChange={setEventFields} />}
          {project.project_type === "meeting" && (
            <MeetingFields value={meetingFields} onChange={setMeetingFields} />
          )}
          {project.project_type === "room" && (
            <p className="text-xs text-ink-muted mb-4">
              Manage announcements, meetings, and assignments from the room itself.
            </p>
          )}
          {project.project_type === "course" && (
            <p className="text-xs text-ink-muted mb-4">
              Manage modules and lessons from the course builder.
            </p>
          )}
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

          <PrivacyToggle checked={isPrivate} onChange={setIsPrivate} />

          {error && (
            <p className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={updateProject.isPending}>
            Save changes
          </Button>
        </form>
      </div>
    </div>
  );
}
