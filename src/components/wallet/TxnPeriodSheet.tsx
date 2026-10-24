// src/components/wallet/TxnPeriodSheet.tsx
//
// Bottom sheet for choosing what the Transactions page shows: one MONTH (wheel picker), or a TIME FRAME — the last
// 3 / 6 months, everything, or a custom start/end month.
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { Portal } from "../Portal";
import { Button } from "../Button";
import { MonthYearPicker } from "./MonthWheel";
import {
  formatYm,
  lastMonths,
  shiftMonths,
  ymEqual,
  ymIndex,
  ymOf,
  type TxnPeriod,
  type YearMonth,
} from "../../lib/walletRange";

type Tab = "month" | "frame";
type Preset = "3m" | "6m" | "all" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

function presetOf(period: TxnPeriod): Preset {
  if (period.kind === "all") return "all";
  if (period.kind === "range") {
    for (const [id, n] of [["3m", 3], ["6m", 6]] as const) {
      const p = lastMonths(n);
      if (p.kind === "range" && ymEqual(p.from, period.from) && ymEqual(p.to, period.to)) return id;
    }
    return "custom";
  }
  return "3m";
}

export function TxnPeriodSheet({
  period,
  onApply,
  onClose,
}: {
  period: TxnPeriod;
  onApply: (period: TxnPeriod) => void;
  onClose: () => void;
}) {
  useBackDismiss(onClose);

  const [tab, setTab] = useState<Tab>(period.kind === "month" ? "month" : "frame");
  const [month, setMonth] = useState<YearMonth>(period.kind === "month" ? period.at : ymOf());
  const [preset, setPreset] = useState<Preset>(presetOf(period));
  const [from, setFrom] = useState<YearMonth>(period.kind === "range" ? period.from : shiftMonths(ymOf(), -2));
  const [to, setTo] = useState<YearMonth>(period.kind === "range" ? period.to : ymOf());
  const [editing, setEditing] = useState<"from" | "to" | null>(null);

  const invalid = tab === "frame" && preset !== "all" && ymIndex(from) > ymIndex(to);

  function choosePreset(next: Preset) {
    setPreset(next);
    setEditing(next === "custom" ? "from" : null);
    if (next === "3m" || next === "6m") {
      const p = lastMonths(next === "3m" ? 3 : 6);
      if (p.kind === "range") {
        setFrom(p.from);
        setTo(p.to);
      }
    }
  }

  function toggleEditing(which: "from" | "to") {
    setPreset("custom");
    setEditing((cur) => (cur === which ? null : which));
  }

  function confirm() {
    if (invalid) return;
    if (tab === "month") onApply({ kind: "month", at: month });
    else onApply(preset === "all" ? { kind: "all" } : { kind: "range", from, to });
    onClose();
  }

  const dateRow = (which: "from" | "to", title: string, value: YearMonth) => (
    <div>
      <p className="mb-2 mt-5 text-base text-ink">{title}</p>
      <button
        type="button"
        onClick={() => toggleEditing(which)}
        aria-expanded={editing === which}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-base text-ink transition-colors ${
          preset === "all" ? "border-border bg-canvas opacity-50" : "border-border bg-canvas"
        } ${editing === which ? "border-accent/60" : ""}`}
      >
        {formatYm(value)}
        <ChevronDown size={18} className={`text-ink-muted transition-transform ${editing === which ? "rotate-180" : ""}`} />
      </button>
      {editing === which && (
        <div className="mt-2">
          <MonthYearPicker value={value} onChange={which === "from" ? setFrom : setTo} />
        </div>
      )}
    </div>
  );

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div
          role="dialog"
          aria-label="Choose period"
          className="animate-ako-fade-up relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-b-0 border-border bg-surface px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex gap-6" role="tablist">
              {([["month", "Month"], ["frame", "Time Frame"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 pb-3 text-base transition-colors ${
                    tab === id ? "border-accent text-ink" : "border-transparent text-ink-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={onClose} aria-label="Close" className="mb-3 text-ink-muted">
              <X size={22} />
            </button>
          </div>

          {tab === "month" ? (
            <div className="py-5">
              <MonthYearPicker value={month} onChange={setMonth} />
            </div>
          ) : (
            <div className="pb-1 pt-5">
              <p className="mb-3 text-base text-ink">Duration</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={preset === p.id}
                    onClick={() => choosePreset(p.id)}
                    className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                      preset === p.id ? "border-accent/50 bg-accent-soft font-medium text-accent" : "border-border bg-canvas text-ink"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {dateRow("from", "Start Date", from)}
              {dateRow("to", "End Date", to)}
              {invalid && <p className="mt-3 text-sm text-danger">The start month has to be before the end month.</p>}
            </div>
          )}

          <div className="mt-5">
            <Button onClick={confirm} disabled={invalid} className="!rounded-full">
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
