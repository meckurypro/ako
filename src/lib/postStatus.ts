// src/lib/postStatus.ts
//
// A post is only "live" when posts.status = 'published'. Drafts and scheduled posts are readable by their
// author (and by admins/moderators, for moderation) through RLS, but nobody else — so any screen that LISTS
// posts must filter on status, and any screen that OPENS a post must say plainly when it isn't live yet.
// Otherwise an author sees their own draft on their profile exactly as if it were published, shares the link,
// and everyone else is told the post "is no longer available". Use these helpers rather than ad-hoc checks.
import type { Post } from "../types/database";

export type PostLifecycle = "draft" | "scheduled" | "published";

/** status is NOT NULL default 'published' in the DB; a missing value (older cached rows) means published. */
export function postLifecycle(post: Pick<Post, "status">): PostLifecycle {
  return post.status === "draft" || post.status === "scheduled" ? post.status : "published";
}

export function isPublished(post: Pick<Post, "status">): boolean {
  return postLifecycle(post) === "published";
}
