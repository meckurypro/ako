// src/components/TagPeopleSheet.tsx
import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useTaggedUsers, useSetTaggedUsers, type TagTarget } from "../hooks/useTagging";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import { PeoplePicker } from "./PeoplePicker";
import type { MentionCandidate } from "../hooks/useMentions";

export function TagPeopleSheet({
  target,
  targetId,
  onClose,
}: {
  target: TagTarget;
  targetId: string;
  onClose: () => void;
}) {
  const { data: tagged, isLoading } = useTaggedUsers(target, targetId);
  const setTagged = useSetTaggedUsers(target);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBackDismiss(onClose);
  useScrollLock();

  function handleConfirm(selected: MentionCandidate[]) {
    setError(null);
    setTagged.mutate(
      { targetId, userIds: selected.map((p) => p.id) },
      {
        onSuccess: () => setShowPicker(false),
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't update tags."),
      }
    );
  }

  return (
    <>
      <Portal>
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
          <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-display text-lg text-ink">Tag people</h2>
                <p className="text-xs text-ink-muted">Tagged people get notified and can be shown on the {target}.</p>
              </div>
              <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3">
              {isLoading ? (
                <p className="text-ink-muted text-sm text-center py-10">Loading…</p>
              ) : !tagged || tagged.length === 0 ? (
                <p className="text-ink-muted text-sm text-center py-10">No one's tagged yet.</p>
              ) : (
                <div className="space-y-1">
                  {tagged.map((t) => (
                    <div key={t.user_id} className="flex items-center gap-3 py-2 px-1">
                      <Avatar src={t.user.avatar_url} name={t.user.display_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{t.user.display_name}</p>
                        <p className="text-xs text-ink-muted truncate">@{t.user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-danger mt-2">{error}</p>}
            </div>

            <div className="px-4 py-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowPicker(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-border text-sm font-medium text-ink"
              >
                <UserPlus size={16} />
                Manage tags
              </button>
            </div>
          </div>
        </div>
      </Portal>

      {showPicker && (
        <PeoplePicker
          title="Tag people"
          subtitle="They'll be notified they were tagged."
          confirmLabel="Save tags"
          initialSelected={(tagged ?? []).map((t) => t.user)}
          onConfirm={handleConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
