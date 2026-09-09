// src/hooks/useAdminComms.ts
//
// Hooks backing the new /admin communications pages: SMTP settings,
// email templates + campaigns, audience search/preview, and the
// in-app "message from Akọ." notification blast. Secrets and
// cross-user writes (SMTP password, sending mail, inserting
// notifications for other users) go through edge functions — see
// supabase/functions/. Everything else (templates/campaigns CRUD) is
// plain admin-only RLS'd table access, same pattern as useAdmin.ts.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

async function invoke<T>(name: string, options?: { method?: "GET" | "POST"; body?: object }): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    method: options?.method ?? "POST",
    body: options?.body,
  });
  if (error) {
    // FunctionsHttpError carries the actual JSON error body on
    // .context — surface that message instead of the generic
    // "Edge Function returned a non-2xx status code".
    const context = (error as any).context;
    if (context && typeof context.json === "function") {
      const body = await context.json().catch(() => null);
      if (body?.error) throw new Error(body.error);
    }
    throw error;
  }
  return data as T;
}

// ------------------------------------------------------------
// Audience type — shared shape across templates/campaigns/notifications
// ------------------------------------------------------------
export type AudienceType = "all" | "tier" | "page_followers" | "manual";

export interface AudienceInput {
  audience_type: AudienceType;
  audience_filter: Record<string, unknown>;
  manual_recipient_ids: string[];
}

export interface AudienceSample {
  id: string;
  username: string;
  display_name: string;
}

export function useAudiencePreview(audience: AudienceInput, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-audience-preview", audience],
    queryFn: () =>
      invoke<{ count: number; sample: AudienceSample[] }>("admin-audience-preview", { body: audience }),
    enabled,
  });
}

export interface AdminSearchUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  tier: string;
}

export function useAdminSearchUsers(query: string) {
  return useQuery({
    queryKey: ["admin-search-users", query],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `admin-search-users?q=${encodeURIComponent(query)}`,
        { method: "GET" }
      );
      if (error) throw error;
      return (data as { users: AdminSearchUser[] }).users;
    },
    enabled: query.trim().length >= 2,
  });
}

export interface AdminPage {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  follower_count: number;
  page_type: string;
}

export function useAdminListPages(query: string) {
  return useQuery({
    queryKey: ["admin-list-pages", query],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `admin-list-pages?q=${encodeURIComponent(query)}`,
        { method: "GET" }
      );
      if (error) throw error;
      return (data as { pages: AdminPage[] }).pages;
    },
  });
}

// ------------------------------------------------------------
// SMTP settings
// ------------------------------------------------------------
export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_configured: boolean;
  has_password: boolean;
}

export function useSmtpSettings() {
  return useQuery({
    queryKey: ["admin-smtp-settings"],
    queryFn: () => invoke<SmtpSettings>("admin-smtp-settings", { method: "GET" }),
  });
}

export interface SaveSmtpInput {
  host: string;
  port: number;
  username: string;
  password?: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

export function useSaveSmtpSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveSmtpInput) => invoke<{ ok: true }>("admin-smtp-settings", { body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-smtp-settings"] }),
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (to: string) => invoke<{ ok: true }>("admin-send-test-email", { body: { to } }),
  });
}

// ------------------------------------------------------------
// Email templates
// ------------------------------------------------------------
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useEmailTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["email-template", id],
    queryFn: async (): Promise<EmailTemplate> => {
      const { data, error } = await supabase.from("email_templates").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export interface TemplateInput {
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_draft: boolean;
}

export function useSaveEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TemplateInput }) => {
      if (id) {
        const { error } = await supabase
          .from("email_templates")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return id;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("email_templates")
        .insert({ ...input, created_by: user?.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

// ------------------------------------------------------------
// Email campaigns
// ------------------------------------------------------------
export type ScheduleType = "immediate" | "scheduled" | "recurring";
export type Recurrence = "daily" | "weekly" | "monthly";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "paused" | "cancelled";

export interface EmailCampaign {
  id: string;
  template_id: string;
  name: string;
  audience_type: AudienceType;
  audience_filter: Record<string, unknown>;
  manual_recipient_ids: string[];
  schedule_type: ScheduleType;
  send_at: string | null;
  recurrence: Recurrence | null;
  status: CampaignStatus;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
  template?: { name: string; subject: string };
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async (): Promise<EmailCampaign[]> => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*, template:email_templates(name, subject)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as EmailCampaign[];
    },
  });
}

export function useEmailCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ["email-campaign", id],
    queryFn: async (): Promise<EmailCampaign> => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*, template:email_templates(name, subject)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as EmailCampaign;
    },
    enabled: !!id,
  });
}

export interface CampaignInput {
  template_id: string;
  name: string;
  audience_type: AudienceType;
  audience_filter: Record<string, unknown>;
  manual_recipient_ids: string[];
  schedule_type: ScheduleType;
  send_at: string | null;
  recurrence: Recurrence | null;
  status: "draft" | "scheduled";
}

export function useSaveCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: CampaignInput }) => {
      if (id) {
        const { error } = await supabase
          .from("email_campaigns")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return id;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert({ ...input, created_by: user?.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-campaigns"] }),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-campaigns"] }),
  });
}

export function useSendCampaignNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) =>
      invoke<{ ok: true; status: string; sent_count: number; failed_count: number }>(
        "admin-send-campaign-now",
        { body: { campaign_id: campaignId } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["email-campaign"] });
    },
  });
}

// ------------------------------------------------------------
// In-app notification blast ("message from Akọ.")
// ------------------------------------------------------------
export interface SendNotificationInput extends AudienceInput {
  message: string;
}

export function useAdminSendNotification() {
  return useMutation({
    mutationFn: (input: SendNotificationInput) =>
      invoke<{ ok: true; recipient_count: number }>("admin-send-notification", { body: input }),
  });
}
