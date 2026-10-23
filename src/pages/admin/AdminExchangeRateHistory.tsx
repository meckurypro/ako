// src/pages/admin/AdminExchangeRateHistory.tsx
//
// Admin-only history of the deposit / withdrawal rates (and the live market rate they follow), grouped
// by day, week or month, with period + series filters. Data comes from exchange_rate_history, which is
// filled by a trigger on exchange_rates (see supabase/ako_exchange_rate_history.sql). The chart is plain
// SVG — no chart library — and is sized from its container so labels stay readable on a phone.
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import {
  useRateChangeLog,
  useRateHistory,
  type ChangeSource,
  type HistoryBucket,
  type HistoryRange,
  type RateHistoryBucketRow,
  type RateKind,
} from "../../hooks/useRateHistory";
import { formatNgn } from "../../lib/money";

type SeriesKey = "deposit" | "withdrawal" | "market";

const SERIES: { key: SeriesKey; label: string; color: string; dashed?: boolean }[] = [
  { key: "deposit", label: "Deposit", color: "var(--color-accent)" },
  { key: "withdrawal", label: "Withdrawal", color: "var(--color-brand-orange)" },
  { key: "market", label: "Market", color: "var(--color-ink-muted)", dashed: true },
];

const BUCKET_OPTIONS: { value: HistoryBucket; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const RANGE_OPTIONS: { value: HistoryRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

const fmt = (n: number) => n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
const deltaTone = (n: number) => (n > 0 ? "text-accent" : n < 0 ? "text-danger" : "text-ink-muted");

function bucketDate(bucketStart: string) {
  return new Date(`${bucketStart}T00:00:00Z`);
}

function shortDay(d: Date) {
  const withYear = d.getUTCFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "2-digit" } : {}),
    timeZone: "UTC",
  });
}

/** Compact label for chart axes / readout. */
function axisLabel(bucketStart: string, bucket: HistoryBucket) {
  const d = bucketDate(bucketStart);
  if (bucket === "month") return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  return bucket === "week" ? `Wk of ${shortDay(d)}` : shortDay(d);
}

