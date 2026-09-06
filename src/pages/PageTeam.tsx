// src/pages/PageTeam.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "../components/Avatar";
import {
  usePageByUsername,
  usePageMembers,
  useInvitePageMember,
  useRemovePageMember,
} from "../hooks/usePages";

// /page/:username/team — admin view: active roster + pending invites,
// invite-by-username form, remove/leave. Reachable from the gear icon
// on PagePage (only shown there to admins); RLS/the RPCs enforce the
// same admin-only rules server-side regardless of what this page shows.
export function PageTeam() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: page } = usePageByUsername(username!);
  const { data: members } = usePageMembers(page?.id ?? "");
  const invite = useInvitePageMember();
  const remove = useRemovePageMember();

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const myMembership = members?.find((m) => m.user_id === user?.id && m.status === "active");
  const isAdmin = !!myMembership?.is_admin;

  const active = (members ?? []).filter((m) => m.status === "active");
  const pending = (members ?? []).filter((m) => m.status === "invited");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!page || !inviteUsername.trim() || !inviteRole.trim()) return;

    setSubmitting(true);
    try {
      const { data: target, error: lookupError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", inviteUsername.trim().replace(/^@/, ""))
        .maybeSingle();

      if (lookupError || !target) {
        setError("No user found with that username.");
        return;
      }

      await invite.mutateAsync({
        page_id: page.id,
        user_id: target.id,
        role_label: inviteRole.trim(),
        is_admin: inviteAsAdmin,
      });
      setInviteUsername("");
      setInviteRole("");
      setInviteAsAdmin(false);
    } catch (err: any) {
      setError(err.message ?? "Couldn't send that invite.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6 text-center">
        <p className="text-ink-muted">Only a {page.name} admin can manage its team.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">{page.name} team</h2>
        </div>

        <form onSubmit={handleInvite} className="bg-surface rounded-2xl p-4 mb-6 space-y-3">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Invite someone</p>
          <input
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="@username"
            className="w-full bg-canvas rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted"
          />
          <input
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            placeholder="Role — e.g. Graphics Designer"
            maxLength={60}
            className="w-full bg-canvas rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted"
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={inviteAsAdmin}
              onChange={(e) => setInviteAsAdmin(e.target.checked)}
              className="rounded"
            />
            Make them an admin (can post as {page.name} and manage the team)
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
        </form>

        {pending.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2 px-1">
              Pending
            </p>
            <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border">
              {pending.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{m.profile.display_name}</p>
                    <p className="text-xs text-ink-muted truncate">Invited as {m.role_label}</p>
                  </div>
                  <button
                    onClick={() => remove.mutate({ page_id: page.id, user_id: m.user_id })}
                    className="text-ink-muted"
                    aria-label="Cancel invite"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2 px-1">
          Team ({active.length})
        </p>
        <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border">
          {active.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate flex items-center gap-1">
                  {m.profile.display_name}
                  {m.is_admin && <ShieldCheck size={13} className="text-accent" />}
                </p>
                <p className="text-xs text-ink-muted truncate">{m.role_label}</p>
              </div>
              {m.user_id !== user?.id && (
                <button
                  onClick={() => remove.mutate({ page_id: page.id, user_id: m.user_id })}
                  className="text-xs text-danger flex-shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
