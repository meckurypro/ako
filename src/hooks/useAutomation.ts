// src/hooks/useAutomation.ts
// Admin "Automate posts": automated accounts, their idea vault and run history. Tables and the cron job are in
// supabase/ako_post_automation.sql; the generator is the run-post-automation edge function. Everything here is
// admin-only by RLS.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface ScheduleSlot {
  /** 0 (Sunday) to 6 (Saturday). Empty means every day. */
  days: number[];
  /** HH:MM, in the account's timezone. */
  time: string;
}

export interface AutomatedAccount {
  id: string;
  user_id: string;
  system_prompt: string;
  is_enabled: boolean;
  max_post_chars: number;
  max_heading_chars: number;
  timezone: string;
  schedule: ScheduleSlot[];
  next_run_at: string | null;
  last_run_at: string | null;
  locked_until: string | null;
  created_at: string;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
}

export interface AutomationIdea {
  id: string;
  account_id: string;
  idea: string;
  status: "pending" | "used" | "archived";
  priority: "normal" | "high";
  created_at: string;
  used_at: string | null;
  used_post_id: string | null;
}

export interface AutomationRun {
  id: string;
  account_id: string;
  scheduled_for: string;
  trigger: "schedule" | "manual";
  status: "running" | "published" | "failed" | "skipped";
  header: string | null;
  body: string | null;
  topic: string | null;
  mode: string | null;
  post_id: string | null;
  error: string | null;
  attempts: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
  finished_at: string | null;
}

export interface GeneratedPreview {
  header: string;
  body: string;
  topic: string;
  content_angle: string;
  mode: string;
  source_idea_id: string | null;
}

const ACCOUNT_SELECT =
  "id, user_id, system_prompt, is_enabled, max_post_chars, max_heading_chars, timezone, schedule, next_run_at, last_run_at, locked_until, created_at, profile:profiles(username, display_name, avatar_url, is_verified)";

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["automation"] });
}

// ---- Accounts --------------------------------------------------------------------------------------------------

export function useAutomatedAccounts() {
  return useQuery({
    queryKey: ["automation", "accounts"],
    queryFn: async (): Promise<(AutomatedAccount & { pending_ideas: number })[]> => {
      const [accountsRes, ideasRes] = await Promise.all([
        supabase.from("automated_accounts").select(ACCOUNT_SELECT).order("created_at", { ascending: false }),
        supabase.from("automation_ideas").select("account_id").eq("status", "pending"),
      ]);
      if (accountsRes.error) throw accountsRes.error;
      const counts = new Map<string, number>();
      for (const row of (ideasRes.data ?? []) as { account_id: string }[]) {
        counts.set(row.account_id, (counts.get(row.account_id) ?? 0) + 1);
      }
      return ((accountsRes.data ?? []) as unknown as AutomatedAccount[]).map((a) => ({
        ...a,
        pending_ideas: counts.get(a.id) ?? 0,
      }));
    },
  });
}

export function useAutomatedAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: ["automation", "account", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<AutomatedAccount | null> => {
      const { data, error } = await supabase
        .from("automated_accounts")
        .select(ACCOUNT_SELECT)
        .eq("id", accountId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AutomatedAccount) ?? null;
    },
  });
}

export function useCreateAutomatedAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<string> => {
      const { data, error } = await supabase
        .from("automated_accounts")
        .insert({ user_id: userId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export type AutomatedAccountPatch = Partial<
  Pick<AutomatedAccount, "system_prompt" | "is_enabled" | "max_post_chars" | "max_heading_chars" | "timezone" | "schedule">
>;

export function useUpdateAutomatedAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AutomatedAccountPatch }) => {
      const { error } = await supabase.from("automated_accounts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteAutomatedAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automated_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

// ---- Idea vault ------------------------------------------------------------------------------------------------

export function useAutomationIdeas(accountId: string | undefined) {
  return useQuery({
    queryKey: ["automation", "ideas", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<AutomationIdea[]> => {
      const { data, error } = await supabase
        .from("automation_ideas")
        .select("id, account_id, idea, status, priority, created_at, used_at, used_post_id")
        .eq("account_id", accountId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutomationIdea[];
    },
  });
}

export function useAddAutomationIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId,
      idea,
      priority,
    }: {
      accountId: string;
      idea: string;
      priority: "normal" | "high";
    }) => {
      const { error } = await supabase.from("automation_ideas").insert({ account_id: accountId, idea, priority });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateAutomationIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<AutomationIdea, "status" | "priority" | "idea">>;
    }) => {
      // Putting a used idea back in the queue is a deliberate, manual act, so clear its used markers.
      const extra = patch.status === "pending" ? { used_at: null, used_post_id: null } : {};
      const { error } = await supabase
        .from("automation_ideas")
        .update({ ...patch, ...extra })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteAutomationIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

// ---- History ---------------------------------------------------------------------------------------------------

export function useAutomationRuns(accountId: string | undefined) {
  return useQuery({
    queryKey: ["automation", "runs", accountId],
    enabled: !!accountId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<AutomationRun[]> => {
      const { data, error } = await supabase
        .from("automation_runs")
        .select(
          "id, account_id, scheduled_for, trigger, status, header, body, topic, mode, post_id, error, attempts, input_tokens, output_tokens, created_at, finished_at",
        )
        .eq("account_id", accountId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AutomationRun[];
    },
  });
}

// ---- Generate / publish ----------------------------------------------------------------------------------------

export function useGenerateAutomationPreview() {
  return useMutation({
    mutationFn: async (accountId: string): Promise<{ post: GeneratedPreview; idea_id: string | null }> => {
      const { data, error } = await supabase.functions.invoke("run-post-automation", {
        body: { mode: "preview", account_id: accountId },
      });
      if (error) throw new Error("Couldn't reach the generator. Please try again.");
      if (!data?.ok) throw new Error(data?.error ?? "Couldn't generate a preview.");
      return { post: data.post as GeneratedPreview, idea_id: (data.idea_id as string | null) ?? null };
    },
  });
}

export function useRunAutomationNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId,
      draft,
    }: {
      accountId: string;
      draft?: GeneratedPreview;
    }): Promise<{ post_id: string }> => {
      const { data, error } = await supabase.functions.invoke("run-post-automation", {
        body: { mode: "run_now", account_id: accountId, draft },
      });
      if (error) throw new Error("Couldn't reach the generator. Please try again.");
      if (!data?.ok) throw new Error(data?.error ?? "The post wasn't published.");
      return { post_id: data.post_id as string };
    },
    onSettled: () => invalidate(queryClient),
  });
}