/** Fuller label for table rows (weeks show their Mon–Sun span). */
function periodLabel(bucketStart: string, bucket: HistoryBucket) {
  if (bucket !== "week") return axisLabel(bucketStart, bucket);
  const start = bucketDate(bucketStart);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${shortDay(start)} – ${shortDay(end)}`;
}

/* ───────────── small controls ───────────── */

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-accent-soft p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-accent text-canvas" : "text-accent hover:bg-accent-soft/70"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

/* ───────────── chart ───────────── */

interface TrendPoint {
  bucketStart: string;
  t: number;
  deposit?: number;
  withdrawal?: number;
  market?: number;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

const CHART_HEIGHT = 230;
const PAD = { left: 50, right: 12, top: 12, bottom: 26 };

function TrendChart({
  points,
  visible,
  bucket,
  activeIndex,
  onActiveChange,
}: {
  points: TrendPoint[];
  visible: SeriesKey[];
  bucket: HistoryBucket;
  activeIndex: number;
  onActiveChange: (index: number) => void;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const shown = SERIES.filter((s) => visible.includes(s.key));

  const values = points.flatMap((p) => shown.map((s) => p[s.key])).filter((v): v is number => v !== undefined);
  const ready = width > 0 && points.length > 0 && values.length > 0;

  let body: React.ReactNode = null;
  if (ready) {
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const margin = (max - min) * 0.08;
    min -= margin;
    max += margin;

    const innerW = Math.max(1, width - PAD.left - PAD.right);
    const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const x = (t: number) => (t1 === t0 ? PAD.left + innerW / 2 : PAD.left + ((t - t0) / (t1 - t0)) * innerW);
    const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;

    const yTicks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
    const xTickCount = Math.min(points.length, width < 420 ? 3 : 5);
    const xTickIdx = Array.from(
      new Set(Array.from({ length: xTickCount }, (_, i) => Math.round((i * (points.length - 1)) / Math.max(1, xTickCount - 1))))
    );

    const active = points[Math.min(activeIndex, points.length - 1)];

    function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
      const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
      let best = 0;
      for (let i = 1; i < points.length; i++) {
        if (Math.abs(x(points[i].t) - px) < Math.abs(x(points[best].t) - px)) best = i;
      }
      onActiveChange(best);
    }

    body = (
      <svg
        width={width}
        height={CHART_HEIGHT}
        role="img"
        aria-label="Exchange rate trend chart"
        style={{ touchAction: "pan-y", display: "block" }}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              style={{ stroke: "var(--color-border)" }}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              style={{ fill: "var(--color-ink-muted)" }}
            >
              {Math.round(tick).toLocaleString("en-NG")}
            </text>
          </g>
        ))}

        {xTickIdx.map((idx, i) => (
          <text
            key={idx}
            x={x(points[idx].t)}
            y={CHART_HEIGHT - 8}
            textAnchor={i === 0 ? "start" : i === xTickIdx.length - 1 ? "end" : "middle"}
            fontSize={11}
            style={{ fill: "var(--color-ink-muted)" }}
          >
            {axisLabel(points[idx].bucketStart, bucket)}
          </text>
        ))}

        <line
          x1={x(active.t)}
          x2={x(active.t)}
          y1={PAD.top}
          y2={CHART_HEIGHT - PAD.bottom}
          style={{ stroke: "var(--color-ink-muted)" }}
          strokeOpacity={0.35}
          strokeWidth={1}
        />

        {shown.map((s) => {
          const own = points.filter((p) => p[s.key] !== undefined);
          if (own.length === 0) return null;
          const path = own.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)} ${y(p[s.key] as number).toFixed(1)}`).join(" ");
          const activeValue = active[s.key];
          return (
            <g key={s.key}>
              {own.length > 1 && (
                <path
                  d={path}
                  fill="none"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  style={{ stroke: s.color }}
                />
              )}
              {own.length <= 31 &&
                own.map((p) => (
                  <circle key={p.bucketStart} cx={x(p.t)} cy={y(p[s.key] as number)} r={own.length === 1 ? 4 : 2.5} style={{ fill: s.color }} />
                ))}
              {activeValue !== undefined && (
                <circle
                  cx={x(active.t)}
                  cy={y(activeValue)}
                  r={5}
                  strokeWidth={2}
                  style={{ fill: s.color, stroke: "var(--color-surface)" }}
                />
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div ref={ref} className="w-full">
      {body}
    </div>
  );
}

/* ───────────── stats ───────────── */

function StatCard({ title, color, rows }: { title: string; color: string; rows: RateHistoryBucketRow[] }) {
  if (rows.length === 0) return null;
  const first = rows[0].open;
  const last = rows[rows.length - 1].close;
  const change = last - first;
  const pct = first ? (change / first) * 100 : 0;
  const high = Math.max(...rows.map((r) => r.high));
  const low = Math.min(...rows.map((r) => r.low));
  const records = rows.reduce((n, r) => n + r.records, 0);
  const avg = rows.reduce((sum, r) => sum + r.avg * r.records, 0) / Math.max(1, records);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {title}
      </p>
      <p className="mt-2 text-[11px] text-ink-muted">Latest</p>
      <p className="font-display text-xl text-ink tabular-nums">{formatNgn(last)}</p>
      <p className={`text-sm tabular-nums ${deltaTone(change)}`}>
        {fmtSigned(change)} ({pct > 0 ? "+" : pct < 0 ? "−" : ""}
        {Math.abs(pct).toFixed(2)}%)
      </p>
      <dl className="mt-3 space-y-1 text-xs text-ink-muted tabular-nums">
        <div className="flex justify-between"><dt>High</dt><dd className="text-ink">{fmt(high)}</dd></div>
        <div className="flex justify-between"><dt>Low</dt><dd className="text-ink">{fmt(low)}</dd></div>
        <div className="flex justify-between"><dt>Average</dt><dd className="text-ink">{fmt(avg)}</dd></div>
      </dl>
    </div>
  );
}

/* ───────────── page ───────────── */

const SOURCE_LABEL: Record<ChangeSource, string> = { auto: "Auto", manual: "Manual", baseline: "Start" };

