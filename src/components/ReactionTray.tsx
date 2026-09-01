// src/components/ReactionTray.tsx
import type { ReactNode, MouseEvent } from "react";

export interface EngagementAction {
  key: string;
  label: string;
  icon: ReactNode;
  /** null hides the number entirely (e.g. Bookmark has no public count) */
  count: number | null;
  onClick: (e: MouseEvent) => void;
}

interface ReactionTrayProps {
  actions: EngagementAction[];
}

// Purely presentational — PostCard builds the 8 possible actions,
// orders them by the user's own usage (useEngagementOrder), and
// hands this component exactly the top 5 to render. The divider
// above separates this row from the post content/media, and the
// icon/count/label stack, evenly spaced, mirrors the product mockup.
export function ReactionTray({ actions }: ReactionTrayProps) {
  return (
    <div className="flex items-stretch justify-between border-t border-border mt-3 pt-3">
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={action.onClick}
          className="flex flex-col items-center gap-1 flex-1 min-w-0 text-ink-muted"
        >
          {action.icon}
          <span className="text-sm font-medium text-ink leading-none min-h-[1em]">
            {action.count !== null ? action.count : ""}
          </span>
          <span className="text-[11px] leading-none">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
