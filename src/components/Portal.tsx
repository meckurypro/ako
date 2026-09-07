// src/components/Portal.tsx
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Renders `children` into document.body instead of in place in the
 * React tree.
 *
 * Needed for any `fixed inset-0` overlay (sheet, modal, dialog) that
 * might be mounted from inside PostCard/ProjectCard — those render
 * inside SwipeableTabs (see Feed, ProfilePage, SavedHub, LikedHub),
 * which applies `transform: translateX(...)` to the pane wrapper for
 * the swipe gesture. A CSS transform on an ancestor creates a new
 * containing block for `position: fixed` descendants (per spec), so
 * without this, a "fixed inset-0" modal ends up sized/positioned
 * relative to that translated pane instead of the real viewport —
 * clipped, offset, or shifted mid-swipe. Portaling to document.body
 * sidesteps the containing-block issue entirely, regardless of what
 * transforms exist further up the tree.
 *
 * Not needed for overlays that only ever mount outside SwipeableTabs
 * (e.g. MessageThread's sheets) — but it's harmless to use everywhere,
 * so reach for it on any new full-screen overlay by default.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
