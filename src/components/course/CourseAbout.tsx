// src/components/course/CourseAbout.tsx
// "What you'll learn", requirements and who it's for: the standard course-page summary.
import { Check } from "lucide-react";
import type { CourseDetails } from "../../hooks/useCourseBuilder";
import { COURSE_LEVELS } from "../../lib/courseTypes";

export function CourseAbout({ details, lessons, minutes }: { details: CourseDetails | null | undefined; lessons: number; minutes: number }) {
  if (!details) return null;
  const level = COURSE_LEVELS.find((l) => l.value === details.level)?.label;
  const meta = [level, details.language, lessons > 0 ? `${lessons} lesson${lessons === 1 ? "" : "s"}` : null, minutes > 0 ? (minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`) : null]
    .filter(Boolean)
    .join(" · ");
  const hasAny = details.subtitle || details.objectives.length || details.requirements.length || details.audience.length;
  if (!hasAny) return null;

  return (
    <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      {details.subtitle && <p className="text-[15px] leading-snug text-ink">{details.subtitle}</p>}
      {meta && <p className="-mt-2 text-xs text-ink-muted">{meta}</p>}
      {details.objectives.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-lg font-bold text-ink">What you'll learn</h3>
          <ul className="flex flex-col gap-1.5">
            {details.objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <Check size={15} className="mt-0.5 flex-shrink-0 text-accent" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {details.requirements.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-display text-lg font-bold text-ink">Before you start</h3>
          <ul className="list-disc pl-5 text-sm text-ink marker:text-ink-muted">
            {details.requirements.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}
      {details.audience.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-display text-lg font-bold text-ink">Who it's for</h3>
          <ul className="list-disc pl-5 text-sm text-ink marker:text-ink-muted">
            {details.audience.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
