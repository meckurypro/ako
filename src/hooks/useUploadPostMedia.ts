import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // matches the 50MB post-media bucket limit
// Video removed from posts — item 4: posts are text, images, or slides
// (multiple images) only, going forward. isVideoUrl below is kept:
// posts uploaded before this restriction may still carry a video URL
// in media_urls, and those need to keep rendering correctly.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function useUploadPostMedia() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error("Not signed in");

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Please choose a JPEG, PNG, WebP, or GIF image.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File must be under 50MB.");
      }

      // Same path convention as avatars — {user_id}/... — enforced by
      // the post-media bucket's RLS policy (04_storage_buckets.sql).
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      return data.publicUrl;
    },
  });
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
}
