// src/pages/EditPost.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Image as ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useUpdatePost, canEditPost } from "../hooks/usePosts";
import { useUploadPostMedia, isVideoUrl } from "../hooks/useUploadPostMedia";
import { useAuth } from "../hooks/useAuth";
import { MentionTextarea } from "../components/MentionTextarea";
import type { PostWithAuthor } from "../types/database";

const HEADING_LIMIT = 50;
const CONTENT_LIMIT = 1000;
const MAX_MEDIA_FILES = 4;

function usePostForEdit(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async (): Promise<PostWithAuthor> => {
      const { data, error } = await supabase
        .from("posts")
        .select(`*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier)`)
        .eq("id", postId)
        .single();
      if (error) throw error;
      return data as unknown as PostWithAuthor;
    },
    enabled: !!postId,
  });
}

export function EditPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: post, isLoading } = usePostForEdit(postId!);
  const updatePost = useUpdatePost();
  const uploadMedia = useUploadPostMedia();

  const [heading, setHeading] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill once the post loads — a plain useState default won't
  // work here since the query resolves after first render.
  useEffect(() => {
    if (post && !initialized) {
      setHeading(post.heading ?? "");
      setContent(post.content);
      setMediaUrls(post.media_urls);
      setInitialized(true);
    }
  }, [post, initialized]);

  const canSave = heading.trim().length > 0 || content.trim().length > 0;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

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
    if (!canSave || !postId) return;
    setError(null);

    try {
      await updatePost.mutateAsync({
        post_id: postId,
        heading: heading.trim() || undefined,
        content,
        category_id: post?.category_id ?? null,
        media_urls: mediaUrls,
      });
      navigate(`/post/${postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    }
  }

  if (isLoading || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (post.author_id !== user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <p className="text-ink-muted text-center">You can only edit your own posts.</p>
      </div>
    );
  }

  if (!canEditPost(post)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 text-center gap-2">
        <p className="text-ink">The 15-minute edit window for this post has passed.</p>
        <button onClick={() => navigate(-1)} className="text-accent text-sm font-medium">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
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
            className={`text-xs ${
              content.length > CONTENT_LIMIT * 0.9 ? "text-danger" : "text-ink-muted"
            }`}
          >
            {content.length}/{CONTENT_LIMIT}
          </span>
        </div>

        {uploadError && <p className="text-danger text-sm mt-2">{uploadError}</p>}

        {error && (
          <p className="text-danger text-sm mt-4 bg-danger/10 rounded-xl p-3" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-border px-4 py-3 flex items-center justify-between z-40">
        <button onClick={() => navigate(-1)} className="text-ink-muted p-1" aria-label="Close">
          <X size={22} />
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSave || updatePost.isPending}
          className="bg-accent text-canvas px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
        >
          {updatePost.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
