// src/pages/CreateProject.tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { Avatar } from "../components/Avatar";
import {
  useCreateProject,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_HINTS,
  useActiveProjectTypes,
  useProjectTypeAccessRules,
  useMyEligibilityStats,
  useMyProjectTypeExemption,
  getProjectTypeEligibility,
  getVisibleProjectTypes,
  type ProjectType,
} from "../hooks/useProjects";
import { useActiveIdentity } from "../hooks/usePages";
import { useMyProfile } from "../hooks/useProfile";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { PrivacyToggle } from "../components/PrivacyToggle";
import { TopicPicker, MAX_TOPICS } from "../components/TopicPicker";
import { FormatToolbar } from "../components/FormatToolbar";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";
import { EventFields, EMPTY_EVENT_FIELDS, type EventFieldsValue } from "../components/project-types/EventFields";
import { MeetingFields, EMPTY_MEETING_FIELDS, type MeetingFieldsValue } from "../components/project-types/MeetingFields";
import { RoomFields } from "../components/project-types/RoomFields";
import { CourseFields } from "../components/project-types/CourseFields";
import { FileFields, EMPTY_FILE_FIELDS, type FileFieldsValue } from "../components/project-types/FileFields";
import { UrlFields, EMPTY_URL_FIELDS, type UrlFieldsValue } from "../components/project-types/UrlFields";
import {
  MediaFields,
  EMPTY_MEDIA_FIELDS,
  mediaFieldsAreValid,
  type MediaFieldsValue,
} from "../components/project-types/MediaFields";
import { GigFields, EMPTY_GIG_FIELDS, type GigFieldsValue } from "../components/project-types/GigFields";

