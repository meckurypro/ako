// src/components/comments/CommentReplies.tsx
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCommentList, type StanceFilter } from "../../hooks/useComments";
import { CommentRow } from "./CommentRow";
import { StanceFilterBar, type StanceCounts } from "./StanceFilter";
import { useCommentEngagement } from "./CommentEngagement";

/**
 * The replies under whatever the page is about: a post's top-level comments (`parentCommentId = null`) or an
 * opened comment's direct replies. Stance filter on top, paged list below. Each row is tinted by its stance
 * toward this parent.
 */
export function CommentReplies({
  postId,
  parentCommentId,
  counts,
  total,
}: {
  postId: string;
  parentCommentId: string | null;
  /** Per-stance totals of this parent's direct replies (from the post or comment row itself). */
  counts: StanceCounts;
  /** Direct-reply total for the "All" tab. */
  total: number;
}) {
  const eng = useCommentEngagement();
  const [filter, setFilter] = useState<StanceFilter>("all");
  const list = useCommentList(postId, parentCommentId, filter);

  const rows = useMemo(() => (list.data?.pages ?? []).flat(), [list.data]);

  useEffect(() => {
    if (rows.length > 0) eng.register(rows.map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <section aria-label="Replies">
      <StanceFilterBar counts={counts} total={total} value={filter} onChange={setFilter} />

      {list.isLoading ? (
        <p className="text-sm text-ink-muted text-center py-8">Loading…</p>
      ) : list.isError ? (
        <div className="text-center py-8">
          <p className="text-sm text-ink-muted mb-2">Couldn't load replies.</p>
          <button onClick={() => void list.refetch()} className="text-sm font-medium text-accent">
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-10">
          {filter === "all" ? "No replies yet." : "Nothing here yet."}
        </p>
      ) : (
        <div>
          {rows.map((c) => (
            <CommentRow key={c.id} comment={c} />
          ))}
          {list.hasNextPage && (
            <button
              onClick={() => void list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm font-medium text-accent disabled:opacity-60"
            >
              {list.isFetchingNextPage && <Loader2 size={14} className="animate-spin" />}
              Show more replies
            </button>
          )}
        </div>
      )}
    </section>
  );
}
