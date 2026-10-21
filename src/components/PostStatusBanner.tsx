// src/components/PostStatusBanner.tsx
//
// Shown above a post that is NOT live (a draft or a scheduled post) when someone who is allowed to read it
// opens it — its author, or an admin/moderator. RLS lets them in; everyone else is told the post isn't
// available. Without this banner the page looks exactly like a published post, so an author thinks it's live
// and shares a link nobody else can open. See lib/postStatus.ts.
import { postLifecycle } from "../lib/postStatus";
import type { PostWithAuthor } from "../types/database";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "a later time";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function PostStatusBanner({ post, isOwnPost }: { post: PostWithAuthor; isOwnPost: boolean }) {
  const state = postLifecycle(post);
  if (state === "published") return null;

  const handle = post.author?.username ? `@${post.author.username}` : "the author";
  let text: string;
  if (state === "draft") {
    text = isOwnPost
      ? "This is a draft — only you can see it. It isn't live yet, so a link to it won't open for anyone else. Publish it from your Drafts to share it."
      : `Draft by ${handle} — not published. Only the author and admins can see it; everyone else is told it isn't available.`;
  } else {
    const when = formatWhen(post.scheduled_for);
    text = isOwnPost
      ? `Scheduled for ${when} — only you can see it until then. A link to it won't open for anyone else before it goes live.`
      : `Scheduled by ${handle} for ${when} — not live yet. Only the author and admins can see it until then.`;
  }

  return (
    <p role="status" className="text-xs text-ink-muted bg-surface border border-border rounded-lg px-3 py-2 mb-3">
      {text}
    </p>
  );
}
