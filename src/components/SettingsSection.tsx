// src/components/SettingsSection.tsx
import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  /** Short collapsed-state preview, e.g. "System" or "Private" — lets users
   *  see the current value without expanding (standard progressive-disclosure
   *  practice: the header alone should communicate enough to decide whether
   *  to open it). */
  summary?: string;
  /** Whether this section is currently expanded. Controlled by the parent
   *  so it can enforce "only one section open at a time" — this component
   *  no longer tracks its own open state. */
  open: boolean;
  /** Called when the header is clicked, so the parent can decide what
   *  opens/closes (e.g. toggle this one, close whichever else was open). */
  onToggle: () => void;
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
  open,
  onToggle,
  danger = false,
  children,
}: SettingsSectionProps) {
  const panelId = useId();

  return (
    <div className="bg-surface rounded-3xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-ink/5 transition-colors"
      >
        <span
          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
            danger ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
          }`}
        >
          {icon}
        </span>
        <span className={`flex-1 min-w-0 text-[15px] font-semibold ${danger ? "text-danger" : "text-ink"}`}>
          {title}
        </span>
        {summary && !open && (
          <span className="text-sm text-ink-muted truncate max-w-[40%]">{summary}</span>
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
          <div className="px-4 pb-5 pt-2 border-t border-border">{children}</div>
        </div>
      </div>
    </div>
  );
}
