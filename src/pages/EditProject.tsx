// src/pages/EditProject.tsx
import { FileFolderHero } from "../components/FileFolderArt";
import { BOOK_COVER_RATIO, isBookCoverRatio, BOOK_COVER_ERROR } from "../lib/bookCover";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { useReturnAfterSave } from "../hooks/useReturnAfterSave";
import { useToast } from "../components/Toast";
import { useProjectOwnership } from "../hooks/useProjectOwnership";
import { ArrowLeft, Banknote, CircleDot, Eye, EyeOff, ImageIcon, Link2, Lock, Percent, Ticket, Type, Users } from "lucide-react";
import {
  useProject,
  useProjectTopics,
  useUpdateProject,
  PROJECT_TYPE_LABELS,
  type ProjectStatus,
} from "../hooks/useProjects";
import { useAffiliateProgram } from "../hooks/useAffiliates";
import { SongTalentField, NEW_ARTIST_TALENT } from "../components/SongTalentField";
import { useEnsureArtistTalent } from "../hooks/usePortfolio";
import { useEventDetails, useMeetingDetails, useMediaDetails, useTalentDetails, useTalentSamples, usePitchDetails, useBookDetails } from "../hooks/useProjectTypeDetails";
import { useRoomDetails } from "../hooks/useRoom";
import { supabase } from "../lib/supabase";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { ManageAccessSheet } from "../components/ManageAccessSheet";
import { AffiliateProgramSheet } from "../components/AffiliateProgramSheet";
import { ProjectLinkSheet } from "../components/ProjectLinkSheet";
import { GuestPassSheet } from "../components/GuestPassSheet";
import { TopicPicker, MAX_TOPICS } from "../components/TopicPicker";
import { FormatToolbar } from "../components/FormatToolbar";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";
import { EventFields, EMPTY_EVENT_FIELDS, type EventFieldsValue } from "../components/project-types/EventFields";
import { MeetingFields, EMPTY_MEETING_FIELDS, type MeetingFieldsValue } from "../components/project-types/MeetingFields";
import {
  FileFields,
  EMPTY_FILE_FIELDS,
  fileFieldsError,
  fileFieldsFromProjectFiles,
  fileFieldsToInputs,
  type FileFieldsValue,
} from "../components/project-types/FileFields";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { useMyProfile } from "../hooks/useProfile";
import { useProjectFiles, useSaveProjectFiles } from "../hooks/useProjectFiles";
import { maxProjectFiles } from "../lib/fileProject";
import { UrlFields, EMPTY_URL_FIELDS, type UrlFieldsValue } from "../components/project-types/UrlFields";
import {
  MediaFields,
  EMPTY_MEDIA_FIELDS,
  mediaFieldsAreValid,
  type MediaFieldsValue,
} from "../components/project-types/MediaFields";
import { TalentFields, EMPTY_TALENT_FIELDS, type TalentFieldsValue } from "../components/project-types/TalentFields";
import { RoomFields, EMPTY_ROOM_FIELDS, type RoomFieldsValue } from "../components/project-types/RoomFields";
import { PitchFields, EMPTY_PITCH_FIELDS, type PitchFieldsValue } from "../components/project-types/PitchFields";
import { BookFields, EMPTY_BOOK_FIELDS, type BookFieldsValue } from "../components/project-types/BookFields";
import {
  FormFooter,
  FormSection,
  LinkRow,
  PricingFields,
  PROJECT_TYPE_ICONS,
  ThumbnailPicker,
  ToggleRow,
} from "../components/ProjectFormParts";
import { ProjectStatusSelect } from "../components/ProjectStatusSelect";
import { friendlyError } from "../lib/friendlyError";

