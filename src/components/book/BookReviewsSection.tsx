// src/components/book/BookReviewsSection.tsx
// Rating summary and reviews for a book, shown on the project page to signed-in users so they
// can judge the book before committing to it. Reviewing itself happens inside the reader.
import { useState } from "react";

import { Avatar } from "../Avatar";
import { useAuth } from "../../hooks/useAuth";
import { useBookRatingSummary, useBookReviews } from "../../hooks/useBookReviews";
import { StarRow } from "./Stars";

const PREVIEW_COUNT = 5;

export function BookReviewsSection({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: reviews, isLoading } = useBookReviews(projectId);
  const { data: summary } = useBookRatingSummary(projectId);
  const [showAll, setShowAll] = useState(false);

  const count = summary?.count ?? reviews?.length ?? 0;
  const average = summary?.average ?? null;
  const visible = showAll ? reviews : reviews?.slice(0, PREVIEW_COUNT);

  return (
    <div className="mb-4">
      <h3 className="mb-2 font-display text-lg font-semibold tracking-tight text-ink">Reviews</h3>

      {count > 0 && average !== null && (
        <div className="mb-3 flex items-center gap-2">
          <StarRow rating={average} size={16} />
          <span className="text-sm text-ink-muted">
            {average.toFixed(1)} · {count} review{count === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading reviews…</p>
      ) : !reviews || reviews.length === 0 ? (
        <p className="text-sm text-ink-muted">No reviews yet. Readers can rate this book from inside the reader.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            {visible?.map((r) => (
              <div key={r.id} className="flex gap-2.5">
                <Avatar src={r.reviewer.avatar_url} name={r.reviewer.display_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {r.reviewer.display_name}
                      {r.reviewer_id === user?.id ? " (you)" : ""}
                    </span>
                    <StarRow rating={r.rating} size={11} />
                  </div>
                  {r.review_text && <p className="mt-0.5 whitespace-pre-line break-words text-sm text-ink-muted">{r.review_text}</p>}
                  <p className="mt-0.5 text-xs text-ink-muted/70">
                    {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {reviews.length > PREVIEW_COUNT && (
            <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-accent">
              {showAll ? "Show fewer" : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
