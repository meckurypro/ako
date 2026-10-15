// src/components/ResumePrompt.tsx
// Shown when someone reopens a book or course they had started: pick up where they stopped, or begin again.
// Dismissing it (backdrop click, Escape, back) means *Continue* — closing a dialog must never throw progress away.
import { BookOpen } from "lucide-react";
import { Modal } from "./Modal";

interface ResumePromptProps {
  /** What they're returning to, e.g. “The long road”. */
  where: string;
  /** How far in, 0–100 (omitted when unknown). */
  percent?: number | null;
  onContinue: () => void;
  onStartOver: () => void;
  /** Only changes the wording. */
  kind?: "book" | "course";
}

export function ResumePrompt({ where, percent, onContinue, onStartOver, kind = "book" }: ResumePromptProps) {
  const title = kind === "course" ? "Continue where you stopped?" : "Continue reading?";
  return (
    <Modal onClose={onContinue} ariaLabel={title}>
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-overlay-surface-raised text-overlay-accent flex items-center justify-center">
          <BookOpen size={19} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-medium text-overlay-ink text-[15px] leading-snug">{title}</p>
          <p className="text-sm text-overlay-ink-muted mt-2 leading-relaxed">
            You were at {where}
            {percent != null ? ` (${Math.round(percent)}% through)` : ""}.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-7">
        <button onClick={onContinue} className="py-3 rounded-full bg-overlay-accent text-sm font-medium text-overlay-surface">
          Continue
        </button>
        <button onClick={onStartOver} className="py-3 rounded-full bg-overlay-surface-raised text-sm font-medium text-overlay-ink">
          Start from the beginning
        </button>
      </div>
    </Modal>
  );
}
