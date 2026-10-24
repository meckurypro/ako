// src/components/StanceComposer.tsx
import { useState } from "react";
import { useCreateComment } from "../hooks/useComments";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { useToast } from "./Toast";
import type { Stance } from "../types/database";
import { MentionTextarea } from "./MentionTextarea";
import { CONTENT_LIMIT, contentCounterClass } from "../lib/textLimits";
import { friendlyError } from "../lib/friendlyError";

// ─── Shared colour system ─────────────────────────────────────────────────────
// Single source of truth for stance colours. Imported by:
//   • StanceComposer  — stance chip, top border, textarea ring, submit button
//   • PostCard        — tray icon stroke colour
//   • comments/*      — replies use the subtler STANCE_TONE (comments/stance.ts)
// "comment" is the neutral stance and deliberately carries no colour: ink on canvas.
export const STANCE_COLORS: Record<
  Stance,
  {
    label: string;
    submitLabel: string;    // what the post button says
    prompt: string;
    iconClass: string;      // text-* class for tray icon stroke
    chipClass: string;      // the fixed stance label at the top of the composer
    topBorderClass: string; // coloured top border on the modal card
    ringClass: string;      // textarea focus ring
    submitClass: string;    // submit button bg + text
    pillClass: string;      // comment pill in CommentThread
  }
> = {
  support: {
    label: "Add",
    submitLabel: "Add",
    prompt: "Build on it, agree, or share what you know.",
    iconClass: "text-ink",
    chipClass: "text-accent bg-accent-soft",
    topBorderClass: "border-t-4 border-accent",
    ringClass: "focus:ring-accent/40 focus:border-accent",
    submitClass: "bg-accent text-canvas",
    pillClass: "text-accent bg-accent-soft",
  },
  question: {
    label: "Question",
    submitLabel: "Ask",
    prompt: "What would you like to know?",
    iconClass: "text-ink",
    chipClass: "text-stance-question bg-stance-question/10",
    topBorderClass: "border-t-4 border-stance-question",
    ringClass: "focus:ring-stance-question/40 focus:border-stance-question",
    submitClass: "bg-stance-question text-canvas",
    pillClass: "text-stance-question bg-stance-question/10",
  },
  pushback: {
    label: "Pushback",
    submitLabel: "Push back",
    prompt: "Say where you disagree, or what you'd question or qualify.",
    iconClass: "text-ink",
    chipClass: "text-pushback bg-pushback/10",
    topBorderClass: "border-t-4 border-pushback",
    ringClass: "focus:ring-pushback/40 focus:border-pushback",
    submitClass: "bg-pushback text-canvas",
    pillClass: "text-pushback bg-pushback/10",
  },
  comment: {
    label: "Comment",
    submitLabel: "Comment",
    prompt: "Say something.",
    iconClass: "text-ink",
    chipClass: "text-ink-muted bg-surface",
    topBorderClass: "border-t-4 border-border",
    ringClass: "focus:ring-ink/15 focus:border-ink-muted",
    submitClass: "bg-ink text-canvas",
    pillClass: "text-ink-muted bg-surface",
  },
};

interface StanceComposerProps {
  postId: string;
  /** The stance this comment is posted with. Fixed for the life of the composer: to change it, close and pick
   *  another. */
  stance: Stance;
  onClose: () => void;
  /** Set when replying to a specific comment rather than the post itself. */
  parentCommentId?: string;
}

export function StanceComposer({
  postId,
  stance,
  onClose,
  parentCommentId,
}: StanceComposerProps) {
  useBackDismiss(onClose);
  useScrollLock();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createComment = useCreateComment(postId);
  const toast = useToast();

  const colors = STANCE_COLORS[stance];

  async function handleSubmit() {
    if (!content.trim()) return;
    setError(null);
    try {
      await createComment.mutateAsync({
        post_id: postId,
        content,
        stance,
        parent_comment_id: parentCommentId,
      });
      setContent("");
      onClose();
    } catch (err) {
      // Moderation rejections (e.g. the word-filter's block message)
      // surface here already worded — no need to reword it. Not
      // calling onClose() above puts the author right back in this
      // same composer with their text intact, ready to change
      // whatever bounced; the toast is what actually announces the
      // rejection, since the inline text below can be easy to miss.
      const message = friendlyError(err, "Couldn't post this.");
      setError(message);
      toast(message, { variant: "error" });
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 ako-keyboard-aware bg-canvas/70 backdrop-blur-overlay flex items-end sm:items-center justify-center z-50 px-4">
      {/* Top border colour follows the stance */}
      <div className={`bg-canvas rounded-2xl w-full max-w-md mb-safe overflow-hidden ${colors.topBorderClass}`}>

        {/* ── Body ── */}
        <div className="p-5">
          {/* The stance is fixed once the composer is open: shown, not switchable. */}
          <span className={`inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold ${colors.chipClass}`}>
            {colors.label}
          </span>

          <MentionTextarea
            value={content}
            onChange={setContent}
            maxLength={CONTENT_LIMIT}
            rows={4}
            autoFocus
            showFormatToolbar
            placeholder={colors.prompt}
            className={`w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink
              resize-none focus:outline-none focus:ring-2 ${colors.ringClass} transition-colors duration-150`}
          />

          {error && <p className="text-danger text-sm mt-2">{error}</p>}

          {/* Char count + submit */}
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs ${contentCounterClass(content.length)}`}>
              {content.length}/{CONTENT_LIMIT}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || createComment.isPending}
              className={`px-5 py-2 rounded-full text-sm font-medium
                disabled:opacity-50 transition-colors duration-150 ${colors.submitClass}`}
            >
              {createComment.isPending ? "Posting…" : colors.submitLabel}
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
    </Portal>
  );
}
