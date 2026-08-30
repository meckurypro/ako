import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

/**
 * Profile routes are by username (/profile/:username), but nav links
 * to "your own profile" only know your id — this resolves id -> username
 * once, then redirects. Keeps profile URLs human-readable and shareable
 * without requiring every caller to know their own username upfront.
 */
export function MyProfileRedirect() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-username", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return <Navigate to={`/profile/${profile.username}`} replace />;
}
