// src/pages/Activity.tsx
import { Link } from "react-router-dom";
import { ArrowLeft, ImageIcon, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActivity, type ActivityItem } from "../hooks/useActivity";

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

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <Link
      to={ROUTE_FOR[item.kind](item)}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface"
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
  );
}

// Shown as the "Activity" tab on the profile page (after Posts and
// Projects) — this file is just the list; wiring it into the tab bar
// is a one-line addition wherever ProfilePage's tabs are defined.
export function Activity() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useActivity();
  const now = Date.now();
  const upcoming = (items ?? []).filter((i) => !i.when || new Date(i.when).getTime() >= now);
  const past = (items ?? []).filter((i) => i.when && new Date(i.when).getTime() < now);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">Activity</h2>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : (items ?? []).length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <CalendarClock size={24} />
            <p className="text-sm">Events, meetings, and rooms you've joined will show up here.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-sm font-medium text-ink-muted mb-2">Upcoming</h3>
              <div className="flex flex-col gap-2">
                {upcoming.length === 0 ? (
                  <p className="text-xs text-ink-muted">Nothing upcoming.</p>
                ) : (
                  upcoming.map((item, i) => <ActivityRow key={`${item.kind}-${item.projectId}-${i}`} item={item} />)
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-ink-muted mb-2">Past</h3>
              <div className="flex flex-col gap-2">
                {past.length === 0 ? (
                  <p className="text-xs text-ink-muted">Nothing past yet.</p>
                ) : (
                  past.map((item, i) => <ActivityRow key={`${item.kind}-${item.projectId}-${i}`} item={item} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
