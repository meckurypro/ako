// src/components/course/LessonVideo.tsx
// A lesson's video, whichever way it's stored: an uploaded file (private bucket, signed link), a YouTube/Vimeo link,
// a direct video URL, or any other link.
import { useQuery } from "@tanstack/react-query";
import { PlayCircle } from "lucide-react";
import { signedCourseVideoUrl } from "../../lib/courseVideo";
import { resolveEmbed } from "../../lib/courseTypes";
import { VideoPlayer } from "./VideoPlayer";

// Re-exported so existing imports keep working; the logic lives in lib/courseTypes.ts (shared with the native app).
export { resolveEmbed };

export function useCourseVideoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["course-video-url", path],
    queryFn: () => signedCourseVideoUrl(path as string),
    enabled: !!path,
    staleTime: 5 * 3600_000,
    retry: 1,
  });
}

interface LessonVideoProps {
  videoPath?: string | null;
  mediaUrl?: string | null;
  width?: number | null;
  height?: number | null;
  title?: string;
  /** Second to resume from (files only: embeds are cross-origin and can't be seeked). */
  startAt?: number | null;
  onTime?: (seconds: number) => void;
  /** Fires when playback reaches the end (files only). */
  onWatched?: () => void;
}

export function LessonVideo({ videoPath, mediaUrl, width, height, title, startAt, onTime, onWatched }: LessonVideoProps) {
  const signed = useCourseVideoUrl(videoPath);

  if (videoPath) {
    if (signed.isError) {
      return (
        <div className="mb-2 flex aspect-video w-full items-center justify-center rounded-xl bg-surface px-4 text-center text-sm text-ink-muted">
          This video isn't available right now.
        </div>
      );
    }
    if (!signed.data) return <div className="mb-2 aspect-video w-full animate-pulse rounded-xl bg-surface" />;
    return <VideoPlayer src={signed.data} width={width} height={height} title={title} startAt={startAt} onTime={onTime} onEnded={onWatched} />;
  }

  const embed = resolveEmbed(mediaUrl);
  if (embed.type === "none") return null;
  if (embed.type === "youtube" || embed.type === "vimeo") {
    return (
      <div className="mb-2 aspect-video w-full overflow-hidden rounded-xl bg-canvas">
        <iframe src={embed.embedUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Lesson video" />
      </div>
    );
  }
  if (embed.type === "video") {
    return <VideoPlayer src={embed.url} width={width} height={height} title={title} startAt={startAt} onTime={onTime} onEnded={onWatched} />;
  }
  if (embed.type !== "link") return null;
  return (
    <a href={embed.url} target="_blank" rel="noopener noreferrer" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-accent">
      <PlayCircle size={15} />
      Open lesson video
    </a>
  );
}
