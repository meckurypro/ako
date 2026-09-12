// src/pages/onboarding/FindPeople.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingRecommendations, type OnboardingRecommendation } from "../../hooks/useOnboarding";
import { useIsFollowing, useToggleFollow } from "../../hooks/useProfile";
import { Avatar } from "../../components/Avatar";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";

// Onboarding always runs in Personal mode (a brand-new account has no
// pages yet, and there's no path to switch identity before this gate
// clears) — so the plain, always-personal useToggleFollow is correct
// here, not the page-identity-aware variant FollowButton uses elsewhere.
function SuggestedPersonCard({ person }: { person: OnboardingRecommendation }) {
  const isFollowingQuery = useIsFollowing(person.id);
  const toggleFollow = useToggleFollow(person.id);
  const isFollowing = !!isFollowingQuery.data;

  return (
    <div className="bg-surface rounded-2xl border border-border p-4 flex flex-col items-center text-center">
      <Avatar src={person.avatar_url} name={person.display_name} size="lg" />
      <p className="font-medium text-ink mt-3 truncate w-full">{person.display_name}</p>
      <p className="text-xs text-ink-muted truncate w-full">@{person.username}</p>

      {person.bio && (
        <p className="text-xs text-ink-muted mt-2 line-clamp-2">{person.bio}</p>
      )}

      {person.shared_interest_count > 0 && (
        <p className="text-[11px] text-accent font-medium mt-2">
          {person.shared_interest_count} shared interest{person.shared_interest_count > 1 ? "s" : ""}
        </p>
      )}

      <div className="w-full mt-4">
        <Button
          variant={isFollowing ? "secondary" : "primary"}
          onClick={() => toggleFollow.mutate(isFollowing)}
          disabled={isFollowingQuery.isLoading}
          loading={toggleFollow.isPending}
          className="py-2"
        >
          {isFollowing ? "Following" : "Follow"}
        </Button>
      </div>
    </div>
  );
}

export function FindPeople() {
  const navigate = useNavigate();
  const { data: recommendations, isLoading, error, refetch } = useOnboardingRecommendations(12);
  const [followedCount, setFollowedCount] = useState(0);

  // Local-only tally for the "Continue · N following" copy — actual
  // follow state lives server-side per card via useIsFollowing, this
  // is just a friendlier button label, so a failed toggle never
  // desyncs anything that matters.
  function handleFollowToggled(wasFollowing: boolean) {
    setFollowedCount((n) => Math.max(0, n + (wasFollowing ? -1 : 1)));
  }

  return (
    <div className="min-h-screen bg-canvas px-6 py-10 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Wordmark size="sm" showTagline={false} />
        </div>

        <h2 className="font-display text-2xl text-ink mb-2">Find your people</h2>
        <p className="text-ink-muted mb-8">
          Based on what you're interested in, here are some people you might enjoy reasoning with.
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
              // grid without threading a callback through each card's
              // own mutation — good enough since this only drives copy.
              const target = e.target as HTMLElement;
              if (target.tagName === "BUTTON") {
                const wasFollowing = target.textContent?.trim() === "Following";
                handleFollowToggled(wasFollowing);
              }
            }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-4"
          >
            {recommendations.map((person) => (
              <SuggestedPersonCard key={person.id} person={person} />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-end">
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
