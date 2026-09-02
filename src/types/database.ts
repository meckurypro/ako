// Hand-maintained types matching the SQL schema (00_foundation.sql
// through 22_profile_roles.sql). Once the schema stabilizes, consider
// generating these automatically via:
//   npx supabase gen types typescript --project-id <ref> > database.ts
// For now, hand-maintained keeps us honest about what's actually built
// vs. planned.

export type Tier = "newcomer" | "contributor" | "publisher" | "host" | "creator_business";

export interface Role {
  id: string;
  label: string;
  sort_order: number;
}

// A single job/hobby tag attached to a profile, in display order.
export interface ProfileRole {
  role_id: string;
  label: string;
  position: number; // 1-3
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  tier: Tier;
  follower_count: number;
  following_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithRoles extends Profile {
  roles: ProfileRole[]; // 0-3, ordered by position
}

// Enough of a profile to render an author byline anywhere in the app
// (post card, comment, message, notification).
export type AuthorSummary = Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "tier"> & {
  roles: ProfileRole[];
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Interest {
  id: string;
  category_id: string | null;
  name: string;
  is_active: boolean;
}

export type Stance = "support" | "disagree" | "pushback";

export interface Post {
  id: string;
  author_id: string;
  heading: string | null;
  content: string;
  media_urls: string[];
  category_id: string | null;
  visibility: "public" | "followers_only";
  like_count: number;
  dislike_count: number;
  share_count: number;
  support_count: number;
  disagree_count: number;
  pushback_count: number;
  gift_count: number;
  comment_count: number;
  is_deleted: boolean;
  is_archived: boolean;
  edited_at: string | null;
  created_at: string;
}

// Joined shape used when rendering a feed card — the post plus
// enough author info to render without a separate fetch per post.
export interface PostWithAuthor extends Post {
  author: AuthorSummary;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  content: string;
  stance: Stance | null;
  like_count: number;
  dislike_count: number;
  reply_count: number;
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
}

export type ReactionType = "like" | "dislike" | "share";

export interface GiftType {
  id: string;
  name: string;
  icon_url: string | null;
  cost_usd: number;
  is_active: boolean;
  sort_order: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  pending_balance: number;
  currency: "USD";
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface MessageUserState {
  message_id: string;
  starred_at: string | null;
  pinned_at: string | null;
}

export interface UserEmojiUsage {
  user_id: string;
  emoji: string;
  use_count: number;
  last_used_at: string;
}
