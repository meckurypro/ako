// src/pages/admin/AdminUserAnalytics.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import type { UserListFilter } from "../../hooks/useAdminUserList";
import {
  useUserStats,
  usePostGrowth,
  useCommentGrowth,
  type DailyCount,
  type UserStats,
} from "../../hooks/useAdminAnalytics";

/**
 * Plain CSS/SVG bar chart — no charting library in this project
 * (see package.json), and a handful of 30-bar charts doesn't justify
 * adding one. If more charts get added later, recharts would be the
 * natural choice (React-idiomatic, already used in comparable
 * Vite/Tailwind stacks) — worth revisiting then.
 */
type Granularity = "day" | "week" | "month";

function GrowthChart({ data, granularity = "day" }: { data: DailyCount[]; granularity?: Granularity }) {
  const label = (key: string | undefined) => formatBucketDate(key, granularity);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div>
      <div className="flex items-end gap-[3px] h-40">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col justify-end h-full group relative">
            <div
              className="bg-accent rounded-sm w-full min-h-[2px] transition-all group-hover:bg-accent-hover"
              style={{ height: `${(d.count / max) * 100}%` }}
            />
            {/* Native tooltip — good enough for an internal admin tool */}
            <span className="sr-only">
              {label(d.date)}: {d.count}
            </span>
            <div className="absolute inset-x-0 -top-6 hidden group-hover:flex justify-center pointer-events-none">
              <span className="text-[10px] bg-ink text-canvas rounded px-1.5 py-0.5 whitespace-nowrap">
                {label(d.date)} · {d.count}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted mt-1.5">
        <span>{label(data[0]?.date)}</span>
        <span>{label(data[Math.floor(data.length / 2)]?.date)}</span>
        <span>{label(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function formatShortDate(dateKey: string | undefined): string {
  if (!dateKey) return "";
  const [, m, d] = dateKey.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[Number(m) - 1]} ${Number(d)}`;
}

function formatBucketDate(dateKey: string | undefined, granularity: Granularity): string {
  if (!dateKey) return "";
  if (granularity === "month") {
    const [y, m] = dateKey.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[Number(m) - 1]} ${y}`;
  }
  return granularity === "week" ? `Wk of ${formatShortDate(dateKey)}` : formatShortDate(dateKey);
}

function bestDayOf(daily: DailyCount[] | undefined) {
  if (!daily) return undefined;
  return daily.reduce((best, d) => (d.count > best.count ? d : best), { date: "", count: 0 });
}

/**
 * One metric's full card: total + 30-day count + chart. Shared by
 * Users, Posts, and Comments below so the three sections stay visually
 * and structurally identical rather than each admin metric evolving
 * its own layout over time.
 */
function GrowthSection({
  title,
  totalLabel,
  total,
  newLast30Days,
  daily,
  unitSingular,
  unitPlural,
  isLoading,
  error,
}: {
  title: string;
  totalLabel: string;
  total: number | undefined;
  newLast30Days: number | undefined;
  daily: DailyCount[] | undefined;
  unitSingular: string;
  unitPlural: string;
  isLoading: boolean;
  error: unknown;
}) {
  const bestDay = bestDayOf(daily);

  return (
    <section className="mb-8">
      <h3 className="font-display text-lg text-ink mb-3">{title}</h3>

      {isLoading && <p className="text-ink-muted text-center py-6 text-sm">Loading…</p>}
      {!!error && <p className="text-danger text-center py-6 text-sm">Couldn't load this data.</p>}

      {daily && total !== undefined && newLast30Days !== undefined && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-surface rounded-xl p-4 border border-border">
              <p className="text-xs text-ink-muted mb-1">{totalLabel}</p>
              <p className="font-display text-2xl text-ink">{total.toLocaleString()}</p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border">
              <p className="text-xs text-ink-muted mb-1">New (30 days)</p>
              <p className="font-display text-2xl text-ink">{newLast30Days.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border mb-3">
            <p className="text-sm font-medium text-ink mb-4">Daily {unitPlural}</p>
            <GrowthChart data={daily} />
          </div>

          {bestDay && bestDay.count > 0 && (
            <p className="text-xs text-ink-muted text-center">
              Best day: {formatShortDate(bestDay.date)} with {bestDay.count} {bestDay.count === 1 ? unitSingular : unitPlural}
            </p>
          )}
        </>
      )}
    </section>
  );
}

// "+12 vs previous 7 days" — a plain number comparison, no invented percentages
// when the previous period was zero.
function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : null;
  const tone = diff > 0 ? "text-accent" : diff < 0 ? "text-danger" : "text-ink-muted";
  return (
    <p className={`text-[11px] mt-1 ${tone}`}>
      {diff > 0 ? "+" : ""}
      {diff}
      {pct !== null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""} vs {label}
    </p>
  );
}

function StatCard({
  label,
  value,
  filter,
  children,
}: {
  label: string;
  value: number;
  /** When set, the card is a link to the paginated list of the users behind it. */
  filter?: UserListFilter;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <p className="font-display text-2xl text-ink">{value.toLocaleString()}</p>
      {children}
    </>
  );
  const base = "bg-surface rounded-xl p-4 border border-border";
  if (!filter) return <div className={base}>{body}</div>;
  return (
    <Link
      to={`/admin/analytics/users?filter=${filter}&page=1`}
      aria-label={`${label}: ${value}. View users`}
      className={`${base} block active:bg-canvas transition-colors`}
    >
      {body}
    </Link>
  );
}

const PERIODS: { key: Granularity; label: string; title: string; unit: string }[] = [
  { key: "day", label: "Daily", title: "New users per day (last 30 days)", unit: "sign-up" },
  { key: "week", label: "Weekly", title: "New users per week (last 12 weeks)", unit: "sign-up" },
  { key: "month", label: "Monthly", title: "New users per month (last 12 months)", unit: "sign-up" },
];

function seriesFor(stats: UserStats, g: Granularity) {
  return g === "day" ? stats.daily : g === "week" ? stats.weekly : stats.monthly;
}

function UsersSection() {
  const { data: stats, isLoading, error } = useUserStats();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const period = PERIODS.find((p) => p.key === granularity)!;

  return (
    <section className="mb-8">
      <h3 className="font-display text-lg text-ink mb-3">Users</h3>

      {isLoading && <p className="text-ink-muted text-center py-6 text-sm">Loading…</p>}
      {!!error && <p className="text-danger text-center py-6 text-sm">Couldn't load this data.</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatCard label="Total users" filter="all" value={stats.total}>
              <p className="text-[11px] mt-1 text-ink-muted">
                {stats.first_signup ? `Since ${formatShortDate(stats.first_signup)}` : "No sign-ups yet"}
                {stats.deleted > 0 ? ` · ${stats.deleted} deleted` : ""}
              </p>
            </StatCard>
            <StatCard label="New today" filter="today" value={stats.new.today}>
              <Delta current={stats.new.today} previous={stats.new.yesterday} label="yesterday" />
            </StatCard>
            <StatCard label="New this week" filter="this_week" value={stats.new.this_week}>
              <Delta current={stats.new.this_week} previous={stats.new.last_week} label="last week" />
            </StatCard>
            <StatCard label="New this month" filter="this_month" value={stats.new.this_month}>
              <Delta current={stats.new.this_month} previous={stats.new.last_month} label="last month" />
            </StatCard>
            <StatCard label="New (last 7 days)" filter="last_7" value={stats.new.last_7}>
              <Delta current={stats.new.last_7} previous={stats.new.prev_7} label="previous 7 days" />
            </StatCard>
            <StatCard label="New (last 30 days)" filter="last_30" value={stats.new.last_30}>
              <Delta current={stats.new.last_30} previous={stats.new.prev_30} label="previous 30 days" />
            </StatCard>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border mb-3">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm font-medium text-ink">{period.title}</p>
            </div>
            <div className="flex gap-1.5 mb-4" role="tablist" aria-label="Sign-up period">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={granularity === p.key}
                  onClick={() => setGranularity(p.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    granularity === p.key
                      ? "bg-cta text-white border-cta"
                      : "bg-canvas text-ink-muted border-border"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <GrowthChart data={seriesFor(stats, granularity)} granularity={granularity} />
            {(() => {
              const best = bestDayOf(seriesFor(stats, granularity));
              return best && best.count > 0 ? (
                <p className="text-xs text-ink-muted text-center mt-3">
                  Best {granularity}: {formatBucketDate(best.date, granularity)} with {best.count}{" "}
                  {best.count === 1 ? period.unit : `${period.unit}s`}
                </p>
              ) : null;
            })()}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <StatCard label="Active (24h)" filter="active_day" value={stats.active.day} />
            <StatCard label="Active (7d)" filter="active_week" value={stats.active.week} />
            <StatCard label="Active (30d)" filter="active_month" value={stats.active.month} />
          </div>
          <p className="text-[11px] text-ink-muted mb-3">
            Active = signed-in users last seen within that window.
          </p>

          <div className="bg-surface rounded-xl p-4 border border-border">
            <p className="text-sm font-medium text-ink mb-3">Accounts by status</p>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-muted">Approved</dt>
              <dd className="text-ink text-right">{stats.status.approved.toLocaleString()}</dd>
              <dt className="text-ink-muted">Pending review</dt>
              <dd className="text-ink text-right">{stats.status.pending.toLocaleString()}</dd>
              <dt className="text-ink-muted">Declined</dt>
              <dd className="text-ink text-right">{stats.status.declined.toLocaleString()}</dd>
              <dt className="text-ink-muted">Suspended</dt>
              <dd className="text-ink text-right">{stats.status.suspended.toLocaleString()}</dd>
              <dt className="text-ink-muted">Verified badge</dt>
              <dd className="text-ink text-right">{stats.verified.toLocaleString()}</dd>
            </dl>
          </div>
        </>
      )}
    </section>
  );
}

export function AdminUserAnalytics() {
  const smartBack = useSmartBack();
  const posts = usePostGrowth();
  const comments = useCommentGrowth();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Growth</h2>
        </div>

        <UsersSection />

        <GrowthSection
          title="Posts"
          totalLabel="Total posts"
          total={posts.data?.total}
          newLast30Days={posts.data?.newLast30Days}
          daily={posts.data?.daily}
          unitSingular="post"
          unitPlural="posts"
          isLoading={posts.isLoading}
          error={posts.error}
        />

        <GrowthSection
          title="Comments"
          totalLabel="Total comments"
          total={comments.data?.total}
          newLast30Days={comments.data?.newLast30Days}
          daily={comments.data?.daily}
          unitSingular="comment"
          unitPlural="comments"
          isLoading={comments.isLoading}
          error={comments.error}
        />
      </div>
    </div>
  );
}
