// src/pages/PagePage.tsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Globe, Settings as SettingsIcon, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";
import { usePageByUsername, useIsFollowingPage, useTogglePageFollow, usePageMembers } from "../hooks/usePages";
import { usePagePosts } from "../hooks/usePosts";
import { pageModeLabel } from "../lib/pageRoles";

function getWebsiteHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getWebsiteDomain(url: string): string {
  try {
    return new URL(getWebsiteHref(url)).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

// /page/:username — a page's public profile. Its feed is simply every
// post posted_as_page_id = this page (see usePagePosts), which is
// what naturally gives "cumulative activity of everyone managing it"
// without any separate aggregation.
export function PagePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { data: page, isLoading } = usePageByUsername(username!);
  const { data: members } = usePageMembers(page?.id ?? "");
  const { data: posts } = usePagePosts(page?.id ?? "");
  const isFollowingQuery = useIsFollowingPage(page?.id ?? "");
  const toggleFollow = useTogglePageFollow(page?.id ?? "");

  const isFollowing = !!isFollowingQuery.data;
  const isAdmin = !!members?.some((m) => m.user_id === user?.id && m.is_admin && m.status === "active");
  const activeMembers = (members ?? []).filter((m) => m.status === "active");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6 text-center">
        <p className="text-ink-muted">This page doesn't exist, or is no longer active.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 pt-4">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          {isAdmin && (
            <Link to={`/page/${page.username}/team`} className="text-ink-muted" aria-label="Manage team">
              <SettingsIcon size={20} />
            </Link>
          )}
        </div>

        <div className="px-4 pt-3 pb-4">
          <div className="flex items-start gap-4">
            <Avatar src={page.avatar_url} name={page.name} size="xl" />
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-lg text-ink truncate">{page.name}</h1>
                {page.is_verified && <BadgeCheck size={16} className="text-accent flex-shrink-0" />}
              </div>
              <p className="text-xs text-ink-muted">
                {pageModeLabel(page.page_type)} · @{page.username}
              </p>
              {page.tagline && <p className="text-sm text-ink mt-1">{page.tagline}</p>}
            </div>
          </div>

          {page.bio && <p className="text-sm text-ink mt-3 whitespace-pre-wrap">{page.bio}</p>}

          {page.website_url && (
            <a
              href={getWebsiteHref(page.website_url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent mt-2"
            >
              <Globe size={14} />
              {getWebsiteDomain(page.website_url)}
            </a>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-ink">
              <strong>{page.follower_count}</strong> <span className="text-ink-muted">followers</span>
            </span>
            <Link to={`/page/${page.username}/team`} className="flex items-center gap-1 text-ink-muted">
              <Users size={14} />
              {activeMembers.length} on the team
            </Link>
          </div>

          <button
            type="button"
            onClick={() => (user ? toggleFollow.mutate(isFollowing) : navigate(`/login?redirect=/page/${page.username}`))}
            disabled={toggleFollow.isPending}
            className={`w-full mt-4 rounded-xl py-2.5 text-sm font-medium ${
              isFollowing ? "bg-surface text-ink" : "bg-accent text-canvas"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>

          {activeMembers.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Team</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {activeMembers.slice(0, 8).map((m) => (
                  <Link
                    key={m.id}
                    to={`/profile/${m.profile.username}`}
                    className="flex flex-col items-center gap-1 flex-shrink-0 w-16 text-center"
                  >
                    <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="md" />
                    <span className="text-[11px] text-ink-muted truncate w-full">{m.role_label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border">
          {!posts || posts.length === 0 ? (
            <p className="text-ink-muted text-center py-14 text-sm">
              {page.name} hasn't posted anything yet.
            </p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
