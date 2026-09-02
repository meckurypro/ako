import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfileByUsername, useFollowers, useFollowing } from "../hooks/useProfile";
import { Avatar } from "../components/Avatar";

export function FollowListPage({ type }: { type: "followers" | "following" }) {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfileByUsername(username!);

  const isOwnList = !!user && !!profile && user.id === profile.id;
  const hiddenByOwner =
    type === "followers" ? profile?.hide_followers_list : profile?.hide_following_list;
  // Owners can always see their own list — the setting only hides it
  // from other people.
  const isHidden = !!profile && !isOwnList && hiddenByOwner;

  const followersQuery = useFollowers(!isHidden ? profile?.id ?? "" : "");
  const followingQuery = useFollowing(!isHidden ? profile?.id ?? "" : "");

  const list = type === "followers" ? followersQuery.data : followingQuery.data;
  const isLoading =
    profileLoading || (!isHidden && (type === "followers" ? followersQuery.isLoading : followingQuery.isLoading));

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink capitalize">{type}</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : isHidden ? (
          <div className="flex flex-col items-center text-center py-14">
            <Lock size={22} className="text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm max-w-[240px]">
              @{profile!.username} has chosen to hide their {type} list.
            </p>
          </div>
        ) : !list || list.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">
            {type === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        ) : (
          list.map((person) => (
            <Link
              key={person.id}
              to={`/profile/${person.username}`}
              className="flex items-center gap-3 py-3 border-b border-border"
            >
              <Avatar src={person.avatar_url} name={person.display_name} />
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{person.display_name}</p>
                <p className="text-sm text-ink-muted truncate">@{person.username}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
