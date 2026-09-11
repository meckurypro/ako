// src/pages/Compose.tsx

import { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { X, Image as ImageIcon, ChevronDown, ChevronRight, Link2, MoreHorizontal } from "lucide-react";
import { useCreatePost, useDeleteDraftOrScheduledPost } from "../hooks/usePosts";
import { useCategories } from "../hooks/useCategories";
import { useUploadPostMedia, isVideoUrl } from "../hooks/useUploadPostMedia";
import { useActiveIdentity } from "../hooks/usePages";
import { useMyProfile } from "../hooks/useProfile";
import { supabase } from "../lib/supabase";
import { Avatar } from "../components/Avatar";
import { MentionTextarea } from "../components/MentionTextarea";
import { TagProjectPicker } from "../components/TagProjectPicker";
import { DropdownMenu, type DropdownMenuItem } from "../components/DropdownMenu";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";

const HEADING_LIMIT = 50;
const MAX_MEDIA_FILES = 4;

export function Compose() {
  const navigate = useNavigate();
  const location = useLocation();
  const smartBack = useSmartBack();
  const [heading, setHeading] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Item 10: tag one of your own projects into the post — stored as
  // just the id (what actually gets posted) plus a title snapshot
  // (so the picker pill below can show something without waiting on
  // a fresh fetch of the project itself).
  const [taggedProject, setTaggedProject] = useState<{ id: string; title: string } | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const createPost = useCreatePost();
  const deleteDraftOrScheduled = useDeleteDraftOrScheduledPost();
  const uploadMedia = useUploadPostMedia();
  const { data: categories } = useCategories();
  const { data: identity } = useActiveIdentity();
  const { data: me } = useMyProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const toast = useToast();

  // Resuming a draft (see DraftPosts.tsx's "Resume" button) — loaded
  // directly rather than through create-post's edge function, since
  // this is just reading the author's own unpublished row back, not
  // creating or moderating anything. Kept in a ref (not state) since
  // it's read once, at submit time, to know which row to clean up —
  // re-fetching it or reacting to it changing isn't needed.
  const resumingDraftId = (location.state as { draftId?: string } | null)?.draftId ?? null;
  const resumedDraftIdRef = useRef(resumingDraftId);

  useEffect(() => {
    if (!resumingDraftId) return;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("heading, content, category_id, media_urls")
        .eq("id", resumingDraftId)
        .single();
      if (fetchError || !data) {
        toast("Couldn't load that draft.", { variant: "error" });
        return;
      }
      setHeading(data.heading ?? "");
      setContent(data.content ?? "");
      setCategoryId(data.category_id ?? null);
      setMediaUrls(data.media_urls ?? []);
    })();
    // Only ever needs to run once, on mount — this is a one-time
    // prefill, not a live sync with the draft row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Who this post will be attributed to — set once, from whichever mode
  // was active when Compose opened (switching mid-draft would be
  // confusing, so we don't watch for that here).
  const postingAsPage = identity?.mode === "page" ? identity.page : null;

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  // A post can be heading-only or details-only — either is enough to post.
  const canPost = heading.trim().length > 0 || content.trim().length > 0;

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

  async function submitPost(status: "published" | "draft" | "scheduled", scheduledFor?: string) {
    if (!canPost) return;
    setError(null);

    try {
      await createPost.mutateAsync({
        heading: heading.trim() || undefined,
        content,
        category_id: categoryId ?? undefined,
        media_urls: mediaUrls,
        posted_as_page_id: postingAsPage?.id,
        tagged_project_id: taggedProject?.id,
        // Omitted entirely for the normal "Post now" path so a create-post
        // deployment that predates the drafts/scheduling migration (see
        // supabase-fixes/) keeps working exactly as it always did —
        // only a draft/scheduled save sends anything new.
        ...(status !== "published" ? { status, scheduled_for: scheduledFor } : {}),
      });

      if (status === "draft") {
        toast("Saved to your drafts.", { variant: "success" });
        if (resumedDraftIdRef.current) deleteDraftOrScheduled.mutate(resumedDraftIdRef.current);
        navigate("/activity/drafts");
      } else if (status === "scheduled") {
        toast("Scheduled — it'll post automatically.", { variant: "success" });
        if (resumedDraftIdRef.current) deleteDraftOrScheduled.mutate(resumedDraftIdRef.current);
        navigate("/activity/scheduled");
      } else {
        if (resumedDraftIdRef.current) deleteDraftOrScheduled.mutate(resumedDraftIdRef.current);
        navigate(postingAsPage ? `/page/${postingAsPage.username}` : "/feed");
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

  function handleSubmit() {
    void submitPost("published");
  }

  function handleSaveDraft() {
    void submitPost("draft");
  }

  function handleConfirmSchedule() {
    if (!scheduleValue) return;
    const iso = new Date(scheduleValue).toISOString();
    setScheduleModalOpen(false);
    void submitPost("scheduled", iso);
  }

  const moreMenuItems: DropdownMenuItem[] = [
    {
      key: "draft",
      label: "Save as draft",
      onSelect: handleSaveDraft,
      disabled: !canPost,
    },
    {
      key: "schedule",
      label: "Schedule…",
      onSelect: () => setScheduleModalOpen(true),
      disabled: !canPost,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      {/* Bottom padding clears the fixed action bar so nothing sits behind it. */}
      <div className="max-w-xl mx-auto px-4 pt-4 pb-28">
        {/* Who this posts as — reflects account mode (see /pages). Not
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
                · <Link to="/pages" className="text-accent">switch</Link>
              </>
            )}
          </p>
        </div>

        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value.slice(0, HEADING_LIMIT))}
          maxLength={HEADING_LIMIT}
          placeholder="Heading (optional)"
          className="w-full font-display text-2xl leading-tight text-ink bg-transparent focus:outline-none placeholder:text-ink-muted/60 mb-1"
        />
        <p className="text-xs text-ink-muted mb-3">{heading.length}/{HEADING_LIMIT}</p>

        <MentionTextarea
          value={content}
          onChange={setContent}
          maxLength={CONTENT_LIMIT}
          rows={8}
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
                <Link2 size={13} className="text-ink-muted" />
                <span className="truncate max-w-[220px]">{taggedProject.title}</span>
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
            className={`text-xs ${contentCounterClass(content.length)}`}
          >
            {content.length}/{CONTENT_LIMIT}
          </span>
        </div>

        {uploadError && <p className="text-danger text-sm mt-2">{uploadError}</p>}

        {categories && categories.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setCategoriesOpen((o) => !o)}
              className="w-full flex items-center justify-between text-sm font-medium text-ink-muted mb-2"
            >
              <span>
                Category (optional)
                {selectedCategory && !categoriesOpen && (
                  <span className="text-ink"> · {selectedCategory.name}</span>
                )}
              </span>
              {categoriesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {categoriesOpen && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() =>
                      setCategoryId(categoryId === category.id ? null : category.id)
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      categoryId === category.id
                        ? "bg-accent text-canvas border-accent"
                        : "bg-surface text-ink border-border"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
            disabled={!canPost || createPost.isPending}
            className="text-ink-muted p-2 disabled:opacity-40"
            aria-label="More posting options"
          >
            <MoreHorizontal size={20} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canPost || createPost.isPending}
            className="bg-accent text-canvas px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {createPost.isPending ? "Posting…" : "Post"}
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
          anchorRef={moreButtonRef}
          items={moreMenuItems}
          onClose={() => setMoreMenuOpen(false)}
          widthClass="w-48"
        />
      )}

      {scheduleModalOpen && (
        <Modal onClose={() => setScheduleModalOpen(false)} ariaLabel="Schedule post">
          <h2 className="font-display text-lg text-ink mb-1">Schedule this post</h2>
          <p className="text-sm text-ink-muted mb-4">
            It'll post automatically at the time you pick — you can find it under Activity →
            Scheduled until then.
          </p>
          <input
            type="datetime-local"
            value={scheduleValue}
            min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
            onChange={(e) => setScheduleValue(e.target.value)}
            className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink border border-border"
          />
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSchedule}
              disabled={!scheduleValue}
              className="flex-1 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
            >
              Schedule
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
