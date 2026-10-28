// src/components/course/LessonReader.tsx
// Focused reading view for one lesson: breadcrumb, title, media, formatted content, and a sticky
// bar with Back / "Complete & continue" so the next step is always one tap away.
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Circle, Clock, Eye, Lock } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import type { CourseLesson } from "../../hooks/useCourseBuilder";
import { parseLesson } from "../../lib/lessonFormat";
import { formatDuration, lessonMinutes, lessonTypeLabel, lessonTypeOf, parseQuiz } from "../../lib/courseTypes";
import { LessonRenderer } from "./LessonRenderer";
import { ProgressBar } from "./ProgressBar";

interface LessonReaderProps {
  lesson: CourseLesson;
  /** null for the locked Foreword module, which isn't numbered like the course's own modules. */
  moduleNumber: number | null;
  lessonNumber: string;
  position: number;
  total: number;
  pct: number;
  hasAccess: boolean;
  completed: boolean;
  pending: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  nextLocked: boolean;
  /** The lesson's video/embed, already rendered by the page. */
  media: ReactNode;
  /** Quiz questions etc., shown under the lesson text. */
  interactive?: ReactNode;
  onOutline: () => void;
  onPrev: () => void;
  onPrimary: () => void;
  onToggleComplete: () => void;
}

export function LessonReader(props: LessonReaderProps) {
  const { lesson, hasAccess, completed, hasNext, nextLocked } = props;
  const emoji = useMemo(() => parseLesson(lesson.content).emoji, [lesson.content]);
  const type = lessonTypeOf(lesson);
  const hasVideo = !!(lesson.video_path || lesson.media_url);
  const minutes = type === "text" ? lessonMinutes(lesson) : null;
  const questions = type === "quiz" ? parseQuiz(lesson.data).questions.length : 0;
  // A quiz is finished by passing it, not by pressing continue.
  const mustPass = type === "quiz" && hasAccess && !completed;
  const isLast = !hasNext;
  const canAdvance = hasNext && !nextLocked;

  const primary = mustPass
    ? "Pass the quiz to continue"
    : type === "assignment" && hasAccess && !completed
      ? "Mark as done"
      : !hasAccess
    ? canAdvance
      ? "Next lesson"
      : "Unlock the full course"
    : isLast
      ? completed
        ? "Back to the course"
        : "Finish the course"
      : completed
        ? "Next lesson"
        : "Complete & continue";

  return (
    <article key={lesson.id} className="animate-[lesson-in_0.25s_ease-out]">
      <div className="mb-4 lg:hidden">
        <div className="mb-2.5 flex items-center justify-between">
          <button onClick={props.onOutline} className="flex items-center gap-1 text-[13px] font-medium text-ink-muted">
            <ArrowLeft size={18} className="text-ink" /> All lessons
          </button>
          <span className="text-xs font-medium text-ink-muted">
            {props.position} of {props.total} · {props.pct}%
          </span>
        </div>
        <ProgressBar pct={props.pct} height={5} />
      </div>

      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
        {props.moduleNumber === null ? "Foreword" : `Module ${props.moduleNumber} · Lesson ${props.lessonNumber}`}
      </p>
      <div className="mb-3 flex items-start gap-3">
        {emoji ? <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-[22px]">{emoji}</div> : null}
        <h2 className="min-w-0 flex-1 font-display text-2xl font-bold leading-[30px] text-ink">{lesson.title}</h2>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
        {minutes !== null ? (
          <span className="flex items-center gap-1.5 text-ink-muted">
            <Clock size={13} /> {minutes} min read
          </span>
        ) : null}
        {type === "video" && lesson.video_duration ? (
          <span className="flex items-center gap-1.5 text-ink-muted">
            <Clock size={13} /> {formatDuration(lesson.video_duration)}
          </span>
        ) : null}
        {type === "quiz" || type === "assignment" ? (
          <span className="flex items-center gap-1.5 text-ink-muted">
            {lessonTypeLabel(type)}
            {questions > 0 ? ` · ${questions} question${questions === 1 ? "" : "s"}` : ""}
          </span>
        ) : null}
        {!hasAccess && lesson.is_free_preview ? (
          <span className="flex items-center gap-1.5 font-medium text-accent">
            <Eye size={13} /> Free preview
          </span>
        ) : null}
        {completed ? (
          <span className="flex items-center gap-1.5 font-medium text-accent">
            <CheckCircle2 size={13} /> Completed
          </span>
        ) : null}
      </div>

      {props.media}
      {lesson.content ? <LessonRenderer content={lesson.content} /> : !hasVideo && type !== "quiz" ? <p className="text-ink-muted">No content yet.</p> : null}
      {props.interactive}

      {hasAccess && type !== "quiz" ? (
        <button
          onClick={props.onToggleComplete}
          disabled={props.pending}
          className="mt-6 flex items-center gap-2 text-[13px] font-medium disabled:opacity-50"
        >
          {completed ? <CheckCircle2 size={16} className="text-accent" /> : <Circle size={16} className="text-ink-muted" />}
          <span className={completed ? "text-accent" : "text-ink-muted"}>{completed ? "Completed. Click to mark as not done" : "Mark as complete"}</span>
        </button>
      ) : null}

      <div className="sticky bottom-0 -mx-4 mt-8 flex items-center gap-3 border-t border-border bg-canvas px-4 py-3 lg:mx-0 lg:rounded-2xl lg:border lg:bg-surface lg:px-3">
        <button
          onClick={props.onPrev}
          disabled={!props.hasPrev}
          aria-label="Previous lesson"
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-ink transition-opacity disabled:opacity-30"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={props.onPrimary}
          disabled={props.pending || mustPass}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-cta text-[15px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {!hasAccess && !canAdvance ? <Lock size={16} /> : null}
          {primary}
          {hasAccess && !isLast ? <ArrowRight size={18} /> : null}
        </button>
      </div>
    </article>
  );
}
