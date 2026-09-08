// src/pages/MessageThread.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Search,
  ChevronUp,
  ChevronDown,
  Smile,
  Keyboard,
  Reply,
  X,
  MoreHorizontal,
  Inbox,
  Trash2,
  Forward,
  EyeOff,
  Star,
  Mic,
  Play,
  Pause,
  Square,
  Share2,
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
  type MessageReaction,
} from "../hooks/useMessageReactions";
import { Avatar } from "../components/Avatar";
import { useUnseenPosts } from "../hooks/useUnseenPosts";
import { MessageStatusTicks } from "../components/MessageStatusTicks";
import { PresenceDot } from "../components/PresenceDot";
import { MessageActionMenu } from "../components/MessageActionMenu";
import { DeleteMessageSheet } from "../components/DeleteMessageSheet";
import { ForwardMessageSheet } from "../components/ForwardMessageSheet";
import { VoiceMessageBubble } from "../components/VoiceMessageBubble";
import { EmojiPickerSheet, removeLastGrapheme } from "../components/EmojiPickerSheet";
import { formatLastSeen } from "../lib/presence";
import { decodeVoiceNote, VOICE_NOTE_LABEL, formatVoiceDuration } from "../lib/voiceNotes";
import { getEmojiOnlyInfo, jumboEmojiSizeClass } from "../lib/emoji";
import { formatMessageTime } from "../lib/messageTime";
import { ReactionOptionsPopover, type ReactionPopoverTarget } from "../components/ReactionOptionsPopover";

