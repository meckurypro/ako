// src/pages/CreateProject.tsx
import { FileFolderHero } from "../components/FileFolderArt";
import { BOOK_COVER_RATIO, isBookCoverRatio, BOOK_COVER_ERROR } from "../lib/bookCover";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { extractBookPdf } from "../hooks/useBookBuilder";
import { ArrowLeft, Banknote, Eye, EyeOff, ImageIcon, Type } from "lucide-react";
import { Avatar } from "../components/Avatar";
import {
  FormFooter,
  FormSection,
  PricingFields,
  PROJECT_TYPE_ICONS,
  ProjectTypeChips,
  ThumbnailPicker,
  ToggleRow,
} from "../components/ProjectFormParts";
import {
  isTypeAllowedForKind,
  useBypassesCreatorRules,
  useCreatorRules,
  useMyCreatorKind,
} from "../hooks/useCreatorKinds";
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
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { useActiveIdentity, useActivePagePermissions } from "../hooks/usePages";
import { PageActionBlocked } from "../components/PageActionBlocked";
import { useMyProfile } from "../hooks/useProfile";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { FormField } from "../components/FormField";
import { SongTalentField, NEW_ARTIST_TALENT } from "../components/SongTalentField";
import { useEnsureArtistTalent } from "../hooks/usePortfolio";
import { Button } from "../components/Button";
import { TopicPicker, MAX_TOPICS } from "../components/TopicPicker";
import { FormatToolbar } from "../components/FormatToolbar";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";
import { EventFields, EMPTY_EVENT_FIELDS, type EventFieldsValue } from "../components/project-types/EventFields";
import { MeetingFields, EMPTY_MEETING_FIELDS, type MeetingFieldsValue } from "../components/project-types/MeetingFields";
import { RoomFields, EMPTY_ROOM_FIELDS, type RoomFieldsValue } from "../components/project-types/RoomFields";
import { CourseFields } from "../components/project-types/CourseFields";
import {
  FileFields,
  EMPTY_FILE_FIELDS,
  fileFieldsError,
  fileFieldsToInputs,
  type FileFieldsValue,
} from "../components/project-types/FileFields";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { maxProjectFiles } from "../lib/fileProject";
import { UrlFields, EMPTY_URL_FIELDS, type UrlFieldsValue } from "../components/project-types/UrlFields";
import {
  MediaFields,
  EMPTY_MEDIA_FIELDS,
  mediaFieldsAreValid,
  type MediaFieldsValue,
} from "../components/project-types/MediaFields";
import { TalentFields, EMPTY_TALENT_FIELDS, type TalentFieldsValue } from "../components/project-types/TalentFields";
import { PitchFields, EMPTY_PITCH_FIELDS, type PitchFieldsValue } from "../components/project-types/PitchFields";
import { BookFields, EMPTY_BOOK_FIELDS, type BookFieldsValue } from "../components/project-types/BookFields";
import { useCreatePitchProject } from "../hooks/useProjects";
import { useToast } from "../components/Toast";
import { useLeaveGuard } from "../hooks/useLeaveGuard";
import { SaveProgressDialog } from "../components/SaveProgressDialog";
import { ProfilePagesModal } from "../components/ProfilePagesModal";
import {
  clearProjectDraft,
  projectDraftHasProgress,
  projectDraftKey,
  projectDraftSignature,
  readProjectDraft,
  writeProjectDraft,
  type ProjectDraftData,
} from "../lib/projectDraft";
import { friendlyError } from "../lib/friendlyError";

