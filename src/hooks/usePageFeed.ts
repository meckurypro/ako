// src/hooks/usePageFeed.ts
//
// Page-mode counterpart to the feed hooks in usePosts.ts. A page is its
// own account with its own topics and its own follow graph — separate
// from whichever team member is currently switched into it — so "For
// You" and "Following" while in page mode should rank by the PAGE's
// interests/network, not the acting human's.
//
// BACKEND NOT YET BUILT. Needed on the backend before these hooks work:
//
//   create table public.page_interests (
//     page_id uuid not null references public.pages(id),
//     interest_id uuid not null references public.interests(id),
//     created_at timestamptz not null default now(),
//     primary key (page_id, interest_id)
//   );
//   -- mirrors user_interests, but for a page's own topic/niche signal.
//
//   create table public.page_follows_target (
//     page_id uuid not null references public.pages(id),
//     followed_profile_id uuid references public.profiles(id),
//     followed_page_id uuid references public.pages(id),
//     created_at timestamptz not null default now(),
//     check (
//       (followed_profile_id is not null) <> (followed_page_id is not null)
//     )
//   );
//   -- lets a PAGE follow either an account or another page — distinct
//   -- from page_follows, which is the reverse (an account following a
//   -- page). Powers get_page_following_feed below.
//
//   -- RPCs, mirroring get_ranked_feed / get_following_feed but keyed to
//   -- a page rather than a viewer profile:
//   get_page_ranked_feed(p_page_id uuid, p_limit int, p_offset int)
//     returns table(post_id uuid)
//   get_page_following_feed(p_page_id uuid, p_limit int, p_offset int)
//     returns table(post_id uuid)
//
// Top Discussions (get_trending_feed) is deliberately NOT duplicated
// here — it's already a global "what's hot this week" ranking with no
// per-viewer personalization, so it stays identical in page mode.
//
// Also deliberately skipped: fulfill_gift_tokens. That's a wallet/gift
// mechanic and wallets belong to profiles only (see public.wallets —
// no page_id column), so pages have no gift tokens to fulfill.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { PostWithAuthor } from "../types/database";

const PAGE_SIZE = 15;
const AUTHOR_SELECT = `id, username, display_name, avatar_url, tier, is_private`;
const FEED_SELECT = `*, author:profiles!posts_author_id_fkey(${AUTHOR_SELECT}), posted_as_page:pages(id, username, name, avatar_url, page_type, is_verified), reshared_post(*, author:profiles!posts_author_id_fkey(${AUTHOR_SELECT}))`;

function normalizePost(raw: any): PostWithAuthor {
  return raw as PostWithAuthor;
}

async function fetchByRankedIds(
  rpcName: string,
  pageId: string,
  page: number
): Promise<PostWithAuthor[]> {
  const { data: ranked, error: rankError } = await supabase.rpc(rpcName, {
    p_page_id: pageId,
    p_limit: PAGE_SIZE,
    p_offset: page * PAGE_SIZE,
  });
  if (rankError) throw rankError;

  const orderedIds: string[] = (ranked ?? []).map((r: { post_id: string }) => r.post_id);
  if (orderedIds.length === 0) return [];

  const { data, error } = await supabase.from("posts").select(FEED_SELECT).in("id", orderedIds);
  if (error) throw error;

  const byId = new Map((data as any[]).map((raw) => [raw.id, normalizePost(raw)]));
  return orderedIds.map((id) => byId.get(id)).filter((p): p is PostWithAuthor => !!p);
}

/** Page-mode "For You" — ranked by the page's own topics (page_interests)
 *  and engagement, not the acting team member's. */
export function usePageRankedFeed(pageId: string | undefined, page: number) {
  return useQuery({
    queryKey: ["page-feed-posts", "ranked", pageId, page],
    queryFn: () => fetchByRankedIds("get_page_ranked_feed", pageId!, page),
    enabled: !!pageId,
  });
}

/** Page-mode "Following" — posts from whoever/whatever the PAGE follows
 *  (page_follows_target), not the acting team member's own following list. */
export function usePageFollowingFeed(pageId: string | undefined, page: number) {
  return useQuery({
    queryKey: ["page-feed-posts", "following", pageId, page],
    queryFn: () => fetchByRankedIds("get_page_following_feed", pageId!, page),
    enabled: !!pageId,
  });
}
