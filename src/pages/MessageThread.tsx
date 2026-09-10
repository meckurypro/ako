// src/pages/MessageThread.tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Search,
  ChevronUp,
  ChevronDown,
  Smile,
  Keyboard,
  X,
  MoreHorizontal,
  Inbox,
  Trash2,
  Forward,
  EyeOff,
  Star,
  Mic,
  Share2,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Wallpaper } from "../components/Wallpaper";
import { useAuth } from "../hooks/useAuth";
import {
  useMessages,
  useSendMessage,
  useSendVoiceNote,
  useMarkConversationRead,
  useMarkMessagesRead,
  useDeleteMessage,
  useBulkDeleteMessages,
  useMyParticipantState,
  type MessageWithSender,
  type DeleteScope,
} from "../hooks/useMessaging";
import {
  useConversationReactions,
  useSetReaction,
  useRemoveReaction,
  useUserTopEmojis,
  useMessageUserStates,
  useToggleMessageState,
  useBulkSetMessagesHidden,
  useTrackEmojiUsage,
} from "../hooks/useMessageReactions";
import { Avatar } from "../components/Avatar";
import { useUnseenPosts } from "../hooks/useUnseenPosts";
import { PresenceDot } from "../components/PresenceDot";
import { MessageActionMenu } from "../components/MessageActionMenu";
import { DeleteMessageSheet } from "../components/DeleteMessageSheet";
import { ForwardMessageSheet } from "../components/ForwardMessageSheet";
import { VoiceRecordingBar } from "../components/VoiceRecordingBar";
import { VoicePreviewBar } from "../components/VoicePreviewBar";
import { EmojiPickerSheet, removeLastGrapheme } from "../components/EmojiPickerSheet";
import { formatLastSeen } from "../lib/presence";
import { decodeVoiceNote, VOICE_NOTE_LABEL } from "../lib/voiceNotes";
import { ReactionOptionsPopover, type ReactionPopoverTarget } from "../components/ReactionOptionsPopover";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useKeyboardInset } from "../hooks/useKeyboardInset";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { MessageBubble, SWIPE_THRESHOLD, SWIPE_MAX } from "../components/MessageBubble";

// Fetches header identity for the thread — a small dedicated query
// since useConversations' list-summary shape isn't available when
// landing here directly (e.g. from a notification link). Group
// conversations (a page's team chat — see
// team_group_chat_migration.sql) get their identity from the page
// itself, not a participant lookup: the old version here used
// .maybeSingle() on "every OTHER participant", which throws outright
// the moment a conversation has more than one (any group with 3+
// total members) — this branches before ever reaching that query.
function useConversationHeader(conversationId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversation-header", conversationId, user?.id],
    queryFn: async () => {
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select(
          "is_group, team_page:pages!conversations_team_page_id_fkey(id, username, name, avatar_url, page_type, is_verified)"
        )
        .eq("id", conversationId)
        .single();
      if (convError) throw convError;

      if (conv.is_group) {
        return {
          is_group: true as const,
          team_page: (conv as any).team_page as
            | { id: string; username: string; name: string; avatar_url: string | null; page_type: "organization" | "brand"; is_verified: boolean }
            | null,
          other_participant: undefined,
        };
      }

      const { data, error } = await supabase
        .from("conversation_participants")
        .select(
          "profile:profiles!conversation_participants_user_id_fkey(id, username, display_name, avatar_url, last_seen_at)"
        )
        .eq("conversation_id", conversationId)
        .neq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;

      return {
        is_group: false as const,
        team_page: null,
        other_participant: data?.profile as
          | { id: string; username: string; display_name: string; avatar_url: string | null; last_seen_at: string | null }
          | undefined,
      };
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 30_000, // keeps the header status dot from going stale on a long-open thread
  });
}

// Chat wallpaper: shared <Wallpaper /> component (African motifs, same
// pattern used on auth screens) — sits fixed behind the message list only
// (header/composer stay solid `bg-canvas` for legibility), non-scrolling
// so it reads like a wallpaper rather than content.

// Swipe-to-reply resistance past SWIPE_MAX — SWIPE_THRESHOLD/SWIPE_MAX
// themselves live in MessageBubble.tsx (which owns the visual swipe
// feedback) and are imported above so this file's own drag-offset math
// below uses the exact same numbers.
const SWIPE_RESISTANCE = 0.2;

interface ActiveMessage {
  message: MessageWithSender;
  anchorRect: DOMRect;
}

/** What DeleteMessageSheet is currently open for — one message or a bulk selection. */
interface DeleteTarget {
  messageIds: string[];
  allowEveryone: boolean;
}

type EmojiPickerTarget = { mode: "input" } | { mode: "reaction"; messageId: string } | null;

