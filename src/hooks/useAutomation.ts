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

export type AiProvider = "anthropic" | "openai" | "gemini";

export const AI_PROVIDERS: { value: AiProvider; label: string; defaultModel: string }[] = [
  { value: "anthropic", label: "Anthropic", defaultModel: "claude-sonnet-5-5" },
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4.1" },
  { value: "gemini", label: "Gemini", defaultModel: "gemini-3.5-flash" },
];

/** The id of a template in the catalog (automation_templates). The app never names one in code. */
export type AutomationPipeline = string;

/** Values for the template's own settings (automated_accounts.news_settings). Keys come from the template. */
export type TemplateSettings = Record<string, unknown>;

export interface AutomatedAccount {
  id: string;
  user_id: string;
  system_prompt: string;
  is_enabled: boolean;
  max_post_chars: number;
  max_heading_chars: number;
  timezone: string;
  schedule: ScheduleSlot[];
  ai_provider: AiProvider;
  ai_model: string | null;
  pipeline: AutomationPipeline;
  news_settings: TemplateSettings;
  /** Last four characters of the saved key, or null when none is saved. The key itself is never readable here. */
  api_key_last4: string | null;
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
  /** News pipeline: the cached articles the post was built from. Sent back unchanged when publishing the draft. */
  source_article_ids?: string[];
  /** The heading color the post will get when published (set by the generator from the day of the week). */
  heading_color?: string | null;
}

const ACCOUNT_SELECT =
  "id, user_id, system_prompt, is_enabled, max_post_chars, max_heading_chars, timezone, schedule, ai_provider, ai_model, pipeline, news_settings, api_key_last4, next_run_at, last_run_at, locked_until, created_at, profile:profiles(username, display_name, avatar_url, is_verified)";

// Returned on purpose: a mutation then resolves only after the refreshed data has arrived, so a screen that reads the
// account straight after saving never sees the old values.
function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["automation"] });
}


// ---- Catalog ---------------------------------------------------------------------------------------------------
// What an account can be, which feeds it can read and the presets for them. Lives in the database
// (supabase/ako_automation_catalog.sql) so the screen builds itself from it and names nothing in code.

export interface TemplateSetting {
  key: string;
  label: string;
  help?: string;
  min: number;
  max: number;
  default: number;
}

export interface AutomationTemplate {
  id: AutomationPipeline;
  label: string;
  description: string;
  uses_idea_vault: boolean;
  uses_sources: boolean;
  settings: TemplateSetting[];
}

export interface SourceProviderInfo {
  id: SourceProvider;
  label: string;
  needs_key: boolean;
  config_help: string;
  blank_config: Record<string, unknown>;
}

export interface SourcePreset {
  id: string;
  provider_id: SourceProvider;
  label: string;
  note: string;
  config: Record<string, unknown>;
}

export interface AutomationCatalog {
  templates: AutomationTemplate[];
  providers: SourceProviderInfo[];
  presets: SourcePreset[];
}

