// src/pages/Compose.tsx

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Image as ImageIcon, ChevronDown, ChevronRight } from "lucide-react";
import { useCreatePost } from "../hooks/usePosts";
import { useCategories } from "../hooks/useCategories";
import { useUploadPostMedia, isVideoUrl } from "../hooks/useUploadPostMedia";
import { MentionTextarea } from "../components/MentionTextarea";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";

const HEADING_LIMIT = 50;
const MAX_MEDIA_FILES = 4;

export function Compose() {
  const navigate = useNavigate();
  const [heading, setHeading] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const createPost = useCreatePost();
  const uploadMedia = useUploadPostMedia();
  const { data: categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSubmit() {
    if (!canPost) return;
    setError(null);

    try {
      await createPost.mutateAsync({
        heading: heading.trim() || undefined,
        content,
        category_id: categoryId ?? undefined,
        media_urls: mediaUrls,
      });
      navigate("/feed");
    } catch (err) {
      // Moderation rejections and other edge-function errors surface here —
      // the message is already short and direct, no need to reword it.
      setError(err instanceof Error ? err.message : "Couldn't post this.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Bottom padding clears the fixed action bar so nothing sits behind it. */}
      <div className="max-w-xl mx-auto px-4 pt-4 pb-28">
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

        <div className="flex items-center justify-between mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
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
            {uploadMedia.isPending ? "Uploading…" : "Add photo/video"}
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
        <button onClick={() => navigate(-1)} className="text-ink-muted p-1" aria-label="Close">
          <X size={22} />
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
  );
}
