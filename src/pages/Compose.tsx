import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Image as ImageIcon } from "lucide-react";
import { useCreatePost } from "../hooks/usePosts";
import { useCategories } from "../hooks/useCategories";
import { useUploadPostMedia, isVideoUrl } from "../hooks/useUploadPostMedia";

const CONTENT_LIMIT = 1000;
const MAX_MEDIA_FILES = 4;

export function Compose() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const createPost = useCreatePost();
  const uploadMedia = useUploadPostMedia();
  const { data: categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!content.trim()) return;
    setError(null);

    try {
      await createPost.mutateAsync({
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
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <X size={22} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || createPost.isPending}
            className="bg-accent text-canvas px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {createPost.isPending ? "Posting…" : "Post"}
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={CONTENT_LIMIT}
          rows={8}
          autoFocus
          placeholder="What's on your mind?"
          className="w-full text-lg text-ink bg-transparent resize-none focus:outline-none placeholder:text-ink-muted/60"
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
            className={`text-xs ${
              content.length > CONTENT_LIMIT * 0.9 ? "text-danger" : "text-ink-muted"
            }`}
          >
            {content.length}/{CONTENT_LIMIT}
          </span>
        </div>

        {uploadError && <p className="text-danger text-sm mt-2">{uploadError}</p>}

        {categories && categories.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-ink-muted mb-2">Category (optional)</p>
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
          </div>
        )}

        {error && (
          <p className="text-danger text-sm mt-4 bg-danger/10 rounded-xl p-3" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
