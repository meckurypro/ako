// src/components/SchedulePostModal.tsx
// "Schedule post" — deliberately minimal: a Date field, a Time field, one line confirming when it goes live.
// Pre-filled with tomorrow 9:00 AM so the button always works.
import { useState } from "react";
import { Modal } from "./Modal";
import { defaultSchedule, formatScheduleShort, isFarEnough, MIN_SCHEDULE_LEAD_MS } from "../lib/schedulePresets";

interface SchedulePostModalProps {
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function SchedulePostModal({ onClose, onConfirm }: SchedulePostModalProps) {
  const [value, setValue] = useState<Date>(() => defaultSchedule());
  const valid = isFarEnough(value);

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

  const fieldClass = "w-full min-w-0 bg-overlay-surface-raised rounded-xl px-3 py-2 text-sm text-overlay-ink border border-overlay-border";

  return (
    <Modal onClose={onClose} ariaLabel="Schedule post" themed>
      <h2 className="font-display text-lg text-overlay-ink mb-4">Schedule post</h2>

      <div className="grid grid-cols-2 gap-4">
        <label className="block min-w-0">
          <span className="block text-[11px] text-overlay-ink-muted mb-1">Date</span>
          <input type="date" value={toDateInput(value)} min={toDateInput(new Date())} onChange={(e) => onDateChange(e.target.value)} className={fieldClass} />
        </label>
        <label className="block min-w-0">
          <span className="block text-[11px] text-overlay-ink-muted mb-1">Time</span>
          <input type="time" value={toTimeInput(value)} onChange={(e) => onTimeChange(e.target.value)} className={fieldClass} />
        </label>
      </div>

      <p aria-live="polite" className={`mt-3 text-sm ${valid ? "text-overlay-ink-muted" : "text-overlay-danger"}`}>
        {valid ? `Posts ${formatScheduleShort(value)}` : `Choose a time at least ${Math.round(MIN_SCHEDULE_LEAD_MS / 60000)} minutes from now.`}
      </p>

      <div className="flex items-center gap-2 mt-5">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-full bg-overlay-surface-raised text-sm font-medium text-overlay-ink">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => isFarEnough(value) && onConfirm(value)}
          disabled={!valid}
          className="flex-1 py-2.5 rounded-full bg-overlay-accent text-overlay-surface text-sm font-medium disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
    </Modal>
  );
}
