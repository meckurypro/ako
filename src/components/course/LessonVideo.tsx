// src/components/course/LessonVideo.tsx
// A lesson's video, whichever way it's stored: an uploaded file (private bucket, signed link), a YouTube/Vimeo link,
// a direct video URL, or any other link.
import { useQuery } from "@tanstack/react-query";
import { PlayCircle } from "lucide-react";
import { signedCourseVideoUrl } from "../../lib/courseVideo";
import { VideoPlayer } from "./VideoPlayer";

type EmbedKind = { type: "youtube" | "vimeo"; embedUrl: string } | { type: "video" } | { type: "link" };

export function resolveEmbed(url: string): EmbedKind {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)) return { type: "video" };
  return { type: "link" };
}

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

  if (!mediaUrl) return null;
  const embed = resolveEmbed(mediaUrl);
  if (embed.type === "youtube" || embed.type === "vimeo") {
    return (
      <div className="mb-2 aspect-video w-full overflow-hidden rounded-xl bg-canvas">
        <iframe src={embed.embedUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Lesson video" />
      </div>
    );
  }
  if (embed.type === "video") {
    return <VideoPlayer src={mediaUrl} width={width} height={height} title={title} startAt={startAt} onTime={onTime} onEnded={onWatched} />;
  }
  return (
    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-accent">
      <PlayCircle size={15} />
      Open lesson video
    </a>
  );
}
