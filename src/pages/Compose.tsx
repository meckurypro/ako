// src/pages/Compose.tsx

import { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { useReturnAfterSave } from "../hooks/useReturnAfterSave";
import { setJustPostedPending } from "../lib/justPosted";
import { setComposeRestore, peekComposeRestore, clearComposeRestore, type ComposeRestore } from "../lib/composeRestore";
import { setJustSaved } from "../lib/justSaved";
import { formatScheduleShort } from "../lib/schedulePresets";
import { SchedulePostModal } from "../components/SchedulePostModal";
import { X, Image as ImageIcon, Link2, MoreHorizontal, FileText, CalendarClock } from "lucide-react";
import { useCreatePost, useDeleteDraftOrScheduledPost } from "../hooks/usePosts";
import { TopicPicker, MAX_TOPICS } from "../components/TopicPicker";
import { useUploadPostMedia, isVideoUrl } from "../hooks/useUploadPostMedia";
import { useActiveIdentity, useActivePagePermissions } from "../hooks/usePages";
import { PageActionBlocked } from "../components/PageActionBlocked";
import { useMyProfile } from "../hooks/useProfile";
import { supabase } from "../lib/supabase";
import { Avatar } from "../components/Avatar";
import { MentionTextarea } from "../components/MentionTextarea";
import { HeadingColorPicker } from "../components/HeadingColorPicker";
import { TagProjectPicker } from "../components/TagProjectPicker";
import { DropdownMenu, type DropdownMenuItem } from "../components/DropdownMenu";
import { useToast } from "../components/Toast";
import { CONTENT_LIMIT, contentCounterClass, postContentLimit } from "../lib/textLimits";
import { AddMusicSheet } from "../components/music/AddMusicSheet";
import { Music as MusicIcon } from "lucide-react";
import type { MusicSearchResult } from "../types/music";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { useLeaveGuard } from "../hooks/useLeaveGuard";
import { SaveProgressDialog } from "../components/SaveProgressDialog";
import { ProfilePagesModal } from "../components/ProfilePagesModal";

const HEADING_LIMIT = 50;
const MAX_MEDIA_FILES = 4;

// Everything the person can put into the form, as one comparable string. Used to tell "they've changed something
// since this screen opened (or since the draft they resumed was loaded)" from "nothing to lose" when they try to
// leave — see useLeaveGuard.
function postSignature(f: {
  heading: string;
  headingColor: string | null;
  content: string;
  mediaUrls: string[];
  topicIds: string[];
  taggedProjectId: string | null;
  musicCatalogueId: string | null;
}): string {
  return JSON.stringify([f.heading, f.headingColor, f.content, f.mediaUrls, [...f.topicIds].sort(), f.taggedProjectId, f.musicCatalogueId]);
}

export function Compose() {
  const navigate = useNavigate();
  const location = useLocation();
  const smartBack = useSmartBack();
  const returnAfterSave = useReturnAfterSave();
  // Set when a post that already redirected to the Feed was then rejected: the form comes back as it was.
  // Peeked (not consumed) so a StrictMode double render sees it too; cleared on mount below.
  const [restore] = useState(() => peekComposeRestore());
  useEffect(() => {
    clearComposeRestore();
  }, []);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [heading, setHeading] = useState(restore?.heading ?? "");
  const [headingColor, setHeadingColor] = useState<string | null>(restore?.headingColor ?? null);
  const [content, setContent] = useState(restore?.content ?? "");
  const [topicIds, setTopicIds] = useState<Set<string>>(new Set(restore?.topicIds ?? []));
  const [mediaUrls, setMediaUrls] = useState<string[]>(restore?.mediaUrls ?? []);
  const [error, setError] = useState<string | null>(restore?.error ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Item 10: tag one of your own projects into the post — stored as
  // just the id (what actually gets posted) plus a title snapshot
  // (so the picker pill below can show something without waiting on
  // a fresh fetch of the project itself). Arriving from a project's
  // "Push" menu item (see ProjectCard.tsx) preloads this via
  // location.state instead of the picker — the two ways in meet at
  // the same piece of state, so everything downstream (the pill,
  // "change" reopening the picker, what gets posted) works identically
  // either way.
  const incomingTaggedProject =
    restore?.taggedProject ?? (location.state as { taggedProject?: { id: string; title: string } } | null)?.taggedProject ?? null;
  const [taggedProject, setTaggedProject] = useState<{ id: string; title: string } | null>(
    incomingTaggedProject
  );
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  // Optional soundtrack — either picked via AddMusicSheet in this
  // session (attachedMusic has full display info), or arriving via
  // location.state (e.g. MusicDiscoverySheet's "Use in my post"),
  // same pattern as incomingTaggedProject above.
  const incomingMusic =
    restore?.musicCatalogueId ?? (location.state as { attachMusicCatalogueId?: string } | null)?.attachMusicCatalogueId ?? null;
  const [attachedMusic, setAttachedMusic] = useState<MusicSearchResult | null>(null);
  const [musicCatalogueId, setMusicCatalogueId] = useState<string | null>(incomingMusic);
  // Only gates the entry point for attaching NEW music — if the admin
  // flips this off mid-session after music is already attached (rare),
  // the attached chip below still shows so it can be removed, it just
  // won't offer the "Add music" button to attach something else.
  const musicInPostsEnabled = useFeatureFlag("music_in_posts_enabled");
  const [addMusicOpen, setAddMusicOpen] = useState(false);
  const createPost = useCreatePost();
  // Publishing leaves for the Feed immediately, so it must not raise the blocking overlay (see useCreatePost).
  const publishPost = useCreatePost({ blocking: false });
  const publishingRef = useRef(false);
  const deleteDraftOrScheduled = useDeleteDraftOrScheduledPost();
  const uploadMedia = useUploadPostMedia();
  const { data: identity } = useActiveIdentity();
  const { data: me } = useMyProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const toast = useToast();

  // Resuming a draft or a scheduled post (see DraftPosts.tsx and
  // ScheduledPosts.tsx's "Resume" buttons) — loaded directly rather
  // than through create-post's edge function, since this is just
  // reading the author's own unpublished row back, not creating or
  // moderating anything. Both cases behave identically here: prefill,
  // let the author change anything (including the tagged project),
  // and delete the original row once the edit is (re)submitted —
  // "editing" an unpublished post is really "replace it," which is
  // also how it re-enters moderation on save instead of skipping it.
  // Kept in a ref (not state) since it's read once, at submit time, to
  // know which row to clean up — re-fetching it or reacting to it
  // changing isn't needed.
  const locationState = location.state as { draftId?: string; scheduledId?: string } | null;
  const resumingPostId = locationState?.draftId ?? locationState?.scheduledId ?? null;
  const resumedPostIdRef = useRef(restore?.resumedPostId ?? resumingPostId);
  const resumingKind = locationState?.scheduledId ? "scheduled post" : "draft";

  // The form as it stood when it was opened — including a project/song handed in by whoever opened it, which isn't
  // the person's own progress. A resumed draft re-baselines once it has loaded (below). Leaving with the form
  // different from this is what triggers the "save your progress?" prompt.
  const baselineRef = useRef<string | null>(null);
  const signature = postSignature({
    heading,
    headingColor,
    content,
    mediaUrls,
    topicIds: Array.from(topicIds),
    taggedProjectId: taggedProject?.id ?? null,
    musicCatalogueId,
  });
  // A form handed back after a failed post is unsaved progress, not a fresh start.
  if (baselineRef.current === null) {
    baselineRef.current = restore
      ? postSignature({ heading: "", headingColor: null, content: "", mediaUrls: [], topicIds: [], taggedProjectId: null, musicCatalogueId: null })
      : signature;
  }

  useEffect(() => {
    if (!resumingPostId) return;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select(
          "heading, heading_color, content, media_urls, tagged_project:projects!posts_tagged_project_id_fkey(id, title), post_topics(interest_id)"
        )
        .eq("id", resumingPostId)
        .single();
      if (fetchError || !data) {
        toast(`Couldn't load that ${resumingKind}.`, { variant: "error" });
        return;
      }
      setHeading(data.heading ?? "");
      setHeadingColor(data.heading_color ?? null);
      setContent(data.content ?? "");
      setMediaUrls(data.media_urls ?? []);
      const resumedTopics = (data as any).post_topics as { interest_id: string }[] | null;
      if (resumedTopics?.length) setTopicIds(new Set(resumedTopics.map((row) => row.interest_id)));
      const resumedProject = (data as any).tagged_project;
      if (resumedProject) setTaggedProject({ id: resumedProject.id, title: resumedProject.title });
      // What was just loaded is the starting point, not unsaved progress.
      baselineRef.current = postSignature({
        heading: data.heading ?? "",
        headingColor: data.heading_color ?? null,
        content: data.content ?? "",
        mediaUrls: data.media_urls ?? [],
        topicIds: (resumedTopics ?? []).map((row) => row.interest_id),
        taggedProjectId: resumedProject ? resumedProject.id : incomingTaggedProject?.id ?? null,
        musicCatalogueId: incomingMusic,
      });
    })();
    // Only ever needs to run once, on mount — this is a one-time
    // prefill, not a live sync with the original row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Who this post will be attributed to — set once, from whichever mode
  // was active when Compose opened (switching mid-draft would be
  // confusing, so we don't watch for that here).
  const postingAsPage = identity?.mode === "page" ? identity.page : null;
  // Verified personal accounts get the longer cap; page posts keep the standard one.
  const contentLimit = postingAsPage ? CONTENT_LIMIT : postContentLimit(me?.is_verified);
  const pagePerms = useActivePagePermissions();

  // A post can be heading-only or details-only — either is enough to post.
  const canPost = heading.trim().length > 0 || content.trim().length > 0;

  // Leaving with unsaved progress asks first (save as a draft / discard). Hooks stay above the early return below.
  const leaveGuard = useLeaveGuard(signature !== baselineRef.current);
  const [leaveSaving, setLeaveSaving] = useState(false);

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later

    if (mediaUrls.length + files.length > MAX_MEDIA_FILES) {
      setUploadError(`You can attach up to ${MAX_MEDIA_FILES} files.`);
      return;
    }

    setUploadError(null);

    for (const file of files) {
      try {
        const url = await uploadMedia.mutateAsync(file);
        setMediaUrls((prev) => [...prev, url]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
        break;
      }
    }
  }

  function removeMedia(url: string) {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  }

  // What create-post is sent for any outcome — post now, draft, or scheduled.
  function postInput(status: "published" | "draft" | "scheduled", scheduledFor?: string) {
    return {
      heading: heading.trim() || undefined,
      heading_color: headingColor,
      content,
      interest_ids: Array.from(topicIds),
      media_urls: mediaUrls,
      posted_as_page_id: postingAsPage?.id,
      tagged_project_id: taggedProject?.id,
      music_catalogue_id: musicCatalogueId ?? undefined,
      // Omitted entirely for the normal "Post now" path so a create-post
      // deployment that predates the drafts/scheduling migration (see
      // supabase-fixes/) keeps working exactly as it always did —
      // only a draft/scheduled save sends anything new.
      ...(status !== "published" ? { status, scheduled_for: scheduledFor } : {}),
    };
  }

  // Awaited (it used to be fire-and-forget) so a failed cleanup is seen instead of silently leaving the stale draft.
  async function removeOriginalDraft() {
    if (!resumedPostIdRef.current) return;
    try {
      await deleteDraftOrScheduled.mutateAsync(resumedPostIdRef.current);
    } catch (cleanupErr) {
      console.error("Couldn't remove the original draft after saving", cleanupErr);
      toast("Saved, but the old draft couldn't be removed. Delete it from Drafts.", { variant: "error" });
    }
  }

  // Publishing: the person is on the Feed (For You) the instant they tap Post. The server round trip (moderation,
  // insert, fetching the new post) finishes in the background, and Feed pins the post when its id arrives. If the
  // post is rejected, the form is handed back through composeRestore and the person returns to the editor with
  // everything they typed and the reason shown - so they never lose their words, and never wait on a spinner.
  function publishInBackground() {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setError(null);

    const input = postInput("published");
    const resumedId = resumedPostIdRef.current;
    const snapshot: ComposeRestore = {
      heading,
      headingColor,
      content,
      mediaUrls,
      topicIds: Array.from(topicIds),
      taggedProject,
      musicCatalogueId,
      resumedPostId: resumedId,
      error: null,
    };
    const removeOriginal = deleteDraftOrScheduled.mutateAsync;

    // Shown on the Feed while the post finishes, and swapped for the outcome the moment it is known.
    const posting = toast("Posting…", { variant: "loading" });

    const result: Promise<string | null> = publishPost
      .mutateAsync(input)
      .then(async (createdPost) => {
        // Resuming a draft/scheduled post: the new row replaces it.
        if (resumedId) {
          try {
            await removeOriginal(resumedId);
          } catch (cleanupErr) {
            console.error("Couldn't remove the original draft after saving", cleanupErr);
            toast("Saved, but the old draft couldn't be removed. Delete it from Drafts.", { variant: "error" });
          }
        }
        posting.dismiss();
        toast("Posted.", { variant: "success" });
        return (createdPost as { id: string }).id;
      })
      .catch((err) => {
        // Moderation rejections and other edge-function errors surface here - the message is already short and
        // direct. Reopen the editor with the form exactly as it was.
        const message = err instanceof Error ? err.message : "Couldn't post this.";
        posting.dismiss();
        toast(message, { variant: "error" });
        setComposeRestore({ ...snapshot, error: message });
        navigate("/compose");
        return null;
      });

    setJustPostedPending(result);
    // Posted from here is the person finishing, not walking away from unsaved work.
    leaveGuard.allowLeaving();
    // Always land on the Feed (replacing the editor in history so Back never returns to a stale form), whichever
    // page opened Compose (e.g. Notifications' "+" button). Feed opens on For You.
    void returnAfterSave({ landOn: "/feed" });
  }

  async function submitPost(status: "published" | "draft" | "scheduled", scheduledFor?: string) {
    if (!canPost) return;
    if (status === "published") {
      publishInBackground();
      return;
    }
    setError(null);

    try {
      const createdPost = await createPost.mutateAsync(postInput(status, scheduledFor));

      await removeOriginalDraft();

      // Saved or published — the redirect below is the person finishing, not walking away from unsaved work.
      leaveGuard.allowLeaving();

      // Every outcome lands the person where the post now lives, so they see it straight away - never back on
      // this editor, and never on whichever page happened to open it (e.g. Notifications' "+" button). The
      // editor is replaced in history so Back doesn't return to a stale form.
      const createdId = (createdPost as { id: string }).id;
      if (status === "draft") {
        setJustSaved("draft", createdId);
        toast("Saved to your drafts.", { variant: "success" });
        navigate("/activity/drafts", { replace: true });
      } else if (status === "scheduled") {
        setJustSaved("scheduled", createdId);
        toast(
          scheduledFor ? `Scheduled for ${formatScheduleShort(new Date(scheduledFor))}.` : "Scheduled - it'll post automatically.",
          { variant: "success" }
        );
        navigate("/activity/scheduled", { replace: true });
      }
    } catch (err) {
      // Moderation rejections and other edge-function errors surface here —
      // the message is already short and direct, no need to reword it.
      // Staying on this screen (no navigate() above the catch) is what
      // puts the author right back in edit mode with everything they
      // typed still intact, ready to change whatever bounced.
      const message = err instanceof Error ? err.message : "Couldn't post this.";
      setError(message);
      toast(message, { variant: "error" });
    }
  }

  // "Save draft" from the leave prompt: same draft the "Save as draft" menu item makes, but the person carries on
  // to wherever they were headed instead of landing on the drafts list. If the save is rejected (moderation, no
  // connection) they stay on the form with everything intact, and the reason is shown.
  async function handleLeaveSave() {
    if (!canPost || leaveSaving) return;
    setLeaveSaving(true);
    setError(null);
    try {
      const savedDraft = await createPost.mutateAsync(postInput("draft"));
      await removeOriginalDraft();
      setJustSaved("draft", (savedDraft as { id: string }).id);
      toast("Saved to your drafts.", { variant: "success" });
      // Like "Save as draft" from the menu: the draft is the outcome, so the person lands on their Drafts.
      leaveGuard.allowLeaving();
      navigate("/activity/drafts", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save this draft.";
      setError(message);
      toast(message, { variant: "error" });
      leaveGuard.stay();
    } finally {
      setLeaveSaving(false);
    }
  }

  function handleSubmit() {
    void submitPost("published");
  }

  function handleSaveDraft() {
    void submitPost("draft");
  }

  function handleConfirmSchedule(when: Date) {
    setScheduleModalOpen(false);
    void submitPost("scheduled", when.toISOString());
  }

  const moreMenuItems: DropdownMenuItem[] = [
    {
      key: "draft",
      label: "Save as draft",
      icon: <FileText />,
      onSelect: handleSaveDraft,
      disabled: !canPost,
    },
    {
      key: "schedule",
      label: "Schedule…",
      icon: <CalendarClock />,
      onSelect: () => setScheduleModalOpen(true),
      disabled: !canPost,
    },
  ];

  if (postingAsPage && !pagePerms.loading && !pagePerms.can("create_posts")) {
    return <PageActionBlocked pageName={postingAsPage.name} action="create posts" />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Bottom padding clears the fixed action bar so nothing sits behind it. */}
      <div className="max-w-xl mx-auto px-4 pt-4 pb-28">
        {/* Who this posts as — reflects account mode (see ProfilePagesModal). Not
            editable from here on purpose: switch mode first, then compose,
            so there's no chance of posting as the wrong identity mid-draft. */}
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
                · <button type="button" onClick={() => setPagesOpen(true)} className="text-accent">switch</button>
              </>
            )}
          </p>
        </div>

        <div className="flex items-start gap-2 mb-1">
          <input
            value={heading}
            onChange={(e) => setHeading(e.target.value.slice(0, HEADING_LIMIT))}
            maxLength={HEADING_LIMIT}
            placeholder="Heading (optional)"
            className="w-full font-display text-2xl leading-tight text-ink bg-transparent focus:outline-none placeholder:text-ink-muted/60"
          />
          {/* Only worth showing once there's something to color — an
              empty heading has nothing for the pick to apply to, and
              PostContent only ever renders the colored headline style
              when there's a heading anyway (see its own "heading-only
              falls back to plain text" case). */}
          {heading.trim().length > 0 && (
            <div className="pt-1.5">
              <HeadingColorPicker value={headingColor} onChange={setHeadingColor} />
            </div>
          )}
        </div>
        <p className="text-xs text-ink-muted mb-3">{heading.length}/{HEADING_LIMIT}</p>

        <MentionTextarea
          value={content}
          onChange={setContent}
          maxLength={contentLimit}
          rows={8}
          autoGrow
          placeholder="Add details… use @ to mention someone."
          className="w-full text-base text-ink bg-transparent resize-none focus:outline-none placeholder:text-ink-muted/60"
          showFormatToolbar
        />

        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {mediaUrls.map((url) => (
              <div key={url} className="relative rounded-xl overflow-hidden aspect-square bg-surface">
                {isVideoUrl(url) ? (
                  <video src={url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeMedia(url)}
                  className="absolute top-1.5 right-1.5 bg-ink/60 text-canvas rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Item 10 — tagged project pill, shown once picked. Only
            offered in Personal mode for now: a page's own projects
            aren't fetched by useUserProjects the way a person's are
            (that hook takes a profile id, not a page id) — tagging a
            page's project from Page mode is a reasonable follow-up,
            not done here since it needs its own query, not just this
            button reused. */}
        {!postingAsPage && (
          <div className="mt-3">
            {taggedProject ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface pl-3 pr-1.5 py-1 text-sm text-ink">
                <button
                  type="button"
                  onClick={() => setShowProjectPicker(true)}
                  className="flex items-center gap-1.5 min-w-0"
                  aria-label="Change tagged project"
                >
                  <Link2 size={13} className="text-ink-muted shrink-0" />
                  <span className="truncate max-w-[220px]">{taggedProject.title}</span>
                </button>
                <button
                  onClick={() => setTaggedProject(null)}
                  className="p-1 text-ink-muted"
                  aria-label="Remove tagged project"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowProjectPicker(true)}
                className="flex items-center gap-1.5 text-sm text-accent font-medium"
              >
                <Link2 size={15} />
                Tag a project
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMedia.isPending || mediaUrls.length >= MAX_MEDIA_FILES}
            className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
          >
            <ImageIcon size={18} />
            {uploadMedia.isPending ? "Uploading…" : mediaUrls.length > 0 ? "Add another slide" : "Add photos"}
          </button>
          <span
            className={`text-xs ${contentCounterClass(content.length, contentLimit)}`}
          >
            {content.length}/{contentLimit}
          </span>
        </div>

        {uploadError && <p className="text-danger text-sm mt-2">{uploadError}</p>}

        {(musicInPostsEnabled || musicCatalogueId) && (
        <div className="mt-6">
          {musicCatalogueId ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-accent-soft text-sm">
              <span className="text-accent truncate">
                ♫ {attachedMusic?.title ?? "Music attached"}
                {attachedMusic && <span className="text-ink-muted"> · {attachedMusic.primary_artist_name}</span>}
              </span>
              <button
                onClick={() => {
                  setMusicCatalogueId(null);
                  setAttachedMusic(null);
                }}
                className="text-ink-muted p-1"
                aria-label="Remove music"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddMusicOpen(true)}
              className="w-full flex items-center gap-2 text-sm font-medium text-ink-muted"
            >
              <MusicIcon size={16} />
              Add music
            </button>
          )}
        </div>
        )}

        {addMusicOpen && (
          <AddMusicSheet
            onSelect={(song) => {
              setMusicCatalogueId(song.id);
              setAttachedMusic(song);
              setAddMusicOpen(false);
            }}
            onClose={() => setAddMusicOpen(false)}
          />
        )}

        <div className="mt-6">
          <TopicPicker selected={topicIds} onToggle={toggleTopic} />
        </div>

        {error && (
          <p className="text-danger text-sm mt-4 bg-danger/10 rounded-xl p-3" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Sticky action bar — stays put at the bottom regardless of scroll
          position or whether categories are expanded above it. */}
      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-border px-4 py-3 flex items-center justify-between z-40">
        <button onClick={smartBack} className="text-ink-muted p-1" aria-label="Close">
          <X size={22} />
        </button>
        <div className="flex items-center gap-2">
          <button
            ref={moreButtonRef}
            onClick={() => setMoreMenuOpen(true)}
            disabled={!canPost || createPost.isPending || publishPost.isPending}
            className="text-ink-muted p-2 disabled:opacity-40"
            aria-label="More posting options"
          >
            <MoreHorizontal size={20} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canPost || createPost.isPending || publishPost.isPending}
            className="bg-accent text-canvas px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {createPost.isPending || publishPost.isPending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {showProjectPicker && me && (
        <TagProjectPicker
          userId={me.id}
          onSelect={(id, title) => {
            setTaggedProject({ id, title });
            setShowProjectPicker(false);
          }}
          onClose={() => setShowProjectPicker(false)}
        />
      )}

      {moreMenuOpen && (
        <DropdownMenu
          title="Post options"
          anchorRef={moreButtonRef}
          items={moreMenuItems}
          onClose={() => setMoreMenuOpen(false)}
        />
      )}

      {pagesOpen && <ProfilePagesModal mode="owner" navigateOnSwitch={false} onClose={() => setPagesOpen(false)} />}

      {leaveGuard.isBlocked && (
        <SaveProgressDialog
          description={
            resumingPostId
              ? `Save your changes as a draft to finish later, or discard them. The ${resumingKind} you opened stays as it was if you discard.`
              : "Save this post as a draft to finish later, or discard it."
          }
          saveDisabled={!canPost}
          saveHint="Add a heading or some details to save it as a draft."
          saving={leaveSaving}
          onSave={() => void handleLeaveSave()}
          onDiscard={leaveGuard.proceed}
          onKeepEditing={leaveGuard.stay}
        />
      )}
      {scheduleModalOpen && (
        <SchedulePostModal onClose={() => setScheduleModalOpen(false)} onConfirm={handleConfirmSchedule} />
      )}
    </div>
  );
}
