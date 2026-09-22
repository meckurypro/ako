import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { enqueueOfflineWrite, isNetworkError, isOnline, offlineId } from "@/lib/offline";
import { useAuth } from "@/providers/AuthProvider";

export type ActiveIdentity = { mode: "personal" } | { mode: "page"; page: { id: string; name: string; username: string; avatar_url: string | null }; role_label: string; is_admin: boolean };
export type CreatePostInput = { heading?: string; content: string; interest_ids: string[]; media_urls: string[]; status?: "draft" | "scheduled"; scheduled_for?: string; posted_as_page_id?: string };
export type CreatePostResult = { id: string; pending?: boolean } & Record<string, unknown>;

async function message(error: unknown) {
  if (error instanceof FunctionsHttpError) try { const body = await error.context.json(); return body?.error ?? "Couldn't publish this post."; } catch { return "Couldn't publish this post."; }
  return error instanceof Error ? error.message : "Couldn't publish this post.";
}

async function enqueuePost(input: CreatePostInput): Promise<CreatePostResult> {
  await enqueueOfflineWrite({ op: "create-post", input });
  return { id: offlineId("post"), pending: true };
}

export function useActiveIdentity() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["active-identity", user?.id], enabled: !!user, queryFn: async (): Promise<ActiveIdentity> => {
    const { data: profile, error } = await supabase.from("profiles").select("active_page_id").eq("id", user!.id).single();
    if (error) throw error;
    if (!profile.active_page_id) return { mode: "personal" };
    const { data, error: memberError } = await supabase.from("page_members").select("role_label, is_admin, page:pages(id, name, username, avatar_url)").eq("page_id", profile.active_page_id).eq("user_id", user!.id).eq("status", "active").maybeSingle();
    if (memberError) throw memberError;
    const page = Array.isArray(data?.page) ? data.page[0] : data?.page;
    return page ? { mode: "page", page, role_label: data!.role_label, is_admin: data!.is_admin } : { mode: "personal" };
  } });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: CreatePostInput): Promise<CreatePostResult> => {
    if (!isOnline()) return enqueuePost(input);
    try {
      const { posted_as_page_id, ...body } = input;
      const { data, error } = posted_as_page_id ? await supabase.functions.invoke("create-page-post", { body: { ...body, page_id: posted_as_page_id } }) : await supabase.functions.invoke("create-post", { body });
      if (error) throw new Error(await message(error));
      if (data?.error) throw new Error(data.error);
      if (!data?.post) throw new Error("The server did not return the new post.");
      return data.post;
    } catch (error) {
      if (isNetworkError(error)) return enqueuePost(input);
      throw error;
    }
  }, onSuccess: () => { void qc.invalidateQueries({ queryKey: ["feed"] }); void qc.invalidateQueries({ queryKey: ["identity-posts"] }); } });
}

export function useUploadPostMedia() {
  const { user } = useAuth();
  return useMutation({ mutationFn: async (asset: { uri: string; mimeType?: string | null; fileName?: string | null; fileSize?: number | null }) => {
    if (!user) throw new Error("Not signed in");
    if (!isOnline()) throw new Error("Media uploads need internet. Save the text as a draft and upload media when you are back online.");
    const type = asset.mimeType ?? "";
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
    if ((asset.fileSize ?? 0) > 50 * 1024 * 1024) throw new Error("Each image must be under 50MB.");
    const bytes = await new File(asset.uri).arrayBuffer();
    if (bytes.byteLength === 0) throw new Error("The selected image could not be read. Please choose it again.");
    const ext = (asset.fileName?.split(".").pop() || type.split("/")[1] || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, bytes, { contentType: type, upsert: false });
    if (error) throw error;
    return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
  } });
}
