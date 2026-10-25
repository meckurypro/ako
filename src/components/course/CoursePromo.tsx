// src/components/course/CoursePromo.tsx
// The course trailer: plays the creator's promo video (upload or link) for anyone deciding whether to buy.
import { useCourseDetails } from "../../hooks/useCourseBuilder";
import { LessonVideo } from "./LessonVideo";

export function CoursePromo({ projectId }: { projectId: string | undefined }) {
  const { data: details } = useCourseDetails(projectId);
  if (!details || (!details.promo_video_path && !details.promo_url)) return null;
  return (
    <div className="mb-3">
      <LessonVideo
        videoPath={details.promo_video_path}
        mediaUrl={details.promo_url}
        width={details.promo_width}
        height={details.promo_height}
        title="Course promo"
      />
    </div>
  );
}
