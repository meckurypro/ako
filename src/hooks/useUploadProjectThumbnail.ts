import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { matchesThumbSpec, type ThumbSpec } from "../lib/thumbnailSpec";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // matches the post-media bucket limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface UploadedThumbnail {
  url: string;
  width: number;
  height: number;
}

// Reads an image file's natural pixel dimensions BEFORE upload, so the stored width/height always describe the file
// that is actually uploaded (the database turns them into projects.thumbnail_shape).
export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
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

async function uploadToPostMedia(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
}

function checkFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Please choose a JPEG, PNG, WebP, or GIF image.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Image must be under 50MB.");
}

/**
 * Uploads a project thumbnail (public post-media bucket) and returns its URL and exact pixel size, which are stored on
 * the project. The image must ALREADY be the shape the project's type requires (`spec`, see lib/thumbnailSpec.ts):
 * anything else goes through the crop sheet first (useThumbnailCropper). This is the second lock behind the crop UI —
 * the database trigger is the third — so an off-shape thumbnail can't slip through.
 */
export function useUploadProjectThumbnail() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, spec }: { file: File; spec: ThumbSpec }): Promise<UploadedThumbnail> => {
      if (!user) throw new Error("Not signed in");
      checkFile(file);
      const { width, height } = await readImageDimensions(file);
      if (!matchesThumbSpec(width, height, spec)) {
        throw new Error(`This image isn't ${spec.label}. Crop it to that shape and try again.`);
      }
      return { url: await uploadToPostMedia(user.id, file), width, height };
    },
  });
}

/**
 * Uploads an ordinary public image exactly as it is — no shape rules. For pictures that are NOT a project's thumbnail
 * (a ticket's background template, an image inside a book chapter), which must keep their own shape.
 */
export function useUploadPublicImage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadedThumbnail> => {
      if (!user) throw new Error("Not signed in");
      checkFile(file);
      const { width, height } = await readImageDimensions(file);
      return { url: await uploadToPostMedia(user.id, file), width, height };
    },
  });
}
