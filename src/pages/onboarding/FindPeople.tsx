// src/pages/onboarding/FindPeople.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingRecommendations, type OnboardingRecommendation } from "../../hooks/useOnboarding";
import { useIsFollowing, useToggleFollow } from "../../hooks/useProfile";
import { Avatar } from "../../components/Avatar";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";
import { AuthPattern } from "../../components/AuthPattern";

// Never more than five picks — this is meant to read as a short,
// hand-curated shortlist rather than an open-ended directory. Passed
// straight through as the RPC's own p_limit, so only five ever come
// back over the wire.
const MAX_SUGGESTIONS = 5;

// Onboarding always runs in Personal mode (a brand-new account has no
// pages yet, and there's no path to switch identity before this gate
// clears) — so the plain, always-personal useToggleFollow is correct
// here, not the page-identity-aware variant FollowButton uses elsewhere.
function SuggestedPersonRow({ person }: { person: OnboardingRecommendation }) {
  const isFollowingQuery = useIsFollowing(person.id);
  const toggleFollow = useToggleFollow(person.id);
  const isFollowing = !!isFollowingQuery.data;

  return (
    <div className="bg-surface rounded-xl border border-border px-3.5 py-3 flex items-center gap-3 shadow-[0_1px_4px_-1px_rgba(var(--shadow-ink-rgb),0.06)]">
      <Avatar src={person.avatar_url} name={person.display_name} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-display text-sm text-ink truncate">{person.display_name}</p>
          {person.is_admin_suggested && (
            <span className="text-[10px] font-medium text-accent bg-accent-soft px-1.5 py-0.5 rounded-full shrink-0">
              Featured
            </span>
          )}
        </div>
        <p className="text-xs text-ink-muted truncate mt-0.5">
          @{person.username}
          {person.follower_count > 0 && ` · ${person.follower_count.toLocaleString()} followers`}
        </p>

        {person.bio && (
          <p className="text-xs text-ink-muted mt-1 line-clamp-1">{person.bio}</p>
        )}

        {person.shared_interest_count > 0 && (
          <p className="text-[11px] text-accent font-medium mt-1">
            {person.shared_interest_count} shared interest{person.shared_interest_count > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <Button
        variant={isFollowing ? "secondary" : "primary"}
        size="sm"
        onClick={() => toggleFollow.mutate(isFollowing)}
        disabled={isFollowingQuery.isLoading}
        loading={toggleFollow.isPending}
        className="shrink-0"
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
}

export function FindPeople() {
  const navigate = useNavigate();
  const { data: recommendations, isLoading, error, refetch } = useOnboardingRecommendations(MAX_SUGGESTIONS);
  const [followedCount, setFollowedCount] = useState(0);

  // Local-only tally for the "Continue · N following" copy — actual
  // follow state lives server-side per card via useIsFollowing, this
  // is just a friendlier button label, so a failed toggle never
  // desyncs anything that matters.
  function handleFollowToggled(wasFollowing: boolean) {
    setFollowedCount((n) => Math.max(0, n + (wasFollowing ? -1 : 1)));
  }

  return (
    <div className="relative min-h-screen bg-canvas px-6 py-10 pb-28 overflow-hidden">
      <AuthPattern />
      <div className="relative z-10 max-w-lg mx-auto">
        <div className="mb-8">
          <Wordmark />
        </div>

        <h2 className="font-display text-2xl text-ink mb-2">Find your people</h2>
        <p className="text-ink-muted mb-8">
          A short, hand-picked list based on what you're interested in — people you might enjoy
          reasoning with.
        </p>

        {isLoading ? (
          <p className="text-ink-muted text-center py-16">Finding people for you…</p>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-danger mb-4">Couldn't load suggestions.</p>
            <button onClick={() => refetch()} className="text-accent font-medium text-sm">
              Try again
            </button>
          </div>
        ) : !recommendations || recommendations.length === 0 ? (
          // No/few matches (spec §16) — never a dead-end screen, still
          // fully continuable.
          <p className="text-ink-muted text-center py-16 text-sm">
            We couldn't find anyone to suggest just yet — you can always find people to follow
            from Discover once you're in.
          </p>
        ) : (
          <div
            onClickCapture={(e) => {
              // Cheap way to catch every Follow-button click inside the
              // list without threading a callback through each row's
              // own mutation — good enough since this only drives copy.
              const target = e.target as HTMLElement;
              if (target.tagName === "BUTTON") {
                const wasFollowing = target.textContent?.trim() === "Following";
                handleFollowToggled(wasFollowing);
              }
            }}
            className="space-y-3"
          >
            {recommendations.slice(0, MAX_SUGGESTIONS).map((person) => (
              <SuggestedPersonRow key={person.id} person={person} />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-border px-6 py-4">
        <div className="max-w-lg mx-auto flex justify-end">
          <div className="w-48">
            <Button onClick={() => navigate("/onboarding/building")}>
              {followedCount > 0 ? `Continue · ${followedCount} following` : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
