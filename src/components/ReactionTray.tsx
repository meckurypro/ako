// src/components/ReactionTray.tsx
import type { ReactNode, MouseEvent } from "react";

export interface EngagementAction {
  key: string;
  label: string;       // used as aria-label only — not rendered visually
  icon: ReactNode;
  /** null renders no count (no number shown, space still reserved) */
  count: number | null;
  onClick: (e: MouseEvent) => void;
}

interface ReactionTrayProps {
  actions: EngagementAction[];
}

// Purely presentational. PostCard builds the 5 visible actions and
// passes them here. Each button shows icon + count only — no label text.
// The label is kept in the interface for aria-label so screen readers work.
export function ReactionTray({ actions }: ReactionTrayProps) {
  return (
    <div className="flex items-stretch justify-between border-t border-border mt-3 pt-3">
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={action.onClick}
          aria-label={action.label}
          className="flex flex-col items-center gap-1 flex-1 min-w-0 text-accent"
        >
          {action.icon}
          {/* Reserve vertical space so all buttons stay the same height
              regardless of whether they have a count. */}
          <span className="text-sm font-semibold text-accent leading-none min-h-[1em]">
            {action.count !== null ? action.count : ""}
          </span>
        </button>
      ))}
    </div>
  );
}
