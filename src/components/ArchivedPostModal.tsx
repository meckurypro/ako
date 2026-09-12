// src/components/ArchivedPostModal.tsx
import { X } from "lucide-react";
import { PostCard } from "./PostCard";
import { Modal } from "./Modal";
import type { PostWithAuthor } from "../types/database";

interface ArchivedPostModalProps {
  post: PostWithAuthor;
  onClose: () => void;
}

/**
 * Full post preview from the Archive screen — renders the exact same
 * PostCard the feed uses. Restore/Delete come from PostCard's own
 * archived-actions bar (top-right of the card, visible because
 * is_archived is true) rather than being reimplemented here — its
 * regular reaction tray is frozen for archived content, so those two
 * actions get their own always-usable icons instead of living in the
 * tray's long-press sheet. The caller is responsible for closing this
 * once the post falls out of the archived list (see the effect in
 * Archive.tsx) — restoring/deleting doesn't close it on its own since
 * PostCard has no way to tell us that happened.
 *
 * Built on the shared <Modal> wrapper in `bare` mode — see Modal.tsx —
 * since PostCard already brings its own card chrome and doesn't need
 * a second bordered box wrapped around it. Uses a lower z-40 (see
 * Modal's zIndexClass) instead of the default z-[60], since PostCard
 * can open its own z-50 bottom sheets (GiftPicker, ReshareSheet,
 * StanceComposer) — those need to render above this modal, not under
 * it.
 */
export function ArchivedPostModal({ post, onClose }: ArchivedPostModalProps) {
  return (
    <Modal onClose={onClose} ariaLabel="Archived post preview" maxWidthClass="max-w-xl" bare zIndexClass="z-40">
      <button
        onClick={onClose}
        aria-label="Close"
        className="flex items-center gap-1.5 text-sm text-canvas bg-ink/70 rounded-full px-3 py-1.5 mb-3"
      >
        <X size={15} />
        Close
      </button>
      <PostCard post={post} isOwnerView />
    </Modal>
  );
}
