// src/pages/ArchivedConversations.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArchiveRestore, Trash2, X, CheckSquare } from "lucide-react";
import {
  useArchivedConversations,
  useMarkArchiveSeen,
  useUpdateConversationState,
  useBulkUpdateConversationState,
  type ArchivedConversationSummary,
} from "../hooks/useMessaging";
import { Avatar } from "../components/Avatar";
import { PresenceDot } from "../components/PresenceDot";
import { ConfirmDialog } from "../components/ConfirmDialog";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ArchivedConversations() {
  const navigate = useNavigate();
  const { data: archived, isLoading } = useArchivedConversations();
  const markSeen = useMarkArchiveSeen();
  const updateConversationState = useUpdateConversationState();
  const bulkUpdateConversationState = useBulkUpdateConversationState();

  // Opening this screen clears the "new" badge on the Archive row —
  // items themselves stay right here until the user actually replies
  // (see the accept-on-reply logic in useSendMessage), so this only
  // ever touches the badge, never the list contents.
  useEffect(() => {
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Long press for unarchive/delete/select, mirrors ConversationList ---
  const [actionTarget, setActionTarget] = useState<ArchivedConversationSummary | null>(null);
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressStart = useRef<Record<string, { x: number; y: number }>>({});
  const longPressFired = useRef<Record<string, boolean>>({});

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  function enterSelectMode(id: string) {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }
  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handlePointerDown(c: ArchivedConversationSummary, e: React.PointerEvent) {
    if (selectMode) return;
    longPressStart.current[c.id] = { x: e.clientX, y: e.clientY };
    longPressFired.current[c.id] = false;
    longPressTimers.current[c.id] = setTimeout(() => {
      longPressFired.current[c.id] = true;
      if (navigator.vibrate) navigator.vibrate(15);
      setActionTarget(c);
    }, 450);
  }
  function cancelLongPressTimer(id: string) {
    const timer = longPressTimers.current[id];
    if (timer) clearTimeout(timer);
    longPressTimers.current[id] = null;
  }
  function handlePointerMove(c: ArchivedConversationSummary, e: React.PointerEvent) {
    const start = longPressStart.current[c.id];
    if (!start) return;
    if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) {
      cancelLongPressTimer(c.id);
    }
  }
  function endGesture(id: string) {
    cancelLongPressTimer(id);
    delete longPressStart.current[id];
  }
  function handleRowClick(c: ArchivedConversationSummary, e: React.MouseEvent) {
    if (selectMode) {
      toggleSelected(c.id);
      return;
    }
    if (longPressFired.current[c.id]) {
      e.preventDefault();
      longPressFired.current[c.id] = false;
      return;
    }
    navigate(`/messages/${c.id}`);
  }

  function handleUnarchive(c: ArchivedConversationSummary) {
    updateConversationState.mutate({ conversationId: c.id, archived_at: null });
  }
  function handleBulkUnarchive() {
    bulkUpdateConversationState.mutate({ conversationIds: [...selectedIds], archived_at: null }, { onSuccess: exitSelectMode });
  }
  function handleBulkDeletePress() {
    setDeleteTarget({ ids: [...selectedIds], label: selectedIds.size > 1 ? `${selectedIds.size} chats` : "this chat" });
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.ids.length === 1) {
      updateConversationState.mutate({ conversationId: deleteTarget.ids[0], hidden_at: new Date().toISOString() });
    } else {
      bulkUpdateConversationState.mutate({ conversationIds: deleteTarget.ids, hidden_at: new Date().toISOString() });
    }
    setDeleteTarget(null);
    exitSelectMode();
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        {selectMode ? (
          <>
            <button onClick={exitSelectMode} className="text-ink-muted" aria-label="Cancel selection">
              <X size={22} />
            </button>
            <span className="flex-1 text-sm font-medium text-ink">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkUnarchive}
              disabled={!selectedIds.size}
              className="text-ink-muted disabled:opacity-30"
              aria-label="Unarchive selected"
            >
              <ArchiveRestore size={19} />
            </button>
            <button
              onClick={handleBulkDeletePress}
              disabled={!selectedIds.size}
              className="text-danger disabled:opacity-30"
              aria-label="Delete selected"
            >
              <Trash2 size={19} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate(-1)} className="text-ink-muted">
              <ArrowLeft size={22} />
            </button>
            <h2 className="font-display text-2xl text-ink flex-1">Archive</h2>
            {archived && archived.length > 0 && (
              <button onClick={() => setSelectMode(true)} className="text-ink-muted" aria-label="Select chats">
                <CheckSquare size={20} />
              </button>
            )}
          </>
        )}
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !archived || archived.length === 0 ? (
          <p className="text-ink-muted text-center py-16 text-sm">Nothing archived right now.</p>
        ) : (
          archived.map((c) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                onPointerDown={(e) => handlePointerDown(c, e)}
                onPointerMove={(e) => handlePointerMove(c, e)}
                onPointerUp={() => endGesture(c.id)}
                onPointerLeave={() => endGesture(c.id)}
                onPointerCancel={() => endGesture(c.id)}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => handleRowClick(c, e)}
                role="link"
                className="flex items-center gap-3 py-3.5 border-b border-border select-none cursor-pointer"
                style={{ WebkitTouchCallout: "none" }}
              >
                {selectMode && (
                  <span
                    className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                      isSelected ? "bg-accent border-accent" : "border-border"
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-canvas" />}
                  </span>
                )}

                <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${c.unread ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                      {c.other_participant.display_name}
                    </p>
                    <span className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <span className="text-xs text-ink-muted">{timeAgo(c.last_message_at)}</span>
                      <PresenceDot lastSeenAt={c.other_participant.last_seen_at} />
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.is_request && (
                      <span className="text-[11px] font-medium text-accent bg-accent-soft rounded-full px-2 py-0.5 flex-shrink-0">
                        Request
                      </span>
                    )}
                    <p className={`text-sm truncate min-w-0 flex-1 ${c.unread ? "text-ink" : "text-ink-muted"} ${c.last_message?.is_deleted ? "italic opacity-70" : ""}`}>
                      {c.last_message?.is_deleted ? "This message was deleted" : c.last_message?.content ?? "Say hello"}
                    </p>
                  </div>
                </div>

                {c.unread && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
              </div>
            );
          })
        )}
      </div>

      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setActionTarget(null)} />
          <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
            <p className="px-4 pt-4 pb-2 text-xs text-ink-muted truncate">{actionTarget.other_participant.display_name}</p>

            <button
              onClick={() => {
                handleUnarchive(actionTarget);
                setActionTarget(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
            >
              <ArchiveRestore size={18} />
              Unarchive
            </button>

            <button
              onClick={() => {
                enterSelectMode(actionTarget.id);
                setActionTarget(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
            >
              <CheckSquare size={18} />
              Select chats
            </button>

            <button
              onClick={() => {
                setDeleteTarget({ ids: [actionTarget.id], label: "this chat" });
                setActionTarget(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-danger"
            >
              <Trash2 size={18} />
              Delete chat
            </button>

            <button onClick={() => setActionTarget(null)} className="w-full py-3.5 text-sm text-ink-muted border-t border-border mt-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.label}?`}
          description="This removes it from your Archive. The other participant keeps their copy, and you can't undo this."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