// Fetches the other participant's profile for the header — a small
// dedicated query since useConversations' list-summary shape isn't
// available when landing here directly (e.g. from a notification link).
function useOtherParticipant(conversationId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["other-participant", conversationId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(
          "profile:profiles!conversation_participants_user_id_fkey(id, username, display_name, avatar_url, last_seen_at)"
        )
        .eq("conversation_id", conversationId)
        .neq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.profile as
        | { id: string; username: string; display_name: string; avatar_url: string | null; last_seen_at: string | null }
        | undefined;
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 30_000, // keeps the header status dot from going stale on a long-open thread
  });
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps every case-insensitive occurrence of `query` in `text` with <mark>. */
function highlightMatches(text: string, query: string, isMine: boolean) {
  const q = query.trim();
  if (!q) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className={`rounded-sm ${isMine ? "bg-white/25 text-white" : "bg-accent-soft text-ink"}`}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Grouped reaction badges under a bubble — tap toggles the current
 * user's own reaction. Each unique emoji is a perfectly round chip
 * (fixed w/h, not a pill sized to its own padding) with a soft drop
 * shadow standing in for the old hard outline — background is always
 * the "other bubble" tone (bg-surface) regardless of which side the
 * message is on, so reactions stay legible sitting on either bubble
 * color and never compete with the accent green. A count above 1 rides
 * in a small separate badge overlapping the bottom-right of the circle
 * instead of being laid out inline next to the emoji, which is what
 * kept the old badge from ever actually being round. The user's own
 * reaction gets a subtle accent ring (still a ring, not a border-
 * outline swap, so the circle's silhouette never changes) — tapping it
 * again opens the replace/remove popover instead of removing
 * immediately.
 */
function ReactionsBar({
  reactions,
  myReaction,
  isMine,
  onAdd,
  onRequestManage,
}: {
  reactions: MessageReaction[];
  myReaction: string | null;
  isMine: boolean;
  onAdd: (emoji: string) => void;
  onRequestManage: (anchorRect: DOMRect, emoji: string) => void;
}) {
  if (!reactions.length) return null;
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);

  return (
    <div className={`flex flex-wrap gap-2 mt-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
      {[...counts.entries()].map(([emoji, count]) => {
        const isMineReaction = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={(e) =>
              isMineReaction ? onRequestManage(e.currentTarget.getBoundingClientRect(), emoji) : onAdd(emoji)
            }
            className={`relative w-8 h-8 flex-shrink-0 rounded-full bg-surface reaction-badge-shadow flex items-center justify-center transition-transform active:scale-90 ${
              isMineReaction ? "ring-2 ring-accent" : ""
            }`}
          >
            <span className="text-base leading-none">{emoji}</span>
            {count > 1 && (
              <span className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-ink-muted text-canvas text-[10px] font-semibold leading-4 text-center">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Chat wallpaper: shared <Wallpaper /> component (African motifs, same
// pattern used on auth screens) — sits fixed behind the message list only
// (header/composer stay solid `bg-canvas` for legibility), non-scrolling
// so it reads like a wallpaper rather than content.

// Swipe-to-reply tuning — mirrors WhatsApp's feel: the bubble tracks
// the finger 1:1 up to SWIPE_MAX, then resists further drag, and the
// reply fires the instant SWIPE_THRESHOLD is crossed (no need to
// release), snapping back immediately afterward.
const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 80;
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

/** Voice-note recorder state machine backing the compose bar. */
type RecorderState =
  | { phase: "idle" }
  | { phase: "recording"; elapsedMs: number; paused: boolean }
  | { phase: "preview"; blob: Blob; url: string; durationSec: number };

export function MessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId!);
  const { data: otherParticipant } = useOtherParticipant(conversationId!);
  const { data: myParticipantState } = useMyParticipantState(conversationId!);

  // Same ring-on-avatar treatment as ConversationList — checks just
  // this one participant for an unseen post from the last 24h.
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Brief inline banner for async failures (delete/star/pin/react/…)
  // that would otherwise fail silently — see flashError below.
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const errorBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function flashError(message: string) {
    setErrorBanner(message);
    if (errorBannerTimer.current) clearTimeout(errorBannerTimer.current);
    errorBannerTimer.current = setTimeout(() => setErrorBanner(null), 3500);
  }
  useEffect(() => () => {
    if (errorBannerTimer.current) clearTimeout(errorBannerTimer.current);
  }, []);
  const onMutationError = () => flashError("Something went wrong. Please try again.");

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
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
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

  // The emoji sheet is an in-page overlay, not a route — without this,
  // the hardware/browser back button falls through to React Router's
  // history and leaves the thread entirely instead of just closing the
  // sheet. Pushing a dummy entry while it's open means "back" consumes
  // that entry first.
  useEffect(() => {
    if (!emojiPickerTarget) return;
    window.history.pushState({ modal: "emoji" }, "");
    const handlePopState = () => setEmojiPickerTarget(null);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Only pop our own dummy entry if it's still there — if the user
      // closed this via the back button, popstate already consumed it,
      // and calling history.back() again here would eat a real entry.
      if (window.history.state?.modal === "emoji") {
        window.history.back();
      }
    };
  }, [emojiPickerTarget]);

  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressStart = useRef<Record<string, { x: number; y: number }>>({});

  // --- Swipe-to-reply state ---
  const [replyTarget, setReplyTarget] = useState<MessageWithSender | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const swipeTriggered = useRef<Record<string, boolean>>({});
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashHighlight(id: string) {
    setFlashMessageId(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashMessageId(null), 700);
  }

  function startReply(m: MessageWithSender) {
    setReplyTarget(m);
    flashHighlight(m.id);
    // Close the emoji panel if it's open so focusing the input below
    // doesn't fight it for the bottom of the screen.
    setEmojiPickerTarget((prev) => (prev?.mode === "input" ? null : prev));
    // Wait a frame so the reply banner has actually mounted (it changes
    // the composer's height) before focusing — focusing first can race
    // some mobile browsers' keyboard/layout settling.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function scrollToMessage(id: string) {
    messageRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    flashHighlight(id);
  }

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

  useEffect(() => {
    if (searchOpen) return; // don't fight the search-match scroll below
    if (!visibleMessages) return;
    bottomRef.current?.scrollIntoView({ behavior: hasScrolledToBottomOnce.current ? "smooth" : "auto" });
    hasScrolledToBottomOnce.current = true;
  }, [visibleMessages, searchOpen]);

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
      await sendMessage.mutateAsync({ content: text, replyToMessageId: replyingTo?.id ?? null });
    } catch {
      setContent(text); // restore on failure so the user doesn't lose what they typed
      setReplyTarget(replyingTo);
      flashError("Couldn't send that message. Please try again.");
    }
  }

  // --- Long press + swipe-to-reply (no gesture library — hand-rolled pointer timers) ---
  function handlePointerDown(m: MessageWithSender, e: React.PointerEvent) {
    if (selectMode) return; // tap-to-toggle takes over entirely in select mode
    // Pointer capture keeps move/up events targeted at this element even
    // if the finger drifts off it mid-gesture — without this, a fast
    // swipe can lose the pointer and the gesture silently cancels.
    e.currentTarget.setPointerCapture(e.pointerId);
    longPressStart.current[m.id] = { x: e.clientX, y: e.clientY };
    swipeTriggered.current[m.id] = false;
    longPressTimers.current[m.id] = setTimeout(() => {
      const el = messageRefs.current[m.id];
      if (!el) return;
      if (navigator.vibrate) navigator.vibrate(15);
      setActiveMessage({ message: m, anchorRect: el.getBoundingClientRect() });
    }, 450);
  }

  function cancelLongPressTimer(id: string) {
    const timer = longPressTimers.current[id];
    if (timer) clearTimeout(timer);
    longPressTimers.current[id] = null;
  }

  function handlePointerMove(m: MessageWithSender, e: React.PointerEvent) {
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
  }

  /** Ends a gesture (pointer up/leave/cancel) — stops the long-press
   *  timer and springs any swipe offset back to 0. */
  function endGesture(id: string) {
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
  }

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
  const [recorder, setRecorder] = useState<RecorderState>({ phase: "idle" });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentStartRef = useRef(0);
  const accumulatedMsRef = useRef(0);

  useEffect(
    () => () => {
      // Release the mic and stop the ticking timer if the thread unmounts
      // mid-recording (navigating away, etc.) — never leave the mic hot.
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.start();
      accumulatedMsRef.current = 0;
      segmentStartRef.current = Date.now();
      setRecorder({ phase: "recording", elapsedMs: 0, paused: false });
      recordingTimerRef.current = setInterval(() => {
        setRecorder((prev) =>
          prev.phase === "recording" && !prev.paused
            ? { ...prev, elapsedMs: accumulatedMsRef.current + (Date.now() - segmentStartRef.current) }
            : prev
        );
      }, 200);
    } catch {
      flashError("Couldn't access the microphone. Check your browser/site permissions.");
    }
  }

  function togglePauseResume() {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    setRecorder((prev) => {
      if (prev.phase !== "recording") return prev;
      if (prev.paused) {
        mr.resume();
        segmentStartRef.current = Date.now();
        return { ...prev, paused: false };
      }
      mr.pause();
      accumulatedMsRef.current += Date.now() - segmentStartRef.current;
      return { ...prev, paused: true, elapsedMs: accumulatedMsRef.current };
    });
  }

  function stopToPreview() {
    const mr = mediaRecorderRef.current;
    if (!mr || recorder.phase !== "recording") return;
    const finalElapsedMs = recorder.paused
      ? recorder.elapsedMs
      : accumulatedMsRef.current + (Date.now() - segmentStartRef.current);
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      setRecorder({ phase: "preview", blob, url, durationSec: Math.max(1, Math.round(finalElapsedMs / 1000)) });
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    };
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mr.stop();
  }

  function cancelRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null;
      mr.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    recordedChunksRef.current = [];
    setRecorder({ phase: "idle" });
  }

  function discardPreview() {
    if (recorder.phase === "preview") URL.revokeObjectURL(recorder.url);
    setRecorder({ phase: "idle" });
  }

  async function sendVoicePreview() {
    if (recorder.phase !== "preview") return;
    const { blob, durationSec, url } = recorder;
    const replyingTo = replyTarget;
    try {
      await sendVoiceNote.mutateAsync({ blob, durationSec, replyToMessageId: replyingTo?.id ?? null });
      URL.revokeObjectURL(url);
      setRecorder({ phase: "idle" });
      setReplyTarget(null);
    } catch {
      flashError("Couldn't send the voice message. Please try again.");
    }
  }

  return (
    <div className="h-dvh bg-canvas flex flex-col overflow-hidden">
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
        <div className="relative z-10 h-full overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !visibleMessages || visibleMessages.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Say hello.</p>
        ) : (
          visibleMessages.map((m) => {
            const isMine = m.sender_id === user?.id;
            const isCurrentMatch = m.id === currentMatchId;
            const reactions = m.is_deleted ? [] : reactionsByMessage?.[m.id] ?? [];
            const myReaction = reactions.find((r) => r.user_id === user?.id)?.emoji ?? null;
            const voiceNote = !m.is_deleted ? decodeVoiceNote(m.content) : null;

            const offset = dragOffsets[m.id] ?? 0;
            const isDraggingThis = activeDragId === m.id;
            const isFlashed = flashMessageId === m.id;
            const repliedTo = m.reply_to?.[0];
            const repliedToVoiceNote = repliedTo && !repliedTo.is_deleted ? decodeVoiceNote(repliedTo.content) : null;
            const isSelected = selectedIds.has(m.id);
            const isHighlighted = isCurrentMatch || isFlashed;
            const timeStr = formatMessageTime(m.created_at);

            // "Jumbo" emoji-only rendering (WhatsApp/iMessage behavior,
            // researched — see lib/emoji.ts): 1-3 emoji and nothing
            // else gets shown big with no bubble at all. Suppressed
            // when replying to something, since the reply-quote strip
            // still needs an actual bubble to sit inside.
            const emojiInfo =
              !m.is_deleted && !voiceNote && !repliedTo ? getEmojiOnlyInfo(m.content) : { isEmojiOnly: false, count: 0 };
            const isJumboEmoji = emojiInfo.isEmojiOnly;
            const tailClass = isMine ? "bubble-tail-mine" : "bubble-tail-theirs";

            const ticks = isMine ? (
              <MessageStatusTicks deliveredAt={m.delivered_at} readAt={m.read_at} size={14} />
            ) : null;

            return (
              <div
                key={m.id}
                className="flex items-center gap-2 mb-2 -mx-2 px-2 py-0.5"
                onClick={() => {
                  if (selectMode) {
                    toggleSelected(m.id);
                  } else if (activeMessage && activeMessage.message.id !== m.id) {
                    // A tap on a different message while one is already
                    // highlighted (the long-press menu open for it)
                    // starts a multi-select spanning both, instead of
                    // requiring "Select" from the overflow menu first.
                    setActiveMessage(null);
                    enterMultiSelectFrom(activeMessage.message.id, m.id);
                  }
                }}
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

                {/* This wrapper is what makes the bubble's max-w-[78%]
                    resolve sanely — it's a flex-1 item inside a row with
                    a definite width, so it gets a real, definite width
                    of its own for the percentage below to be measured
                    against. Without flex-1 here, this wrapper's width
                    would itself be shrink-to-fit (sized off its own
                    content), and a percentage max-width measured
                    against a shrink-to-fit container is circular —
                    which is what was collapsing short messages down to
                    one character per line. */}
                <div className={`flex min-w-0 flex-1 ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`relative flex flex-col max-w-[78%] ${isMine ? "items-end" : "items-start"}`}>
                    {/* Reply icon revealed in the gap uncovered by the swipe —
                        fades/scales in with drag progress, "locks" past threshold. */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft text-accent pointer-events-none"
                      style={{
                        opacity: Math.min(offset / SWIPE_THRESHOLD, 1),
                        transform: `translateY(-50%) scale(${offset >= SWIPE_THRESHOLD ? 1 : 0.7})`,
                        transition: isDraggingThis ? "none" : "opacity 150ms, transform 150ms",
                      }}
                    >
                      <Reply size={16} />
                    </div>

                    <div
                      ref={(el) => {
                        messageRefs.current[m.id] = el;
                      }}
                      data-message-id={m.id}
                      onPointerDown={(e) => handlePointerDown(m, e)}
                      onPointerMove={(e) => handlePointerMove(m, e)}
                      onPointerUp={() => endGesture(m.id)}
                      onPointerLeave={() => endGesture(m.id)}
                      onPointerCancel={() => endGesture(m.id)}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`relative w-fit max-w-full text-sm whitespace-pre-wrap break-words select-none ${
                        isJumboEmoji
                          ? "bg-transparent"
                          : `rounded-2xl px-3 py-2 ${tailClass} ${isMine ? "bg-accent text-white" : "bg-surface text-ink"}`
                      } ${m.is_deleted ? "italic opacity-70" : ""}`}
                      style={{
                        WebkitTouchCallout: "none",
                        touchAction: "pan-y",
                        transform: `translateX(${offset}px)`,
                        transition: isDraggingThis
                          ? "none"
                          : "transform 200ms ease-out, box-shadow 300ms, background-color 300ms",
                      }}
                    >
                      {/* Highlight, whatever the reason, is a shape-matching
                          overlay — never a ring/offset (which changes the
                          bubble's own outline) and never a background
                          change on anything outside the bubble. rounded-
                          [inherit] means it always tracks whatever corner
                          shape the bubble itself has, tail included. */}
                      {(isHighlighted || isSelected) && (
                        <div
                          className={`absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300 ${
                            isSelected ? "bg-highlight/50" : "bg-accent/25"
                          }`}
                        />
                      )}

                      {repliedTo && !m.is_deleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToMessage(repliedTo.id);
                          }}
                          className={`relative block w-full text-left mb-1.5 pl-2 border-l-2 rounded-sm text-xs ${
                            isMine ? "border-white/50 text-white/80" : "border-accent/50 text-ink-muted"
                          }`}
                        >
                          <span className="block font-medium">
                            {repliedTo.sender_id === user?.id ? "You" : otherParticipant?.display_name ?? "Them"}
                          </span>
                          <span className="block truncate">
                            {repliedTo.is_deleted
                              ? "Original message deleted"
                              : repliedToVoiceNote
                                ? VOICE_NOTE_LABEL
                                : repliedTo.content}
                          </span>
                        </button>
                      )}

                      {m.is_deleted ? (
                        <span className="relative block">
                          This message was deleted
                          {ticks && (
                            <span className="flex items-center gap-1 justify-end mt-1 text-[11px] not-italic opacity-100 text-ink-muted">
                              {timeStr}
                              {ticks}
                            </span>
                          )}
                        </span>
                      ) : voiceNote ? (
                        <span className="relative block">
                          <VoiceMessageBubble url={voiceNote.url} durationSec={voiceNote.durationSec} isMine={isMine} />
                          <span
                            className={`flex items-center gap-1 justify-end mt-1 text-[11px] ${isMine ? "text-white/70" : "text-ink-muted"}`}
                          >
                            {timeStr}
                            {ticks}
                          </span>
                        </span>
                      ) : isJumboEmoji ? (
                        <span className="relative flex flex-col items-end">
                          <span className={jumboEmojiSizeClass(emojiInfo.count)}>{m.content.trim()}</span>
                          <span className="flex items-center gap-1 mt-0.5 text-[11px] text-ink-muted">
                            {timeStr}
                            {ticks}
                          </span>
                        </span>
                      ) : (
                        // WhatsApp's own trick for a trailing inline
                        // timestamp: an invisible copy of the time+ticks
                        // reserves room at the end of the text flow (so
                        // wrapping accounts for it, and short messages'
                        // bubbles grow to fit it on the last line), while
                        // the real, visible one is pinned to the bottom-
                        // right corner on top of it.
                        <span className="relative block">
                          {searchQuery ? highlightMatches(m.content, searchQuery, isMine) : m.content}
                          <span className="invisible inline-flex items-center gap-1 text-[11px] ml-2 align-bottom">
                            {timeStr}
                            {ticks}
                          </span>
                          <span
                            className={`pointer-events-none absolute bottom-0 right-0 flex items-center gap-1 text-[11px] leading-none ${
                              isMine ? "text-white/70" : "text-ink-muted"
                            }`}
                          >
                            {timeStr}
                            {ticks}
                          </span>
                        </span>
                      )}
                    </div>
                    {!m.is_deleted && (
                      <ReactionsBar
                        reactions={reactions}
                        myReaction={myReaction}
                        isMine={isMine}
                        onAdd={(emoji) => setReaction.mutate({ messageId: m.id, emoji }, { onError: onMutationError })}
                        onRequestManage={(anchorRect, emoji) => setReactionPopover({ messageId: m.id, anchorRect, emoji })}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-canvas border-t border-border max-w-xl mx-auto w-full">
        {replyTarget && recorder.phase === "idle" && (
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

        {recorder.phase === "recording" ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              className="text-danger flex-shrink-0 p-1"
              aria-label="Cancel recording"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex-1 flex items-center gap-2 text-sm text-ink min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0 ${recorder.paused ? "" : "animate-pulse"}`} />
              <span className="tabular-nums">{formatVoiceDuration(recorder.elapsedMs / 1000)}</span>
              {recorder.paused && <span className="text-ink-muted text-xs">Paused</span>}
            </div>
            <button
              type="button"
              onClick={togglePauseResume}
              className="text-ink flex-shrink-0 p-2"
              aria-label={recorder.paused ? "Resume recording" : "Pause recording"}
            >
              {recorder.paused ? <Play size={20} /> : <Pause size={20} />}
            </button>
            <button
              type="button"
              onClick={stopToPreview}
              className="bg-accent text-white rounded-full p-2.5 flex-shrink-0"
              aria-label="Stop recording"
            >
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        ) : recorder.phase === "preview" ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={discardPreview}
              className="text-danger flex-shrink-0 p-1"
              aria-label="Discard recording"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex-1 min-w-0 bg-surface rounded-full px-3 py-1.5">
              <VoiceMessageBubble url={recorder.url} durationSec={recorder.durationSec} isMine={false} />
            </div>
            <button
              type="button"
              onClick={sendVoicePreview}
              disabled={sendVoiceNote.isPending}
              className="bg-accent text-white rounded-full p-2.5 flex-shrink-0 disabled:opacity-50"
              aria-label="Send voice message"
            >
              <Send size={18} />
            </button>
          </div>
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
            <input
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              placeholder="Message…"
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-surface text-ink
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
                onClick={startRecording}
                className="bg-accent text-white rounded-full p-2.5 transition-colors hover:bg-accent-hover active:scale-95 flex-shrink-0"
                aria-label="Record voice message"
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
            onBackspace={() => setContent((c) => removeLastGrapheme(c))}
            onSelect={(emoji) => {
              setContent((c) => c + emoji);
              trackEmojiUsage.mutate(emoji);
            }}
          />
        )}
      </div>

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
