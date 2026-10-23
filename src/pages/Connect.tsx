// src/pages/Connect.tsx
//
// Bottom-nav home for everything you attend or earn from outside the
// feed: Events, Meetings, Rooms and Forked projects. Replaces the old
// "Events & meetings" and "Affiliates" rows in the Activity hub, and the
// Messages tab (messages now live behind the floating chat button).
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ImageIcon, TrendingUp, Users, X } from "lucide-react";
import { useActivity, type ActivityItem } from "../hooks/useActivity";
import { useMyAffiliateRelationships } from "../hooks/useAffiliates";
import { useTabState } from "../hooks/useTabState";
import { useRemoveFromLibrary } from "../hooks/useLibraryRemovals";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { AffiliateLinkRow } from "./MyAffiliateLinks";
import { BottomNav } from "../components/BottomNav";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { SlidingTabBar } from "../components/SlidingTabBar";

const TABS = ["events", "meetings", "rooms", "affiliates"] as const;
type ConnectTab = (typeof TABS)[number];

const TAB_LABEL: Record<ConnectTab, string> = {
  events: "Events",
  meetings: "Meetings",
  rooms: "Rooms",
  affiliates: "Forked",
};

const KIND_FOR_TAB: Record<Exclude<ConnectTab, "affiliates">, ActivityItem["kind"]> = {
  events: "event",
  meetings: "meeting",
  rooms: "room_meeting",
};

const ROUTE_FOR: Record<ActivityItem["kind"], (item: ActivityItem) => string> = {
  event: (item) => `/projects/${item.projectId}/ticket`,
  meeting: (item) => `/meetings/${item.projectId}`,
  room_meeting: (item) => `/rooms/${item.projectId}`,
};

const LABEL_FOR: Record<ActivityItem["kind"], string> = {
  event: "Event",
  meeting: "Meeting",
  room_meeting: "Room meeting",
};

const EMPTY_COPY: Record<ConnectTab, string> = {
  events: "Events you have tickets for will show up here.",
  meetings: "Meetings you've joined or bought access to will show up here.",
  rooms: "Room meetings for rooms you're a member of will show up here.",
  affiliates:
    "Projects you fork show up here. Tap \"Fork & earn\" on a project to start.",
};

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
          {item.when ? ` · ${new Date(item.when).toLocaleString()}` : " · Date TBA"}
        </p>
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

function Empty({ tab }: { tab: ConnectTab }) {
  const Icon = tab === "affiliates" ? TrendingUp : CalendarClock;
  return (
    <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
      <Icon size={24} className="text-brand-orange" />
      <p className="text-sm">{EMPTY_COPY[tab]}</p>
    </div>
  );
}

export function Connect() {
  const [tab, setTab] = useTabState<ConnectTab>(TABS, "events");
  const activeIndex = Math.max(TABS.indexOf(tab), 0);
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);
  const { data: items, isLoading: activityLoading } = useActivity();
  const { data: relationships, isLoading: affiliatesLoading } = useMyAffiliateRelationships();

  const now = Date.now();

  function renderPane(t: ConnectTab): ReactNode {
    if (t === "affiliates") {
      if (affiliatesLoading) return <p className="text-ink-muted text-sm">Loading…</p>;
      if ((relationships ?? []).length === 0) return <Empty tab={t} />;
      return (
        <div className="flex flex-col gap-2">
          {relationships!.map((r) => (
            <AffiliateLinkRow key={r.id} relationship={r} />
          ))}
        </div>
      );
    }
    if (activityLoading) return <p className="text-ink-muted text-sm">Loading…</p>;
    const kindItems = (items ?? []).filter((i) => i.kind === KIND_FOR_TAB[t]);
    if (kindItems.length === 0) return <Empty tab={t} />;
    const upcoming = kindItems.filter((i) => !i.when || new Date(i.when).getTime() >= now);
    const past = kindItems.filter((i) => i.when && new Date(i.when).getTime() < now);
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

        <SlidingTabBar
          ariaLabel="Connect"
          tabs={TABS.map((t) => ({ id: t, label: TAB_LABEL[t] }))}
          activeIndex={activeIndex}
          progress={tabProgress}
          dragging={tabDragging}
          onSelect={(i) => setTab(TABS[i])}
          className="mb-5"
        />

        {/* Swipe left/right to change tab — same carousel as Feed and Profile. */}
        <SwipeableTabs
          fillViewport
          index={activeIndex}
          onIndexChange={(i) => setTab(TABS[i])}
          onProgress={(progress, dragging) => {
            setTabProgress(progress);
            setTabDragging(dragging);
          }}
        >
          {TABS.map((t) => (
            <div key={t}>{renderPane(t)}</div>
          ))}
        </SwipeableTabs>
      </div>

      <BottomNav />
    </div>
  );
}
