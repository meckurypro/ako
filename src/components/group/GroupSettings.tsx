// src/components/group/GroupSettings.tsx
// Group settings, laid out like WhatsApp's "Group permissions": grouped rows, each with an icon, a title and the
// CURRENT value underneath. Tapping a choice row opens a small picker; switches sit inline. Sections:
//   Group link      — short link (owner sets it, same as projects/pages), copy, share
//   Joining         — who can join (communities), join requests, add people
//   Messaging       — who can send, mute, what new members can read
//   Managing        — hosts, blocked people
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Ban, Check, ChevronRight, Copy, History, Link2, MailPlus, MessageSquare, Search, Share2, Shield, UserCheck, UserPlus, Users, VolumeX, X, type LucideIcon } from "lucide-react";

import { Avatar } from "../Avatar";
import { Modal } from "../Modal";
import { OptionsModal, type OptionItem } from "../OptionsModal";
import { ProjectLinkSheet } from "../ProjectLinkSheet";
import { useToast } from "../Toast";
import {
  useAddRoomMember,
  useCancelRoomInvite,
  useInviteRoomMember,
  useReviewRoomJoinRequest,
  useRoomBlocklist,
  useRoomCandidates,
  useRoomDetails,
  useRoomInvites,
  useRoomJoinRequests,
  useRoomPeople,
  useUnblacklistRoomUser,
  useUpdateRoomDetails,
  type GroupJoinMode,
  type RoomCandidate,
  type RoomHistoryMode,
} from "../../hooks/useRoom";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { timeAgo } from "../../lib/timeAgo";
import type { Project } from "../../hooks/useProjects";
import { APP_URL } from "../../lib/appUrl";
import { getGroupPath } from "../../lib/groups";

const HISTORY_OPTIONS: { value: RoomHistoryMode; label: string; hint: string }[] = [
  { value: "anchored", label: "Anchored only", hint: "New members see anchored messages and anything from when they joined." },
  { value: "admins_and_anchored", label: "Hosts + anchored", hint: "New members also see everything the hosts wrote." },
  { value: "all", label: "Everything", hint: "New members can read the whole chat history." },
];

const HISTORY_SHORT: Record<RoomHistoryMode, string> = { anchored: "Anchored only", admins_and_anchored: "Hosts + anchored", all: "Everything" };

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function PersonLink({ username, name, avatar }: { username: string; name: string; avatar: string | null }) {
  return (
    <Link to={`/profile/${username}`} className="flex items-center gap-2 min-w-0">
      <Avatar src={avatar} name={name} size="sm" />
      <span className="min-w-0">
        <span className="block text-sm text-ink truncate">{name}</span>
        <span className="block text-[11px] text-ink-muted truncate">@{username}</span>
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------
function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface divide-y divide-border">{rows}</div>
      {footer ? <p className="mt-1.5 px-1 text-[11px] leading-4 text-ink-muted">{footer}</p> : null}
    </section>
  );
}

function IconTile({ icon: IconCmp }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
      <IconCmp size={18} className="text-accent" />
    </span>
  );
}

function Row({ icon, title, value, onClick, right, badge }: { icon: LucideIcon; title: string; value?: string; onClick: () => void; right?: ReactNode; badge?: number }) {
  return (
    <div className="flex items-center gap-1 pr-3 hover:bg-ink-a10 transition-colors">
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
        <IconTile icon={icon} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{title}</span>
          {value ? <span className="block truncate text-xs text-ink-muted">{value}</span> : null}
        </span>
        {badge && badge > 0 ? (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cta px-1.5 text-[11px] font-semibold text-white">{badge}</span>
        ) : null}
      </button>
      {right}
      <ChevronRight size={18} className="shrink-0 text-ink-muted pointer-events-none" />
    </div>
  );
}

