// src/components/SettingsSection.tsx
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  /** Short collapsed-state preview, e.g. "System" or "Private" — lets users
   *  see the current value without expanding (standard progressive-disclosure
   *  practice: the header alone should communicate enough to decide whether
   *  to open it). */
  summary?: string;
  /** Opens on first render. Reserve for the single most-used section. */
  defaultOpen?: boolean;
  /** Red-tinted header for destructive/irreversible settings (kept last, on
   *  its own, never collapsed together with routine settings). */
  danger?: boolean;
  children: ReactNode;
}

// Pure-CSS expand/collapse via animatable grid-template-rows (0fr <-> 1fr),
// rather than max-height tricks or a JS height measurement — no layout
// thrash, and content of any length collapses/expands cleanly.
export function SettingsSection({
  icon,
  title,
  summary,
  defaultOpen = false,
  danger = false,
  children,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="bg-surface rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className={danger ? "text-danger" : "text-ink-muted"}>{icon}</span>
        <span className={`flex-1 min-w-0 text-sm font-medium ${danger ? "text-danger" : "text-ink"}`}>
          {title}
        </span>
        {summary && !open && (
          <span className="text-xs text-ink-muted truncate max-w-[40%]">{summary}</span>
        )}
        <ChevronDown
          size={18}
          className={`text-ink-muted flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-5 pt-1 border-t border-border">{children}</div>
        </div>
      </div>
    </div>
  );
}
