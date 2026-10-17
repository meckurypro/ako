// src/components/book/ReviewSheet.tsx
// "Rate & Review" bottom sheet inside the book reader. One review per reader per book:
// opening it again edits the earlier one. Colours come from the reader theme so it matches the page.
import { useState } from "react";

import { MAX_REVIEW_LENGTH, useDeleteBookReview, useMyBookReview, useSaveBookReview } from "../../hooks/useBookReviews";
import type { ReaderThemeSpec } from "../../lib/bookReaderTheme";
import { Sheet } from "./ReaderSheets";
import { StarPicker } from "./Stars";

const LABELS = ["", "Didn't like it", "It was okay", "Liked it", "Really liked it", "Loved it"];

export function ReviewSheet({
  theme,
  projectId,
  bookTitle,
  initialRating,
  onClose,
}: {
  theme: ReaderThemeSpec;
  projectId: string;
  bookTitle: string;
  /** Pre-selected stars when the sheet opens from the end-of-book prompt. */
  initialRating?: number;
  onClose: () => void;
}) {
  const { review } = useMyBookReview(projectId);
  const save = useSaveBookReview(projectId);
  const remove = useDeleteBookReview(projectId);
  const [rating, setRating] = useState(initialRating ?? review?.rating ?? 0);
  const [text, setText] = useState(review?.review_text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(initialRating != null);

  // Fill in the earlier review once it arrives, unless the reader has already started typing.
  if (review && !touched && rating === 0) {
    setRating(review.rating);
    setText(review.review_text ?? "");
  }

  const busy = save.isPending || remove.isPending;

  async function submit() {
    if (rating < 1) {
      setError("Tap a star to rate the book.");
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({ rating, reviewText: text });
      onClose();
    } catch {
      setError("Couldn't save your review. Check your connection and try again.");
    }
  }

  async function removeReview() {
    setError(null);
    try {
      await remove.mutateAsync();
      onClose();
    } catch {
      setError("Couldn't delete your review. Try again.");
    }
  }

  const hairline = `1px solid ${theme.rule}`;

  return (
    <Sheet theme={theme} title={review ? "Your review" : "Rate this book"} subtitle={bookTitle} onClose={onClose}>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2">
        <div className="flex flex-col items-center gap-1.5 py-1">
          <StarPicker
            value={rating}
            onChange={(n) => {
              setTouched(true);
              setRating(n);
            }}
            on={theme.accent}
            off={theme.rule}
          />
          <p className="h-5 text-[13px]" style={{ color: theme.muted }}>
            {LABELS[rating] ?? ""}
          </p>
        </div>

        <div>
          <textarea
            value={text}
            onChange={(e) => {
              setTouched(true);
              setText(e.target.value);
            }}
            maxLength={MAX_REVIEW_LENGTH}
            rows={5}
            placeholder="What did you think? (optional)"
            className="w-full resize-none rounded-xl px-3.5 py-3 text-[15px] outline-none"
            style={{ background: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", color: theme.ink, border: hairline }}
          />
          <p className="mt-1 text-right text-[12px]" style={{ color: theme.muted }}>
            {text.length}/{MAX_REVIEW_LENGTH}
          </p>
        </div>

        {error && (
          <p className="text-[13px]" role="alert" style={{ color: theme.ink }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="flex-1 rounded-full px-5 py-3 text-[15px] font-semibold disabled:opacity-50"
            style={{ background: theme.ink, color: theme.bg }}
          >
            {save.isPending ? "Saving…" : review ? "Update review" : "Post review"}
          </button>
          {review && (
            <button
              onClick={() => void removeReview()}
              disabled={busy}
              className="rounded-full px-4 py-3 text-[14px] disabled:opacity-50"
              style={{ color: theme.muted, border: hairline }}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
