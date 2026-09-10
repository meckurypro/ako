// src/components/Modal.tsx
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
  ariaLabel?: string;
  /** Tailwind max-width class for the card. Default matches every
   *  existing centered dialog in the app (ConfirmDialog,
   *  PageInviteResponseModal) — only override for something that
   *  genuinely needs more room (a form with several fields, say). */
  maxWidthClass?: string;
  /** Skip the default bg-surface/border/rounded-2xl/p-5 card styling
   *  and just provide the centered, scrollable positioning box —
   *  for content that already brings its own card chrome (e.g.
   *  ArchivedPostModal wrapping a real PostCard, which has its own
   *  border/background/padding and would look double-boxed inside
   *  another card). */
  bare?: boolean;
}

/**
 * The one shared wrapper every centered modal/dialog in the app goes
 * through — ConfirmDialog, AddAccountModal, ArchivedPostModal,
 * PageInviteResponseModal. Before this, each of those hand-rolled its
 * own version of the same handful of pieces, and two of them
 * (AddAccountModal, ArchivedPostModal) had quietly drifted from the
 * other two in ways that were real bugs, not just style differences:
 *
 *  - No <Portal>. A modal opened from anywhere already rendering
 *    inside SwipeableTabs' translateX'd pane (Feed/ProfilePage/
 *    SavedHub/LikedHub) got clipped/offset inside that pane instead of
 *    centering on the real viewport — see Portal.tsx and the identical
 *    bug this already caused for ConfirmDialog before it got one.
 *  - z-50 instead of z-[60]. A modal confirming something from inside
 *    a bottom sheet or kebab menu (both z-50) needs to render above
 *    it, not tie with it — DOM order deciding which wins is not
 *    something to rely on.
 *  - `overflow-y-auto px-4 py-10` instead of real
 *    `flex items-center justify-center` — looked centered-ish for
 *    short content via the card's own `mx-auto`, but never actually
 *    was vertically, and broke down for anything taller than the
 *    viewport minus 2×py-10.
 *
 * Fixed once, here, instead of per-file — including a background
 * scroll-lock (via the shared useScrollLock — see that file for why
 * it's ref-counted rather than each modal naively hiding/restoring
 * overflow itself) and an Escape-key close that only two of the four
 * previously had.
 *
 * Deliberately NOT used for bottom sheets (GiftPicker,
 * ReactionMoreSheet, DropdownMenu, ManageAccessSheet, and the rest) —
 * those anchor to the bottom by design, same as WhatsApp/most native
 * apps' action sheets; that's a different, intentional pattern, not
 * an inconsistency to fix.
 */
export function Modal({
  onClose,
  children,
  role = "dialog",
  ariaLabel,
  maxWidthClass = "max-w-sm",
  bare = false,
}: ModalProps) {
  useBackDismiss(onClose);
  useScrollLock();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" role={role} aria-modal="true" aria-label={ariaLabel}>
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
        <div
          className={
            bare
              ? `relative w-full ${maxWidthClass} max-h-[85vh] overflow-y-auto`
              : `relative w-full ${maxWidthClass} max-h-[85vh] overflow-y-auto bg-surface rounded-2xl border border-border p-5 shadow-xl`
          }
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
