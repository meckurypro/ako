// src/components/course/CourseHero.tsx
// The warm welcome at the top of a course: where you are, how far you've come, and one clear next step.
import { ArrowRight, PartyPopper, Sparkles } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

interface CourseHeroProps {
  pct: number;
  done: number;
  total: number;
  minutesLeft: number;
  /** Title of the lesson "Continue" will open (null once everything is done). */
  nextTitle: string | null;
  onContinue: () => void;
}

function timeLeft(minutes: number): string {
  if (minutes < 60) return `about ${Math.max(1, minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `about ${h} h` : `about ${h} h ${m} min`;
}

export function CourseHero({ pct, done, total, minutesLeft, nextTitle, onContinue }: CourseHeroProps) {
  const finished = total > 0 && done === total;
  const started = done > 0;
  const Lead = finished ? PartyPopper : Sparkles;

  const eyebrow = finished ? "Course complete" : started ? "Welcome back" : "Welcome";
  const headline = finished ? "You finished every lesson. Well done." : started ? `You're ${pct}% of the way there.` : "Ready when you are.";
  const sub = finished ? "Everything stays open. Revisit any lesson, any time." : `${done} of ${total} lessons done · ${timeLeft(minutesLeft)} to go`;
  const cta = finished ? "Review from the start" : started ? "Continue" : "Start the course";

  return (
    <div className="mb-5 rounded-3xl border border-border bg-accent-soft p-5">
      <div className="mb-1.5 flex items-center gap-1.5 text-accent">
        <Lead size={14} />
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{eyebrow}</span>
      </div>
      <p className="font-display text-[22px] font-bold leading-7 text-ink">{headline}</p>
      <p className="mb-4 mt-1 text-[13px] text-ink-muted">{sub}</p>
      <ProgressBar pct={pct} height={10} />
      <button
        onClick={onContinue}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-cta px-4 py-3.5 text-left text-white transition-colors hover:opacity-90"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{cta}</span>
          {nextTitle && !finished ? <span className="mt-0.5 block truncate text-[12.5px] opacity-85">{nextTitle}</span> : null}
        </span>
        <ArrowRight size={20} className="flex-shrink-0" />
      </button>
    </div>
  );
}
