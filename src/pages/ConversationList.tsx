// src/pages/ConversationList.tsx
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, Pin, Archive, ChevronRight, Trash2, CheckSquare } from "lucide-react";
import {
  useConversations,
  useUpdateConversationState,
  useBulkUpdateConversationState,
  useTogglePin,
  useArchiveBadgeCount,
  type ConversationSummary,
} from "../hooks/useMessaging";
import { useUnseenPosts } from "../hooks/useUnseenPosts";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";
import { MessageStatusTicks } from "../components/MessageStatusTicks";
import { PresenceDot } from "../components/PresenceDot";
import { ConversationActionSheet } from "../components/ConversationActionSheet";
import { ConfirmDialog } from "../components/ConfirmDialog";

const MAX_PINNED = 3;

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ConversationList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const authorIds = conversations?.map((c) => c.other_participant.id) ?? [];
  const { data: unseenPosts } = useUnseenPosts(authorIds);
  const archiveBadgeCount = useArchiveBadgeCount();

  const [searchQuery, setSearchQuery] = useState("");

  // --- Long press to open pin/archive/delete/select actions (same
  // hand-rolled pointer-timer approach used for messages — no gesture
  // library). ---
  const updateConversationState = useUpdateConversationState();
  const bulkUpdateConversationState = useBulkUpdateConversationState();
  const togglePin = useTogglePin();
  const [actionTarget, setActionTarget] = useState<ConversationSummary | null>(null);
  const [pinLimitNotice, setPinLimitNotice] = useState(false);
  const pinNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressStart = useRef<Record<string, { x: number; y: number }>>({});
  const longPressFired = useRef<Record<string, boolean>>({});

  // --- Multi-select mode ---
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Single-chat delete (from the action sheet) and bulk delete both
  // route through this confirmation — deleting a whole conversation's
  // history from your view is significant enough to warrant a pause,
  // unlike archive/pin/select which are all instantly reversible.
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

  function handleBulkArchive() {
    bulkUpdateConversationState.mutate(
      { conversationIds: [...selectedIds], archived_at: new Date().toISOString(), pinned_at: null },
      { onSuccess: exitSelectMode }
    );
  }
  function handleBulkDeletePress() {
    setDeleteTarget({
      ids: [...selectedIds],
      label: selectedIds.size > 1 ? `${selectedIds.size} chats` : "this chat",
    });
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

  function handlePointerDown(c: ConversationSummary, e: React.PointerEvent) {
    if (selectMode) return; // tap-to-toggle takes over in select mode
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
  function handlePointerMove(c: ConversationSummary, e: React.PointerEvent) {
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
  function handleRowClick(c: ConversationSummary, e: React.MouseEvent) {
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

  function handleTogglePin(c: ConversationSummary) {
    const pin = !c.pinned_at;
    togglePin.mutate(
      { conversationId: c.id, pin },
      {
        onError: (err) => {
          if (err instanceof Error && err.message === "PIN_LIMIT_REACHED") {
            setPinLimitNotice(true);
            if (pinNoticeTimer.current) clearTimeout(pinNoticeTimer.current);
            pinNoticeTimer.current = setTimeout(() => setPinLimitNotice(false), 3000);
          }
        },
      }
    );
  }

  // Client-side filter over the already-fetched list — matches by
  // contact name/username or last-message content. Cheap enough at
  // conversation-list scale; no need for a server round trip.
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !conversations) return conversations;
    return conversations.filter((c) => {
      const { display_name, username } = c.other_participant;
      return (
        display_name.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q) ||
        (c.last_message?.content ?? "").toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  // Pinned chats (max MAX_PINNED, enforced on the write side by
  // useTogglePin) float into their own section above the rest.
  const pinnedConversations = useMemo(
    () => filteredConversations?.filter((c) => !!c.pinned_at) ?? [],
    [filteredConversations]
  );
  const normalConversations = useMemo(
    () => filteredConversations?.filter((c) => !c.pinned_at) ?? [],
    [filteredConversations]
  );

  function renderRow(c: ConversationSummary) {
    const unseenPostId = unseenPosts?.[c.other_participant.id];
    // Only show ticks when the last message is one WE sent — seeing
    // your own message's delivery/read state in the list preview, same
    // as the double-tick-in-list pattern in WhatsApp.
    const showTicksInPreview = c.last_message?.sender_id === user?.id;
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

        {unseenPostId ? (
          <span
            role="link"
            aria-label={`View ${c.other_participant.display_name}'s new post`}
            onClick={(e) => {
              e.preventDefault();
              if (selectMode) {
                toggleSelected(c.id); // let it behave like the rest of the row while selecting
                return;
              }
              e.stopPropagation();
              navigate(`/post/${unseenPostId}`);
            }}
            className="flex-shrink-0 rounded-full p-[2.5px] bg-accent shadow-[0_0_6px_rgba(61,90,69,0.45)]"
          >
            <span className="block rounded-full bg-canvas p-[2px]">
              <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} />
            </span>
          </span>
        ) : (
          <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className={`text-sm truncate flex items-center gap-1 ${c.unread ? "font-semibold text-ink" : "font-medium text-ink"}`}>
              {c.pinned_at && <Pin size={12} className="text-ink-muted flex-shrink-0" />}
              <span className="truncate">{c.other_participant.display_name}</span>
            </p>
            <span className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
              <span className="text-xs text-ink-muted">{timeAgo(c.last_message_at)}</span>
              <PresenceDot lastSeenAt={c.other_participant.last_seen_at} />
            </span>
          </div>
          <p className={`text-sm flex items-center gap-1 min-w-0 ${c.unread ? "text-ink" : "text-ink-muted"}`}>
            {showTicksInPreview && c.last_message && !c.last_message.is_deleted && (
              <span className="flex-shrink-0 inline-flex">
                <MessageStatusTicks
                  deliveredAt={c.last_message.delivered_at}
                  readAt={c.last_message.read_at}
                  variant="list"
                  size={13}
                />
              </span>
            )}
            <span className={`truncate min-w-0 flex-1 ${c.last_message?.is_deleted ? "italic opacity-70" : ""}`}>
              {c.last_message?.is_deleted ? "This message was deleted" : c.last_message?.content ?? "Say hello"}
            </span>
          </p>
        </div>
        {c.unread && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="sticky top-0 bg-canvas z-30 border-b border-border">
        {selectMode ? (
          <div className="px-4 pt-6 pb-3 flex items-center gap-3">
            <button onClick={exitSelectMode} className="text-ink-muted" aria-label="Cancel selection">
              <X size={22} />
            </button>
            <span className="flex-1 text-sm font-medium text-ink">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkArchive}
              disabled={!selectedIds.size}
              className="text-ink-muted disabled:opacity-30"
              aria-label="Archive selected"
            >
              <Archive size={19} />
            </button>
            <button
              onClick={handleBulkDeletePress}
              disabled={!selectedIds.size}
              className="text-danger disabled:opacity-30"
              aria-label="Delete selected"
            >
              <Trash2 size={19} />
            </button>
          </div>
        ) : (
          <div className="px-4 pt-6 pb-3 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-ink-muted">
              <ArrowLeft size={22} />
            </button>
            <h2 className="font-display text-2xl text-ink flex-1">Messages</h2>
            {conversations && conversations.length > 0 && (
              <button
                onClick={() => setSelectMode(true)}
                className="text-ink-muted"
                aria-label="Select chats"
              >
                <CheckSquare size={20} />
              </button>
            )}
          </div>
        )}

        {/* Archive — sits at the top, sticky with the header, above
            pinned/normal chats. Requests from people who don't follow
            you land here (see is_request in useMessaging.ts) alongside
            anything you've manually archived. */}
        {!selectMode && (
          <button
            onClick={() => navigate("/messages/archive")}
            className="w-full flex items-center gap-3 px-4 py-3 max-w-xl mx-auto border-t border-border/60"
          >
            <span className="flex-shrink-0 w-11 h-11 rounded-full bg-accent-soft text-accent flex items-center justify-center">
              <Archive size={18} />
            </span>
            <span className="flex-1 text-left text-sm font-medium text-ink">Archive</span>
            {archiveBadgeCount > 0 && (
              <span className="bg-accent text-canvas text-[11px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center flex-shrink-0">
                {archiveBadgeCount > 99 ? "99+" : archiveBadgeCount}
              </span>
            )}
            <ChevronRight size={16} className="text-ink-muted flex-shrink-0" />
          </button>
        )}
      </header>

      {!selectMode && conversations && conversations.length > 0 && (
        <div className="max-w-xl mx-auto px-4 pt-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="w-full pl-10 pr-9 py-2.5 rounded-full border border-border bg-surface text-ink text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">
            No conversations yet. Message someone from their profile.
          </p>
        ) : filteredConversations && filteredConversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No conversations match your search.</p>
        ) : (
          <>
            {pinnedConversations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide pt-2 pb-1">
                  Pinned
                </p>
                {pinnedConversations.map(renderRow)}
              </div>
            )}
            {normalConversations.map(renderRow)}
          </>
        )}
      </div>

      <BottomNav />

      {pinLimitNotice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ink text-canvas text-sm rounded-full px-4 py-2 shadow-lg whitespace-nowrap">
          You can only pin up to {MAX_PINNED} chats — unpin one first.
        </div>
      )}

      {actionTarget && (
        <ConversationActionSheet
          displayName={actionTarget.other_participant.display_name}
          isPinned={!!actionTarget.pinned_at}
          onTogglePin={() => handleTogglePin(actionTarget)}
          onArchive={() =>
            updateConversationState.mutate({
              conversationId: actionTarget.id,
              archived_at: new Date().toISOString(),
              // Pinned + archived at once doesn't make sense — archiving
              // an important chat should also drop it from "Pinned".
              pinned_at: null,
            })
          }
          onDelete={() =>
            setDeleteTarget({ ids: [actionTarget.id], label: "this chat" })
          }
          onSelect={() => enterSelectMode(actionTarget.id)}
          onClose={() => setActionTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.label}?`}
          description="This removes it from your inbox. The other participant keeps their copy, and you can't undo this."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
