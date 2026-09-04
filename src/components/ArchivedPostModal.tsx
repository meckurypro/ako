// src/components/ArchivedPostModal.tsx
import { useEffect } from "react";
import { X } from "lucide-react";
import { PostCard } from "./PostCard";
import type { PostWithAuthor } from "../types/database";

interface ArchivedPostModalProps {
  post: PostWithAuthor;
  onClose: () => void;
}

/**
 * Full post preview from the Archive screen — renders the exact same
 * PostCard the feed uses, so Restore/Edit/Delete all come for free
 * from its own "…" menu (PostActionSheet) instead of being
 * reimplemented here. The caller is responsible for closing this once
 * the post falls out of the archived list (see the effect in
 * Archive.tsx) — restoring/deleting doesn't close it on its own since
 * PostCard has no way to tell us that happened.
 */
export function ArchivedPostModal({ post, onClose }: ArchivedPostModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-ink/40 z-50 overflow-y-auto px-4 py-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Archived post preview"
    >
      <div className="w-full max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center gap-1.5 text-sm text-canvas bg-ink/70 rounded-full px-3 py-1.5 mb-3"
        >
          <X size={15} />
          Close
        </button>
        <PostCard post={post} isOwnerView />
      </div>
    </div>
  );
}