function ToggleRow({ icon, title, hint, checked, onChange }: { icon: LucideIcon; title: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <IconTile icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{title}</p>
        {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------
// Type-ahead: results update as you type (after a short pause), people you follow come first, and each result says
// what you can do — "Add" puts them straight in, "Invite" is for people who've chosen to join groups by invitation only.
function AddMembersDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const toast = useToast();
  const addMember = useAddRoomMember(projectId);
  const inviteMember = useInviteRoomMember(projectId);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const debounced = useDebouncedValue(query.trim(), 200);
  const { data: results, isFetching, isError } = useRoomCandidates(projectId, debounced);
  const waiting = query.trim() !== debounced || isFetching;
  const list = results ?? [];

  async function act(person: RoomCandidate) {
    setBusyId(person.user_id);
    try {
      if (person.add_mode === "invite") {
        await inviteMember.mutateAsync(person.user_id);
        toast(`Invitation sent to ${person.display_name}.`, { variant: "success" });
      } else {
        await addMember.mutateAsync(person.user_id);
        toast(`${person.display_name} was added.`, { variant: "success" });
      }
    } catch (err) {
      toast(errorMessage(err, person.add_mode === "invite" ? "Couldn't send the invitation." : "Couldn't add them."), { variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Add members">
      <h2 className="font-display text-xl text-ink">Add members</h2>
      <p className="mt-1 text-sm text-ink-muted">Start typing a name or username. People who only join by invitation get an invite instead.</p>
      <div className="relative mt-4">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          className="w-full rounded-xl bg-canvas py-3 pl-10 pr-10 text-sm text-ink"
          aria-label="Search people to add"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 max-h-[50vh] overflow-y-auto">
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            {isError ? "Couldn't search just now. Try again." : waiting ? "Searching…" : query.trim() ? "No one matches that search." : "Type to find people. The people you follow show up here first."}
          </p>
        ) : (
          <div className="flex flex-col">
            {!query.trim() ? <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">People you follow</p> : null}
            {list.map((p) => {
              const busy = busyId === p.user_id;
              return (
                <div key={p.user_id} className="flex items-center justify-between gap-2 py-2">
                  <PersonLink username={p.username} name={p.display_name} avatar={p.avatar_url} />
                  {p.state === "member" ? (
                    <span className="shrink-0 px-2 text-xs text-ink-muted">In the group</span>
                  ) : p.state === "invited" ? (
                    <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted">Invited</span>
                  ) : (
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => void act(p)}
                        disabled={busy}
                        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium disabled:opacity-50 ${p.add_mode === "invite" ? "border border-accent text-accent" : "bg-cta text-white"}`}
                      >
                        {p.add_mode === "invite" ? <MailPlus size={13} /> : <UserPlus size={13} />}
                        {busy ? (p.add_mode === "invite" ? "Inviting…" : "Adding…") : p.add_mode === "invite" ? "Invite" : "Add"}
                      </button>
                      {p.add_mode === "invite" ? <span className="text-[10px] text-ink-muted">Invitation only</span> : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Everyone invited who hasn't answered yet — hosts can see who invited them and when, and take an invite back.
function InvitesDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const toast = useToast();
  const { data: invites } = useRoomInvites(projectId);
  const cancel = useCancelRoomInvite(projectId);
  const list = invites ?? [];

  return (
    <Modal onClose={onClose} ariaLabel="Pending invites">
      <h2 className="font-display text-xl text-ink">Pending invites</h2>
      <p className="mt-1 text-sm text-ink-muted">They join as soon as they accept. Cancel an invite and it disappears from their notifications.</p>
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No invites waiting for a reply.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {list.map((i) => (
            <div key={i.user_id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <PersonLink username={i.profile.username} name={i.profile.display_name} avatar={i.profile.avatar_url} />
                <p className="mt-0.5 pl-10 text-[11px] text-ink-muted">
                  {i.inviter ? `Invited by ${i.inviter.display_name} · ` : "Invited · "}
                  {timeAgo(i.created_at)}
                </p>
              </div>
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(i.user_id, {
                    onSuccess: () => toast(`Invitation to ${i.profile.display_name} cancelled.`, { variant: "success" }),
                    onError: (err) => toast(errorMessage(err, "Couldn't cancel that invitation."), { variant: "error" }),
                  })
                }
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-danger disabled:opacity-50"
              >
                Cancel invite
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function BlockedDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const toast = useToast();
  const { data: blocklist } = useRoomBlocklist(projectId);
  const unblacklist = useUnblacklistRoomUser(projectId);
  const list = blocklist ?? [];

  return (
    <Modal onClose={onClose} ariaLabel="Blocked people">
      <h2 className="font-display text-xl text-ink">Blocked people</h2>
      <p className="mt-1 text-sm text-ink-muted">They can't join this group.</p>
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No one is blocked.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {list.map((b) => (
            <div key={b.user_id} className="flex items-center justify-between gap-2">
              <PersonLink username={b.profile.username} name={b.profile.display_name} avatar={b.profile.avatar_url} />
              <button
                type="button"
                onClick={() =>
                  unblacklist.mutate(b.user_id, {
                    onSuccess: () => toast(`${b.profile.display_name} can request to join again.`, { variant: "success" }),
                    onError: (err) => toast(errorMessage(err, "Couldn't update the blocked list."), { variant: "error" }),
                  })
                }
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-accent"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------
// Panel
// ---------------------------------------------------------------
type Picker = "join" | "chat" | "history" | null;

export function HostSettingsPanel({ projectId, project, isOwner, onOpenMembers }: { projectId: string; project: Project; isOwner: boolean; onOpenMembers?: () => void }) {
  const toast = useToast();
  const { data: details } = useRoomDetails(projectId);
  const { data: people } = useRoomPeople(projectId);
  const { data: requests } = useRoomJoinRequests(projectId);
  const { data: blocklist } = useRoomBlocklist(projectId);
  const { data: invites } = useRoomInvites(projectId);
  const updateDetails = useUpdateRoomDetails(projectId);
  const review = useReviewRoomJoinRequest(projectId);
  const [picker, setPicker] = useState<Picker>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const historyMode = details?.history_mode ?? "anchored";
  const joinMode: GroupJoinMode = details?.join_mode ?? "request";
  const isCommunity = details?.kind === "community";
  const hostsOnly = !!details?.hosts_only_chat;
  const onError = () => toast("Couldn't update that.", { variant: "error" });

  const groupUrl = `${APP_URL}${getGroupPath(project)}`;
  const shownUrl = groupUrl.replace(/^https?:\/\//, "");
  const hostNames = (people ?? []).filter((p) => p.role !== "member").map((p) => p.display_name);
  const blockedCount = (blocklist ?? []).length;
  const inviteCount = (invites ?? []).length;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(groupUrl);
      toast("Link copied.", { variant: "success" });
    } catch {
      toast("Couldn't copy the link.", { variant: "error" });
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: project.title, url: groupUrl });
        return;
      } catch {
        // Dismissed the share sheet — nothing to do.
        return;
      }
    }
    await copyLink();
  }

  function onLinkRow() {
    if (isOwner) setLinkOpen(true);
    else if (project.slug) void copyLink();
    else toast("Only the group owner can set the link.");
  }

  function decide(userId: string, name: string, approve: boolean) {
    review.mutate(
      { userId, approve },
      {
        onSuccess: () => toast(approve ? `${name} joined the group.` : `Declined ${name}.`, { variant: "success" }),
        onError: (err) => toast(errorMessage(err, "Couldn't update that request."), { variant: "error" }),
      }
    );
  }

  const check = (on: boolean) => (on ? <Check size={18} className="text-accent" /> : undefined);

  function pickerItems(): { title: string; items: OptionItem[] } | null {
    if (picker === "join") {
      return {
        title: "Who can join",
        items: [
          { key: "open", label: "Anyone", description: "People join in one tap, no approval needed.", badge: check(joinMode === "open"), onSelect: () => updateDetails.mutate({ join_mode: "open" }, { onError }) },
          { key: "request", label: "Approval required", description: "A host reviews every request to join.", badge: check(joinMode === "request"), onSelect: () => updateDetails.mutate({ join_mode: "request" }, { onError }) },
        ],
      };
    }
    if (picker === "chat") {
      return {
        title: "Send new messages",
        items: [
          { key: "everyone", label: "Everyone", description: "Every member can post in the chat.", badge: check(!hostsOnly), onSelect: () => updateDetails.mutate({ hosts_only_chat: false }, { onError }) },
          { key: "hosts", label: "Only hosts", description: "Members can read the chat but not post.", badge: check(hostsOnly), onSelect: () => updateDetails.mutate({ hosts_only_chat: true }, { onError }) },
        ],
      };
    }
    if (picker === "history") {
      return {
        title: "Message history for new members",
        items: HISTORY_OPTIONS.map((o) => ({ key: o.value, label: o.label, description: o.hint, badge: check(historyMode === o.value), onSelect: () => updateDetails.mutate({ history_mode: o.value }, { onError }) })),
      };
    }
    return null;
  }
  const active = pickerItems();

  return (
    <div className="flex flex-col gap-6 pb-8">
      {(requests ?? []).length > 0 && (
        <section>
          <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Requests to join · {requests!.length}</h3>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface divide-y divide-border">
            {requests!.map((r) => (
              <div key={r.user_id} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <PersonLink username={r.profile.username} name={r.profile.display_name} avatar={r.profile.avatar_url} />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => decide(r.user_id, r.profile.display_name, false)} disabled={review.isPending} className="rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted">
                      Decline
                    </button>
                    <button type="button" onClick={() => decide(r.user_id, r.profile.display_name, true)} disabled={review.isPending} className="rounded-full bg-cta px-3 py-1.5 text-xs font-medium text-white">
                      Accept
                    </button>
                  </div>
                </div>
                {r.message && <p className="px-1 text-xs text-ink-muted">“{r.message}”</p>}
              </div>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-ink-muted">Tap a name or photo to see their profile first.</p>
        </section>
      )}

      <Section title="Group link" footer={project.slug ? "Anyone with this link can find the group. Changing it keeps the old link working." : isOwner ? "Pick a short, memorable link like you can for projects and pages." : undefined}>
        <Row
          icon={Link2}
          title="Group link"
          value={project.slug ? shownUrl : isOwner ? "Not set — click to choose a short link" : "Not set"}
          onClick={onLinkRow}
          right={
            project.slug ? (
              <button type="button" onClick={() => void copyLink()} aria-label="Copy link" className="shrink-0 p-1.5">
                <Copy size={16} className="text-accent" />
              </button>
            ) : undefined
          }
        />
        <Row icon={Share2} title="Share group link" value="Send the link to people outside the group" onClick={() => void shareLink()} />
      </Section>

      <Section title="Joining the group">
        {isCommunity ? <Row icon={UserCheck} title="Who can join" value={joinMode === "open" ? "Anyone" : "Approval required"} onClick={() => setPicker("join")} /> : null}
        <Row icon={UserPlus} title="Add members" value="Search by name or username" onClick={() => setAddOpen(true)} />
        <Row icon={MailPlus} title="Pending invites" value={inviteCount > 0 ? `${inviteCount} waiting for a reply` : "No one waiting"} badge={inviteCount} onClick={() => setInvitesOpen(true)} />
      </Section>

      <Section title="Messaging">
        <Row icon={MessageSquare} title="Send new messages" value={hostsOnly ? "Only hosts" : "Everyone"} onClick={() => setPicker("chat")} />
        <ToggleRow icon={VolumeX} title="Mute chat for everyone" hint="Nobody can post until you turn this off" checked={!!details?.chat_muted} onChange={(v) => updateDetails.mutate({ chat_muted: v }, { onError })} />
        <Row icon={History} title="Message history" value={`New members see: ${HISTORY_SHORT[historyMode]}`} onClick={() => setPicker("history")} />
      </Section>

      <Section title="Managing the group" footer="Anchored messages are always visible to new members.">
        <Row icon={Shield} title="Hosts" value={hostNames.length ? hostNames.join(", ") : "Just you"} onClick={() => onOpenMembers?.()} />
        {onOpenMembers ? <Row icon={Users} title="Members" value={`${(people ?? []).length} in this group · click to manage`} onClick={onOpenMembers} /> : null}
        <Row icon={Ban} title="Blocked people" value={blockedCount > 0 ? `${blockedCount} blocked` : "No one"} onClick={() => setBlockedOpen(true)} />
      </Section>

      {active ? <OptionsModal title={active.title} items={active.items} onClose={() => setPicker(null)} /> : null}
      {linkOpen ? <ProjectLinkSheet project={project} noun="group" onClose={() => setLinkOpen(false)} /> : null}
      {addOpen ? <AddMembersDialog projectId={projectId} onClose={() => setAddOpen(false)} /> : null}
      {invitesOpen ? <InvitesDialog projectId={projectId} onClose={() => setInvitesOpen(false)} /> : null}
      {blockedOpen ? <BlockedDialog projectId={projectId} onClose={() => setBlockedOpen(false)} /> : null}
    </div>
  );
}
