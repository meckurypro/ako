import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { Profile, ProfileWithRoles } from "../types/database";

export function useProfileByUsername(username: string) {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: async (): Promise<ProfileWithRoles> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`*, ${PROFILE_ROLES_SELECT}`)
        .eq("username", username)
        .single();
      if (error) throw error;
      const { profile_roles, ...profile } = data as any;
      return { ...profile, roles: toProfileRoles(profile_roles) };
    },
    enabled: !!username,
  });
}

/**
 * The signed-in user's own id/username/avatar — just enough for the
 * TopHeader avatar link. Keyed by user id so it shares cache with
 * anything else that happens to fetch the same slice later.
 */
export function useMyProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async (): Promise<Pick<Profile, "id" | "username" | "display_name" | "avatar_url">> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier, is_private, ${PROFILE_ROLES_SELECT})`
        )
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((post: any) => {
        const { profile_roles, ...author } = post.author;
        return { ...post, author: { ...author, roles: toProfileRoles(profile_roles) } };
      });
    },
    enabled: !!userId,
  });
}

export function useIsFollowing(targetUserId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-following", targetUserId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
  });
}

/**
 * The reverse of useIsFollowing: does targetUserId follow ME. Powers
 * "Follow back" (I don't follow them, but they follow me) and the
 * mutual-follow "you and X are friends" unfollow reminder (I follow
 * them AND they follow me).
 */
export function useIsFollowedByUser(targetUserId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-followed-by", targetUserId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", targetUserId)
        .eq("following_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
  });
}

export function useToggleFollow(targetUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currentlyFollowing: boolean) => {
      if (!user) throw new Error("Not signed in");

      if (currentlyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["is-followed-by", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
  });
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio, tier)`)
        .eq("following_id", userId);
      if (error) throw error;
      return data.map((row: any) => row.follower) as Profile[];
    },
    enabled: !!userId,
  });
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: ["following", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio, tier)`)
        .eq("follower_id", userId);
      if (error) throw error;
      return data.map((row: any) => row.following) as Profile[];
    },
    enabled: !!userId,
  });
}

interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  website_url?: string;
  username?: string;
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: UpdateProfileInput) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(input).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Settings' own profile lookup, plus the two username-keyed caches
      // (TopHeader's avatar link, BottomNav's "is this my own profile"
      // check) — a username change makes both stale immediately, not
      // just the ["profile", oldUsername] lookup above.
      queryClient.invalidateQueries({ queryKey: ["own-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-username"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

/**
 * Replaces the signed-in user's job/hobby tags in one atomic call
 * (delete + reinsert with position, via the set_profile_roles RPC).
 * roleIds is treated as ordered — index 0 becomes position 1, etc.
 */
export function useUpdateProfileRoles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (roleIds: string[]) => {
      if (!user) throw new Error("Not signed in");
      if (roleIds.length > 3) throw new Error("You can select up to 3 job/hobby tags.");
      const { error } = await supabase.rpc("set_profile_roles", { p_role_ids: roleIds });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["own-profile"] });
    },
  });
}
