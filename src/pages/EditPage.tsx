// src/pages/EditPage.tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, Camera } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePageByUsername, usePageMembers, useUpdatePage } from "../hooks/usePages";
import { useCategories } from "../hooks/useCategories";
import { useUploadAvatar } from "../hooks/useUploadAvatar";
import { Avatar } from "../components/Avatar";
import { MentionTextarea } from "../components/MentionTextarea";

// /page/:username/edit — admin-only. Everything a page can change about
// itself: name, tagline, bio, avatar, cover, website, category. Reuses
// useUpdatePage (already existed, nothing called it yet) and
// useUploadAvatar for both avatar and cover — there's no separate
// "page media" bucket, and the storage RLS policy keys off the
// uploading human's auth.uid() regardless of which page they're
// editing, so the existing avatars bucket works fine for both.
export function EditPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { user } = useAuth();

  const { data: page, isLoading } = usePageByUsername(username!);
  const { data: members } = usePageMembers(page?.id ?? "");
  const { data: categories } = useCategories();
  const updatePage = useUpdatePage();
  const uploadAvatar = useUploadAvatar();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const myMembership = members?.find((m) => m.user_id === user?.id && m.status === "active");
  const isAdmin = !!myMembership?.is_admin;

  useEffect(() => {
    if (page && !hydrated) {
      setName(page.name);
      setTagline(page.tagline ?? "");
      setBio(page.bio ?? "");
      setWebsiteUrl(page.website_url ?? "");
      setCategoryId(page.category_id ?? "");
      setAvatarUrl(page.avatar_url);
      setCoverUrl(page.cover_url);
      setHydrated(true);
    }
  }, [page, hydrated]);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingAvatar(true);
    try {
      setAvatarUrl(await uploadAvatar.mutateAsync(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
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
      setCoverUrl(await uploadAvatar.mutateAsync(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
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

    try {
      await updatePage.mutateAsync({
        page_id: page.id,
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        bio: bio.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        category_id: categoryId || null,
        avatar_url: avatarUrl ?? undefined,
        cover_url: coverUrl ?? undefined,
      });
      navigate(`/page/${page.username}`);
    } catch (err: any) {
      setError(err.message ?? "Couldn't save those changes.");
    }
  }

  if (isLoading || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6 text-center">
        <p className="text-ink-muted">Only a {page.name} admin can edit its details.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Edit page</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cover */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="w-full aspect-[3/1] bg-surface rounded-2xl flex items-center justify-center overflow-hidden relative"
          >
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-ink-muted">
                {uploadingCover ? "Uploading…" : "Add a cover photo"}
              </span>
            )}
            <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-canvas/80 flex items-center justify-center">
              <Camera size={14} className="text-ink" />
            </span>
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleCoverSelect}
            className="hidden"
          />

          {/* Avatar — overlaps the cover slightly, same idea as most
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
              placeholder="yourwebsite.com"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          {categories && categories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={updatePage.isPending || uploadingAvatar || uploadingCover}
            className="w-full bg-accent text-canvas rounded-xl py-3 text-sm font-medium disabled:opacity-60"
          >
            {updatePage.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
