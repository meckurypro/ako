// src/pages/admin/AdminUserAnalytics.tsx
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useUserGrowth } from "../../hooks/useAdminAnalytics";

/**
 * Plain CSS/SVG bar chart — no charting library in this project
 * (see package.json), and one 30-bar chart doesn't justify adding
 * one. If more charts get added later, recharts would be the
 * natural choice (React-idiomatic, already used in comparable
 * Vite/Tailwind stacks) — worth revisiting then.
 */
function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
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
              {d.date}: {d.count}
            </span>
            <div className="absolute inset-x-0 -top-6 hidden group-hover:flex justify-center pointer-events-none">
              <span className="text-[10px] bg-ink text-canvas rounded px-1.5 py-0.5 whitespace-nowrap">
                {formatShortDate(d.date)} · {d.count}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted mt-1.5">
        <span>{formatShortDate(data[0]?.date)}</span>
        <span>{formatShortDate(data[Math.floor(data.length / 2)]?.date)}</span>
        <span>{formatShortDate(data[data.length - 1]?.date)}</span>
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

export function AdminUserAnalytics() {
  const smartBack = useSmartBack();
  const { data, isLoading, error } = useUserGrowth();

  const bestDay = data?.dailySignups.reduce(
    (best, d) => (d.count > best.count ? d : best),
    { date: "", count: 0 }
  );

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">User growth</h2>
        </div>

        {isLoading && <p className="text-ink-muted text-center py-10">Loading…</p>}
        {error && <p className="text-danger text-center py-10">Couldn't load user analytics.</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-surface rounded-xl p-4 border border-border">
                <p className="text-xs text-ink-muted mb-1">Total users</p>
                <p className="font-display text-2xl text-ink">{data.totalUsers.toLocaleString()}</p>
              </div>
              <div className="bg-surface rounded-xl p-4 border border-border">
                <p className="text-xs text-ink-muted mb-1">New (30 days)</p>
                <p className="font-display text-2xl text-ink">{data.newLast30Days.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border mb-4">
              <p className="text-sm font-medium text-ink mb-4">Daily sign-ups</p>
              <SignupsChart data={data.dailySignups} />
            </div>

            {bestDay && bestDay.count > 0 && (
              <p className="text-xs text-ink-muted text-center">
                Best day: {formatShortDate(bestDay.date)} with {bestDay.count} sign-up
                {bestDay.count === 1 ? "" : "s"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
