// src/pages/Connect.tsx
//
// Bottom-nav home for everything you attend or earn from outside the
// feed: Events, Meetings and Rooms. Replaces the old "Events & meetings" row
// in the Activity hub, and the Messages tab (messages now live behind the
// floating chat button). Forked (affiliate) projects live under Wallet.
//
// Tabs are dynamic: a tab only appears once the user has something in it, and
// when there's nothing at all the page shows a single empty state instead of
// a tab bar.
import { useMemo, useState, type ReactNode } from "react";
import { useCountdown, formatCountdown } from "../hooks/useCountdown";
import { BellOff, CalendarClock, ImageIcon, Pin, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useCanCreateGroup } from "../hooks/useCanCreateGroup";
import { useActivity, type ActivityItem } from "../hooks/useActivity";
import { useTabState } from "../hooks/useTabState";
import { ListItemMenu } from "../components/ListItemMenu";
import { BottomNav } from "../components/BottomNav";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { SlidingTabBar } from "../components/SlidingTabBar";

const ALL_TABS = ["events", "meetings", "groups"] as const;
type ConnectTab = (typeof ALL_TABS)[number];

const TAB_LABEL: Record<ConnectTab, string> = {
  events: "Events",
  meetings: "Meetings",
  groups: "Groups",
};

// Group meetings sit with the other meetings (name of the group + a countdown); the Groups tab lists the groups themselves
// (communities and cohorts you're in or run).
const KINDS_FOR_TAB: Record<ConnectTab, ActivityItem["kind"][]> = {
  events: ["event"],
  meetings: ["meeting", "room_meeting"],
  groups: ["room"],
};

const ROUTE_FOR: Record<ActivityItem["kind"], (item: ActivityItem) => string> = {
  event: (item) => `/projects/${item.projectId}/ticket`,
  meeting: (item) => `/meetings/${item.projectId}`,
  room_meeting: (item) => `/groups/${item.projectId}`,
  room: (item) => `/groups/${item.projectId}`,
};

const LABEL_FOR: Record<ActivityItem["kind"], string> = {
  event: "Event",
  meeting: "Meeting",
  room_meeting: "Group meeting",
  room: "Group",
};

// Live countdown for something that hasn't started. Shows "Live now" for a room meeting that is running.
function MeetingCountdown({ item }: { item: ActivityItem }) {
  const remaining = useCountdown(item.when);
  if (!item.when || remaining === null) return null;
  if (remaining > 0) {
    return <p className="text-xs font-medium text-accent mt-0.5">Starts in {formatCountdown(remaining)}</p>;
  }
  if (item.kind === "room_meeting" && item.meetingStatus === "live") {
    return <p className="text-xs font-medium text-accent mt-0.5">Live now</p>;
  }
  return null;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  // A group (and its meetings) is managed from inside the group, so its menu has no "Remove from Connect": the way out
  // of a group is to exit it. Events and meetings can still be taken off the list.
  const isGroup = item.kind === "room" || item.kind === "room_meeting";
  return (
    <div className="relative">
    <Link
      to={ROUTE_FOR[item.kind](item)}
      className="flex items-center gap-3 p-3 pr-11 rounded-xl border border-border bg-surface"
    >
      {/* Every thumbnail is a square; whatever was uploaded is cropped to fit. */}
      <div className="w-12 h-12 rounded-lg bg-canvas flex items-center justify-center overflow-hidden shrink-0">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={18} className="text-ink-muted" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-ink truncate flex items-center gap-1.5">
          <span className="truncate">{item.projectTitle}</span>
          {item.pinned && <Pin size={12} className="shrink-0 text-ink-muted" aria-label="Pinned" />}
          {item.muted && <BellOff size={12} className="shrink-0 text-ink-muted" aria-label="Muted" />}
        </p>
        <p className="text-xs text-ink-muted">
          {LABEL_FOR[item.kind]}
          {item.kind === "room"
            ? ""
            : item.when
              ? ` · ${new Date(item.when).toLocaleString()}`
              : " · Date TBA"}
        </p>
        {item.kind === "room_meeting" && item.meetingTitle && (
          <p className="text-xs text-ink-muted truncate">{item.meetingTitle}</p>
        )}
        {(item.kind === "meeting" || item.kind === "room_meeting") && <MeetingCountdown item={item} />}
      </div>
    </Link>
    <ListItemMenu
      projectId={item.projectId}
      title={item.projectTitle}
      slug={item.slug}
      pinned={item.pinned}
      muted={item.muted}
      listName="Connect"
      group={isGroup ? { isOwner: item.isOwner } : undefined}
    />
    </div>
  );
}

