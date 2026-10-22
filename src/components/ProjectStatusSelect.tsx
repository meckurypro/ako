// src/components/ProjectStatusSelect.tsx
// The project Status control on Edit: one button that shows the current state (colour-coded) and opens the app's
// standard options list (OptionsModal — same card, title and rows as every other dropdown, themed for
// light and dark) to switch it. Replaces the old three-row radio group.
//
// Colour code (theme tokens, so each is tuned for light and dark): Published = green, Draft = amber, Archived = grey.
// Text stays ink for contrast; the colour rides on the tinted fill, the border and the icon chip.
import { useState, type ReactNode } from "react";
import { Archive, Check, ChevronDown, Globe, Pencil } from "lucide-react";
import type { ProjectStatus } from "../hooks/useProjects";
import { OptionsModal } from "./OptionsModal";

// 'cancelled' is deliberately not offered here — it only happens through the (not-yet-built) Event/Meeting
// cancellation flow, which also handles the host's per-cancellation refund choice. Exposing it as a plain status
// choice here would skip that entirely.
type EditableStatus = Extract<ProjectStatus, "active" | "draft" | "archived">;

const STATUS_OPTIONS: { value: EditableStatus; label: string; hint: string; color: string; icon: ReactNode }[] = [
  { value: "active", label: "Published", hint: "Visible to everyone", color: "var(--color-stance-support)", icon: <Globe /> },
  { value: "draft", label: "Draft", hint: "Only visible to you, not published yet", color: "var(--color-pushback)", icon: <Pencil /> },
  { value: "archived", label: "Archived", hint: "Hidden — was published before", color: "var(--color-ink-muted)", icon: <Archive /> },
];

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export function ProjectStatusSelect({ value, onChange }: { value: ProjectStatus; onChange: (next: ProjectStatus) => void }) {
  const [open, setOpen] = useState(false);
  // A legacy 'cancelled' row is shown as Archived (EditProject maps it on load), so there is always a match.
  const current = STATUS_OPTIONS.find((o) => o.value === value) ?? STATUS_OPTIONS[2];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${current.label}. Change status`}
        className="flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-transform active:scale-[0.99]"
        style={{ background: tint(current.color, 12), borderColor: tint(current.color, 40) }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&_svg]:h-[18px] [&_svg]:w-[18px]"
          style={{ background: tint(current.color, 20), color: current.color }}
        >
          {current.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{current.label}</span>
        <ChevronDown size={16} className="shrink-0 text-ink-muted" />
      </button>

      {open && (
        <OptionsModal
          title="Project status"
          onClose={() => setOpen(false)}
          items={STATUS_OPTIONS.map((o) => ({
            key: o.value,
            label: o.label,
            description: o.hint,
            icon: (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: tint(o.color, 16), color: o.color }}
              >
                {o.icon}
              </span>
            ),
            badge: o.value === current.value ? <Check size={20} style={{ color: o.color }} /> : undefined,
            onSelect: () => onChange(o.value),
          }))}
        />
      )}
    </>
  );
}
