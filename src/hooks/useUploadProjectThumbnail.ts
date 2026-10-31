import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { BOOK_COVER_ERROR, isBookCoverRatio } from "../lib/bookCover";
import { cropToAspect } from "../lib/cropImage";

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

// Every project thumbnail is a 1:1 square except a book cover (2:3). Whatever shape a person uploads is cropped to the
// centre square before it is stored, so the file, the stored width and height, and what people see always agree.
const THUMBNAIL_SIZE_PX = 1200;

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
    // Pass a bare File for any normal thumbnail, or { file, bookCover: true } to enforce the 2:3 book-cover ratio.
    mutationFn: async (input: File | { file: File; bookCover?: boolean }): Promise<UploadedThumbnail> => {
      if (!user) throw new Error("Not signed in");
      const file = input instanceof File ? input : input.file;
      const bookCover = input instanceof File ? false : !!input.bookCover;

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Please choose a JPEG, PNG, WebP, or GIF image.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Image must be under 50MB.");
      }

      // Read dimensions from the file itself — independent of upload,
      // so this works the same regardless of where it's stored.
      const picked = await readImageDimensions(file);
      if (bookCover && !isBookCoverRatio(picked.width, picked.height)) throw new Error(BOOK_COVER_ERROR);

      // Book covers must already be 2:3 (checked above). Everything else is cropped to a centred square.
      const upload = bookCover ? file : await cropToAspect(file, 1, { maxWidth: THUMBNAIL_SIZE_PX });
      const { width, height } = bookCover ? picked : await readImageDimensions(upload);

      const ext = upload.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("post-media").upload(path, upload, { contentType: upload.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);

      return { url: data.publicUrl, width, height };
    },
  });
}
