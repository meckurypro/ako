// src/components/FollowButton.tsx
import { useIsFollowing, useIsFollowedByUser, useToggleFollow } from "../hooks/useProfile";
import { useHasPendingFollowRequest, useSendFollowRequest } from "../hooks/useFollowRequests";

interface FollowButtonProps {
  authorId: string;
  isPrivate: boolean;
}

/**
 * Sits in a post card's top-right corner (see PostCard) — a much smaller,
 * one-directional cousin of the full Follow/Unfollow button on ProfilePage.
 * It only ever moves you forward (not-following → following/requested); it
 * never offers to unfollow. That's intentional: a stray tap on a compact
 * card control shouldn't be able to drop a follow, so once you're following
 * (or a request is pending) this renders as a plain non-interactive label
 * instead of a button. Managing/undoing a follow still lives on the full
 * ProfilePage button, where it's a deliberate, harder-to-miss action.
 *
 * PostCard is responsible for not rendering this at all on your own posts.
 */
export function FollowButton({ authorId, isPrivate }: FollowButtonProps) {
  const isFollowingQuery = useIsFollowing(authorId);
  const isFollowedByUserQuery = useIsFollowedByUser(authorId);
  const hasPendingQuery = useHasPendingFollowRequest(authorId);
  const toggleFollow = useToggleFollow(authorId);
  const sendRequest = useSendFollowRequest(authorId);

  // Wait for the relationship checks before rendering anything — avoids a
  // flash of "Follow" on someone you already follow while the query loads.
  if (isFollowingQuery.isLoading || isFollowedByUserQuery.isLoading || hasPendingQuery.isLoading) {
    return null;
  }

  const isFollowing = !!isFollowingQuery.data;
  const isFollowedByUser = !!isFollowedByUserQuery.data;
  const hasPendingRequest = !!hasPendingQuery.data;

  if (isFollowing) {
    return (
      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent whitespace-nowrap">
        {isFollowedByUser ? "Friends" : "Following"}
      </span>
    );
  }

  if (hasPendingRequest) {
    return (
      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent whitespace-nowrap">
        Requested
      </span>
    );
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isPrivate) {
      sendRequest.mutate();
    } else {
      toggleFollow.mutate(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={toggleFollow.isPending || sendRequest.isPending}
      aria-label={isFollowedByUser ? "Follow back" : "Follow"}
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent text-canvas disabled:opacity-50 whitespace-nowrap"
    >
      {isFollowedByUser ? "Follow back" : "Follow"}
    </button>
  );
}
