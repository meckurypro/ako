// src/hooks/useCollaboration.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export type CollaborationTarget = "post" | "project";
export type CollaborationStatus = "invited" | "accepted" | "declined" | "removed";

export interface Collaborator {
  status: CollaborationStatus;
  invited_at: string;
  responded_at: string | null;
  invited_by: string;
  user: { id: string; username: string; display_name: string; avatar_url: string | null };
}

function tableFor(target: CollaborationTarget) {
  return target === "post" ? "post_collaborators" : "project_collaborators";
}
function idColumnFor(target: CollaborationTarget) {
  return target === "post" ? "post_id" : "project_id";
}

/** Everyone invited/collaborating on a given post or project, accepted-first. */
export function useCollaborators(target: CollaborationTarget, targetId: string | undefined) {
  return useQuery({
    queryKey: ["collaborators", target, targetId],
    queryFn: async (): Promise<Collaborator[]> => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from(tableFor(target))
        .select(`status, invited_at, responded_at, invited_by, user:profiles!${tableFor(target)}_user_id_fkey(id, username, display_name, avatar_url)`)
        .eq(idColumnFor(target), targetId)
        .neq("status", "removed")
        .order("status", { ascending: true }); // "accepted" < "declined" < "invited" alphabetically — good enough default grouping
      if (error) throw error;
      return data as unknown as Collaborator[];
    },
    enabled: !!targetId,
  });
}

/** Sends a collaboration request — inserting the row is the request; the DB trigger notifies the invitee. */
export function useSendCollaborationRequest(target: CollaborationTarget) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, userId }: { targetId: string; userId: string }) => {
      if (!user) throw new Error("Not signed in.");
      const { error } = await supabase.from(tableFor(target)).insert({
        [idColumnFor(target)]: targetId,
        user_id: userId,
        invited_by: user.id,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Already invited to collaborate on this.");
        throw error;
      }
    },
    onSuccess: (_data, { targetId }) => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", target, targetId] });
    },
  });
}

/** Pending collaboration invites addressed to the current user, across both posts and projects. */
export function useMyPendingCollaborationInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-collaboration-invites", user?.id],
    queryFn: async () => {
      if (!user) return { posts: [], projects: [] };
      const [postsRes, projectsRes] = await Promise.all([
        supabase
          .from("post_collaborators")
          .select("post_id, invited_by, invited_at, inviter:profiles!post_collaborators_invited_by_fkey(id, username, display_name, avatar_url)")
          .eq("user_id", user.id)
          .eq("status", "invited"),
        supabase
          .from("project_collaborators")
          .select("project_id, invited_by, invited_at, inviter:profiles!project_collaborators_invited_by_fkey(id, username, display_name, avatar_url)")
          .eq("user_id", user.id)
          .eq("status", "invited"),
      ]);
      if (postsRes.error) throw postsRes.error;
      if (projectsRes.error) throw projectsRes.error;
      return { posts: postsRes.data ?? [], projects: projectsRes.data ?? [] };
    },
    enabled: !!user,
  });
}

/** Accept or decline a pending invite — the DB trigger notifies whoever sent it. */
export function useRespondToCollaborationRequest(target: CollaborationTarget) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, accept }: { targetId: string; accept: boolean }) => {
      if (!user) throw new Error("Not signed in.");
      const { error } = await supabase
        .from(tableFor(target))
        .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
        .eq(idColumnFor(target), targetId)
        .eq("user_id", user.id)
        .eq("status", "invited");
      if (error) throw error;
    },
    onSuccess: (_data, { targetId }) => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", target, targetId] });
      queryClient.invalidateQueries({ queryKey: ["my-collaboration-invites", user?.id] });
    },
  });
}

/** Withdraws an invite (by the inviter) or leaves a collaboration (by the collaborator). */
export function useRemoveCollaborator(target: CollaborationTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, userId }: { targetId: string; userId: string }) => {
      const { error } = await supabase
        .from(tableFor(target))
        .update({ status: "removed" })
        .eq(idColumnFor(target), targetId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { targetId }) => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", target, targetId] });
    },
  });
}
