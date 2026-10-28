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
import { Link } from "react-router-dom";
import { CalendarClock, ImageIcon, Users, X } from "lucide-react";
import { useActivity, type ActivityItem } from "../hooks/useActivity";
import { useTabState } from "../hooks/useTabState";
import { useRemoveFromLibrary } from "../hooks/useLibraryRemovals";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { BottomNav } from "../components/BottomNav";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { SlidingTabBar } from "../components/SlidingTabBar";

const ALL_TABS = ["events", "meetings", "rooms"] as const;
type ConnectTab = (typeof ALL_TABS)[number];

const TAB_LABEL: Record<ConnectTab, string> = {
  events: "Events",
  meetings: "Meetings",
  rooms: "Rooms",
};

// Room meetings sit with the other meetings (name of the room + a countdown); the Rooms tab lists the rooms themselves.
const KINDS_FOR_TAB: Record<ConnectTab, ActivityItem["kind"][]> = {
  events: ["event"],
  meetings: ["meeting", "room_meeting"],
  rooms: ["room"],
};

const ROUTE_FOR: Record<ActivityItem["kind"], (item: ActivityItem) => string> = {
  event: (item) => `/projects/${item.projectId}/ticket`,
  meeting: (item) => `/meetings/${item.projectId}`,
  room_meeting: (item) => `/rooms/${item.projectId}`,
  room: (item) => `/rooms/${item.projectId}`,
};

const LABEL_FOR: Record<ActivityItem["kind"], string> = {
  event: "Event",
  meeting: "Meeting",
  room_meeting: "Room meeting",
  room: "Room",
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
  const remove = useRemoveFromLibrary();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="relative">
    <Link
      to={ROUTE_FOR[item.kind](item)}
      className="flex items-center gap-3 p-3 pr-11 rounded-xl border border-border bg-surface"
    >
      <div className="w-12 h-12 rounded-lg bg-canvas flex items-center justify-center overflow-hidden shrink-0">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={18} className="text-ink-muted" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-ink truncate">{item.projectTitle}</p>
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
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Remove ${item.projectTitle} from Connect`}
      className="absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full text-ink-muted hover:text-ink"
    >
      <X size={16} />
    </button>
    {confirming && (
      <ConfirmDialog
        themed
        danger={false}
        title="Remove from Connect?"
        description="This only takes it off this list. Your access doesn't change."
        confirmLabel="Remove"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          remove.mutate(item.projectId);
        }}
      />
    )}
    </div>
  );
}

// Shown when the user has nothing in any tab.
function EmptyConnect() {
  return (
    <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
      <CalendarClock size={24} className="text-brand-orange" />
      <p className="text-sm font-medium text-ink">Nothing here yet</p>
      <p className="text-sm max-w-xs">
        When you get tickets to events or join meetings and rooms, you'll find them here.
      </p>
    </div>
  );
}

export function Connect() {
  const { data: items, isLoading } = useActivity();

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
    if (t === "rooms") {
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
        <h2 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink mb-5 flex items-center gap-2.5">
          <Users size={24} className="text-brand-orange" />
          Connect
        </h2>

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