export function useAutomationCatalog() {
  return useQuery({
    queryKey: ["automation", "catalog"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<AutomationCatalog> => {
      const [templates, providers, presets] = await Promise.all([
        supabase
          .from("automation_templates")
          .select("id, label, description, uses_idea_vault, uses_sources, settings")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("automation_source_providers")
          .select("id, label, needs_key, config_help, blank_config")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("automation_source_presets")
          .select("id, provider_id, label, note, config")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (templates.error) throw templates.error;
      if (providers.error) throw providers.error;
      if (presets.error) throw presets.error;
      return {
        templates: (templates.data ?? []) as unknown as AutomationTemplate[],
        providers: (providers.data ?? []) as unknown as SourceProviderInfo[],
        presets: (presets.data ?? []) as unknown as SourcePreset[],
      };
    },
  });
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
    mutationFn: async ({ userId, pipeline }: { userId: string; pipeline: AutomationPipeline }): Promise<string> => {
      const { data, error } = await supabase
        .from("automated_accounts")
        .insert({ user_id: userId, pipeline })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export type AutomatedAccountPatch = Partial<
  Pick<
    AutomatedAccount,
    "system_prompt" | "is_enabled" | "max_post_chars" | "max_heading_chars" | "timezone" | "schedule" | "pipeline" | "news_settings"
  >
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

/**
 * Saves the provider, optional model override and (when pasted) the API key. The key goes straight into Supabase
 * Vault and can't be read back, only replaced or removed. Switching provider without pasting a new key removes the
 * old key and pauses the account, because the old key belongs to the old provider.
 */
export function useSaveAutomationAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId,
      provider,
      model,
      apiKey,
    }: {
      accountId: string;
      provider: AiProvider;
      model: string;
      apiKey: string;
    }): Promise<{ key_saved: boolean; key_removed: boolean; paused: boolean }> => {
      const { data, error } = await supabase.rpc("automation_set_ai", {
        p_account_id: accountId,
        p_provider: provider,
        p_model: model.trim() || null,
        p_key: apiKey.trim() || null,
      });
      if (error) throw error;
      return data as { key_saved: boolean; key_removed: boolean; paused: boolean };
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useClearAutomationApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase.rpc("automation_clear_api_key", { p_account_id: accountId });
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
      return {
        post: { ...(data.post as GeneratedPreview), heading_color: (data.heading_color as string | null) ?? null },
        idea_id: (data.idea_id as string | null) ?? null,
      };
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

// ---- News sources ----------------------------------------------------------------------------------------------
// Feeds a news account reads (supabase/ako_post_automation_news.sql). A feed's key goes straight into Supabase Vault and
// can't be read back, only replaced or removed, exactly like the AI key.

/** The id of a provider in the catalog (automation_source_providers). */
export type SourceProvider = string;

export interface AutomationSource {
  id: string;
  account_id: string;
  provider: SourceProvider;
  label: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  api_key_last4: string | null;
  last_fetched_at: string | null;
  last_status: "ok" | "error" | null;
  last_error: string | null;
  last_count: number | null;
  created_at: string;
}

export interface SourceReport {
  source_id: string;
  label: string;
  provider: SourceProvider;
  ok: boolean;
  fetched: number;
  error?: string;
}

export function useAutomationSources(accountId: string | undefined) {
  return useQuery({
    queryKey: ["automation", "sources", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<AutomationSource[]> => {
      const { data, error } = await supabase
        .from("automation_sources")
        .select(
          "id, account_id, provider, label, is_enabled, config, api_key_last4, last_fetched_at, last_status, last_error, last_count, created_at",
        )
        .eq("account_id", accountId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AutomationSource[];
    },
  });
}

export function useAddAutomationSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId,
      provider,
      label,
      config,
      apiKey,
      needsKey,
    }: {
      accountId: string;
      provider: SourceProvider;
      label: string;
      config: Record<string, unknown>;
      apiKey: string;
      needsKey: boolean;
    }) => {
      // A keyed source can't be enabled until it has a key, so it is created off and switched on after the key lands.
      const { data, error } = await supabase
        .from("automation_sources")
        .insert({ account_id: accountId, provider, label, config, is_enabled: !needsKey })
        .select("id")
        .single();
      if (error) throw error;
      if (needsKey && apiKey.trim()) {
        const { error: keyError } = await supabase.rpc("automation_set_source_key", {
          p_source_id: data.id,
          p_key: apiKey.trim(),
        });
        if (keyError) throw keyError;
        const { error: onError } = await supabase.from("automation_sources").update({ is_enabled: true }).eq("id", data.id);
        if (onError) throw onError;
      }
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateAutomationSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<AutomationSource, "label" | "is_enabled" | "config">>;
    }) => {
      const { error } = await supabase.from("automation_sources").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useSaveSourceKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, apiKey }: { id: string; apiKey: string }) => {
      const { error } = await supabase.rpc("automation_set_source_key", { p_source_id: id, p_key: apiKey.trim() });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useClearSourceKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("automation_clear_source_key", { p_source_id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteAutomationSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

/** Pulls every enabled source into the article cache now and reports what each one returned. Publishes nothing. */
export function useFetchAutomationSources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string): Promise<SourceReport[]> => {
      const { data, error } = await supabase.functions.invoke("run-post-automation", {
        body: { mode: "fetch_sources", account_id: accountId },
      });
      if (error) throw new Error("Couldn't reach the generator. Please try again.");
      if (!data?.ok) throw new Error(data?.error ?? "Couldn't fetch the sources.");
      return data.reports as SourceReport[];
    },
    onSettled: () => invalidate(queryClient),
  });
}
