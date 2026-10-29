// src/pages/ConversationList.tsx
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search, X, Pin, Archive, Trash2, CheckSquare, Users } from "lucide-react";
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
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";
import { MessageStatusTicks } from "../components/MessageStatusTicks";
import { ConversationActionSheet } from "../components/ConversationActionSheet";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MediaViewer } from "../components/MediaViewer";
import { MessagePreviewLine } from "../components/MessagePreviewLine";
import { messagePlainText } from "../lib/chatMedia";
import { formatChatListTime } from "../lib/messageTime";

const MAX_PINNED = 3;

// Same title treatment as Connect and Library: orange section icon, big bold title, no bar.
const TITLE_CLASS = "font-bold text-[1.75rem] leading-tight tracking-tight text-ink flex items-center gap-2.5";

export function ConversationList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const authorIds = conversations?.map((c) => c.other_participant.id) ?? [];
  const { data: unseenPosts } = useUnseenPosts(authorIds);
  const archiveBadgeCount = useArchiveBadgeCount();
  const messagingEnabled = useFeatureFlag("messaging_enabled");

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

  // Tapping a chat row's avatar previews the photo instead of opening the
  // thread — same pattern as tapping an avatar elsewhere in the app.
  // Uses displayIdentity (not raw other_participant) so this also works
  // for a team group chat's page avatar.
  const [previewAvatar, setPreviewAvatar] = useState<{ src: string; name: string } | null>(null);
  function handleAvatarClick(c: ConversationSummary, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (selectMode) {
      toggleSelected(c.id);
      return;
    }
    const identity = displayIdentity(c);
    if (!identity.avatarUrl) return; // nothing to enlarge — let the row's own tap navigate
    setPreviewAvatar({ src: identity.avatarUrl, name: identity.name });
  }

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

  // A team group chat shows the PAGE's identity (name/avatar/username),
  // not a mashup of member names — see team_group_chat_migration.sql.
  // Every other place below that used to reach into c.other_participant
  // directly for display purposes goes through this instead.
  function displayIdentity(c: ConversationSummary) {
    if (c.is_group && c.team_page) {
      return { name: c.team_page.name, avatarUrl: c.team_page.avatar_url, username: c.team_page.username };
    }
    return {
      name: c.other_participant.display_name,
      avatarUrl: c.other_participant.avatar_url,
      username: c.other_participant.username,
    };
  }

  // Client-side filter over the already-fetched list — matches by
  // contact name/username or last-message content. Cheap enough at
  // conversation-list scale; no need for a server round trip.
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !conversations) return conversations;
    return conversations.filter((c) => {
      const { name, username } = displayIdentity(c);
      return (
        name.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q) ||
        // A voice note's raw encoded content (the storage path, its
        // JSON wrapper) isn't something a search term should ever
        // match against — nothing about it is meant to be read as text.
        (!!c.last_message && messagePlainText(c.last_message.content).toLowerCase().includes(q))
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
    const identity = displayIdentity(c);
    // The unseen-post glow is a 1:1 thing (view a specific person's new
    // post) — a group chat has no single "other person" it applies to.
    const unseenPostId = c.is_group ? undefined : unseenPosts?.[c.other_participant.id];
    // Only show ticks when the last message is one WE sent — seeing
    // your own message's delivery/read state in the list preview, same
    // as the double-tick-in-list pattern in WhatsApp.
    const showTicksInPreview = c.last_message?.sender_id === user?.id;
    const isSelected = selectedIds.has(c.id);
    const unread = c.unreadCount > 0;

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
        className="flex items-center gap-3.5 px-4 py-3 select-none cursor-pointer hover:bg-surface/50 active:bg-surface/60"
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

        {/* Both variants occupy the same 56px box, so names line up whether or not there's a ring. */}
        {unseenPostId ? (
          <span
            role="link"
            aria-label={`View ${identity.name}'s new post`}
            onClick={(e) => {
              e.preventDefault();
              if (selectMode) {
                toggleSelected(c.id); // let it behave like the rest of the row while selecting
                return;
              }
              e.stopPropagation();
              navigate(`/post/${unseenPostId}`);
            }}
            className="flex-shrink-0 w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-[0_0_6px_rgba(var(--accent-rgb),0.45)]"
          >
            <span className="block rounded-full bg-canvas p-[2px]">
              <Avatar src={identity.avatarUrl} name={identity.name} size="vn" />
            </span>
          </span>
        ) : (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleAvatarClick(c, e)}
            className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
            aria-label={`View ${identity.name}'s photo`}
          >
            <Avatar src={identity.avatarUrl} name={identity.name} size="vn" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <p className={`min-w-0 flex-1 text-base text-ink flex items-center gap-1.5 ${unread ? "font-semibold" : "font-medium"}`}>
              <span className="truncate">{identity.name}</span>
              {c.is_group && (
                <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-surface border border-border text-[10px] font-medium text-ink-muted">
                  <Users size={10} />
                  Group
                </span>
              )}
            </p>
            {/* The stamp turns the unread colour, like the badge below it. */}
            <span className={`text-xs flex-shrink-0 ml-2 ${unread ? "font-semibold text-cta" : "text-ink-muted"}`}>
              {formatChatListTime(c.last_message_at)}
            </span>
          </div>
          <div className="mt-0.5 min-h-[22px] flex items-center gap-1 min-w-0">
            {showTicksInPreview && c.last_message && !c.last_message.is_deleted && (
              <span className="flex-shrink-0 inline-flex">
                <MessageStatusTicks
                  deliveredAt={c.last_message.delivered_at}
                  readAt={c.last_message.read_at}
                  variant="list"
                  size={15}
                />
              </span>
            )}
            <span className={`min-w-0 flex-1 text-sm ${unread ? "text-ink" : "text-ink-muted"} ${c.last_message?.is_deleted ? "italic opacity-70" : ""}`}>
              <MessagePreviewLine
                variant="list"
                content={c.last_message?.is_deleted ? "This message was deleted" : (c.last_message?.content ?? "Say hello")}
              />
            </span>
            {unread && (
              <span className="ml-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-cta text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {c.unreadCount > 99 ? "99+" : c.unreadCount}
              </span>
            )}
            {c.pinned_at && <Pin size={15} className="ml-1 text-ink-muted flex-shrink-0" aria-label="Pinned" />}
          </div>
        </div>
      </div>
    );
  }

  // Defensive layer for anyone who lands on /messages directly (a
  // stale tab, a bookmark, a deep link) while messaging is off — same
  // "off switch is enforced here too, not just hidden from BottomNav"
  // approach WalletPage takes for wallet_enabled. Enforced server-side
  // as well (see check_messaging_enabled trigger on conversations/
  // messages), so this is a courtesy, not the only thing stopping a
  // new conversation or message from going through.
  if (!messagingEnabled) {
    return (
      <div className="min-h-screen bg-canvas pb-24">
        <header className="max-w-xl md:max-w-2xl mx-auto px-4 pt-6 pb-3">
          <h2 className={TITLE_CLASS}>
            <MessageCircle size={24} className="text-brand-orange shrink-0" />
            Chats
          </h2>
        </header>
        <div className="max-w-xl md:max-w-2xl mx-auto px-4 pt-10 text-center">
          <p className="text-sm text-ink-muted">Messaging is temporarily unavailable. Check back later.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className={`sticky top-0 bg-canvas z-chrome ${selectMode ? "border-b border-border" : ""}`}>
        <div className="max-w-xl md:max-w-2xl mx-auto px-4 pt-6 pb-3">
          {selectMode ? (
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-3">
              <h2 className={`${TITLE_CLASS} flex-1`}>
                <MessageCircle size={24} className="text-brand-orange shrink-0" />
                Chats
              </h2>
              {conversations && conversations.length > 0 && (
                <button onClick={() => setSelectMode(true)} className="text-ink" aria-label="Select chats">
                  <CheckSquare size={22} />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-xl md:max-w-2xl mx-auto">
        {!selectMode && conversations && conversations.length > 0 && (
          <div className="px-4 pt-1 pb-2">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages…"
                className="w-full h-12 pl-12 pr-11 rounded-full border border-border bg-surface text-ink text-base
                  focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Archive — sits under the search, above pinned/normal chats. Requests from people who
            don't follow you land here (see is_request in useMessaging.ts) alongside anything
            you've manually archived. */}
        {!selectMode && (
          <button
            onClick={() => navigate("/messages/archive")}
            className="w-full flex items-center gap-3.5 px-4 py-2 hover:bg-surface/50 active:bg-surface/60"
          >
            <span className="flex-shrink-0 w-14 h-14 flex items-center justify-center text-ink-muted">
              <Archive size={22} />
            </span>
            <span className="flex-1 text-left text-base font-medium text-ink">Archive</span>
            {archiveBadgeCount > 0 && (
              <span className="bg-cta text-white text-xs font-semibold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center flex-shrink-0">
                {archiveBadgeCount > 99 ? "99+" : archiveBadgeCount}
              </span>
            )}
          </button>
        )}

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm px-4">
            No conversations yet. Message someone from their profile.
          </p>
        ) : filteredConversations && filteredConversations.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm px-4">No conversations match your search.</p>
        ) : (
          <>
            {pinnedConversations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide px-4 pt-3 pb-1">
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
          displayName={displayIdentity(actionTarget).name}
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

      {previewAvatar && (
        <MediaViewer
          mediaUrls={[previewAvatar.src]}
          startIndex={0}
          onClose={() => setPreviewAvatar(null)}
        />
      )}
    </div>
  );
}