export function CreateProject() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const toast = useToast();
  const createProject = useCreateProject();
  // Pitch is created through its own RPC-backed hook, not the shared
  // createProject mutation — a Pitch is really two projects (the
  // pitch + its auto-provisioned update Room) created atomically
  // server-side, not a single-row insert with a details row bolted
  // on. See create_pitch_project in ako_projects_v8_pitch.sql.
  const createPitchProject = useCreatePitchProject();
  const uploadThumbnail = useUploadProjectThumbnail();
  const projectsEnabled = useFeatureFlag("projects_enabled");

  const [pagesOpen, setPagesOpen] = useState(false);
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
  const [supportingImageUrls, setSupportingImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: identity } = useActiveIdentity();
  const { data: me } = useMyProfile();
  // One file for most accounts; up to six for verified, unrestricted ones (the database enforces it too).
  const restricted = useIsRestricted();
  const maxFiles = maxProjectFiles(!!me?.is_verified && !restricted);
  // Same reasoning as Compose.tsx: read once at mount, not editable
  // from here — switch mode first via /pages, then create, so there's
  // no chance of a type picked for one identity ending up attributed
  // to the other mid-draft.
  const postingAsPage = identity?.mode === "page" ? identity.page : null;
  const pagePerms = useActivePagePermissions();

  // Admin can switch a type off entirely (project_type_settings), and
  // separately choose whether a type a user doesn't qualify for
  // (project_type_access_rules) disappears from the list or stays
  // visible-but-locked — see getVisibleProjectTypes.
  const { data: typeSettings } = useActiveProjectTypes();
  const { data: accessRules } = useProjectTypeAccessRules();
  const { data: myStats } = useMyEligibilityStats();
  const { data: isExempt } = useMyProjectTypeExemption();

  // Admin account-kind matrix: restricted / unrestricted / page type.
  const creatorKind = useMyCreatorKind();
  const { data: creatorRules } = useCreatorRules();
  const bypassesCreatorRules = useBypassesCreatorRules();

  const allowedTypes = getVisibleProjectTypes(
    postingAsPage ? "page" : "personal",
    typeSettings,
    accessRules,
    myStats,
    isExempt,
    (type) => bypassesCreatorRules || isTypeAllowedForKind(creatorRules, type, creatorKind)
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
  }, [postingAsPage?.id, typeSettings, accessRules, myStats, isExempt, creatorRules, creatorKind]);

  // Type-specific state — only the block matching projectType is
  // read/validated/sent; switching types keeps the others' state
  // around harmlessly rather than resetting it, in case the host
  // switches back.
  const [fileFields, setFileFields] = useState<FileFieldsValue>(EMPTY_FILE_FIELDS);
  const [urlFields, setUrlFields] = useState<UrlFieldsValue>(EMPTY_URL_FIELDS);
  const [mediaFields, setMediaFields] = useState<MediaFieldsValue>(EMPTY_MEDIA_FIELDS);
  const [mediaUploading, setMediaUploading] = useState(false);
  // A song lives under an artist talent: a talent id, or NEW_ARTIST_TALENT to scaffold one on save. "" until the picker settles.
  const [songTalent, setSongTalent] = useState("");
  const ensureArtistTalent = useEnsureArtistTalent();
  const [eventFields, setEventFields] = useState<EventFieldsValue>(EMPTY_EVENT_FIELDS);
  const [meetingFields, setMeetingFields] = useState<MeetingFieldsValue>(EMPTY_MEETING_FIELDS);
  const [talentFields, setTalentFields] = useState<TalentFieldsValue>(EMPTY_TALENT_FIELDS);
  const [pitchFields, setPitchFields] = useState<PitchFieldsValue>(EMPTY_PITCH_FIELDS);
  const [roomFields, setRoomFields] = useState<RoomFieldsValue>(EMPTY_ROOM_FIELDS);
  const [bookFields, setBookFields] = useState<BookFieldsValue>(EMPTY_BOOK_FIELDS);

  // A book credited to someone else can never be sold — mirrors the
  // server-side trigger (trg_enforce_book_no_monetization), kept in
  // sync here so the price field itself reflects it rather than
  // letting the host set a price that will just fail to save.
  useEffect(() => {
    if (projectType === "book" && !bookFields.is_own_work && priceUsd !== "0") {
      setPriceUsd("0");
      setShowPromo(false);
      setPromoPriceUsd("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectType, bookFields.is_own_work]);

  // ---- Unsaved progress ---------------------------------------------------------------------------------
  // Leaving this form with something filled in asks "save as a draft / discard?" (see useLeaveGuard). The draft is
  // kept on this device — see lib/projectDraft.ts for why it isn't a `draft` row in `projects` — and is put back
  // the next time New project opens. One draft per account per acting identity (personal / each Page).
  const draftKey = me?.id && identity !== undefined ? projectDraftKey(me.id, postingAsPage?.id) : null;
  const restoredRef = useRef(false);
  // The form as last restored from a draft; leaving with the form still identical to it isn't "unsaved".
  const baselineRef = useRef<string | null>(null);
  const [restoredDraftNotice, setRestoredDraftNotice] = useState(false);

  function collectDraft(): ProjectDraftData {
    return {
      title,
      description,
      projectType,
      topicIds: Array.from(topicIds),
      priceUsd,
      showPromo,
      promoPriceUsd,
      isPrivate,
      thumbnailUrl,
      thumbnailRatio,
      supportingImageUrls,
      fileFields,
      urlFields,
      mediaFields,
      eventFields,
      meetingFields,
      talentFields,
      pitchFields,
      roomFields,
      bookFields,
    };
  }

  function applyDraft(d: ProjectDraftData) {
    setTitle(d.title);
    setDescription(d.description);
    setProjectType(d.projectType);
    setTopicIds(new Set(d.topicIds));
    setPriceUsd(d.priceUsd);
    setShowPromo(d.showPromo);
    setPromoPriceUsd(d.promoPriceUsd);
    setIsPrivate(d.isPrivate);
    setThumbnailUrl(d.thumbnailUrl);
    setThumbnailRatio(d.thumbnailRatio);
    setSupportingImageUrls(d.supportingImageUrls);
    setFileFields(d.fileFields);
    setUrlFields(d.urlFields);
    setMediaFields(d.mediaFields);
    setEventFields(d.eventFields);
    setMeetingFields(d.meetingFields);
    setTalentFields(d.talentFields);
    setPitchFields(d.pitchFields);
    setRoomFields(d.roomFields);
    setBookFields(d.bookFields);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setProjectType(allowedTypes.length === 0 || allowedTypes.includes("file") ? "file" : allowedTypes[0]);
    setTopicIds(new Set());
    setPriceUsd("0");
    setShowPromo(false);
    setPromoPriceUsd("");
    setIsPrivate(false);
    setThumbnailUrl(null);
    setThumbnailRatio(null);
    setSupportingImageUrls([]);
    setFileFields(EMPTY_FILE_FIELDS);
    setUrlFields(EMPTY_URL_FIELDS);
    setMediaFields(EMPTY_MEDIA_FIELDS);
    setEventFields(EMPTY_EVENT_FIELDS);
    setMeetingFields(EMPTY_MEETING_FIELDS);
    setTalentFields(EMPTY_TALENT_FIELDS);
    setPitchFields(EMPTY_PITCH_FIELDS);
    setRoomFields(EMPTY_ROOM_FIELDS);
    setBookFields(EMPTY_BOOK_FIELDS);
  }

  // Put a saved draft back, once, as soon as we know whose form this is (account + acting identity).
  useEffect(() => {
    if (!draftKey || restoredRef.current) return;
    restoredRef.current = true;
    const stored = readProjectDraft(draftKey);
    if (!stored) return;
    applyDraft(stored.data);
    baselineRef.current = projectDraftSignature(stored.data);
    setRestoredDraftNotice(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const currentDraft = collectDraft();
  const hasUnsavedProgress =
    projectDraftHasProgress(currentDraft) && projectDraftSignature(currentDraft) !== baselineRef.current;
  const leaveGuard = useLeaveGuard(hasUnsavedProgress);

  function handleLeaveSave() {
    if (!draftKey || !writeProjectDraft(draftKey, collectDraft())) {
      toast("Couldn't save the draft on this device. Check your browser's storage settings.", { variant: "error" });
      leaveGuard.stay();
      return;
    }
    toast("Draft saved. It'll be here next time you create a project.", { variant: "success" });
    // Land on the Projects tab where the person's projects live, not wherever the leave click happened to go.
    leaveGuard.allowLeaving();
    if (postingAsPage) navigate(`/page/${postingAsPage.username}?tab=projects`, { replace: true });
    else if (me?.username) navigate(`/profile/${me.username}?tab=projects`, { replace: true });
    else leaveGuard.proceed();
  }

  function handleLeaveDiscard() {
    if (draftKey) clearProjectDraft(draftKey);
    leaveGuard.proceed();
  }

  function handleStartOver() {
    if (draftKey) clearProjectDraft(draftKey);
    baselineRef.current = null;
    setRestoredDraftNotice(false);
    resetForm();
  }

  // The project exists now: the saved draft has done its job, and the redirect that follows is the person
  // finishing, not leaving unsaved work behind.
  function finishedCreating() {
    if (draftKey) clearProjectDraft(draftKey);
    leaveGuard.allowLeaving();
  }

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
      const { url, width, height } = await uploadThumbnail.mutateAsync({ file, bookCover: projectType === "book" });
      setThumbnailUrl(url);
      setThumbnailRatio({ width, height });
    } catch (err) {
      setError(friendlyError(err, "Thumbnail upload failed."));
    }
  }

  function validateTypeSpecific(): string | null {
    if (projectType === "book" && thumbnailUrl && thumbnailRatio && !isBookCoverRatio(thumbnailRatio.width, thumbnailRatio.height)) {
      return BOOK_COVER_ERROR;
    }
    if (projectType === "file") {
      const fileError = fileFieldsError(fileFields);
      if (fileError) return fileError;
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
    if (projectType === "gig" && !talentFields.role_id) {
      return "Select the professional role this talent represents.";
    }
    if (projectType === "gig" && !talentFields.tagline.trim()) {
      return "Add a short tagline for this talent.";
    }
    if (projectType === "pitch") {
      const goal = parseFloat(pitchFields.goal_amount_usd);
      if (!pitchFields.goal_amount_usd.trim() || Number.isNaN(goal) || goal <= 0) {
        return "Set a fundraising goal above $0.";
      }
    }
    if (
      projectType === "room" &&
      roomFields.start_date &&
      roomFields.end_date &&
      new Date(roomFields.end_date) <= new Date(roomFields.start_date)
    ) {
      return "End date needs to be after the start date.";
    }
    // Authored books have nothing to validate here — they're created
    // as an empty draft (like Course) and built afterward in the
    // Book builder page.
    if (projectType === "book" && bookFields.content_source !== "authored") {
      if (bookFields.content_source === "link" && !bookFields.url.trim()) {
        return "Add the link to the book or article.";
      }
      if (bookFields.content_source === "upload" && !bookFields.file_path) {
        return "Upload a PDF to continue.";
      }
      if (
        bookFields.content_source === "upload" &&
        !bookFields.allow_download &&
        !bookFields.allow_read_in_app
      ) {
        return "Allow download, in-app reading, or both.";
      }
      if (!bookFields.is_own_work && !bookFields.source_credit.trim()) {
        return "Credit the original author or source.";
      }
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mediaUploading) {
      setError("Your file is still uploading — wait for it to finish, then save.");
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    // A song is never sold (the database refuses a price on one), so it always saves as free.
    const price = projectType === "media" ? 0 : parseFloat(priceUsd) || 0;

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

    if (allowedTypes.length > 0 && !allowedTypes.includes(projectType)) {
      setError("This kind of account can't create that project type.");
      return;
    }

    // Pitch never carries a price/promo — it's created through its
    // own atomic RPC (pitch + linked update Room together), so it
    // branches off here rather than falling into the shared
    // createProject call below.
    if (projectType === "pitch") {
      try {
        await createPitchProject.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          thumbnail_url: thumbnailUrl ?? undefined,
          thumbnail_width: thumbnailRatio?.width,
          thumbnail_height: thumbnailRatio?.height,
          supporting_image_urls: thumbnailUrl ? supportingImageUrls : undefined,
          is_private: isPrivate,
          posted_as_page_id: postingAsPage?.id,
          goal_amount_usd: parseFloat(pitchFields.goal_amount_usd),
          topic_ids: Array.from(topicIds),
        });
        finishedCreating();
        if (postingAsPage) {
          navigate(`/page/${postingAsPage.username}?tab=projects`);
          toast(`${title.trim()} created successfully.`, { variant: "success" });
        } else if (me?.username) {
          // Straight to the Projects tab (see useTabState's ?tab=
          // convention) — the new project is already the first card
          // there (useUserProjects orders by created_at desc for the
          // owner's own view), so no scroll/highlight logic is needed
          // to bring it "into view".
          navigate(`/profile/${me.username}?tab=projects`);
          toast(`${title.trim()} created successfully.`, { variant: "success" });
        } else {
          navigate(-1);
        }
      } catch (err) {
        setError(friendlyError(err, "Couldn't create project."));
      }
      return;
    }

    let promoPrice: number | null = null;
    if (projectType !== "media" && showPromo && promoPriceUsd.trim() !== "") {
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
      // A song needs a talent. "New talent" scaffolds the Music Artist talent first, so the song never exists without one.
      let parentTalentId: string | undefined;
      if (projectType === "media") {
        if (!songTalent) {
          setError("Pick a talent.");
          return;
        }
        parentTalentId = songTalent === NEW_ARTIST_TALENT ? await ensureArtistTalent.mutateAsync() : songTalent;
      }

      const created = await createProject.mutateAsync({
        title: title.trim(),
        parent_gig_id: parentTalentId,
        description: description.trim() || undefined,
        project_type: projectType,
        posted_as_page_id: postingAsPage?.id,
        // File stores only an uploaded file, URL stores only a link —
        // Media doesn't use either base column at all, it lives
        // entirely in media_details below.
        external_url: projectType === "url" ? urlFields.url.trim() : undefined,
        // File: the first file's path is mirrored here (older app builds read it); the full list goes in file_details.
        file_path: projectType === "file" ? fileFieldsToInputs(fileFields)[0]?.file_path : undefined,
        file_details: projectType === "file" ? { files: fileFieldsToInputs(fileFields) } : undefined,
        thumbnail_url: projectType === "file" ? undefined : thumbnailUrl ?? undefined,
        thumbnail_width: projectType === "file" ? undefined : thumbnailRatio?.width,
        thumbnail_height: projectType === "file" ? undefined : thumbnailRatio?.height,
        supporting_image_urls: projectType !== "file" && thumbnailUrl ? supportingImageUrls : undefined,
        price_usd: price,
        promo_price_usd: promoPrice,
        is_private: isPrivate,
        // Course and an authored Book both start as a draft, no
        // matter what — neither can be purchased until the host
        // publishes it from its builder. A link/upload Book is
        // complete the moment it's created, so it's left undefined
        // (falls back to the server default) just like every other
        // simple type.
        status:
          projectType === "course" || (projectType === "book" && bookFields.content_source === "authored")
            ? "draft"
            : undefined,
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
                role_id: talentFields.role_id,
                tagline: talentFields.tagline.trim(),
                delivery_estimate: talentFields.delivery_estimate.trim() || undefined,
                sample_project_ids: talentFields.sample_project_ids,
                revisions_included: talentFields.revisions_included.trim()
                  ? parseInt(talentFields.revisions_included.trim(), 10)
                  : undefined,
                deliverables:
                  talentFields.deliverables.map((d) => d.trim()).filter(Boolean).length > 0
                    ? talentFields.deliverables.map((d) => d.trim()).filter(Boolean)
                    : undefined,
                faq:
                  talentFields.faq
                    .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
                    .filter((f) => f.question && f.answer).length > 0
                    ? talentFields.faq
                        .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
                        .filter((f) => f.question && f.answer)
                    : undefined,
              }
            : undefined,
        room_details:
          projectType === "room"
            ? {
                start_date: roomFields.start_date ? new Date(roomFields.start_date).toISOString() : undefined,
                end_date: roomFields.end_date ? new Date(roomFields.end_date).toISOString() : undefined,
              }
            : undefined,
        // Always created, even for an authored book with no content
        // yet — project_book_details is metadata (type, attribution)
        // separate from the actual content, which for an authored
        // book lives entirely in book_chapters, built afterward in
        // the Book builder. The content-matches-source check on the
        // table is why external_url/file_path are both left
        // undefined for "authored" rather than the row being skipped.
        book_details:
          projectType === "book"
            ? {
                book_type: bookFields.book_type,
                content_source: bookFields.content_source,
                author_name: bookFields.author_name.trim() || undefined,
                is_own_work: bookFields.is_own_work,
                source_credit: bookFields.is_own_work ? undefined : bookFields.source_credit.trim() || undefined,
                external_url: bookFields.content_source === "link" ? bookFields.url.trim() : undefined,
                file_path: bookFields.content_source === "upload" ? bookFields.file_path ?? undefined : undefined,
                allow_download: bookFields.content_source === "upload" ? bookFields.allow_download : undefined,
                allow_read_in_app: bookFields.content_source === "upload" ? bookFields.allow_read_in_app : undefined,
              }
            : undefined,
      });
      finishedCreating();
      // An uploaded PDF book: extract its text into chapters in the background (best effort — the reader retries on the
      // owner's first open, and falls back to page images if it can't).
      if (projectType === "book" && bookFields.content_source === "upload" && bookFields.allow_read_in_app && created?.id) {
        void extractBookPdf(created.id).catch(() => {});
      }
      if (projectType === "course" && created?.id) {
        // Straight into the builder, where the setup wizard opens for the new draft.
        navigate(`/courses/${created.id}`, { replace: true });
        return;
      }
      if (postingAsPage) {
        navigate(`/page/${postingAsPage.username}?tab=projects`);
        toast(`${title.trim()} created successfully.`, { variant: "success" });
      } else if (me?.username) {
        navigate(`/profile/${me.username}?tab=projects`);
        toast(`${title.trim()} created successfully.`, { variant: "success" });
      } else {
        navigate(-1);
      }
    } catch (err) {
      setError(friendlyError(err, "Couldn't create project."));
    }
  }

  // Admin kill switch (see AdminFeatureFlags) — blocks the form even
  // for someone who navigates here directly, not just the hidden
  // "Project" entry in CreateChoice. Existing projects are unaffected
  // either way; this only stops NEW ones from being created. Also
  // enforced server-side in enforce_project_type_rules, so this is a
  // convenience, not the only thing standing in the way.
  if (postingAsPage && !pagePerms.loading && !pagePerms.can("create_projects")) {
    return <PageActionBlocked pageName={postingAsPage.name} action="create projects" />;
  }

  if (!projectsEnabled) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
        <div className="max-w-md mx-auto">
          <button onClick={smartBack} className="text-ink-muted mb-4">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-2xl text-ink mb-6">New project</h2>
          <p className="text-sm text-ink-muted">New projects aren't being created right now. Check back later.</p>
        </div>
      </div>
    );
  }

  const bookNotOwn = projectType === "book" && !bookFields.is_own_work;
  const isDraftType = projectType === "course" || (projectType === "book" && bookFields.content_source === "authored");

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">New project</h2>

        {restoredDraftNotice && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 mb-5">
            <p className="text-sm text-ink-muted">Picked up where you left off.</p>
            <button type="button" onClick={handleStartOver} className="text-sm font-medium text-accent flex-shrink-0">
              Start over
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Who it posts as — fixed once the form is open (same switch-mode-first pattern as Compose.tsx), so it's a
              quiet line rather than a section. */}
          <div className="flex items-center gap-2.5 px-1 pb-1">
            <Avatar
              src={postingAsPage ? postingAsPage.avatar_url : me?.avatar_url}
              name={postingAsPage ? postingAsPage.name : me?.display_name ?? "You"}
              size="sm"
            />
            <p className="text-sm text-ink-muted">
              Posting as{" "}
              <span className="text-ink font-medium">{postingAsPage ? postingAsPage.name : me?.display_name}</span>
              {!postingAsPage && (
                <>
                  {" "}
                  · <button type="button" onClick={() => setPagesOpen(true)} className="text-accent">switch</button>
                </>
              )}
            </p>
          </div>

          {/* 1 — What are you making? The type decides which fields appear below. */}
          <FormSection
            icon={PROJECT_TYPE_ICONS[projectType]}
            title="Project type"
            description="What are you creating? The form adapts to your choice."
          >
            {allowedTypes.length === 0 && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-canvas border border-border">
                <p className="text-sm text-ink-muted">There are no project types available to this account right now.</p>
              </div>
            )}
            <ProjectTypeChips options={allowedTypes} value={projectType} onChange={setProjectType} />
            <p className="text-xs text-ink-muted mb-4">
              {PROJECT_TYPE_HINTS[projectType]}
              {postingAsPage
                ? " Event and Room are page-only — that's why some types you might expect aren't listed here."
                : " Talent, Meeting, Media, and File are personal-only — switch to a page to create an Event or Room."}
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
          </FormSection>

          {/* 2 — Cover. The thumbnail frame takes the uploaded image's own aspect ratio (16:9 only as the placeholder). */}
          <FormSection
            icon={ImageIcon}
            title="Cover"
            description={projectType === "book" ? "Your book's cover." : projectType === "file" ? undefined : "The image people see first."}
          >
            {projectType === "file" ? (
              <div className="w-full mb-4 rounded-2xl border border-border bg-canvas overflow-hidden">
                <FileFolderHero />
              </div>
            ) : (
              <ThumbnailPicker
                url={thumbnailUrl}
                aspectRatio={
                  projectType === "book"
                    ? BOOK_COVER_RATIO
                    : thumbnailRatio
                      ? `${thumbnailRatio.width} / ${thumbnailRatio.height}`
                      : "16 / 9"
                }
                isBook={projectType === "book"}
                uploading={uploadThumbnail.isPending}
                inputRef={thumbnailInputRef}
                onFileChange={handleThumbnailSelect}
                supportingImageUrls={supportingImageUrls}
                onSupportingChange={setSupportingImageUrls}
              />
            )}
          </FormSection>

          {/* 3 — The basics. */}
          <FormSection icon={Type} title="Basics">
            <FormField id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

            <div className="mb-4">
              <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2.5">
                Description
              </label>
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

            <TopicPicker selected={topicIds} onToggle={toggleTopic} />
          </FormSection>

          {/* 4 — Whatever this type needs. */}
          <FormSection icon={PROJECT_TYPE_ICONS[projectType]} title={`${PROJECT_TYPE_LABELS[projectType]} details`}>
            {projectType === "media" && <SongTalentField value={songTalent} onChange={setSongTalent} />}
            {projectType === "media" && <MediaFields value={mediaFields} onChange={setMediaFields} onError={setError} onUploadingChange={setMediaUploading} />}
            {projectType === "file" && (
              <FileFields value={fileFields} onChange={setFileFields} onError={setError} maxFiles={maxFiles} />
            )}
            {projectType === "url" && <UrlFields value={urlFields} onChange={setUrlFields} />}
            {projectType === "event" && <EventFields value={eventFields} onChange={setEventFields} />}
            {projectType === "meeting" && <MeetingFields value={meetingFields} onChange={setMeetingFields} />}
            {projectType === "room" && <RoomFields value={roomFields} onChange={setRoomFields} />}
            {projectType === "course" && <CourseFields />}
            {projectType === "gig" && <TalentFields value={talentFields} onChange={setTalentFields} />}
            {projectType === "pitch" && <PitchFields value={pitchFields} onChange={setPitchFields} />}
            {projectType === "book" && <BookFields value={bookFields} onChange={setBookFields} onError={setError} />}
          </FormSection>

          {/* 5 — Price. A pitch never carries one: it's support-based fundraising with a pledge amount chosen by the
              supporter, not a sale. Neither does a song. */}
          {projectType !== "pitch" && projectType !== "media" && (
            <FormSection
              icon={Banknote}
              title="Pricing"
              description={bookNotOwn ? "Free — it credits someone else's work." : "Free, or set a price."}
            >
              <PricingFields
                type={projectType}
                priceUsd={priceUsd}
                onPriceChange={setPriceUsd}
                showPromo={showPromo}
                onShowPromoChange={setShowPromo}
                promoPriceUsd={promoPriceUsd}
                onPromoPriceChange={setPromoPriceUsd}
                bookNotOwn={bookNotOwn}
              />
            </FormSection>
          )}

          {/* 6 — Who can see it. */}
          <FormSection icon={Eye} title="Visibility">
            <ToggleRow
              icon={EyeOff}
              title="Private project"
              description="Not listed anywhere, and not open to anyone by link — only people you add can see or open it."
              checked={isPrivate}
              onChange={setIsPrivate}
            />
          </FormSection>

          <FormFooter error={error}>
            <Button
              type="submit"
              loading={projectType === "pitch" ? createPitchProject.isPending : createProject.isPending}
            >
              {isDraftType ? "Create draft" : projectType === "pitch" ? "Publish pitch" : "Publish project"}
            </Button>
          </FormFooter>
        </form>
      </div>

      {pagesOpen && <ProfilePagesModal mode="owner" navigateOnSwitch={false} onClose={() => setPagesOpen(false)} />}

      {leaveGuard.isBlocked && (
        <SaveProgressDialog
          description="Save this project as a draft on this device to finish later, or discard it."
          onSave={handleLeaveSave}
          onDiscard={handleLeaveDiscard}
          onKeepEditing={leaveGuard.stay}
        />
      )}
    </div>
  );
}
