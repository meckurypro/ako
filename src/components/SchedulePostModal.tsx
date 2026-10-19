// src/components/SchedulePostModal.tsx
// "Schedule this post" — built so nobody has to guess how it works:
//   1. Quick picks (In 1 hour / Today / Tomorrow / Monday) — one tap for the common cases.
//   2. A pre-filled default, so the primary button is never a dead end.
//   3. Separate, clearly labelled Date and Time fields (with icons) instead of one ambiguous input.
//   4. A live summary ("Posts Tue, Oct 20 at 9:00 AM · in 13 hours") and inline validation rather than a
//      silently disabled button.
import { CalendarDays, Clock, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import {
  buildPresets,
  defaultSchedule,
  formatScheduleShort,
  isFarEnough,
  localTimeZone,
  MIN_SCHEDULE_LEAD_MS,
  relativeFromNow,
} from "../lib/schedulePresets";

interface SchedulePostModalProps {
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function SchedulePostModal({ onClose, onConfirm }: SchedulePostModalProps) {
  const [value, setValue] = useState<Date>(() => defaultSchedule());
  const presets = useMemo(() => buildPresets(), []);
  const timeZone = useMemo(() => localTimeZone(), []);

  const valid = isFarEnough(value);
  const minutes = Math.round(MIN_SCHEDULE_LEAD_MS / 60000);

  function onDateChange(v: string) {
    if (!v) return;
    const [y, m, d] = v.split("-").map(Number);
    const next = new Date(value);
    next.setFullYear(y, m - 1, d);
    setValue(next);
  }

  function onTimeChange(v: string) {
    if (!v) return;
    const [h, min] = v.split(":").map(Number);
    const next = new Date(value);
    next.setHours(h, min, 0, 0);
    setValue(next);
  }

  const fieldClass = "w-full bg-surface rounded-xl pl-10 pr-3 py-2.5 text-sm text-ink border border-border";

  return (
    <Modal onClose={onClose} ariaLabel="Schedule post">
      <h2 className="font-display text-lg text-ink mb-1">Schedule this post</h2>
      <p className="text-sm text-ink-muted mb-4">Choose when it should go live. It posts automatically.</p>

      {presets.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {presets.map((p) => {
            const selected = p.date.getTime() === value.getTime();
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setValue(p.date)}
                aria-pressed={selected}
                className={`text-left rounded-2xl border px-3 py-2.5 transition-colors ${
                  selected ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-accent-soft/50"
                }`}
              >
                <span className={`block text-sm font-medium ${selected ? "text-accent" : "text-ink"}`}>{p.label}</span>
                <span className="block text-xs text-ink-muted">{p.sub}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">Or pick a date and time</p>
      <div className="grid grid-cols-[3fr_2fr] gap-2">
        <label className="relative block">
          <span className="sr-only">Date</span>
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
          <input
            type="date"
            value={toDateInput(value)}
            min={toDateInput(new Date())}
            onChange={(e) => onDateChange(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="relative block">
          <span className="sr-only">Time</span>
          <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
          <input type="time" value={toTimeInput(value)} onChange={(e) => onTimeChange(e.target.value)} className={fieldClass} />
        </label>
      </div>

      <div
        aria-live="polite"
        className={`mt-4 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm ${
          valid ? "bg-accent-soft text-ink" : "bg-danger/10 text-danger"
        }`}
      >
        <Info size={15} className={`mt-0.5 shrink-0 ${valid ? "text-accent" : "text-danger"}`} />
        {valid ? (
          <span>
            Posts <span className="font-medium">{formatScheduleShort(value)}</span> · {relativeFromNow(value)}
          </span>
        ) : (
          <span>Pick a time at least {minutes} minutes from now.</span>
        )}
      </div>
      {timeZone && (
        <p className="mt-2 text-[11px] text-ink-muted">
          Your local time ({timeZone.replace(/_/g, " ")}). Find it later under Activity → Scheduled.
        </p>
      )}

      <div className="flex items-center gap-2 mt-5">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => isFarEnough(value) && onConfirm(value)}
          disabled={!valid}
          className="flex-1 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
        >
          Schedule post
        </button>
      </div>
    </Modal>
  );
}
