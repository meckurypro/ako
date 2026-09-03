// src/components/StanceComposer.tsx
import { useRef, useState } from "react";
import { useCreateComment } from "../hooks/useComments";
import type { Stance } from "../types/database";
import { FormatToolbar } from "./FormatToolbar";

const STANCES: Stance[] = ["support", "disagree", "pushback"];

// ─── Shared colour system ─────────────────────────────────────────────────────
// Single source of truth for stance colours. Imported by:
//   • StanceComposer  — tabs, top border, textarea ring, submit button
//   • PostCard        — tray icon stroke colour
//   • CommentThread   — stance pill on each comment, reply button colour
export const STANCE_COLORS: Record<
  Stance,
  {
    label: string;
    prompt: string;
    iconClass: string;      // text-* class for tray icon stroke
    tabActive: string;      // classes for the active tab button
    topBorderClass: string; // coloured top border on the modal card
    ringClass: string;      // textarea focus ring
    submitClass: string;    // submit button bg + text
    pillClass: string;      // comment pill in CommentThread
  }
> = {
  support: {
    label: "Support",
    prompt: "Add your reasoning or build on the argument.",
    iconClass: "text-accent",
    tabActive: "text-accent border-b-2 border-accent bg-accent-soft",
    topBorderClass: "border-t-4 border-accent",
    ringClass: "focus:ring-accent/40 focus:border-accent",
    submitClass: "bg-accent text-canvas",
    pillClass: "text-accent bg-accent-soft",
  },
  disagree: {
    label: "Disagree",
    prompt: "Explain your position.",
    iconClass: "text-danger",
    tabActive: "text-danger border-b-2 border-danger bg-danger/10",
    topBorderClass: "border-t-4 border-danger",
    ringClass: "focus:ring-danger/40 focus:border-danger",
    submitClass: "bg-danger text-canvas",
    pillClass: "text-danger bg-danger/10",
  },
  pushback: {
    label: "Pushback",
    prompt: "What would you question, qualify, or add?",
    iconClass: "text-amber-500",
    tabActive: "text-amber-600 border-b-2 border-amber-500 bg-amber-50",
    topBorderClass: "border-t-4 border-amber-500",
    ringClass: "focus:ring-amber-500/40 focus:border-amber-500",
    submitClass: "bg-amber-500 text-canvas",
    pillClass: "text-amber-700 bg-amber-50",
  },
};

interface StanceComposerProps {
  postId: string;
  /** Which tab opens first. The user can switch freely inside the modal. */
  stance: Stance;
  onClose: () => void;
  /** Set when replying to a specific comment rather than the post itself. */
  parentCommentId?: string;
}

export function StanceComposer({
  postId,
  stance: initialStance,
  onClose,
  parentCommentId,
}: StanceComposerProps) {
  const [activeStance, setActiveStance] = useState<Stance>(initialStance);
  // Single content state shared across tabs — text is retained when
  // the user switches stance so they never lose what they typed.
  const [content, setContent] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const createComment = useCreateComment(postId);

  const colors = STANCE_COLORS[activeStance];

  // Switch stance WITHOUT losing keyboard focus:
  //   • onMouseDown preventDefault stops the browser from moving focus
  //     away from the textarea on pointer-driven events (desktop/tablet).
  //   • setTimeout(0) refocuses after the touch event cycle completes on
  //     mobile, where preventDefault alone isn't always enough.
  function switchStance(s: Stance) {
    setActiveStance(s);
    setTimeout(() => contentRef.current?.focus(), 0);
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setError(null);
    try {
      await createComment.mutateAsync({
        post_id: postId,
        content,
        stance: activeStance,
        parent_comment_id: parentCommentId,
      });
      setContent("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post this.");
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 px-4">
      {/* Top border colour changes with the active stance */}
      <div className={`bg-canvas rounded-2xl w-full max-w-md mb-safe overflow-hidden ${colors.topBorderClass}`}>

        {/* ── Stance tabs — no close button here anymore ── */}
        <div className="flex border-b border-border">
          {STANCES.map((s) => (
            <button
              key={s}
              // preventDefault on mousedown keeps focus on the textarea
              // (prevents the browser moving focus to this button).
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => switchStance(s)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeStance === s
                  ? STANCE_COLORS[s].tabActive
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {STANCE_COLORS[s].label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="p-5">
          <p className="text-sm text-ink-muted mb-3">{colors.prompt}</p>

          <FormatToolbar
            textareaRef={contentRef}
            value={content}
            onChange={setContent}
            className="mb-1.5"
          />

          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={4}
            autoFocus
            placeholder={colors.prompt}
            className={`w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink
              resize-none focus:outline-none focus:ring-2 ${colors.ringClass} transition-colors duration-150`}
          />

          {error && <p className="text-danger text-sm mt-2">{error}</p>}

          {/* Char count + submit */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-ink-muted">{content.length}/2000</span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || createComment.isPending}
              className={`px-5 py-2 rounded-full text-sm font-medium
                disabled:opacity-50 transition-colors duration-150 ${colors.submitClass}`}
            >
              {createComment.isPending ? "Posting…" : colors.label}
            </button>
          </div>

          {/* Cancel — bottom center, defined pill button */}
          <div className="flex justify-center mt-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full text-sm font-medium text-ink-muted
                border border-border hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