export function MessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: messages, isLoading, hasMore, loadOlder, isLoadingOlder } = useMessages(conversationId!);
  const { data: header } = useConversationHeader(conversationId!);
  const otherParticipant = header?.other_participant;
  const teamPage = header?.team_page;
  const { data: myParticipantState } = useMyParticipantState(conversationId!);

  // Same ring-on-avatar treatment as ConversationList — checks just
  // this one participant for an unseen post from the last 24h. No
  // equivalent for a group thread (no single "the other person").
  const { data: unseenPosts } = useUnseenPosts(otherParticipant ? [otherParticipant.id] : []);
  const unseenPostId = otherParticipant ? unseenPosts?.[otherParticipant.id] : undefined;
  const sendMessage = useSendMessage(conversationId!);
  const sendVoiceNote = useSendVoiceNote(conversationId!);
  const deleteMessage = useDeleteMessage(conversationId!);
  const bulkDeleteMessages = useBulkDeleteMessages(conversationId!);
  const bulkSetHidden = useBulkSetMessagesHidden(conversationId!);
  const markConversationRead = useMarkConversationRead(conversationId!);

  const messageIds = useMemo(() => messages?.map((m) => m.id) ?? [], [messages]);
  const { data: reactionsByMessage } = useConversationReactions(conversationId!, messageIds);
  const { data: userStates } = useMessageUserStates(conversationId!, messageIds);
  const setReaction = useSetReaction(conversationId!);
  const removeReaction = useRemoveReaction(conversationId!);
  const toggleStar = useToggleMessageState(conversationId!, "starred_at");
  const togglePin = useToggleMessageState(conversationId!, "pinned_at");
  const toggleHidden = useToggleMessageState(conversationId!, "hidden_at");
  const topEmojis = useUserTopEmojis();
  const trackEmojiUsage = useTrackEmojiUsage();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { viewportHeight, lastKnownHeight } = useKeyboardInset();

  // Brief inline banner for async failures (delete/star/pin/react/…)
  // that would otherwise fail silently — see flashError below.
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const errorBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashError = useCallback((message: string) => {
    setErrorBanner(message);
    if (errorBannerTimer.current) clearTimeout(errorBannerTimer.current);
    errorBannerTimer.current = setTimeout(() => setErrorBanner(null), 3500);
  }, []);
  useEffect(() => () => {
    if (errorBannerTimer.current) clearTimeout(errorBannerTimer.current);
  }, []);
  const onMutationError = useCallback(() => flashError("Something went wrong. Please try again."), [flashError]);

  // Per-message read_at stamping (drives ticks) — separate mechanism
  // from markConversationRead above, which drives the conversation-list
  // unread dot via conversation_participants.last_read_at.
  useMarkMessagesRead(conversationId!, messages);

  // Messages actually visible to THIS user — excludes anything they've
  // hidden or deleted-for-me (message_user_state), but keeps tombstones
  // (is_deleted, "deleted for everyone") since those still occupy a
  // slot in the thread for both participants. `messages` itself stays
  // unfiltered so reactionsByMessage/userStates can be keyed against
  // every fetched id, including the ones we're about to hide here.
  const visibleMessages = useMemo(() => {
    if (!messages) return messages;
    return messages.filter((m) => {
      const state = userStates?.[m.id];
      return !state?.hidden_at && !state?.deleted_for_me_at;
    });
  }, [messages, userStates]);

  // Prefilled from e.g. ProjectCard's "Message for access" — an
  // editable draft, not an auto-sent message, so a customised request
  // is still genuinely the visitor's own words. Consumed once via
  // history.replaceState so navigating back/forward through the
  // thread afterward doesn't keep re-offering it.
  const [content, setContent] = useState(
    () => (location.state as { draftMessage?: string } | null)?.draftMessage ?? ""
  );
  useEffect(() => {
    if (location.state && (location.state as { draftMessage?: string }).draftMessage) {
      window.history.replaceState({}, "");
    }
    // Only ever needs to run once, on mount — re-running on every
    // location.state change would fight with the user's own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Keeps the compose textarea's height in sync with `content` no
  // matter how it changed — typing, an emoji tapped in from
  // EmojiPickerSheet, the reply-draft prefill above, or clearing back
  // to "" the moment a message sends. An onChange-only resize would
  // miss every one of those except plain typing.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [content]);
  // Set right before calling loadOlder(), holding the scroll container's
  // height at that moment — the layout effect below uses it to keep the
  // viewport pinned to the same messages once the older page is
  // prepended, instead of the browser preserving raw scrollTop (which
  // would visually jump the list down by however tall the newly-
  // prepended messages are).
  const prevScrollHeightRef = useRef<number | null>(null);
  // First render of a conversation should land on the last message
  // instantly — no visible scroll animation from the top. Only messages
  // that arrive afterward (a reply coming in, etc.) get a smooth scroll.
  const hasScrolledToBottomOnce = useRef(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);

  const [activeMessage, setActiveMessage] = useState<ActiveMessage | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<EmojiPickerTarget>(null);
  // Which message's own reaction is open for management (replace/
  // remove) — set by either the reaction bar under a bubble or the
  // long-press quick-react strip's "tap your own emoji again"; resolved
  // by the ReactionOptionsPopover rendered near the bottom.
  const [reactionPopover, setReactionPopover] = useState<ReactionPopoverTarget | null>(null);

  // --- Multi-select mode: reached via MessageActionMenu's "Select", or
  // by long-pressing straight past it in a future iteration. While
  // active, tapping a bubble toggles its checkbox instead of opening
  // the long-press menu or triggering swipe-to-reply. ---
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [forwardMessages, setForwardMessages] = useState<{ content: string }[] | null>(null);

  function enterSelectMode(id: string) {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }
  /** Tapping a second message while one is already highlighted (the
   *  long-press menu is open for it) jumps straight into a multi-select
   *  spanning both, instead of requiring "Select" from the overflow
   *  menu first — see MessageActionMenu's onTapMessage. */
  function enterMultiSelectFrom(idA: string, idB: string) {
    setSelectMode(true);
    setSelectedIds(new Set([idA, idB]));
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

  const selectedMessages = useMemo(
    () => visibleMessages?.filter((m) => selectedIds.has(m.id)) ?? [],
    [visibleMessages, selectedIds]
  );
  // "Delete for everyone" only makes sense when every selected message
  // is both the current user's own AND not already a tombstone.
  const selectionAllowsDeleteEveryone =
    selectedMessages.length > 0 && selectedMessages.every((m) => m.sender_id === user?.id && !m.is_deleted);
  const selectionHasForwardableContent = selectedMessages.some((m) => !m.is_deleted);

  function handleBulkDeletePress() {
    setDeleteTarget({ messageIds: [...selectedIds], allowEveryone: selectionAllowsDeleteEveryone });
  }
  function handleBulkHide() {
    bulkSetHidden.mutate([...selectedIds], { onSuccess: exitSelectMode, onError: onMutationError });
  }
  function handleBulkStar() {
    // Bulk star always turns ON (mixed starred/unstarred selections
    // would make a single bulk "toggle" ambiguous) — unstarring stays a
    // per-message action from the long-press menu.
    for (const id of selectedIds) {
      toggleStar.mutate({ messageId: id, active: true }, { onError: onMutationError });
    }
    exitSelectMode();
  }
  function handleBulkForward() {
    const content = selectedMessages.filter((m) => !m.is_deleted).map((m) => ({ content: m.content }));
    if (!content.length) return;
    setForwardMessages(content);
  }
  function handleBulkShare() {
    const text = selectedMessages
      .filter((m) => !m.is_deleted)
      .map((m) => (decodeVoiceNote(m.content) ? VOICE_NOTE_LABEL : m.content))
      .join("\n");
    if (!text) return;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  function handleDeleteConfirm(scope: DeleteScope) {
    if (!deleteTarget) return;
    if (deleteTarget.messageIds.length === 1) {
      deleteMessage.mutate({ messageId: deleteTarget.messageIds[0], scope }, { onError: onMutationError });
    } else {
      bulkDeleteMessages.mutate({ messageIds: deleteTarget.messageIds, scope }, { onError: onMutationError });
    }
    setDeleteTarget(null);
    exitSelectMode();
  }

  // The emoji tray (input mode) is an in-page overlay, not a route —
  // hardware/browser back should close it instead of falling through
  // to React Router and leaving the thread entirely. Uses the same
  // guarded push-one-entry-per-instance pattern as every other overlay
  // in the app (see useBackDismiss) instead of the bespoke version
  // this used to have: a bare "any popstate closes it" listener races
  // with fast emoji↔keyboard toggling — closing the tray fires an
  // async history.back() whose popstate can still be in flight when
  // the user reopens the tray a moment later, so it arrives late and
  // is wrongly attributed to the new, already-reopened instance,
  // slamming it shut again and forcing a second tap.
  useBackDismiss(() => setEmojiPickerTarget(null), emojiPickerTarget?.mode === "input");

  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressStart = useRef<Record<string, { x: number; y: number }>>({});

  // --- Swipe-to-reply state ---
  const [replyTarget, setReplyTarget] = useState<MessageWithSender | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const swipeTriggered = useRef<Record<string, boolean>>({});
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashHighlight = useCallback((id: string) => {
    setFlashMessageId(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashMessageId(null), 700);
  }, []);

  const startReply = useCallback(
    (m: MessageWithSender) => {
      setReplyTarget(m);
      flashHighlight(m.id);
      // Close the emoji panel if it's open so focusing the input below
      // doesn't fight it for the bottom of the screen.
      setEmojiPickerTarget((prev) => (prev?.mode === "input" ? null : prev));
      // Wait a frame so the reply banner has actually mounted (it
      // changes the composer's height) before focusing — focusing
      // first can race some mobile browsers' keyboard/layout settling.
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [flashHighlight]
  );

  const scrollToMessage = useCallback(
    (id: string) => {
      messageRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      flashHighlight(id);
    },
    [flashHighlight]
  );

  useEffect(() => {
    markConversationRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    // Switching to a different conversation should also land on its
    // bottom instantly, not carry over the "already scrolled once"
    // state from the previous thread.
    hasScrolledToBottomOnce.current = false;
  }, [conversationId]);

  // Land ready-to-type, like opening a native chat app — focus the
  // composer immediately so the OS keyboard is already up rather than
  // making the first tap be "dismiss nothing, then focus". This only
  // succeeds in bringing up the real keyboard because it runs right
  // off the tap that navigated here (mobile browsers still count that
  // as "user activation" for a few ticks); a focus() fired later,
  // detached from any tap, would just place the caret without
  // triggering the keyboard. Skipped whenever the composer itself
  // isn't the thing on screen, so it never steals focus from search.
  useEffect(() => {
    if (searchOpen || selectMode) return;
    inputRef.current?.focus();
  }, [conversationId, searchOpen, selectMode]);

  useEffect(() => {
    if (searchOpen) return; // don't fight the search-match scroll below
    if (!visibleMessages) return;
    // Loading older messages also changes `visibleMessages` — don't
    // yank the view back down to the bottom in that case; the layout
    // effect below is what keeps the viewport steady for that path.
    if (prevScrollHeightRef.current != null) return;
    bottomRef.current?.scrollIntoView({ behavior: hasScrolledToBottomOnce.current ? "smooth" : "auto" });
    hasScrolledToBottomOnce.current = true;
  }, [visibleMessages, searchOpen]);

  // Keeps the currently-visible messages pinned in place once an
  // older page loads and gets prepended above them — see
  // prevScrollHeightRef's comment above. Runs before paint so there's
  // no visible flash of the wrong scroll position.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && prevScrollHeightRef.current != null) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
    }
  }, [messages]);

  const handleLoadOlder = useCallback(() => {
    const el = listRef.current;
    if (el) prevScrollHeightRef.current = el.scrollHeight;
    loadOlder();
  }, [loadOlder]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (e.currentTarget.scrollTop < 120 && hasMore && !isLoadingOlder) {
        handleLoadOlder();
      }
    },
    [hasMore, isLoadingOlder, handleLoadOlder]
  );

  const matches = useMemo((): MessageWithSender[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !visibleMessages) return [];
    // Tombstones render as "This message was deleted", and voice notes
    // have no text content to match — both are excluded here so a
    // "match" always corresponds to something actually visible/searchable.
    return visibleMessages.filter(
      (m) => !m.is_deleted && !decodeVoiceNote(m.content) && m.content.toLowerCase().includes(q)
    );
  }, [visibleMessages, searchQuery]);

  useEffect(() => {
    setMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!matches.length) return;
    const current = matches[matchIndex];
    messageRefs.current[current.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [matchIndex, matches]);

  function goToPrevMatch() {
    if (!matches.length) return;
    setMatchIndex((i) => (i - 1 + matches.length) % matches.length);
  }
  function goToNextMatch() {
    if (!matches.length) return;
    setMatchIndex((i) => (i + 1) % matches.length);
  }
  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setMatchIndex(0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const text = content;
    const replyingTo = replyTarget;
    setContent("");
    setReplyTarget(null);
    try {
      await sendMessage.mutateAsync({
        content: text,
        replyToMessageId: replyingTo?.id ?? null,
        replyToSnippet: replyingTo
          ? { id: replyingTo.id, content: replyingTo.content, sender_id: replyingTo.sender_id, is_deleted: replyingTo.is_deleted }
          : null,
      });
    } catch {
      setContent(text); // restore on failure so the user doesn't lose what they typed
      setReplyTarget(replyingTo);
      flashError("Couldn't send that message. Please try again.");
    }
  }

  // --- Long press + swipe-to-reply (no gesture library — hand-rolled
  // pointer timers). Wrapped in useCallback with stable identities
  // (deps limited to `selectMode`/`startReply`, never `content`) so
  // they stay referentially stable across a composer keystroke — that
  // stability is what lets MessageBubble's React.memo actually skip
  // re-rendering messages when only the input text changed. ---
  const cancelLongPressTimer = useCallback((id: string) => {
    const timer = longPressTimers.current[id];
    if (timer) clearTimeout(timer);
    longPressTimers.current[id] = null;
  }, []);

  const handlePointerDown = useCallback(
    (m: MessageWithSender, e: ReactPointerEvent) => {
      if (selectMode) return; // tap-to-toggle takes over entirely in select mode
      // Pointer capture keeps move/up events targeted at this element
      // even if the finger drifts off it mid-gesture — without this, a
      // fast swipe can lose the pointer and the gesture silently
      // cancels.
      e.currentTarget.setPointerCapture(e.pointerId);
      longPressStart.current[m.id] = { x: e.clientX, y: e.clientY };
      swipeTriggered.current[m.id] = false;
      longPressTimers.current[m.id] = setTimeout(() => {
        const el = messageRefs.current[m.id];
        if (!el) return;
        if (navigator.vibrate) navigator.vibrate(15);
        setActiveMessage({ message: m, anchorRect: el.getBoundingClientRect() });
      }, 450);
    },
    [selectMode]
  );

  const handlePointerMove = useCallback(
    (m: MessageWithSender, e: ReactPointerEvent) => {
      if (selectMode) return;
      const start = longPressStart.current[m.id];
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      // Any real movement cancels the long-press timer, but keeps the
      // gesture "live" so we can still track it as a swipe.
      if (adx > 10 || ady > 10) cancelLongPressTimer(m.id);

      // Rightward, predominantly-horizontal drag = swipe-to-reply.
      // Doesn't apply to a tombstone — there's no content left to reply to.
      if (dx > 8 && adx > ady && !m.is_deleted) {
        e.preventDefault(); // stop the page from also trying to scroll/select text during the drag
        const display = dx <= SWIPE_MAX ? dx : SWIPE_MAX + (dx - SWIPE_MAX) * SWIPE_RESISTANCE;
        setActiveDragId(m.id);
        setDragOffsets((prev) => ({ ...prev, [m.id]: display }));

        if (dx > SWIPE_THRESHOLD && !swipeTriggered.current[m.id]) {
          swipeTriggered.current[m.id] = true;
          if (navigator.vibrate) navigator.vibrate(12);
          startReply(m);
        }
      }
    },
    [selectMode, startReply, cancelLongPressTimer]
  );

  /** Ends a gesture (pointer up/leave/cancel) — stops the long-press
   *  timer and springs any swipe offset back to 0. */
  const endGesture = useCallback(
    (id: string) => {
      cancelLongPressTimer(id);
      delete longPressStart.current[id];
      swipeTriggered.current[id] = false;
      setActiveDragId(null);
      setDragOffsets((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [cancelLongPressTimer]
  );

  const registerRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      messageRefs.current[id] = el;
    },
    []
  );

  /** Tap on a message row — toggles selection in select mode, or
   *  starts a multi-select spanning the currently-open long-press
   *  target and whatever was just tapped. Stable across keystrokes:
   *  only changes identity when selectMode/activeMessage themselves
   *  change. */
  const onRowClick = useCallback(
    (id: string) => {
      if (selectMode) {
        toggleSelected(id);
      } else if (activeMessage && activeMessage.message.id !== id) {
        setActiveMessage(null);
        enterMultiSelectFrom(activeMessage.message.id, id);
      }
    },
    [selectMode, activeMessage]
  );

  const onAddReaction = useCallback(
    (messageId: string, emoji: string) => {
      setReaction.mutate({ messageId, emoji }, { onError: onMutationError });
    },
    // Depends on `.mutate` itself (stable across renders in
    // TanStack Query v5), not the whole mutation object returned by
    // useSetReaction — that object IS a new reference every render,
    // which would otherwise make this callback (and therefore every
    // MessageBubble that receives it) re-identify on every keystroke.
    [setReaction.mutate, onMutationError]
  );

  const onRequestManageReaction = useCallback((messageId: string, anchorRect: DOMRect, emoji: string) => {
    setReactionPopover({ messageId, anchorRect, emoji });
  }, []);

  const currentMatchId = matches[matchIndex]?.id;

  // The keyboard opening/closing fires a visualViewport resize (the
  // h-dvh root container below handles the actual layout reflow) —
  // but the message list's own scroll position doesn't automatically
  // follow that reflow, so without this a message that was at the
  // bottom before the keyboard opened can end up sitting behind the
  // composer once it does. Prefers keeping whatever's currently
  // "highlighted" (an active reply target, a flashed message) in view
  // over always snapping to the very bottom, since replying to an
  // older message shouldn't yank the view away from it the moment the
  // keyboard appears.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function keepActiveMessageVisible() {
      requestAnimationFrame(() => {
        const targetId = flashMessageId ?? replyTarget?.id;
        const el = targetId ? messageRefs.current[targetId] : null;
        if (el) el.scrollIntoView({ block: "nearest" });
        else bottomRef.current?.scrollIntoView({ block: "end" });
      });
    }
    vv.addEventListener("resize", keepActiveMessageVisible);
    return () => vv.removeEventListener("resize", keepActiveMessageVisible);
  }, [flashMessageId, replyTarget]);

  const activeReactions = activeMessage ? reactionsByMessage?.[activeMessage.message.id] ?? [] : [];
  const activeMyReaction = activeMessage
    ? activeReactions.find((r) => r.user_id === user?.id)?.emoji ?? null
    : null;
  const activeState = activeMessage ? userStates?.[activeMessage.message.id] : undefined;

  // --- Voice note recording (compose bar) ---
  // Full press-hold-record / slide-to-cancel / slide-up-to-lock /
  // preview-before-send lifecycle lives in this hook — see
  // useVoiceRecorder.ts for the gesture and MediaRecorder details.
  const voiceRecorder = useVoiceRecorder(async (blob, durationSec, peaks) => {
    const replyingTo = replyTarget;
    // Still a valid, playable blob URL at this point — useVoiceRecorder's
    // sendPreview only revokes it once this callback resolves. Passing it
    // through as `localUrl` lets the sent bubble appear instantly and
    // already be playable, instead of waiting on the storage upload.
    const localUrl = voiceRecorder.preview?.url;
    try {
      await sendVoiceNote.mutateAsync({
        blob,
        durationSec,
        peaks,
        replyToMessageId: replyingTo?.id ?? null,
        replyToSnippet: replyingTo
          ? { id: replyingTo.id, content: replyingTo.content, sender_id: replyingTo.sender_id, is_deleted: replyingTo.is_deleted }
          : null,
        localUrl,
      });
      setReplyTarget(null);
    } catch {
      flashError("Couldn't send the voice message. Please try again.");
      throw new Error("send failed"); // keeps the hook from clearing the preview it couldn't send
    }
  });

  return (
    <div
      className="h-dvh bg-canvas flex flex-col overflow-hidden"
      // h-dvh is the fallback for browsers without visualViewport;
      // this inline height is what actually keeps the layout glued to
      // the true visible area — see useKeyboardInset for why dvh alone
      // isn't enough once the keyboard is involved.
      style={{ height: viewportHeight }}
    >
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        {selectMode ? (
          <>
            <button onClick={exitSelectMode} className="text-ink-muted flex-shrink-0" aria-label="Cancel selection">
              <X size={22} />
            </button>
            <span className="flex-1 text-sm font-medium text-ink">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkStar}
              disabled={!selectedIds.size}
              className="text-ink-muted disabled:opacity-30 flex-shrink-0"
              aria-label="Star"
            >
              <Star size={19} />
            </button>
            <button
              onClick={handleBulkHide}
              disabled={!selectedIds.size}
              className="text-ink-muted disabled:opacity-30 flex-shrink-0"
              aria-label="Hide for me"
            >
              <EyeOff size={19} />
            </button>
            <button
              onClick={handleBulkForward}
              disabled={!selectionHasForwardableContent}
              className="text-ink-muted disabled:opacity-30 flex-shrink-0"
              aria-label="Forward"
            >
              <Forward size={19} />
            </button>
            <button
              onClick={handleBulkShare}
              disabled={!selectionHasForwardableContent}
              className="text-ink-muted disabled:opacity-30 flex-shrink-0"
              aria-label="Share outside app"
            >
              <Share2 size={19} />
            </button>
            <button
              onClick={handleBulkDeletePress}
              disabled={!selectedIds.size}
              className="text-danger disabled:opacity-30 flex-shrink-0"
              aria-label="Delete"
            >
              <Trash2 size={19} />
            </button>
          </>
        ) : searchOpen ? (
          <>
            <button onClick={closeSearch} className="text-ink-muted flex-shrink-0" aria-label="Close search">
              <ArrowLeft size={22} />
            </button>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation…"
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none text-sm"
            />
            {searchQuery && (
              <>
                <span className="text-xs text-ink-muted flex-shrink-0 tabular-nums">
                  {matches.length ? `${matchIndex + 1}/${matches.length}` : "0/0"}
                </span>
                <button
                  onClick={goToPrevMatch}
                  disabled={!matches.length}
                  className="text-ink-muted disabled:opacity-30 flex-shrink-0"
                  aria-label="Previous match"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={goToNextMatch}
                  disabled={!matches.length}
                  className="text-ink-muted disabled:opacity-30 flex-shrink-0"
                  aria-label="Next match"
                >
                  <ChevronDown size={18} />
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button onClick={() => navigate("/messages")} className="text-ink-muted flex-shrink-0" aria-label="Back">
              <ArrowLeft size={22} />
            </button>
            {teamPage && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/page/${teamPage.username}`)}
                  aria-label={`View ${teamPage.name}'s page`}
                  className="flex-shrink-0"
                >
                  <Avatar src={teamPage.avatar_url} name={teamPage.name} size="sm" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate flex items-center gap-1.5">
                    <span className="truncate">{teamPage.name}</span>
                    <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-surface border border-border text-[10px] font-medium text-ink-muted">
                      <Users size={10} />
                      Group
                    </span>
                  </p>
                  <p className="text-xs text-ink-muted">Team chat</p>
                </div>
              </>
            )}
            {otherParticipant && (
              <>
                {unseenPostId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/post/${unseenPostId}`)}
                    aria-label={`View ${otherParticipant.display_name}'s new post`}
                    className="flex-shrink-0 rounded-full p-[2.5px] bg-accent shadow-[0_0_6px_rgba(var(--accent-rgb),0.45)]"
                  >
                    <span className="block rounded-full bg-canvas p-[2px]">
                      <Avatar src={otherParticipant.avatar_url} name={otherParticipant.display_name} size="sm" />
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${otherParticipant.username}`)}
                    aria-label={`View ${otherParticipant.display_name}'s profile`}
                    className="flex-shrink-0"
                  >
                    <Avatar src={otherParticipant.avatar_url} name={otherParticipant.display_name} size="sm" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{otherParticipant.display_name}</p>
                  <p className="flex items-center gap-2 text-xs text-ink-muted">
                    <PresenceDot lastSeenAt={otherParticipant.last_seen_at} size={12} />
                    {formatLastSeen(otherParticipant.last_seen_at)}
                  </p>
                </div>
              </>
            )}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setHeaderMenuOpen((open) => !open)}
                className="text-ink-muted"
                aria-label="More options"
              >
                <MoreHorizontal size={20} />
              </button>
              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setHeaderMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-40 bg-surface border border-border rounded-xl shadow-lg py-1 min-w-[170px]">
                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setSearchOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink text-left"
                    >
                      <Search size={16} />
                      Search
                    </button>
                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        navigate(`/messages/${conversationId}/hidden`);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink text-left"
                    >
                      <EyeOff size={16} />
                      Hidden messages
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </header>

      {errorBanner && (
        <div className="px-4 py-2 max-w-xl mx-auto w-full text-xs text-danger bg-danger/10 border-b border-border text-center">
          {errorBanner}
        </div>
      )}

      {myParticipantState?.is_request && (
        <div className="flex items-center gap-2 px-4 py-2.5 max-w-xl mx-auto w-full text-sm text-ink-muted bg-accent-soft/60 border-b border-border">
          <Inbox size={15} className="text-accent flex-shrink-0" />
          <span>Message request — reply to move this to your inbox.</span>
        </div>
      )}

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <Wallpaper />
        <div ref={listRef} onScroll={handleListScroll} className="relative z-10 h-full overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !visibleMessages || visibleMessages.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Say hello.</p>
        ) : (
          <>
            {isLoadingOlder && <p className="text-ink-muted text-center py-2 text-xs">Loading earlier messages…</p>}
            {visibleMessages.map((m) => {
              const reactions = m.is_deleted ? [] : reactionsByMessage?.[m.id] ?? [];
              const myReaction = reactions.find((r) => r.user_id === user?.id)?.emoji ?? null;
              const isCurrentMatch = m.id === currentMatchId;
              const isFlashed = flashMessageId === m.id;

              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  currentUserId={user?.id}
                  otherParticipantName={otherParticipant?.display_name ?? "Them"}
                  reactions={reactions}
                  myReaction={myReaction}
                  isSelected={selectedIds.has(m.id)}
                  selectMode={selectMode}
                  isHighlighted={isCurrentMatch || isFlashed}
                  searchQuery={searchQuery}
                  dragOffset={dragOffsets[m.id] ?? 0}
                  isDraggingThis={activeDragId === m.id}
                  registerRef={registerRef}
                  onRowClick={onRowClick}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onEndGesture={endGesture}
                  onScrollToMessage={scrollToMessage}
                  onAddReaction={onAddReaction}
                  onRequestManageReaction={onRequestManageReaction}
                />
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      {myParticipantState?.left_at ? (
        // No longer an active member — the trigger on messages
        // (see team_group_chat_migration.sql, enforce_active_group_
        // participant) would reject a send from here anyway; this is
        // just the honest UI instead of letting them type into a
        // composer that's guaranteed to fail.
        <div className="sticky bottom-0 bg-canvas border-t border-border max-w-xl mx-auto w-full px-4 py-3 text-center text-sm text-ink-muted">
          You're no longer part of this chat.
        </div>
      ) : (
      <div className="sticky bottom-0 bg-canvas border-t border-border max-w-xl mx-auto w-full">
        {replyTarget && voiceRecorder.phase === "idle" && (
          <div className="flex items-start gap-2 px-4 pt-2.5">
            <div className="flex-1 min-w-0 border-l-2 border-accent pl-2 py-0.5">
              <p className="text-xs font-medium text-accent">
                Replying to {replyTarget.sender_id === user?.id ? "yourself" : otherParticipant?.display_name ?? "them"}
              </p>
              <p className="text-xs text-ink-muted truncate">
                {decodeVoiceNote(replyTarget.content) ? VOICE_NOTE_LABEL : replyTarget.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-ink-muted flex-shrink-0 p-1"
              aria-label="Cancel reply"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {voiceRecorder.phase === "recording" ? (
          <VoiceRecordingBar
            locked={voiceRecorder.locked}
            paused={voiceRecorder.paused}
            elapsedMs={voiceRecorder.elapsedMs}
            drag={voiceRecorder.drag}
            cancelThresholdPx={voiceRecorder.cancelThresholdPx}
            lockThresholdPx={voiceRecorder.lockThresholdPx}
            liveLevels={voiceRecorder.liveLevels}
            onCancel={voiceRecorder.cancelRecording}
            onTogglePause={voiceRecorder.togglePauseResume}
            onStop={voiceRecorder.stopToPreview}
          />
        ) : voiceRecorder.phase === "preview" && voiceRecorder.preview ? (
          <VoicePreviewBar
            url={voiceRecorder.preview.url}
            durationSec={voiceRecorder.preview.durationSec}
            peaks={voiceRecorder.preview.peaks}
            sending={voiceRecorder.sending}
            onDiscard={voiceRecorder.discardPreview}
            onSend={voiceRecorder.sendPreview}
          />
        ) : (
          <form onSubmit={handleSubmit} className="px-4 py-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const switchingToKeyboard = emojiPickerTarget?.mode === "input";
                setEmojiPickerTarget(switchingToKeyboard ? null : { mode: "input" });
                if (switchingToKeyboard) {
                  // Bring the real software keyboard straight back up —
                  // matches the feel of a native app's emoji/keyboard
                  // toggle instead of dropping the user with no keyboard
                  // and no focus.
                  requestAnimationFrame(() => inputRef.current?.focus());
                } else {
                  inputRef.current?.blur(); // stop the OS keyboard from fighting our panel for space
                }
              }}
              className="text-ink-muted flex-shrink-0"
              aria-label={emojiPickerTarget?.mode === "input" ? "Switch to keyboard" : "Add emoji"}
            >
              {emojiPickerTarget?.mode === "input" ? <Keyboard size={22} /> : <Smile size={22} />}
            </button>
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={1}
              placeholder="Message…"
              // No onKeyDown at all on purpose — a bare <textarea> never
              // submits its form on Enter (only <input> does that), so
              // Enter already just inserts a newline for free. Sending
              // only ever happens via the button below.
              className="flex-1 px-4 py-2.5 rounded-3xl border border-border bg-surface text-ink resize-none
                max-h-[120px] leading-snug
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            {content.trim() ? (
              <button
                type="submit"
                disabled={sendMessage.isPending}
                className="bg-accent text-white rounded-full p-2.5 transition-colors hover:bg-accent-hover active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex-shrink-0"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={voiceRecorder.micHandlers.onPointerDown}
                className="bg-accent text-white rounded-full p-2.5 transition-colors hover:bg-accent-hover active:scale-95 flex-shrink-0"
                style={{ touchAction: "none" }}
                aria-label="Hold to record a voice message"
              >
                <Mic size={18} />
              </button>
            )}
          </form>
        )}

        {emojiPickerTarget?.mode === "input" && (
          <EmojiPickerSheet
            mode="input"
            content={content}
            heightPx={lastKnownHeight}
            onBackspace={() => setContent((c) => removeLastGrapheme(c))}
            onSelect={(emoji) => {
              setContent((c) => c + emoji);
              trackEmojiUsage.mutate(emoji);
            }}
          />
        )}
      </div>
      )}

      {activeMessage && (
        <MessageActionMenu
          messageId={activeMessage.message.id}
          content={activeMessage.message.content}
          isMine={activeMessage.message.sender_id === user?.id}
          isDeleted={activeMessage.message.is_deleted}
          anchorRect={activeMessage.anchorRect}
          isStarred={!!activeState?.starred_at}
          isPinned={!!activeState?.pinned_at}
          emojis={topEmojis}
          myReaction={activeMyReaction}
          onReact={(emoji) => setReaction.mutate({ messageId: activeMessage.message.id, emoji }, { onError: onMutationError })}
          onRequestRemoveReaction={(anchorRect) =>
            activeMyReaction &&
            setReactionPopover({ messageId: activeMessage.message.id, anchorRect, emoji: activeMyReaction })
          }
          onOpenFullPicker={() => setEmojiPickerTarget({ mode: "reaction", messageId: activeMessage.message.id })}
          onCopy={() => navigator.clipboard.writeText(activeMessage.message.content)}
          onDeletePress={() =>
            setDeleteTarget({
              messageIds: [activeMessage.message.id],
              allowEveryone: activeMessage.message.sender_id === user?.id && !activeMessage.message.is_deleted,
            })
          }
          onShare={() => {
            if (navigator.share) {
              navigator.share({ text: activeMessage.message.content }).catch(() => {});
            } else {
              navigator.clipboard.writeText(activeMessage.message.content);
            }
          }}
          onForward={() => setForwardMessages([{ content: activeMessage.message.content }])}
          onReply={() => startReply(activeMessage.message)}
          onToggleStar={() =>
            toggleStar.mutate(
              { messageId: activeMessage.message.id, active: !activeState?.starred_at },
              { onError: onMutationError }
            )
          }
          onTogglePin={() =>
            togglePin.mutate(
              { messageId: activeMessage.message.id, active: !activeState?.pinned_at },
              { onError: onMutationError }
            )
          }
          onHide={() =>
            toggleHidden.mutate({ messageId: activeMessage.message.id, active: true }, { onError: onMutationError })
          }
          onSelect={() => enterSelectMode(activeMessage.message.id)}
          onClose={() => setActiveMessage(null)}
          onTapMessage={(tappedId) => {
            const anchorId = activeMessage.message.id;
            setActiveMessage(null);
            enterMultiSelectFrom(anchorId, tappedId);
          }}
        />
      )}

      {emojiPickerTarget?.mode === "reaction" && (
        <EmojiPickerSheet
          mode="reaction"
          onClose={() => setEmojiPickerTarget(null)}
          onSelect={(emoji) => {
            setReaction.mutate({ messageId: emojiPickerTarget.messageId, emoji }, { onError: onMutationError });
            setEmojiPickerTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteMessageSheet
          count={deleteTarget.messageIds.length}
          allowEveryone={deleteTarget.allowEveryone}
          onDelete={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {reactionPopover && (
        <ReactionOptionsPopover
          target={reactionPopover}
          quickEmojis={topEmojis}
          onReplace={(emoji) =>
            setReaction.mutate({ messageId: reactionPopover.messageId, emoji }, { onError: onMutationError })
          }
          onOpenFullPicker={() => setEmojiPickerTarget({ mode: "reaction", messageId: reactionPopover.messageId })}
          onRemove={() => removeReaction.mutate(reactionPopover.messageId, { onError: onMutationError })}
          onClose={() => setReactionPopover(null)}
        />
      )}

      {forwardMessages && (
        <ForwardMessageSheet
          messages={forwardMessages}
          onClose={() => setForwardMessages(null)}
          onSent={() => {
            setForwardMessages(null);
            exitSelectMode();
          }}
        />
      )}
    </div>
  );
}
