// src/components/ReactionMoreSheet.tsx
import { OptionsModal, type OptionItem } from "./OptionsModal";
import type { EngagementAction } from "./ReactionTray";

interface ReactionMoreSheetProps {
  actions: EngagementAction[];
  onClose: () => void;
}

/**
 * Long-pressing any of ReactionTray's visible icons opens this — every engagement action for the post (all secondary
 * actions regardless of usage rank, plus owner management), so nothing is out of reach just because it didn't make
 * the visible few. Rendered through the shared options list; <Portal> inside Modal escapes SwipeableTabs' transformed
 * pane. Actions run only after the dismiss settles (see runAfterDismiss) so the close can't undo them.
 */
export function ReactionMoreSheet({ actions, onClose }: ReactionMoreSheetProps) {
  const items: OptionItem[] = actions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    badge: action.count ? <span className="text-sm font-normal text-overlay-ink-muted">{action.count}</span> : undefined,
    onSelect: (e) => action.onClick(e),
  }));
  return <OptionsModal title="More actions" items={items} onClose={onClose} />;
}
