// src/pages/EditPage.tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useReturnAfterSave } from "../hooks/useReturnAfterSave";
import { useToast } from "../components/Toast";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, Camera, MoreHorizontal, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  usePageByUsername,
  usePageMembers,
  useUpdatePage,
  usePageTopics,
  useMyPagePermissions,
  useResolvePageOwner,
  useDeletePage,
} from "../hooks/usePages";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DropdownMenu } from "../components/DropdownMenu";
import { TopicPicker, MAX_TOPICS } from "../components/TopicPicker";
import { useUploadAvatar } from "../hooks/useUploadAvatar";
import { Avatar } from "../components/Avatar";
import { MentionTextarea } from "../components/MentionTextarea";
import { PageHeroEditor } from "../components/PageHeroEditor";
import { TemplatePicker } from "../components/pageTemplate/TemplatePicker";
import { BANNER_ASPECT, normalizeWebsite } from "../hooks/usePageLanding";
import { cropToAspect } from "../lib/cropImage";
import { friendlyError } from "../lib/friendlyError";
import { useErrorNotice } from "../components/ErrorNotice";

// /page/:username/edit — admin-only. Everything a page can change about
// itself: name, tagline, bio, avatar, banner, website, topics, hero slides. Reuses
// useUpdatePage (already existed, nothing called it yet) and
// useUploadAvatar for both avatar and cover — there's no separate
// "page media" bucket, and the storage RLS policy keys off the
// uploading human's auth.uid() regardless of which page they're
// editing, so the existing avatars bucket works fine for both.
export function EditPage() {
  const notifyError = useErrorNotice();
  const { username } = useParams<{ username: string }>();
  const returnAfterSave = useReturnAfterSave();
  const toast = useToast();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: page, isLoading } = usePageByUsername(username!);
  const { data: members } = usePageMembers(page?.id ?? "");
  const { data: existingTopicIds } = usePageTopics(page?.id);
  const updatePage = useUpdatePage();
  const uploadAvatar = useUploadAvatar();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [topicIds, setTopicIds] = useState<Set<string>>(new Set());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const myMembership = members?.find((m) => m.user_id === user?.id && m.status === "active");
  const isAdmin = !!myMembership?.is_admin;
  // Admins, or a member an admin granted "edit page details" to.
  const { data: myPagePerms, isLoading: permsLoading } = useMyPagePermissions(page?.id);
  const canEdit = isAdmin || !!myPagePerms?.permissions.edit_page;
  // Deleting a page is deliberately tucked away down here, not on the page itself. Only the
  // resolved owner (the creator, or their successor) can do it — the RPC enforces the same.
  const { data: pageOwnerId } = useResolvePageOwner(page?.id ?? "", isAdmin);
  const isOwnerOfPage = isAdmin && !!user && pageOwnerId === user.id;
  const deletePage = useDeletePage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const { hash } = useLocation();

  useEffect(() => {
    if (page && !hydrated) {
      setName(page.name);
      setTagline(page.tagline ?? "");
      setBio(page.bio ?? "");
      setWebsiteUrl(page.website_url ?? "");
      setAvatarUrl(page.avatar_url);
      setCoverUrl(page.cover_url);
      setHydrated(true);
    }
  }, [page, hydrated]);

  useEffect(() => {
    if (existingTopicIds) setTopicIds(new Set(existingTopicIds));
  }, [existingTopicIds]);

  function toggleTopic(interestId: string) {
    setTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) {
        next.delete(interestId);
      } else {
        if (next.size >= MAX_TOPICS) return prev;
        next.add(interestId);
      }
      return next;
    });
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingAvatar(true);
    try {
      setAvatarUrl(await uploadAvatar.mutateAsync(file));
    } catch (err) {
      setError(friendlyError(err, "Upload failed."));
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingCover(true);
    try {
      // Cropped to the banner's shape first, so what's previewed here is what visitors see.
      setCoverUrl(await uploadAvatar.mutateAsync(await cropToAspect(file, BANNER_ASPECT, { maxWidth: 1600 })));
    } catch (err) {
      setError(friendlyError(err, "Upload failed."));
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!page) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    // A page has exactly one website. Blank clears it; anything else must be a real address.
    const website = normalizeWebsite(websiteUrl);
    if (websiteUrl.trim() && !website) {
      setError("That website address doesn't look right. Try something like yourwebsite.com.");
      return;
    }

    try {
      await updatePage.mutateAsync({
        page_id: page.id,
        name: name.trim(),
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
        website_url: website,
        topic_ids: Array.from(topicIds),
        avatar_url: avatarUrl ?? undefined,
        cover_url: coverUrl,
      });
      toast("Page updated.", { variant: "success" });
      await returnAfterSave({ fallback: `/page/${page.username}` });
    } catch (err: any) {
      notifyError(err, "Couldn't save those changes.");
    }
  }

  // Arrived from the page's "…" menu → "Hero slides": bring that section into view.
  const pageLoaded = !!page;
  useEffect(() => {
    if (hash === "#hero" && pageLoaded) heroRef.current?.scrollIntoView({ block: "start" });
    if (hash === "#template" && pageLoaded) templateRef.current?.scrollIntoView({ block: "start" });
  }, [hash, pageLoaded]);

  if (isLoading || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!canEdit) {
    if (permsLoading) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6 text-center">
        <p className="text-ink-muted">You don't have permission to edit {page.name}'s details.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-32">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink flex-1">Edit page</h2>
          {/* Destructive actions live behind this, not on the page — nobody should hit Delete while looking for Save. */}
          {isOwnerOfPage && (
            <>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="More options"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5"
              >
                <MoreHorizontal size={22} />
              </button>
              {menuOpen && (
                <DropdownMenu
                  title="More options"
                  anchorRef={menuButtonRef}
                  onClose={() => setMenuOpen(false)}
                  items={[
                    {
                      key: "delete",
                      label: "Delete page",
                      icon: <Trash2 />,
                      variant: "danger",
                      onSelect: () => setShowDeleteConfirm(true),
                    },
                  ]}
                />
              )}
            </>
          )}
        </div>

        <form id="edit-page-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Banner — like a YouTube / Facebook cover: a wide image across the top of the page. */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-ink-muted">Banner</label>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
                  className="flex items-center gap-1 text-xs text-danger"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-full aspect-[8/3] bg-surface rounded-2xl flex items-center justify-center overflow-hidden relative"
            >
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-ink-muted">
                  {uploadingCover ? "Uploading…" : "Add a banner"}
                </span>
              )}
              <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-canvas/80 flex items-center justify-center">
                <Camera size={14} className="text-ink" />
              </span>
            </button>
            <p className="mt-1 text-xs text-ink-muted">Wide image, cropped to fit. Around 1600 × 600 works best.</p>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleCoverSelect}
            className="hidden"
          />

          {/* Avatar — overlaps the banner slightly, same idea as most
              social apps' page/profile edit screens. */}
          <div className="-mt-12 ml-1">
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="relative inline-block">
              <Avatar src={avatarUrl} name={name || page.name} size="xl" />
              <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-canvas border-2 border-canvas bg-surface flex items-center justify-center">
                <Camera size={12} className="text-ink" />
              </span>
            </button>
            {uploadingAvatar && <p className="text-xs text-ink-muted mt-1">Uploading…</p>}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarSelect}
            className="hidden"
          />

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Tagline</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Bio</label>
            <MentionTextarea
              value={bio}
              onChange={setBio}
              maxLength={280}
              rows={3}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Website</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="yourwebsite.com"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          <TopicPicker selected={topicIds} onToggle={toggleTopic} />

          {error && <p className="text-sm text-danger">{error}</p>}
        </form>

        {/* Outside the form on purpose: every change here saves by itself, and Enter in a
            slide's title must not submit the page details above. */}
        <div id="hero" ref={heroRef} className="mt-8 scroll-mt-4 border-t border-border pt-6">
          <PageHeroEditor page={page} />
        </div>

        <div id="template" ref={templateRef} className="mt-8 scroll-mt-4 border-t border-border pt-6">
          <TemplatePicker page={page} />
        </div>
      </div>

      {/* Save — always at the bottom, always in reach. Submits the details form above. */}
      <div className="fixed inset-x-0 bottom-0 z-chrome border-t border-border bg-canvas/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            type="submit"
            form="edit-page-form"
            disabled={updatePage.isPending || uploadingAvatar || uploadingCover}
            className="w-full rounded-xl bg-accent py-3 text-sm font-medium text-canvas disabled:opacity-60"
          >
            {updatePage.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete this page?"
          description={`${page.name} will disappear from search and everyone's feed. This can't be undone from here.`}
          confirmLabel="Delete"
          onConfirm={() => {
            setShowDeleteConfirm(false);
            deletePage.mutate(page.id, {
              onSuccess: () => navigate("/me", { replace: true }),
            });
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
