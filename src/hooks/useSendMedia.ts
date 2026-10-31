// src/hooks/useSendMedia.ts
// Sends photos (one, or an album of up to 10) and documents into a 1:1 chat.
// Same shape as useSendVoiceNote: the bubble appears instantly from the local file
// (optimistic message), the real upload + insert happen in the background, and the
// optimistic row is swapped for the real one. Files go to the private "chat-media"
// bucket under `<uid>/dm/<conversationId>/…` — the first segment must be the uploader's
// own id and the conversation id lets the other participant read it back (see
// supabase/ako_chat_media_bucket.sql).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CHAT_MEDIA_BUCKET,
  MAX_ALBUM_ITEMS,
  MAX_MEDIA_BYTES,
  chatFileName,
  encodeMedia,
  fileExt,
  safeStorageName,
  type MediaItem,
  type MediaKind,
} from "../lib/chatMedia";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { getMessagesQueries, type MessageWithSender } from "./useMessaging";
import { MESSAGE_META_COLUMNS, metaInsertFields, metaOptimisticFields, type MessageMeta } from "../lib/messageKinds";

interface ReplySnippet {
  id: string;
  content: string;
  sender_id: string;
  is_deleted: boolean;
}

export interface SendMediaInput extends MessageMeta {
  kind: MediaKind;
  files: File[];
  caption?: string;
  /** Send photos at higher quality (WhatsApp's "HD"). */
  hd?: boolean;
  replyToMessageId?: string | null;
  replyToSnippet?: ReplySnippet | null;
}

const STANDARD = { maxEdge: 1600, quality: 0.8 };
const HD = { maxEdge: 2560, quality: 0.92 };

interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

/** Shrinks a photo like chat apps do before upload — big originals are the #1 reason sends feel slow. */
async function compressImage(file: File, hd: boolean): Promise<PreparedImage | null> {
  const { maxEdge, quality } = hd ? HD : STANDARD;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ? { blob, width, height } : null;
  } catch {
    return null; // the original is still a perfectly good upload
  }
}

/** Pixel size of an image File, for the optimistic bubble's aspect ratio. */
export async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size;
  } catch {
    return null;
  }
}

export function useSendMedia(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, files, caption, hd = false, replyToMessageId, ...meta }: SendMediaInput) => {
      if (!user) throw new Error("Not signed in");
      if (!files.length) throw new Error("No files");
      if (files.length > MAX_ALBUM_ITEMS) throw new Error("too_many");
      if (files.some((f) => f.size > MAX_MEDIA_BYTES)) throw new Error("too_large");

      const now = new Date();
      const items: MediaItem[] = await Promise.all(
        files.map(async (file, i) => {
          let body: Blob = file;
          let name = file.name || chatFileName("DOC", fileExt(file.name) || "bin", i, now);
          let mime = file.type || "application/octet-stream";
          let width: number | undefined;
          let height: number | undefined;

          if (kind === "image") {
            const prepared = await compressImage(file, hd);
            name = chatFileName("IMG", "jpg", i, now);
            if (prepared) {
              body = prepared.blob;
              mime = "image/jpeg";
              width = prepared.width;
              height = prepared.height;
            } else {
              const size = await readImageSize(file);
              width = size?.width;
              height = size?.height;
            }
          }

          // Random segment: the path is the only secret protecting a private answer's file (see useSendVoiceNote).
          const path = `${user.id}/dm/${conversationId}/${crypto.randomUUID()}/${i}-${safeStorageName(name)}`;
          const { error } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(path, body, { contentType: mime });
          if (error) throw error;
          return { kind, path, name, mime, size: body.size, width, height };
        })
      );

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: encodeMedia({ items, caption: caption?.trim() || undefined }),
          reply_to_message_id: replyToMessageId ?? null,
          ...metaInsertFields(meta),
        })
        .select(`id, conversation_id, sender_id, content, created_at, delivered_at, read_at, reply_to_message_id, is_deleted, ${MESSAGE_META_COLUMNS}`)
        .single();
      if (error) throw error;

      // Replying with media accepts a pending message request, same as sending text.
      const { error: acceptError } = await supabase
        .from("conversation_participants")
        .update({ is_request: false, archived_at: null })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .eq("is_request", true);
      if (acceptError) console.error("Failed to accept message request:", acceptError);

      return data;
    },
    onMutate: async ({ kind, files, caption, replyToMessageId, replyToSnippet, ...meta }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId], exact: false });
      const previousQueries = getMessagesQueries(queryClient, conversationId);
      const tempId = crypto.randomUUID();

      const sizes = kind === "image" ? await Promise.all(files.map(readImageSize)) : [];
      const optimistic: MessageWithSender = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user!.id,
        content: encodeMedia({
          items: files.map((f, i) => ({
            kind,
            url: URL.createObjectURL(f),
            name: f.name,
            mime: f.type,
            size: f.size,
            width: sizes[i]?.width,
            height: sizes[i]?.height,
          })),
          caption: caption?.trim() || undefined,
        }),
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        reply_to_message_id: replyToMessageId ?? null,
        is_deleted: false,
        reply_to: replyToSnippet ? [replyToSnippet] : null,
        client_key: tempId,
        ...metaOptimisticFields(meta),
      };
      for (const [key, existing] of previousQueries) {
        queryClient.setQueryData(key, [...(existing ?? []), optimistic]);
      }
      return { previousQueries, tempId };
    },
    onError: (_err, _input, context) => {
      if (!context) return;
      for (const [key, data] of context.previousQueries) queryClient.setQueryData(key, data);
    },
    onSuccess: (data, _input, context) => {
      if (context?.tempId) {
        for (const [key, existing] of getMessagesQueries(queryClient, conversationId)) {
          if (!existing) continue;
          queryClient.setQueryData(
            key,
            existing.map((m) =>
              m.id === context.tempId ? { ...(data as MessageWithSender), reply_to: m.reply_to, client_key: context.tempId } : m
            )
          );
        }
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["archived-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["my-participant-state", conversationId] });
    },
  });
}
