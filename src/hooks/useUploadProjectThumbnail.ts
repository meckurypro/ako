import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // matches the post-media bucket limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface UploadedThumbnail {
  url: string;
  width: number;
  height: number;
}

// --------------------------------------------------------
// Reads an image file's natural pixel dimensions BEFORE upload.
// This is what makes the thumbnail's displayed aspect ratio dynamic
// instead of a hardcoded aspect-video (16:9) — ProjectCard and the
// create/edit forms use these stored numbers to set
// `aspect-ratio: width / height` on the container, matching
// whatever the creator actually uploaded (portrait, square,
// ultra-wide, anything).
// --------------------------------------------------------
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read this image. Try a different file."));
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a project thumbnail (reuses the public post-media bucket —
 * thumbnails are meant to be publicly visible, same as post images)
 * and returns both the public URL and the image's natural
 * width/height, so the aspect ratio can be stored on the project row
 * and reproduced exactly wherever the thumbnail is shown.
 */
export function useUploadProjectThumbnail() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadedThumbnail> => {
      if (!user) throw new Error("Not signed in");

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Please choose a JPEG, PNG, WebP, or GIF image.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Image must be under 50MB.");
      }

      // Read dimensions from the file itself — independent of upload,
      // so this works the same regardless of where it's stored.
      const { width, height } = await readImageDimensions(file);

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);

      return { url: data.publicUrl, width, height };
    },
  });
}