// Shown when the user has nothing in any tab.
function EmptyConnect() {
  const { allowed: canCreateGroup } = useCanCreateGroup();
  return (
    <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
      <CalendarClock size={24} className="text-brand-orange" />
      <p className="text-sm font-medium text-ink">Nothing here yet</p>
      <p className="text-sm max-w-xs">
        When you get tickets to events or join meetings and groups, you'll find them here.
      </p>
      <div className="flex gap-4 mt-2 text-sm font-medium">
        <Link to="/topics" className="text-accent">Find groups</Link>
        {canCreateGroup && <Link to="/groups/new" className="text-accent">Start a group</Link>}
      </div>
    </div>
  );
}

export function Connect() {
  const { data: items, isLoading } = useActivity();
  // Groups are created from here; the creation form is the project form in group mode, so it shares its kill switch.
  const { allowed: canCreateGroup } = useCanCreateGroup();

  // Only tabs that have something in them are shown.
  const tabs = useMemo(
    () => ALL_TABS.filter((t) => (items ?? []).some((i) => KINDS_FOR_TAB[t].includes(i.kind))),
    [items]
  );
  const [tab, setTab] = useTabState<ConnectTab>(ALL_TABS, tabs[0] ?? "events");
  // If the selected tab disappears (e.g. its last item was removed), fall back to the first one left.
  const activeIndex = Math.max(tabs.indexOf(tab), 0);
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);

  const now = Date.now();

  function renderPane(t: ConnectTab): ReactNode {
    const kindItems = (items ?? []).filter((i) => KINDS_FOR_TAB[t].includes(i.kind));
    if (t === "groups") {
      return (
        <div className="flex flex-col gap-2">
          {kindItems.map((item) => (
            <ActivityRow key={`${item.kind}-${item.projectId}`} item={item} />
          ))}
        </div>
      );
    }
    // A room meeting that is live right now still counts as upcoming, so it stays at the top with "Live now".
    const isLive = (i: ActivityItem) => i.kind === "room_meeting" && i.meetingStatus === "live";
    const upcoming = kindItems.filter((i) => !i.when || new Date(i.when).getTime() >= now || isLive(i));
    const past = kindItems.filter((i) => i.when && new Date(i.when).getTime() < now && !isLive(i));
    return (
      <>
        <div className="mb-6">
          <h3 className="text-sm font-medium text-ink-muted mb-2">Upcoming</h3>
          <div className="flex flex-col gap-2">
            {upcoming.length === 0 ? (
              <p className="text-xs text-ink-muted">Nothing upcoming.</p>
            ) : (
              upcoming.map((item, i) => (
                <ActivityRow key={`${item.kind}-${item.projectId}-${i}`} item={item} />
              ))
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-ink-muted mb-2">Past</h3>
          <div className="flex flex-col gap-2">
            {past.length === 0 ? (
              <p className="text-xs text-ink-muted">Nothing past yet.</p>
            ) : (
              past.map((item, i) => (
                <ActivityRow key={`${item.kind}-${item.projectId}-${i}`} item={item} />
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 md:px-8 pt-6 md:pt-10 pb-28">
      <div className="max-w-xl md:max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink flex items-center gap-2.5">
            <Users size={24} className="text-brand-orange" />
            Connect
          </h2>
          {canCreateGroup && (
            <Link
              to="/groups/new"
              className="flex items-center gap-1 px-3.5 py-2 rounded-full bg-cta text-white text-sm font-medium"
            >
              <Plus size={16} /> New group
            </Link>
          )}
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : tabs.length === 0 ? (
          <EmptyConnect />
        ) : (
          <>
            <SlidingTabBar
              ariaLabel="Connect"
              tabs={tabs.map((t) => ({ id: t, label: TAB_LABEL[t] }))}
              activeIndex={activeIndex}
              progress={tabProgress}
              dragging={tabDragging}
              onSelect={(i) => setTab(tabs[i])}
              className="mb-5"
            />

            {/* Swipe left/right to change tab — same carousel as Feed and Profile. */}
            <SwipeableTabs
              fillViewport
              index={activeIndex}
              onIndexChange={(i) => setTab(tabs[i])}
              onProgress={(progress, dragging) => {
                setTabProgress(progress);
                setTabDragging(dragging);
              }}
            >
              {tabs.map((t) => (
                <div key={t}>{renderPane(t)}</div>
              ))}
            </SwipeableTabs>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