export function AdminExchangeRateHistory() {
  const smartBack = useSmartBack();

  const [bucket, setBucket] = useState<HistoryBucket>("day");
  const [range, setRange] = useState<HistoryRange>("30d");
  const [visible, setVisible] = useState<SeriesKey[]>(["deposit", "withdrawal", "market"]);
  const [tableKind, setTableKind] = useState<RateKind>("deposit");
  const [tableRows, setTableRows] = useState(20);
  const [logSource, setLogSource] = useState<ChangeSource | "all">("all");
  const [logRows, setLogRows] = useState(15);
  const [activeIndex, setActiveIndex] = useState(Number.MAX_SAFE_INTEGER);

  const { data: rows = [], isLoading, error } = useRateHistory(bucket, range);
  const { data: log = [], isLoading: logLoading } = useRateChangeLog(range, logSource);

  const points = useMemo<TrendPoint[]>(() => {
    const byDate = new Map<string, TrendPoint>();
    for (const r of rows) {
      const point = byDate.get(r.bucketStart) ?? { bucketStart: r.bucketStart, t: bucketDate(r.bucketStart).getTime() };
      point[r.kind] = r.avg;
      if (r.marketAvg !== null) point.market = r.marketAvg;
      byDate.set(r.bucketStart, point);
    }
    return [...byDate.values()].sort((a, b) => a.t - b.t);
  }, [rows]);

  const activePoint = points[Math.min(activeIndex, points.length - 1)];

  function toggleSeries(key: SeriesKey) {
    setVisible((current) => {
      if (current.includes(key)) return current.length === 1 ? current : current.filter((k) => k !== key);
      return [...current, key];
    });
  }

  function changeBucket(next: HistoryBucket) {
    setBucket(next);
    setTableRows(20);
    setActiveIndex(Number.MAX_SAFE_INTEGER);
  }

  function changeRange(next: HistoryRange) {
    setRange(next);
    setTableRows(20);
    setLogRows(15);
    setActiveIndex(Number.MAX_SAFE_INTEGER);
  }

  const depositRows = rows.filter((r) => r.kind === "deposit");
  const withdrawalRows = rows.filter((r) => r.kind === "withdrawal");

  // Table: newest first, with the change in closing rate versus the previous period.
  const tableData = useMemo(() => {
    const own = rows.filter((r) => r.kind === tableKind);
    return own
      .map((r, i) => ({ row: r, delta: i === 0 ? null : r.close - own[i - 1].close }))
      .reverse();
  }, [rows, tableKind]);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Rate history</h2>
        </div>

        {/* Filters */}
        <div className="mb-4 space-y-4 rounded-xl border border-border bg-surface p-4">
          <FilterRow label="Group by">
            <Segmented label="Group by" value={bucket} options={BUCKET_OPTIONS} onChange={changeBucket} />
          </FilterRow>
          <FilterRow label="Period">
            <Segmented label="Period" value={range} options={RANGE_OPTIONS} onChange={changeRange} />
          </FilterRow>
          <FilterRow label="Show">
            <div className="flex flex-wrap gap-2">
              {SERIES.map((s) => {
                const on = visible.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSeries(s.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on ? "border-accent bg-surface text-ink" : "border-border text-ink-muted"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: on ? s.color : "transparent", boxShadow: `inset 0 0 0 1.5px ${s.color}` }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </FilterRow>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-ink-muted">Loading…</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-danger">
            {error instanceof Error ? error.message : "Couldn't load rate history."}
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-ink">No rate history in this period yet.</p>
            <p className="mt-1 text-xs text-ink-muted">
              A record is saved every time the automatic update runs and whenever you save a rate. Try a longer period.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 min-h-10">
                <p className="text-xs text-ink-muted">
                  {activePoint ? axisLabel(activePoint.bucketStart, bucket) : ""} · average per {bucket}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {SERIES.filter((s) => visible.includes(s.key)).map((s) => {
                    const v = activePoint?.[s.key];
                    return (
                      <span key={s.key} className="inline-flex items-center gap-1.5 text-sm text-ink tabular-nums">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.label} {v === undefined ? "—" : formatNgn(v)}
                      </span>
                    );
                  })}
                </div>
              </div>
              <TrendChart
                points={points}
                visible={visible}
                bucket={bucket}
                activeIndex={activeIndex}
                onActiveChange={setActiveIndex}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {visible.includes("deposit") && <StatCard title="Deposit" color={SERIES[0].color} rows={depositRows} />}
              {visible.includes("withdrawal") && <StatCard title="Withdrawal" color={SERIES[1].color} rows={withdrawalRows} />}
            </div>

            {/* Per-period table */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">By {bucket}</p>
                <Segmented
                  label="Table rate"
                  value={tableKind}
                  options={[
                    { value: "deposit", label: "Deposit" },
                    { value: "withdrawal", label: "Withdrawal" },
                  ]}
                  onChange={(k) => {
                    setTableKind(k);
                    setTableRows(20);
                  }}
                />
              </div>
              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="text-left text-ink-muted">
                      <th className="pb-2 pr-3 font-medium">Period</th>
                      <th className="pb-2 pr-3 text-right font-medium">Avg</th>
                      <th className="pb-2 pr-3 text-right font-medium">Close</th>
                      <th className="pb-2 text-right font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.slice(0, tableRows).map(({ row, delta }) => (
                      <tr key={row.bucketStart} className="border-t border-border align-top text-ink">
                        <td className="py-2 pr-3">{periodLabel(row.bucketStart, bucket)}</td>
                        <td className="py-2 pr-3 text-right">
                          {fmt(row.avg)}
                          <span className="block text-[10px] text-ink-muted">
                            {fmt(row.low)}–{fmt(row.high)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right">{fmt(row.close)}</td>
                        <td className={`py-2 text-right ${delta === null ? "text-ink-muted" : deltaTone(delta)}`}>
                          {delta === null ? "—" : fmtSigned(delta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tableRows < tableData.length && (
                <button
                  type="button"
                  onClick={() => setTableRows((n) => n + 20)}
                  className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-accent hover:bg-accent-soft/60"
                >
                  Show more ({tableData.length - tableRows} left)
                </button>
              )}
              <p className="mt-3 text-[11px] text-ink-muted">
                Small figures under Avg are the period's low–high. Change compares each period's closing rate with the
                previous period's. Weeks run Monday–Sunday; days and weeks follow Lagos time.
              </p>
            </div>

            {/* Change log */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Change log</p>
                <Segmented
                  label="Source"
                  value={logSource}
                  options={[
                    { value: "all", label: "All" },
                    { value: "manual", label: "Manual" },
                    { value: "auto", label: "Auto" },
                  ]}
                  onChange={(s) => {
                    setLogSource(s);
                    setLogRows(15);
                  }}
                />
              </div>
              {logLoading ? (
                <p className="py-4 text-center text-sm text-ink-muted">Loading…</p>
              ) : log.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-muted">Nothing recorded for this filter.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {log.slice(0, logRows).map((c) => {
                    const delta = c.previousRate === null ? null : c.rate - c.previousRate;
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-ink">
                            {c.kind === "deposit" ? "Deposit" : "Withdrawal"}
                            <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                              {SOURCE_LABEL[c.source]}
                            </span>
                          </p>
                          <p className="text-xs text-ink-muted">
                            {new Date(c.recordedAt).toLocaleString([], {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right tabular-nums">
                          <p className="text-sm text-ink">{formatNgn(c.rate)}</p>
                          <p className={`text-xs ${delta === null ? "text-ink-muted" : deltaTone(delta)}`}>
                            {delta === null ? "first record" : delta === 0 ? "no change" : fmtSigned(delta)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {logRows < log.length && (
                <button
                  type="button"
                  onClick={() => setLogRows((n) => n + 15)}
                  className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-accent hover:bg-accent-soft/60"
                >
                  Show more
                </button>
              )}
            </div>

            <p className="text-xs text-ink-muted">
              History is recorded from the day it was introduced; earlier rate changes weren't saved. Past
              transactions always keep the exact rate they used at the time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
