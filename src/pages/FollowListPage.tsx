import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useProfileByUsername, useFollowers, useFollowing } from "../hooks/useProfile";
import { Avatar } from "../components/Avatar";

export function FollowListPage({ type }: { type: "followers" | "following" }) {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfileByUsername(username!);

  const followersQuery = useFollowers(profile?.id ?? "");
  const followingQuery = useFollowing(profile?.id ?? "");

  const list = type === "followers" ? followersQuery.data : followingQuery.data;
  const isLoading = type === "followers" ? followersQuery.isLoading : followingQuery.isLoading;

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
