// src/components/course/LessonVideoField.tsx
// The video part of a lesson form: upload a file (up to 1 GB, resumable), replace or remove it, or paste a link instead.
// A file uploaded here but not yet saved with the lesson is "pending": it's deleted again if the creator cancels or
// replaces it, so abandoned uploads don't pile up in storage.
import { useEffect, useRef, useState } from "react";
import { Film, Link2, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  COURSE_VIDEO_ACCEPT,
  readVideoMeta,
  removeCourseVideos,
  uploadCourseVideo,
  validateCourseVideo,
} from "../../lib/courseVideo";
import { UPLOAD_CANCELLED, type ResumableUploadHandle } from "../../lib/resumableUpload";
import { formatDuration, isPortraitVideo, videoLinkProblem } from "../../lib/courseTypes";
import { friendlyError } from "../../lib/friendlyError";
import { useCourseVideoUrl } from "./LessonVideo";

export interface VideoValue {
  videoPath: string | null;
  videoWidth: number | null;
  videoHeight: number | null;
  videoDuration: number | null;
  mediaUrl: string;
}

export const EMPTY_VIDEO: VideoValue = { videoPath: null, videoWidth: null, videoHeight: null, videoDuration: null, mediaUrl: "" };

function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024 * 1024 ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;
}

export function LessonVideoField({
  projectId,
  value,
  savedPath,
  onChange,
  onBusyChange,
}: {
  projectId: string;
  value: VideoValue;
  /** The path the lesson currently has in the database (null for a new lesson). Never deleted from here. */
  savedPath: string | null;
  onChange: (next: VideoValue) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<ResumableUploadHandle | null>(null);
  const [mode, setMode] = useState<"upload" | "link">(value.mediaUrl && !value.videoPath ? "link" : "upload");
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [stalled, setStalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useCourseVideoUrl(progress === null ? value.videoPath : null);

  const uploading = progress !== null;

  // Leaving the form mid-upload stops it.
  useEffect(
    () => () => {
      handleRef.current?.abort();
    },
    []
  );

  // An upload that never got saved with the lesson is deleted when it's replaced or removed.
  const dropIfPending = (path: string | null) => {
    if (path && path !== savedPath) void removeCourseVideos([path]);
  };

  async function pick(file: File | undefined) {
    if (!file || !user) return;
    setError(null);
    const problem = validateCourseVideo(file);
    if (problem) {
      setError(problem);
      return;
    }
    const meta = await readVideoMeta(file);
    setFileName(file.name);
    setFileSize(file.size);
    setProgress(0);
    setStalled(false);
    onBusyChange(true);
    const { path, handle } = uploadCourseVideo({
      file,
      userId: user.id,
      projectId,
      onProgress: (pct) => {
        setProgress(pct);
        setStalled(false);
      },
      onStall: () => setStalled(true),
    });
    handleRef.current = handle;
    try {
      await handle.promise;
      dropIfPending(value.videoPath);
      onChange({
        videoPath: path,
        videoWidth: meta?.width ?? null,
        videoHeight: meta?.height ?? null,
        videoDuration: meta?.duration ?? null,
        mediaUrl: "",
      });
    } catch (err) {
      if (!(err instanceof Error) || err.message !== UPLOAD_CANCELLED) setError(friendlyError(err, "The upload didn't finish."));
      void removeCourseVideos([path]);
    } finally {
      handleRef.current = null;
      setProgress(null);
      onBusyChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const cancelUpload = () => handleRef.current?.abort();

  const hasFile = !!value.videoPath;
  const portrait = isPortraitVideo(value.videoWidth, value.videoHeight);

  return (
    <div className="flex flex-col gap-2">
      <input ref={inputRef} type="file" accept={COURSE_VIDEO_ACCEPT} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />

      {!hasFile && !uploading && (
        <div className="flex gap-1 self-start rounded-full bg-surface p-0.5 text-xs font-medium">
          {(["upload", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 ${mode === m ? "bg-accent text-canvas" : "text-ink-muted"}`}
            >
              {m === "upload" ? <Upload size={12} /> : <Link2 size={12} />}
              {m === "upload" ? "Upload" : "Link"}
            </button>
          ))}
        </div>
      )}

      {uploading && (
        <div className="rounded-xl border border-border bg-canvas p-3">
          <div className="mb-1.5 flex items-center gap-2 text-sm text-ink">
            <Film size={15} className="flex-shrink-0 text-ink-muted" />
            <span className="min-w-0 flex-1 truncate">{fileName}</span>
            <span className="flex-shrink-0 text-xs text-ink-muted">{fmtSize(fileSize)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
            <span>{stalled ? "Reconnecting…" : `Uploading ${progress}%`}</span>
            <button type="button" onClick={cancelUpload} className="flex items-center gap-1 font-medium text-danger">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      {hasFile && !uploading && (
        <div className="rounded-xl border border-border bg-canvas p-2.5">
          <div className="flex items-center gap-3">
            <div className={`relative flex-shrink-0 overflow-hidden rounded-lg bg-black ${portrait ? "h-16 w-9" : "h-14 w-24"}`}>
              {preview.data ? <video src={`${preview.data}#t=0.5`} muted playsInline preload="metadata" className={`h-full w-full ${portrait ? "object-cover" : "object-contain"}`} /> : null}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-ink">Video uploaded</p>
              <p className="text-xs text-ink-muted">
                {[value.videoDuration ? formatDuration(value.videoDuration) : null, value.videoWidth && value.videoHeight ? (portrait ? "9:16" : "16:9") : null]
                  .filter(Boolean)
                  .join(" · ") || "Ready"}
              </p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-ink"
            >
              <RefreshCw size={14} /> Replace
            </button>
            <button
              type="button"
              onClick={() => {
                dropIfPending(value.videoPath);
                onChange({ ...EMPTY_VIDEO });
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-danger"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      )}

      {!hasFile && !uploading && mode === "upload" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-center"
        >
          <Upload size={20} className="text-accent" />
          <span className="text-sm font-medium text-ink">Choose a video</span>
          <span className="text-xs text-ink-muted">MP4, MOV or WebM, up to 1 GB</span>
        </button>
      )}

      {!hasFile && !uploading && mode === "link" && (
        <input
          type="url"
          placeholder="YouTube, Vimeo or direct video link"
          value={value.mediaUrl}
          onChange={(e) => onChange({ ...value, mediaUrl: e.target.value })}
          className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink"
        />
      )}

      {!hasFile && !uploading && mode === "link" && videoLinkProblem(value.mediaUrl) && (
        <p className="text-xs text-danger">{videoLinkProblem(value.mediaUrl)}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
