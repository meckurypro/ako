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

  // Both read as "Follow" now — the old solid bg-accent/text-canvas button
  // (visibly heavier than the Friends/Following pill above, since a solid
  // fill plus longer "Follow back" copy reads bigger even at the same
  // padding) is replaced with the same soft-bg/solid-text pattern Friends
  // uses, just swapped per case so the two remaining meanings — "brand new
  // follow" vs "they already follow you" — stay visually distinct without
  // the size mismatch:
  //  - plain Follow: neutral, off the ink token (not accent — this isn't a
  //    relationship yet) — bg-ink/10 is a faint tint that lands pale in
  //    light mode, dark in dark mode; text-ink is solid and flips the same
  //    way, exactly like Friends' bg-accent-soft/text-accent pair.
  //  - "follow back" case: same shape, orange instead of neutral, off the
  //    existing --color-pushback token (muted gold/ochre) rather than a new
  //    hardcoded color — bg-pushback/15 for the soft fill, text-pushback
  //    solid, each already tuned per-theme.
  // aria-label keeps the "Follow back" distinction for assistive tech even
  // though both now render the same visible word.
  const colorClasses = isFollowedByUser
    ? "bg-pushback/15 text-pushback"
    : "bg-ink/10 text-ink";

  return (
    <button
      onClick={handleClick}
      disabled={toggleFollow.isPending || sendRequest.isPending}
      aria-label={isFollowedByUser ? "Follow back" : "Follow"}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full disabled:opacity-50 whitespace-nowrap ${colorClasses}`}
    >
      Follow
    </button>
  );
}
