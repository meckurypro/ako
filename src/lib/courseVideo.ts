// src/lib/courseVideo.ts
// Direct video upload for course lessons: private `course-videos` bucket, up to 1 GB, resumable (TUS).
import { supabase } from "./supabase";
import { startResumableUpload, type ResumableUploadHandle } from "./resumableUpload";

export const COURSE_VIDEO_BUCKET = "course-videos";
export const MAX_COURSE_VIDEO_BYTES = 1024 * 1024 * 1024; // matches the bucket's file_size_limit
export const COURSE_VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,video/x-m4v";
const ALLOWED = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);

export interface VideoMeta {
  width: number;
  height: number;
  duration: number;
}

export function validateCourseVideo(file: File): string | null {
  const type = file.type || (/\.mov$/i.test(file.name) ? "video/quicktime" : /\.mp4$/i.test(file.name) ? "video/mp4" : "");
  if (!ALLOWED.has(type)) return "Use an MP4, MOV or WebM video.";
  if (file.size > MAX_COURSE_VIDEO_BYTES) return "Videos can be up to 1 GB.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

/** Reads width, height and duration from the file itself, before anything is uploaded. */
export function readVideoMeta(file: File): Promise<VideoMeta | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    let settled = false;
    const done = (meta: VideoMeta | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      v.load();
      resolve(meta);
    };
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => done({ width: v.videoWidth, height: v.videoHeight, duration: Number.isFinite(v.duration) ? Math.round(v.duration) : 0 });
    v.onerror = () => done(null);
    window.setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^(mp4|mov|webm|m4v)$/.test(fromName)) return fromName;
  return file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4";
}

export function courseVideoPath(userId: string, projectId: string, file: File): string {
  return `${userId}/${projectId}/${crypto.randomUUID()}.${extensionOf(file)}`;
}

export function uploadCourseVideo(opts: {
  file: File;
  userId: string;
  projectId: string;
  onProgress: (pct: number) => void;
  onStall?: () => void;
}): { path: string; handle: ResumableUploadHandle } {
  const path = courseVideoPath(opts.userId, opts.projectId, opts.file);
  const handle = startResumableUpload({
    file: opts.file,
    bucket: COURSE_VIDEO_BUCKET,
    path,
    onProgress: opts.onProgress,
    onStall: opts.onStall,
  });
  return { path, handle };
}

/** Best effort: a leftover file is harmless, a failed cleanup shouldn't block the creator. */
export async function removeCourseVideos(paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  try {
    await supabase.storage.from(COURSE_VIDEO_BUCKET).remove(list);
  } catch {
    /* ignore */
  }
}

export async function signedCourseVideoUrl(path: string, expiresInSeconds = 6 * 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(COURSE_VIDEO_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw error ?? new Error("Couldn't load this video.");
  return data.signedUrl;
}
