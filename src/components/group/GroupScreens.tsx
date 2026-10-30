// src/components/group/GroupScreens.tsx
//
// The group's non-chat screens. The chat itself is the shared MessageThread (same engine as 1:1 chats); everything
// else a group has — Updates, Meetings, Assignments, Members, Settings — is a screen of its own, reached from the
// group info list (tap the group name) or the ⋯ menu in the chat header. Leaving is the very last row of that list
// and nowhere else, so it never reads as a call to action.
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardList,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "../Avatar";
import { VerifiedBadge } from "../VerifiedBadge";
import { OptionsModal, type OptionItem } from "../OptionsModal";
import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../Toast";
import {
  useAddRoomModerator,
  useRemoveRoomMember,
  useRemoveRoomModerator,
  useRoomModerators,
  type RoomPerson,
} from "../../hooks/useRoom";
import { useAuth } from "../../hooks/useAuth";
import type { GroupKind } from "../../lib/groups";

export type GroupView = "info" | "updates" | "meetings" | "assignments" | "members" | "settings";

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// ---------------------------------------------------------------
// Shell: sticky header (back · title · subtitle · right slot) over a scrolling, centred column
// ---------------------------------------------------------------
export function GroupScreenShell({
  title,
  subtitle,
  onBack,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header
        className="sticky top-0 z-30 border-b border-border bg-canvas/90 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <button onClick={onBack} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted active:bg-ink/5" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold leading-tight text-ink">{title}</h1>
            {subtitle && <p className="truncate text-xs text-ink-muted">{subtitle}</p>}
          </div>
          {right}
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------------
// Group info: the options list
// ---------------------------------------------------------------
function InfoRow({
  icon,
  label,
  hint,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-ink/5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{label}</span>
        {hint && <span className="block truncate text-xs text-ink-muted">{hint}</span>}
      </span>
      {badge}
      <ChevronRight size={18} className="flex-shrink-0 text-ink-muted/60" />
    </button>
  );
}

export function GroupInfoScreen({
  title,
  kind,
  kindLabel,
  description,
  thumbnailUrl,
  people,
  isHost,
  isClosed,
  showChat,
  pendingRequests,
  canLeave,
  onBack,
  onOpen,
  onOpenChat,
  onLeave,
}: {
  title: string;
  kind: GroupKind;
  kindLabel: string;
  description: string | null;
  thumbnailUrl: string | null;
  people: RoomPerson[];
  isHost: boolean;
  isClosed: boolean;
  showChat: boolean;
  pendingRequests: number;
  canLeave: boolean;
  onBack: () => void;
  onOpen: (view: GroupView) => void;
  onOpenChat: () => void;
  onLeave: () => void;
}) {
  const isCohort = kind === "cohort";
  const memberWord = people.length === 1 ? "member" : "members";
  return (
    <GroupScreenShell title="Group info" onBack={onBack}>
      <section className="flex flex-col items-center px-2 pb-6 pt-2 text-center">
        <Avatar src={thumbnailUrl} name={title} size="2xl" />
        <h2 className="mt-4 font-display text-2xl leading-tight text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {kindLabel} · {people.length} {memberWord}
        </p>
        {description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{description}</p>}
        {isClosed && (
          <p className="mt-3 rounded-full bg-accent-soft/70 px-3 py-1 text-xs text-ink-muted">This {kindLabel.toLowerCase()} has ended</p>
        )}
      </section>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {showChat && <InfoRow icon={<MessageCircle size={18} />} label="Chat" hint="Messages from the group" onClick={onOpenChat} />}
        <InfoRow
          icon={<BookOpen size={18} />}
          label={isCohort ? "Classroom" : "Updates"}
          hint={isCohort ? "Lessons, polls and announcements" : "Announcements, voice notes and polls"}
          onClick={() => onOpen("updates")}
        />
        {!isClosed && <InfoRow icon={<Calendar size={18} />} label="Meetings" hint="Live sessions and recordings" onClick={() => onOpen("meetings")} />}
        {!isClosed && isCohort && (
          <InfoRow icon={<ClipboardList size={18} />} label="Assignments" hint="Work to hand in" onClick={() => onOpen("assignments")} />
        )}
        <InfoRow
          icon={<Users size={18} />}
          label="Members"
          hint={`${people.length} ${memberWord}`}
          onClick={() => onOpen("members")}
        />
        {isHost && (
          <InfoRow
            icon={<Settings size={18} />}
            label="Group settings"
            hint="Chat rules, history, join requests"
            badge={
              pendingRequests > 0 ? (
                <span className="mr-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cta px-1.5 text-[11px] font-semibold text-white">
                  {pendingRequests}
                </span>
              ) : undefined
            }
            onClick={() => onOpen("settings")}
          />
        )}
      </div>

      {canLeave && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <button
            type="button"
            onClick={onLeave}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-danger transition-colors active:bg-danger/5"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-danger/10">
              <LogOut size={18} />
            </span>
            <span className="font-medium">Leave group</span>
          </button>
        </div>
      )}
    </GroupScreenShell>
  );
}

// ---------------------------------------------------------------
// Members: everyone in the group, each row opens their profile
// ---------------------------------------------------------------
const ROLE_LABEL: Record<RoomPerson["role"], string | null> = { owner: "Owner", host: "Host", member: null };

export function GroupMembersScreen({
  projectId,
  title,
  isCohort,
  people,
  isHost,
  isOwner,
  loading,
  onBack,
}: {
  projectId: string;
  title: string;
  isCohort: boolean;
  people: RoomPerson[];
  isHost: boolean;
  isOwner: boolean;
  loading: boolean;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [actionsFor, setActionsFor] = useState<RoomPerson | null>(null);
  const [confirm, setConfirm] = useState<{ person: RoomPerson; blacklist: boolean } | null>(null);
  const removeMember = useRemoveRoomMember(projectId);
  const addModerator = useAddRoomModerator(projectId);
  const removeModerator = useRemoveRoomModerator(projectId);
  const { data: moderators } = useRoomModerators(projectId);
  const moderatorIds = useMemo(() => new Set((moderators ?? []).map((m) => m.user_id)), [moderators]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? people.filter((p) => p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
    : people;
  const hosts = filtered.filter((p) => p.role !== "member");
  const members = filtered.filter((p) => p.role === "member");
  const hostLabel = isCohort ? "Instructors" : "Hosts";

  const openProfile = (p: RoomPerson) => navigate(`/profile/${p.username}`);

  function actionsFor_(p: RoomPerson): (OptionItem | "divider")[] {
    const items: (OptionItem | "divider")[] = [
      { key: "profile", label: "View profile", icon: <Users />, onSelect: () => openProfile(p) },
    ];
    if (isOwner && p.role === "member") {
      items.push({
        key: "make-host",
        label: "Make host",
        icon: <Settings />,
        onSelect: () =>
          addModerator.mutate(p.user_id, {
            onSuccess: () => toast(`${p.display_name} is now a host.`, { variant: "success" }),
            onError: (err) => toast(errorText(err, "Couldn't make them a host."), { variant: "error" }),
          }),
      });
    }
    if (isOwner && moderatorIds.has(p.user_id)) {
      items.push({
        key: "remove-host",
        label: "Remove as host",
        icon: <Settings />,
        onSelect: () =>
          removeModerator.mutate(p.user_id, {
            onSuccess: () => toast(`${p.display_name} is no longer a host.`, { variant: "success" }),
            onError: (err) => toast(errorText(err, "Couldn't update that host."), { variant: "error" }),
          }),
      });
    }
    if (p.role === "member") {
      items.push(
        "divider",
        { key: "remove", label: "Remove from group", icon: <X />, variant: "danger", onSelect: () => setConfirm({ person: p, blacklist: false }) },
        { key: "block", label: "Remove and block", icon: <X />, variant: "danger", onSelect: () => setConfirm({ person: p, blacklist: true }) }
      );
    }
    return items;
  }

  const Row = ({ p }: { p: RoomPerson }) => {
    const isMe = p.user_id === user?.id;
    const role = ROLE_LABEL[p.role];
    const canManage = isHost && !isMe && (p.role === "member" || (isOwner && moderatorIds.has(p.user_id)));
    return (
      <div className="flex items-center gap-1 pr-2">
        <button type="button" onClick={() => openProfile(p)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left active:bg-ink/5">
          <Avatar src={p.avatar_url} name={p.display_name} size="md" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium text-ink">{p.display_name}</span>
              {p.is_verified && <VerifiedBadge size={14} />}
              {isMe && <span className="text-xs text-ink-muted">(You)</span>}
            </span>
            <span className="block truncate text-xs text-ink-muted">@{p.username}</span>
          </span>
          {role && (
            <span className="flex-shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              {p.role === "host" && isCohort ? "Instructor" : role}
            </span>
          )}
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => setActionsFor(p)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-muted active:bg-ink/5"
            aria-label={`Manage ${p.display_name}`}
          >
            <MoreHorizontal size={18} />
          </button>
        )}
      </div>
    );
  };

  const Section = ({ label, rows }: { label: string; rows: RoomPerson[] }) =>
    rows.length === 0 ? null : (
      <section className="mt-5 first:mt-0">
        <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {label} · {rows.length}
        </h3>
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((p) => (
            <Row key={p.user_id} p={p} />
          ))}
        </div>
      </section>
    );

  return (
    <GroupScreenShell title="Members" subtitle={`${title} · ${people.length}`} onBack={onBack}>
      {people.length > 8 && (
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members"
            className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-[15px] text-ink outline-none placeholder:text-ink-muted focus:border-accent"
          />
        </div>
      )}
      {loading && people.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">Loading members…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">{q ? "No one matches that." : "No members yet."}</p>
      ) : (
        <>
          <Section label={hostLabel} rows={hosts} />
          <Section label="Members" rows={members} />
        </>
      )}

      {actionsFor && (
        <OptionsModal title={actionsFor.display_name} items={actionsFor_(actionsFor)} onClose={() => setActionsFor(null)} />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.blacklist ? `Remove and block ${confirm.person.display_name}?` : `Remove ${confirm.person.display_name}?`}
          description={
            confirm.blacklist
              ? "They'll be taken out of the group and won't be able to join again."
              : "They'll be taken out of the group. They can join again if the group allows it."
          }
          confirmLabel={confirm.blacklist ? "Remove and block" : "Remove"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const { person, blacklist } = confirm;
            setConfirm(null);
            removeMember.mutate(
              { userId: person.user_id, blacklist },
              {
                onSuccess: () => toast(blacklist ? `${person.display_name} was removed and blocked.` : `${person.display_name} was removed.`, { variant: "success" }),
                onError: (err) => toast(errorText(err, "Couldn't remove them."), { variant: "error" }),
              }
            );
          }}
        />
      )}
    </GroupScreenShell>
  );
}