export function CreateProject() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailRatio, setThumbnailRatio] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: identity } = useActiveIdentity();
  const { data: me } = useMyProfile();
  // Same reasoning as Compose.tsx: read once at mount, not editable
  // from here — switch mode first via /pages, then create, so there's
  // no chance of a type picked for one identity ending up attributed
  // to the other mid-draft.
  const postingAsPage = identity?.mode === "page" ? identity.page : null;

  // Admin can switch a type off entirely (project_type_settings), and
  // separately choose whether a type a user doesn't qualify for
  // (project_type_access_rules) disappears from the list or stays
  // visible-but-locked — see getVisibleProjectTypes.
  const { data: typeSettings } = useActiveProjectTypes();
  const { data: accessRules } = useProjectTypeAccessRules();
  const { data: myStats } = useMyEligibilityStats();
  const { data: isExempt } = useMyProjectTypeExemption();

  const allowedTypes = getVisibleProjectTypes(
    postingAsPage ? "page" : "personal",
    typeSettings,
    accessRules,
    myStats,
    isExempt
  );

  const eligibility = getProjectTypeEligibility(projectType, accessRules, myStats, isExempt);

  // The type picker only ever shows allowedTypes (below), but the
  // initial "file" default is personal-only — if identity resolves to
  // page mode after that default was set, or a type gets switched off
  // mid-session, correct it to the first type that's actually valid
  // rather than leaving an invalid selection sitting in a hidden
  // option.
  useEffect(() => {
    if (allowedTypes.length > 0 && !allowedTypes.includes(projectType)) {
      setProjectType(allowedTypes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postingAsPage?.id, typeSettings, accessRules, myStats, isExempt]);

  // Type-specific state — only the block matching projectType is
  // read/validated/sent; switching types keeps the others' state
  // around harmlessly rather than resetting it, in case the host
  // switches back.
  const [fileFields, setFileFields] = useState<FileFieldsValue>(EMPTY_FILE_FIELDS);
  const [urlFields, setUrlFields] = useState<UrlFieldsValue>(EMPTY_URL_FIELDS);
  const [mediaFields, setMediaFields] = useState<MediaFieldsValue>(EMPTY_MEDIA_FIELDS);
  const [eventFields, setEventFields] = useState<EventFieldsValue>(EMPTY_EVENT_FIELDS);
  const [meetingFields, setMeetingFields] = useState<MeetingFieldsValue>(EMPTY_MEETING_FIELDS);
  const [gigFields, setGigFields] = useState<GigFieldsValue>(EMPTY_GIG_FIELDS);

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

  function validateTypeSpecific(): string | null {
    if (projectType === "file" && !fileFields.file_path) {
      return "Upload a file to continue.";
    }
    if (projectType === "url" && !urlFields.url.trim()) {
      return "Add the link you're sharing access to.";
    }
    if (projectType === "media" && !mediaFieldsAreValid(mediaFields)) {
      if (!mediaFields.audio.enabled && !mediaFields.video.enabled && !mediaFields.image.enabled) {
        return "Turn on Audio, Video, Image, or any combination.";
      }
      return "Add a link or upload a file for each channel you turned on.";
    }
    if (projectType === "event" && !eventFields.location_value.trim()) {
      return eventFields.location_type === "physical" ? "Add the event address." : "Add the join link.";
    }
    if (projectType === "meeting" && !meetingFields.scheduled_at) {
      return "Set when this meeting happens.";
    }
    if (projectType === "gig" && !gigFields.tagline.trim()) {
      return "Add a short tagline for this gig.";
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

    const typeError = validateTypeSpecific();
    if (typeError) {
      setError(typeError);
      return;
    }

    // Client-side gate for a clean error message — the server enforces
    // the same rule regardless (enforce_project_type_rules trigger),
    // so this is UX, not the real security boundary.
    if (eligibility && !eligibility.eligible) {
      setError(eligibility.reasons[0]);
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
        posted_as_page_id: postingAsPage?.id,
        // File stores only an uploaded file, URL stores only a link —
        // Media doesn't use either base column at all, it lives
        // entirely in media_details below.
        external_url: projectType === "url" ? urlFields.url.trim() : undefined,
        file_path: projectType === "file" ? fileFields.file_path ?? undefined : undefined,
        thumbnail_url: thumbnailUrl ?? undefined,
        thumbnail_width: thumbnailRatio?.width,
        thumbnail_height: thumbnailRatio?.height,
        price_usd: price,
        promo_price_usd: promoPrice,
        is_private: isPrivate,
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
          projectType === "meeting"
            ? { scheduled_at: meetingFields.scheduled_at, recording_enabled: meetingFields.recording_enabled }
            : undefined,
        // Audio/video: upload and link are independent now — a channel
        // can carry either, or both, so both fields are sent whenever
        // they're filled rather than picking one via a "source". Image
        // never gets a link (see MediaFields' allowLink) — image_source
        // is still sent as "upload" for backward compatibility with the
        // column, but image_url never is.
        media_details:
          projectType === "media"
            ? {
                has_audio: mediaFields.audio.enabled,
                has_video: mediaFields.video.enabled,
                has_image: mediaFields.image.enabled,
                audio_source: mediaFields.audio.enabled
                  ? mediaFields.audio.file_path
                    ? "upload"
                    : "link"
                  : undefined,
                audio_url: mediaFields.audio.enabled ? mediaFields.audio.url.trim() || undefined : undefined,
                audio_file_path: mediaFields.audio.enabled ? mediaFields.audio.file_path ?? undefined : undefined,
                video_source: mediaFields.video.enabled
                  ? mediaFields.video.file_path
                    ? "upload"
                    : "link"
                  : undefined,
                video_url: mediaFields.video.enabled ? mediaFields.video.url.trim() || undefined : undefined,
                video_file_path: mediaFields.video.enabled ? mediaFields.video.file_path ?? undefined : undefined,
                image_source: mediaFields.image.enabled ? "upload" : undefined,
                image_file_path: mediaFields.image.enabled ? mediaFields.image.file_path ?? undefined : undefined,
              }
            : undefined,
        gig_details:
          projectType === "gig"
            ? {
                tagline: gigFields.tagline.trim(),
                delivery_estimate: gigFields.delivery_estimate.trim() || undefined,
                sample_project_ids: gigFields.sample_project_ids,
                revisions_included: gigFields.revisions_included.trim()
                  ? parseInt(gigFields.revisions_included.trim(), 10)
                  : undefined,
                deliverables:
                  gigFields.deliverables.map((d) => d.trim()).filter(Boolean).length > 0
                    ? gigFields.deliverables.map((d) => d.trim()).filter(Boolean)
                    : undefined,
                faq:
                  gigFields.faq
                    .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
                    .filter((f) => f.question && f.answer).length > 0
                    ? gigFields.faq
                        .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
                        .filter((f) => f.question && f.answer)
                    : undefined,
              }
            : undefined,
      });
      if (postingAsPage) {
        navigate(`/page/${postingAsPage.username}`);
      } else {
        navigate(-1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create project.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4">
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

          {/* Who this project is attributed to — same fixed-at-open,
              switch-mode-first pattern as Compose.tsx. Also the reason
              the type picker below only shows a subset of types: some
              only make sense for one identity or the other. */}
          <div className="flex items-center gap-2 mb-4">
            <Avatar
              src={postingAsPage ? postingAsPage.avatar_url : me?.avatar_url}
              name={postingAsPage ? postingAsPage.name : me?.display_name ?? "You"}
              size="sm"
            />
            <p className="text-sm text-ink-muted">
              Posting as{" "}
              <span className="text-ink font-medium">
                {postingAsPage ? postingAsPage.name : me?.display_name}
              </span>
              {!postingAsPage && (
                <>
                  {" "}
                  · <Link to="/pages" className="text-accent">switch</Link>
                </>
              )}
            </p>
          </div>

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
              {allowedTypes.map((type) => (
                <option key={type} value={type}>
                  {PROJECT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            {PROJECT_TYPE_HINTS[projectType]}
            {postingAsPage
              ? " Event, Room, and Course are page-only — that's why some types you might expect aren't listed here."
              : " Gig, Meeting, Media, and File are personal-only — switch to a page to create an Event, Room, or Course."}
          </p>

          {eligibility && !eligibility.eligible && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30">
              <p className="text-sm font-medium text-danger mb-1">
                You don't meet the requirements for {PROJECT_TYPE_LABELS[projectType]} yet:
              </p>
              <ul className="text-xs text-danger space-y-0.5 list-disc list-inside">
                {eligibility.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

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

          <TopicPicker selected={topicIds} onToggle={toggleTopic} />

          {/* ---- Type-specific block ---- */}
          {projectType === "media" && (
            <MediaFields value={mediaFields} onChange={setMediaFields} onError={setError} />
          )}
          {projectType === "file" && (
            <FileFields value={fileFields} onChange={setFileFields} onError={setError} />
          )}
          {projectType === "url" && <UrlFields value={urlFields} onChange={setUrlFields} />}
          {projectType === "event" && <EventFields value={eventFields} onChange={setEventFields} />}
          {projectType === "meeting" && <MeetingFields value={meetingFields} onChange={setMeetingFields} />}
          {projectType === "room" && <RoomFields />}
          {projectType === "course" && <CourseFields />}
          {projectType === "gig" && <GigFields value={gigFields} onChange={setGigFields} />}
          {/* ---- end type-specific block ---- */}

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              {projectType === "gig" ? "Booking fee (USD, optional)" : "Price (USD)"}
            </label>
            <input
              type="number"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              min={0}
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <p className="text-xs text-ink-muted mt-1">
              {projectType === "gig"
                ? "Set to 0 to keep this message-only — people reach out, no payment upfront. Add an amount to also let people pay a booking fee to secure a slot."
                : "Set to 0 for a free project."}
            </p>
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

          <PrivacyToggle checked={isPrivate} onChange={setIsPrivate} />

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
