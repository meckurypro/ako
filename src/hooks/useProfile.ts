import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { Profile } from "../types/database";

export function useProfileByUsername(username: string) {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier)`)
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(input).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
