// src/components/comments/CommentRow.tsx
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../Avatar";
import { renderFormattedText } from "../../lib/formatText";
import type { CommentWithAuthor } from "../../hooks/useComments";
import { CommentActionBar } from "./CommentActionBar";
import { STANCE_TONE, timeAgoCompact } from "./stance";

/**
 * One reply in a list. Tapping anywhere on it opens it as the parent of its own replies
 * (/post/:postId/comment/:id) — there's no inline expansion any more.
 *
 * `tinted` shows the reply's stance toward whatever list it sits in (a 2px rail + a tiny label). It's on in
 * reply lists and off for neutral context rows like ancestors.
 */
export function CommentRow({ comment, tinted = true }: { comment: CommentWithAuthor; tinted?: boolean }) {
  const navigate = useNavigate();
  // The neutral "comment" stance draws nothing: no rail, no label.
  const tone = tinted && comment.stance && comment.stance !== "comment" ? STANCE_TONE[comment.stance] : null;
  const href = `/post/${comment.post_id}/comment/${comment.id}`;

  function open(e: React.MouseEvent) {
    // A real link inside (profile, @mention, #tag) keeps its own navigation.
    if ((e.target as HTMLElement).closest("a, button")) return;
    navigate(href);
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) navigate(href);
      }}
      className="relative flex items-start gap-3 pl-3 pr-1 py-3 border-b border-border/70 cursor-pointer hover:bg-surface/60 focus-visible:bg-surface/60 outline-none transition-colors"
    >
      {tone && <span className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${tone.rail}`} aria-hidden="true" />}

      <Link to={`/profile/${comment.author.username}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Avatar src={comment.author.avatar_url} name={comment.author.display_name} size="sm" />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/profile/${comment.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-ink hover:underline truncate"
          >
            {comment.author.display_name}
          </Link>
          <span className="text-xs text-ink-muted flex-shrink-0">· {timeAgoCompact(comment.created_at)}</span>
          {comment.edited_at && <span className="text-xs text-ink-muted flex-shrink-0">· edited</span>}
          {tone && <span className={`text-[11px] font-medium flex-shrink-0 ${tone.text}`}>· {tone.label}</span>}
        </div>

        <p className="text-[15px] leading-snug text-ink mt-0.5 whitespace-pre-wrap break-words">
          {renderFormattedText(comment.content, "c")}
        </p>

        <CommentActionBar comment={comment} />
      </div>
    </article>
  );
}