export function EditProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const smartBack = useSmartBack();
  const returnAfterSave = useReturnAfterSave();
  const toast = useToast();

  const { data: project, isLoading } = useProject(projectId);
  // File projects: the saved files (one slot each), and how many this account may hold (1, or 6 if verified).
  const { data: me } = useMyProfile();
  const restricted = useIsRestricted();
  const maxFiles = maxProjectFiles(!!me?.is_verified && !restricted);
  const { data: existingFiles } = useProjectFiles(projectId, project?.project_type === "file");
  const saveProjectFiles = useSaveProjectFiles();
  const ownership = useProjectOwnership();
  const [manageAccessOpen, setManageAccessOpen] = useState(false);
  const [affiliateSheetOpen, setAffiliateSheetOpen] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [guestPassOpen, setGuestPassOpen] = useState(false);
  // Only used to decide whether to still surface the entry point for a
  // project that's currently free — see the price===0 branch below.
  const { data: affiliateProgram } = useAffiliateProgram(
    project && project.project_type !== "pitch" ? project.id : undefined
  );
  const { data: existingTopicIds } = useProjectTopics(projectId);
  const { data: existingEventDetails } = useEventDetails(project?.project_type === "event" ? projectId : undefined);
  const { data: existingMeetingDetails } = useMeetingDetails(
    project?.project_type === "meeting" ? projectId : undefined
  );
  const { data: existingMediaDetails } = useMediaDetails(
    project?.project_type === "media" ? projectId : undefined
  );
  const { data: existingTalentDetails } = useTalentDetails(project?.project_type === "gig" ? projectId : undefined);
  const { data: existingTalentSamples } = useTalentSamples(project?.project_type === "gig" ? projectId : undefined);
  const { data: existingPitchDetails } = usePitchDetails(project?.project_type === "pitch" ? projectId : undefined);
  const { data: existingRoomDetails } = useRoomDetails(project?.project_type === "room" ? projectId : undefined);
  const { data: existingBookDetails } = useBookDetails(project?.project_type === "book" ? projectId : undefined);
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
  const [supportingImageUrls, setSupportingImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [topicsHydrated, setTopicsHydrated] = useState(false);

  const [fileFields, setFileFields] = useState<FileFieldsValue>(EMPTY_FILE_FIELDS);
  const [urlFields, setUrlFields] = useState<UrlFieldsValue>(EMPTY_URL_FIELDS);
  const [mediaFields, setMediaFields] = useState<MediaFieldsValue>(EMPTY_MEDIA_FIELDS);
  const [mediaUploading, setMediaUploading] = useState(false);
  // The talent a song lives under (a talent id, or NEW_ARTIST_TALENT to scaffold one on save).
  const [songTalent, setSongTalent] = useState("");
  const ensureArtistTalent = useEnsureArtistTalent();
  const [eventFields, setEventFields] = useState<EventFieldsValue>(EMPTY_EVENT_FIELDS);
  const [meetingFields, setMeetingFields] = useState<MeetingFieldsValue>(EMPTY_MEETING_FIELDS);
  const [talentFields, setTalentFields] = useState<TalentFieldsValue>(EMPTY_TALENT_FIELDS);
  const [pitchFields, setPitchFields] = useState<PitchFieldsValue>(EMPTY_PITCH_FIELDS);
  const [roomFields, setRoomFields] = useState<RoomFieldsValue>(EMPTY_ROOM_FIELDS);
  const [bookFields, setBookFields] = useState<BookFieldsValue>(EMPTY_BOOK_FIELDS);
  const [typeDetailsHydrated, setTypeDetailsHydrated] = useState(false);

  // Same lock as CreateProject — crediting someone else's book can
  // never carry a price, kept in sync here too so an existing priced
  // book can't be edited to flip is_own_work off while quietly
  // keeping its old price (the server trigger would reject the save
  // anyway, but this keeps the form honest about it beforehand).
  useEffect(() => {
    if (project?.project_type === "book" && !bookFields.is_own_work && priceUsd !== "0") {
      setPriceUsd("0");
      setShowPromo(false);
      setPromoPriceUsd("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.project_type, bookFields.is_own_work]);

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
      setSupportingImageUrls(project.supporting_image_urls ?? []);
      if (project.thumbnail_width && project.thumbnail_height) {
        setThumbnailRatio({ width: project.thumbnail_width, height: project.thumbnail_height });
      }
      if (project.project_type === "url") {
        setUrlFields({ url: project.external_url ?? "" });
      }
      if (project.project_type === "media") {
        setSongTalent(project.parent_gig_id ?? "");
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
      setMeetingFields({
        scheduled_at: existingMeetingDetails.scheduled_at.slice(0, 16),
        recording_enabled: existingMeetingDetails.recording_enabled,
      });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "media" && existingMediaDetails) {
      setMediaFields({
        audio: {
          enabled: existingMediaDetails.has_audio,
          url: existingMediaDetails.audio_url ?? "",
          file_path: existingMediaDetails.audio_file_path,
          file_name: null,
        },
        video: {
          enabled: existingMediaDetails.has_video,
          url: existingMediaDetails.video_url ?? "",
          file_path: existingMediaDetails.video_file_path,
          file_name: null,
        },
        image: {
          enabled: existingMediaDetails.has_image,
          // Image never has a link (see MediaFields) — any legacy
          // image_url from before that rule existed is intentionally
          // not loaded here, so re-saving the form can't resurrect it.
          url: "",
          file_path: existingMediaDetails.image_file_path,
          file_name: null,
        },
      });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "gig" && existingTalentDetails !== undefined && existingTalentSamples) {
      setTalentFields({
        role_id: existingTalentDetails?.role_id ?? "",
        tagline: existingTalentDetails?.tagline ?? "",
        delivery_estimate: existingTalentDetails?.delivery_estimate ?? "",
        // A talent's own songs come back in this list too, but they're not samples — the form only edits samples.
        sample_project_ids: existingTalentSamples.filter((p) => p.parent_gig_id !== projectId).map((p) => p.id),
        revisions_included: existingTalentDetails?.revisions_included?.toString() ?? "",
        deliverables: existingTalentDetails?.deliverables ?? [],
        faq: existingTalentDetails?.faq ?? [],
      });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "pitch" && existingPitchDetails) {
      // linked_room_id is deliberately never surfaced/edited here — the
      // update Room is internal plumbing (see ako_projects_v8_pitch.sql),
      // not something the creator manages from this form.
      setPitchFields({ goal_amount_usd: String(existingPitchDetails.goal_amount_usd) });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "room" && existingRoomDetails !== undefined) {
      // existingRoomDetails is `undefined` while the query is still
      // loading and `null` if the row genuinely doesn't exist yet
      // (shouldn't happen — useCreateProject always creates one — but
      // falling back to empty rather than getting stuck is safer than
      // the alternative of never hydrating at all).
      setRoomFields({
        start_date: existingRoomDetails?.start_date?.slice(0, 16) ?? "",
        end_date: existingRoomDetails?.end_date?.slice(0, 16) ?? "",
      });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "book" && existingBookDetails !== undefined) {
      // Same undefined-while-loading / null-if-missing reasoning as
      // Room above — useCreateProject always creates this row too
      // (even for "authored", metadata-only), so null shouldn't
      // happen in practice, but the fallback keeps hydration from
      // getting stuck if it ever does.
      setBookFields({
        book_type: existingBookDetails?.book_type ?? "book",
        content_source: existingBookDetails?.content_source ?? "upload",
        url: existingBookDetails?.external_url ?? "",
        file_path: existingBookDetails?.file_path ?? null,
        file_name: null,
        allow_download: existingBookDetails?.allow_download ?? false,
        allow_read_in_app: existingBookDetails?.allow_read_in_app ?? true,
        is_own_work: existingBookDetails?.is_own_work ?? true,
        author_name: existingBookDetails?.author_name ?? "",
        source_credit: existingBookDetails?.source_credit ?? "",
      });
      setTypeDetailsHydrated(true);
    } else if (project.project_type === "file" && existingFiles) {
      setFileFields(fileFieldsFromProjectFiles(existingFiles));
      setTypeDetailsHydrated(true);
    } else if (!["event", "meeting", "media", "gig", "pitch", "room", "book", "file"].includes(project.project_type)) {
      setTypeDetailsHydrated(true);
    }
  }, [
    project,
    existingEventDetails,
    existingMeetingDetails,
    existingMediaDetails,
    existingTalentDetails,
    existingTalentSamples,
    existingPitchDetails,
    existingRoomDetails,
    existingBookDetails,
    existingFiles,
    typeDetailsHydrated,
  ]);

  async function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url, width, height } = await uploadThumbnail.mutateAsync({ file, bookCover: project?.project_type === "book" });
      setThumbnailUrl(url);
      setThumbnailRatio({ width, height });
    } catch (err) {
      setError(friendlyError(err, "Thumbnail upload failed."));
    }
  }

  function validateTypeSpecific(): string | null {
    if (!project) return null;
    if (
      project.project_type === "book" &&
      thumbnailUrl &&
      thumbnailRatio &&
      !isBookCoverRatio(thumbnailRatio.width, thumbnailRatio.height)
    ) {
      return BOOK_COVER_ERROR;
    }
    if (project.project_type === "file") {
      const fileError = fileFieldsError(fileFields);
      if (fileError) return fileError;
    }
    if (project.project_type === "url" && !urlFields.url.trim()) {
      return "Add the link you're sharing access to.";
    }
    if (project.project_type === "media" && !mediaFieldsAreValid(mediaFields)) {
      if (!mediaFields.audio.enabled && !mediaFields.video.enabled && !mediaFields.image.enabled) {
        return "Turn on Audio, Video, Image, or any combination.";
      }
      return "Add a link or upload a file for each channel you turned on.";
    }
    if (project.project_type === "event" && !eventFields.location_value.trim()) {
      return eventFields.location_type === "physical" ? "Add the event address." : "Add the join link.";
    }
    if (project.project_type === "meeting" && !meetingFields.scheduled_at) {
      return "Set when this meeting happens.";
    }
    if (project.project_type === "gig" && !talentFields.role_id) {
      return "Select the professional role this talent represents.";
    }
    if (project.project_type === "gig" && !talentFields.tagline.trim()) {
      return "Add a short tagline for this talent.";
    }
    if (project.project_type === "pitch") {
      const goal = parseFloat(pitchFields.goal_amount_usd);
      if (!pitchFields.goal_amount_usd.trim() || Number.isNaN(goal) || goal <= 0) {
        return "Set a fundraising goal above $0.";
      }
    }
    if (
      project.project_type === "room" &&
      roomFields.start_date &&
      roomFields.end_date &&
      new Date(roomFields.end_date) <= new Date(roomFields.start_date)
    ) {
      return "End date needs to be after the start date.";
    }
    // Authored content is managed entirely in the Book builder, not
    // here — same reasoning as skipping validation for Course.
    if (project.project_type === "book" && bookFields.content_source !== "authored") {
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
    if (!projectId || !project) return;

    if (mediaUploading) {
      setError("Your file is still uploading — wait for it to finish, then save.");
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    // Pitches and songs are never sold (the database refuses a price on a song), so they save as free.
    const price = project.project_type === "pitch" || project.project_type === "media" ? 0 : parseFloat(priceUsd) || 0;

    const typeError = validateTypeSpecific();
    if (typeError) {
      setError(typeError);
      return;
    }

    let promoPrice: number | null = null;
    if (project.project_type !== "pitch" && project.project_type !== "media" && showPromo && promoPriceUsd.trim() !== "") {
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
      // A song always has a talent. "New talent" scaffolds the Music Artist talent first.
      let parentTalentId: string | undefined;
      if (project.project_type === "media") {
        if (!songTalent) {
          setError("Pick a talent.");
          return;
        }
        parentTalentId = songTalent === NEW_ARTIST_TALENT ? await ensureArtistTalent.mutateAsync() : songTalent;
      }

      // Files first: it's the part the database can refuse (limit, ownership), so if it does, nothing else changes.
      if (project.project_type === "file") {
        await saveProjectFiles.mutateAsync({ projectId, files: fileFieldsToInputs(fileFields) });
      }
      await updateProject.mutateAsync({
        id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        project_type: project.project_type, // fixed — see note near the type display below
        parent_gig_id: parentTalentId,
        external_url: project.project_type === "url" ? urlFields.url.trim() || null : project.external_url,
        // File projects: the files are saved by set_project_files below, which also keeps file_path in step.
        file_path: project.project_type === "file" ? undefined : project.file_path,
        // File projects never carry a thumbnail (the folder icon stands in) — editing one clears any old one.
        thumbnail_url: project.project_type === "file" ? null : thumbnailUrl,
        thumbnail_width: project.project_type === "file" ? null : thumbnailRatio?.width ?? null,
        thumbnail_height: project.project_type === "file" ? null : thumbnailRatio?.height ?? null,
        // Supporting images hang off the thumbnail — removing it clears them too.
        supporting_image_urls: project.project_type !== "file" && thumbnailUrl ? supportingImageUrls : [],
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
          .update({ scheduled_at: meetingFields.scheduled_at, recording_enabled: meetingFields.recording_enabled })
          .eq("project_id", projectId);
        if (detailsError) throw detailsError;
      }
      if (project.project_type === "media") {
        // Upsert, not update: a project created before this row
        // existed (migrated from the old audio/video types) already
        // has one from the migration script, but upsert covers both
        // that case and any future edge case cleanly either way.
        // Same hybrid rule as CreateProject: audio/video send whichever
        // of {url, file_path} are actually filled, independently — no
        // more "source" picking one over the other. Image is
        // upload-only; image_url is always cleared.
        const { error: detailsError } = await supabase.from("project_media_details").upsert({
          project_id: projectId,
          has_audio: mediaFields.audio.enabled,
          has_video: mediaFields.video.enabled,
          has_image: mediaFields.image.enabled,
          audio_source: mediaFields.audio.enabled ? (mediaFields.audio.file_path ? "upload" : "link") : null,
          audio_url: mediaFields.audio.enabled ? mediaFields.audio.url.trim() || null : null,
          audio_file_path: mediaFields.audio.enabled ? mediaFields.audio.file_path : null,
          video_source: mediaFields.video.enabled ? (mediaFields.video.file_path ? "upload" : "link") : null,
          video_url: mediaFields.video.enabled ? mediaFields.video.url.trim() || null : null,
          video_file_path: mediaFields.video.enabled ? mediaFields.video.file_path : null,
          image_source: mediaFields.image.enabled ? "upload" : null,
          image_url: null,
          image_file_path: mediaFields.image.enabled ? mediaFields.image.file_path : null,
        });
        if (detailsError) throw detailsError;
      }
      if (project.project_type === "gig") {
        const revisions = talentFields.revisions_included.trim();
        const deliverables = talentFields.deliverables.map((d) => d.trim()).filter(Boolean);
        const faq = talentFields.faq
          .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
          .filter((f) => f.question && f.answer);
        const { error: detailsError } = await supabase.from("project_gig_details").upsert({
          project_id: projectId,
          role_id: talentFields.role_id,
          tagline: talentFields.tagline.trim(),
          delivery_estimate: talentFields.delivery_estimate.trim() || null,
          revisions_included: revisions ? parseInt(revisions, 10) : null,
          deliverables: deliverables.length > 0 ? deliverables : null,
          faq: faq.length > 0 ? faq : null,
          // Saving through this form — with the required role + tagline
          // validated above — is what "completing" an auto-created Talent
          // means (spec §10-11). Safe to always set true here; a
          // manually-created talent was already true.
          is_complete: true,
        });
        if (detailsError) throw detailsError;

        // Replace the full samples set, same approach as topics above.
        const { error: deleteSamplesError } = await supabase
          .from("project_gig_samples")
          .delete()
          .eq("gig_project_id", projectId);
        if (deleteSamplesError) throw deleteSamplesError;

        if (talentFields.sample_project_ids.length > 0) {
          const rows = talentFields.sample_project_ids.map((sample_project_id, i) => ({
            gig_project_id: projectId,
            sample_project_id,
            sort_order: i,
          }));
          const { error: insertSamplesError } = await supabase.from("project_gig_samples").insert(rows);
          if (insertSamplesError) throw insertSamplesError;
        }
      }

      if (project.project_type === "pitch") {
        // goal_amount_usd only — linked_room_id is never touched from
        // here (see the hydration comment above), and there's no
        // price/promo to write since Pitch never carries either.
        const { error: detailsError } = await supabase
          .from("project_pitch_details")
          .update({ goal_amount_usd: parseFloat(pitchFields.goal_amount_usd) })
          .eq("project_id", projectId);
        if (detailsError) throw detailsError;
      }
      if (project.project_type === "room") {
        const { error: detailsError } = await supabase.from("project_room_details").upsert({
          project_id: projectId,
          start_date: roomFields.start_date ? new Date(roomFields.start_date).toISOString() : null,
          end_date: roomFields.end_date ? new Date(roomFields.end_date).toISOString() : null,
        });
        if (detailsError) throw detailsError;
      }
      if (project.project_type === "book") {
        // Upsert, not update — same reasoning as Media/Room: every
        // book project gets a row at creation (even "authored", as
        // metadata-only), but upsert is the safe choice regardless.
        // external_url/file_path are only ever sent for their
        // matching content_source, mirroring the content-matches-
        // source check on the table itself.
        const { error: detailsError } = await supabase.from("project_book_details").upsert({
          project_id: projectId,
          book_type: bookFields.book_type,
          content_source: bookFields.content_source,
          author_name: bookFields.author_name.trim() || null,
          is_own_work: bookFields.is_own_work,
          source_credit: bookFields.is_own_work ? null : bookFields.source_credit.trim() || null,
          external_url: bookFields.content_source === "link" ? bookFields.url.trim() : null,
          file_path: bookFields.content_source === "upload" ? bookFields.file_path : null,
          allow_download: bookFields.content_source === "upload" ? bookFields.allow_download : false,
          allow_read_in_app: bookFields.content_source === "upload" ? bookFields.allow_read_in_app : true,
        });
        if (detailsError) throw detailsError;
      }

      // Draft/archived → published is the moment worth calling out;
      // any other save is just "saved". Either way the person goes
      // back to the page they opened the editor from, refreshed.
      const justPublished = project.status !== "active" && status === "active";
      const savedAsDraft = status === "draft";
      toast(justPublished ? "Project published." : savedAsDraft ? "Saved as draft." : "Changes saved.", { variant: "success" });
      // A draft is finished business on its owner's Projects tab, not on whatever page opened the editor.
      const projectsTab = savedAsDraft
        ? project.posted_as_page_id && ownership.actingAsPageId
          ? undefined
          : me?.username
            ? `/profile/${me.username}?tab=projects`
            : undefined
        : undefined;
      await returnAfterSave({ fallback: `/projects/${projectId}`, landOn: projectsTab });
    } catch (err) {
      setError(friendlyError(err, "Couldn't save changes."));
    }
  }

  if (isLoading || !project || !typeDetailsHydrated || ownership.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  // A Page is its own account: while acting as one, a project published from
  // the person's own profile (or another Page) is someone else's content and
  // can't be edited from here — switch accounts first. (Server RLS is still the
  // real gate; this keeps the UI from offering what it shouldn't.)
  if (!ownership.isOwner(project)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-ink-muted">
          {ownership.actingAsPageId
            ? "This project wasn't published by the Page you're acting as. Switch to the account that published it to edit it."
            : "You can't edit this project."}
        </p>
        <Button onClick={smartBack}>Go back</Button>
      </div>
    );
  }

  const isBook = project?.project_type === "book";
  const bookNotOwn = project?.project_type === "book" && !bookFields.is_own_work;
  const TypeIcon = PROJECT_TYPE_ICONS[project.project_type];

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">Edit project</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <FormSection icon={CircleDot} title="Status" description="Whether people can find and open it.">
            <div className="mb-4">
              <ProjectStatusSelect value={status} onChange={setStatus} />
            </div>
          </FormSection>

          <FormSection
            icon={ImageIcon}
            title="Cover"
            description={isBook ? "Your book's cover." : project?.project_type === "file" ? undefined : "The image people see first."}
          >
            {project?.project_type === "file" ? (
              <div className="w-full mb-4 rounded-2xl border border-border bg-canvas overflow-hidden">
                <FileFolderHero />
              </div>
            ) : (
              <ThumbnailPicker
                url={thumbnailUrl}
                aspectRatio={isBook ? BOOK_COVER_RATIO : thumbnailRatio ? `${thumbnailRatio.width} / ${thumbnailRatio.height}` : "16 / 9"}
                isBook={isBook}
                uploading={uploadThumbnail.isPending}
                inputRef={thumbnailInputRef}
                onFileChange={handleThumbnailSelect}
                supportingImageUrls={supportingImageUrls}
                onSupportingChange={setSupportingImageUrls}
              />
            )}
          </FormSection>

          <FormSection icon={Type} title="Basics">
            <FormField id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

            {/* Project type is fixed after creation — Event/Meeting/Media have their own detail tables, and Room/Course
                have member rosters and content tied to that type. Changing it here would orphan that data, so it's
                shown, not editable. */}
            <div className="mb-6">
              <p className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2.5">Project type</p>
              <div className="flex items-center gap-2.5 rounded-xl bg-canvas px-4 py-3">
                <TypeIcon size={16} className="text-ink-muted shrink-0" />
                <p className="flex-1 text-sm text-ink">
                  {PROJECT_TYPE_LABELS[project.project_type]}{" "}
                  <span className="text-ink-muted">— can't be changed after creation</span>
                </p>
                <Lock size={14} className="text-ink-muted shrink-0" />
              </div>
            </div>

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

          <FormSection icon={TypeIcon} title={`${PROJECT_TYPE_LABELS[project.project_type]} details`}>
            {project.project_type === "media" && <SongTalentField value={songTalent} onChange={setSongTalent} />}
            {project.project_type === "media" && <MediaFields value={mediaFields} onChange={setMediaFields} onError={setError} onUploadingChange={setMediaUploading} />}
            {project.project_type === "file" && (
              <FileFields value={fileFields} onChange={setFileFields} onError={setError} maxFiles={maxFiles} />
            )}
            {project.project_type === "url" && <UrlFields value={urlFields} onChange={setUrlFields} />}
            {project.project_type === "event" && <EventFields value={eventFields} onChange={setEventFields} />}
            {project.project_type === "meeting" && <MeetingFields value={meetingFields} onChange={setMeetingFields} />}
            {project.project_type === "room" && (
              <>
                <RoomFields value={roomFields} onChange={setRoomFields} />
                <p className="text-xs text-ink-muted mb-4 -mt-2">
                  Manage lectures, chat, meetings, and assignments from the cohort itself.
                </p>
              </>
            )}
            {project.project_type === "course" && (
              <p className="text-xs text-ink-muted mb-4">Manage modules and lessons from the course builder.</p>
            )}
            {project.project_type === "gig" && (
              <>
                {existingTalentDetails?.is_complete === false && (
                  <div className="mb-4 p-3 rounded-xl bg-accent-soft border border-accent/30">
                    <p className="text-sm text-ink font-medium">Finish setting up this Talent</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {existingTalentDetails.source === "auto_collaboration"
                        ? "This was started automatically from a collaboration you were credited on."
                        : "This Talent isn't complete yet."}{" "}
                      Review the details below and save to publish it to your profile.
                    </p>
                  </div>
                )}
                <TalentFields value={talentFields} onChange={setTalentFields} excludeProjectId={project.id} />
              </>
            )}
            {project.project_type === "pitch" && <PitchFields value={pitchFields} onChange={setPitchFields} />}
            {project.project_type === "book" && (
              <>
                <BookFields
                  value={bookFields}
                  onChange={setBookFields}
                  onError={setError}
                  existingSource={existingBookDetails?.content_source}
                />
                {bookFields.content_source === "authored" && (
                  <p className="text-xs text-ink-muted mb-4 -mt-2">Manage chapters from the book builder.</p>
                )}
              </>
            )}
          </FormSection>

          {/* A pitch or a song never carries a price tag, and has no sale for an affiliate commission to attach to. */}
          {project.project_type !== "pitch" && project.project_type !== "media" && (
            <FormSection
              icon={Banknote}
              title="Pricing"
              description={bookNotOwn ? "Free — it credits someone else's work." : "Free, or set a price."}
            >
              <PricingFields
                type={project.project_type}
                priceUsd={priceUsd}
                onPriceChange={setPriceUsd}
                showPromo={showPromo}
                onShowPromoChange={setShowPromo}
                promoPriceUsd={promoPriceUsd}
                onPromoPriceChange={setPromoPriceUsd}
                bookNotOwn={bookNotOwn}
              />
              {/* Free projects are blocked from affiliate programs — read off the live form value so this updates before
                  Save — unless a program already exists (so it can still be turned off). */}
              <LinkRow
                icon={Percent}
                title="Affiliate program"
                description={
                  (parseFloat(priceUsd) || 0) > 0 || !!affiliateProgram
                    ? "Let others earn a commission for sharing this."
                    : "Set a price above to enable this."
                }
                onClick={() => setAffiliateSheetOpen(true)}
                disabled={!((parseFloat(priceUsd) || 0) > 0 || !!affiliateProgram)}
              />
            </FormSection>
          )}

          <FormSection icon={Eye} title="Sharing & access">
            {projectId && (
              <LinkRow
                icon={Link2}
                title={project?.slug ? "Custom URL" : "Choose your custom URL"}
                description={project?.slug ? "Change the link people use to open this." : "Give it a short, memorable link."}
                onClick={() => setLinkSheetOpen(true)}
              />
            )}
            {projectId && project?.status === "active" && (
              <LinkRow icon={Ticket} title="Guest Pass" description="A 6-hour link anyone can open." onClick={() => setGuestPassOpen(true)} />
            )}
            <ToggleRow
              icon={EyeOff}
              title="Private project"
              description="Not listed anywhere, and not open to anyone by link — only people you add can see or open it."
              checked={isPrivate}
              onChange={setIsPrivate}
            />
            {isPrivate && projectId && (
              <LinkRow icon={Users} title="Manage who has access" onClick={() => setManageAccessOpen(true)} />
            )}
          </FormSection>

          <FormFooter error={error}>
            <Button type="submit" loading={updateProject.isPending}>
              Save changes
            </Button>
          </FormFooter>
        </form>
      </div>

      {manageAccessOpen && projectId && project && (
        <ManageAccessSheet
          projectId={projectId}
          projectTitle={project.title}
          onClose={() => setManageAccessOpen(false)}
        />
      )}

      {affiliateSheetOpen && projectId && project && (
        <AffiliateProgramSheet
          projectId={projectId}
          projectTitle={project.title}
          priceUsd={parseFloat(priceUsd) || 0}
          onClose={() => setAffiliateSheetOpen(false)}
        />
      )}

      {linkSheetOpen && project && <ProjectLinkSheet project={project} onClose={() => setLinkSheetOpen(false)} />}

      {guestPassOpen && projectId && project && (
        <GuestPassSheet
          projectId={projectId}
          projectTitle={project.title}
          isPrivate={project.is_private}
          isPaid={(parseFloat(priceUsd) || 0) > 0}
          onClose={() => setGuestPassOpen(false)}
        />
      )}
    </div>
  );
}
