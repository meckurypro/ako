import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // matches the 5MB bucket limit set in 04_storage_buckets.sql
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function useUploadAvatar() {
  const { user } = useAuth();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error("Not signed in");

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Please choose a JPEG, PNG, WebP, or GIF image.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Image must be under 5MB.");
      }

      // Path convention MUST be {user_id}/filename — the storage RLS
      // policy from 04_storage_buckets.sql checks the first path segment
      // against auth.uid(), so anything else gets rejected at the
      // database level regardless of what this code does.
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return data.publicUrl;
    },
  });
}
