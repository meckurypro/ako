// src/pages/MessageThread.tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
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
  Paperclip,
  Camera,
  Lock,
  Anchor,
  Info,
  Copy,
  ListFilter,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  useShareAnswer,
  useStartConversation,
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
  useMarkVoiceNoteOpened,
} from "../hooks/useMessageReactions";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useUnseenPosts } from "../hooks/useUnseenPosts";
import { PresenceDot } from "../components/PresenceDot";
import { MessageActionMenu } from "../components/MessageActionMenu";
import { DeleteMessageSheet } from "../components/DeleteMessageSheet";
import { ForwardMessageSheet } from "../components/ForwardMessageSheet";
import { VoiceRecordingBar } from "../components/VoiceRecordingBar";
import { AttachMenu } from "../components/AttachMenu";
import { MediaComposeModal } from "../components/MediaComposeModal";
import { MessagePreviewLine } from "../components/MessagePreviewLine";
import { useSendMedia } from "../hooks/useSendMedia";
import { MAX_ALBUM_ITEMS, MAX_MEDIA_BYTES, messagePlainText, messagePreview, type MediaKind } from "../lib/chatMedia";
import { VoicePreviewBar } from "../components/VoicePreviewBar";
import { EmojiPickerSheet, removeLastGrapheme } from "../components/EmojiPickerSheet";
import { formatLastSeen } from "../lib/presence";
import { dayKeyFor, formatMessageDayLabel } from "../lib/messageTime";
import { ReactionOptionsPopover, type ReactionPopoverTarget } from "../components/ReactionOptionsPopover";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useKeyboardInset } from "../hooks/useKeyboardInset";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { MessageBubble, SWIPE_THRESHOLD, SWIPE_MAX, type GroupBubbleInfo } from "../components/MessageBubble";
import { SendButton } from "../components/SendButton";
import { OptionsModal, type OptionItem } from "../components/OptionsModal";
import { useProfilesByIds, useRoomMemberEvents, useSetMessageAnchor, useSetMessagesAnchor, type RoomMemberEvent, type RoomPerson } from "../hooks/useRoom";
import { copyText, formatMessagesForCopy } from "../lib/chatCopy";
import { useToast } from "../components/Toast";
import { useFeatureFlag, useVoiceNotesEnabled } from "../hooks/useFeatureFlags";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { GroupKind } from "../lib/groups";
import {
  MESSAGE_KIND_LABEL,
  MESSAGE_KIND_PLURAL,
  composerKinds,
  isPrivateAnswer,
  type MessageKind,
  type MessageMeta,
  type PrivateReplyContext,
} from "../lib/messageKinds";

// Fetches header identity for the thread — a small dedicated query
// since useConversations' list-summary shape isn't available when
// landing here directly (e.g. from a notification link). Group
// conversations (a page's team chat — see
// team_group_chat_migration.sql) get their identity from the page
// itself, not a participant lookup: the old version here used
// .maybeSingle() on "every OTHER participant", which throws outright
// the moment a conversation has more than one (any group with 3+
// total members) — this branches before ever reaching that query.
/**
 * Turns this thread into a GROUP chat (a Group's conversation): a group header, per-sender names and avatars, run
 * grouping, host anchoring, and an options menu supplied by the Group page. Without it the thread is a 1:1 DM / page
 * team chat exactly as before.
 */
/** "Reply privately": the group message a DM is about to answer. Travels in router state from the group to the DM. */
interface PrivateReplyTarget {
  messageId: string;
  senderId: string;
  senderName: string;
  groupTitle: string;
  messageKind: MessageKind | null;
  preview: string;
}

/** Rule violations come back from the database with a readable message; anything else gets the caller's fallback. */
function sendErrorMessage(err: unknown, fallback: string): string {
  const e = err as { code?: string; message?: string } | null;
  return e && (e.code === "23514" || e.code === "42501") && e.message ? e.message : fallback;
}

export interface GroupThreadConfig {
  projectId: string;
  /** Cohort chats are typed (question / answer / lecture / announcement); a community's only typed message is an announcement. */
  roomKind: GroupKind;
  title: string;
  avatarUrl: string | null;
  people: RoomPerson[];
  isHost: boolean;
  canPost: boolean;
  cantPostReason?: string;
  onBack: () => void;
  onOpenInfo: () => void;
  /** Opens the A→Z members list directly (the member count in the header). */
  onOpenMembers: () => void;
  onOpenProfile: (username: string) => void;
  /** Rows under Search / Anchored in the ⋯ menu — the Group page's screens, ending with Leave. */
  menuItems: (OptionItem | "divider")[];
}

// A host-only chat badge: "Sharon Eze left" / "Sharon Eze was removed", centred like a day separator.
function LeaveBadge({ event }: { event: RoomMemberEvent }) {
  return (
    <div className="flex justify-center py-1.5">
      <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface/90 text-[12px] font-medium text-ink-muted">
        {`${event.display_name} ${event.kind === "left" ? "left" : "was removed"}`}
      </span>
    </div>
  );
}

function useConversationHeader(conversationId: string, enabled = true) {
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
          "profile:profiles!conversation_participants_user_id_fkey(id, username, display_name, avatar_url, last_seen_at, badge_visible)"
        )
        .eq("conversation_id", conversationId)
        .neq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;

      return {
        is_group: false as const,
        team_page: null,
        other_participant: data?.profile as
          | {
              id: string;
              username: string;
              display_name: string;
              avatar_url: string | null;
              last_seen_at: string | null;
              badge_visible: boolean;
            }
          | undefined,
      };
    },
    enabled: !!conversationId && !!user && enabled,
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

export function MessageThread({ conversationId: conversationIdProp, group }: { conversationId?: string; group?: GroupThreadConfig } = {}) {
  const params = useParams<{ conversationId: string }>();
  const conversationId = conversationIdProp ?? params.conversationId;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { data: messages, isLoading, hasMore, loadOlder, isLoadingOlder } = useMessages(conversationId!);
  const { data: header } = useConversationHeader(conversationId!, !group);
  const otherParticipant = header?.other_participant;
  const teamPage = header?.team_page;
  const { data: myParticipantState } = useMyParticipantState(conversationId!);
  const messagingEnabled = useFeatureFlag("messaging_enabled");
  const voiceNotesEnabled = useVoiceNotesEnabled();

  // Same ring-on-avatar treatment as ConversationList — checks just
  // this one participant for an unseen post from the last 24h. No
  // equivalent for a group thread (no single "the other person").
  const { data: unseenPosts } = useUnseenPosts(otherParticipant ? [otherParticipant.id] : []);
  const unseenPostId = otherParticipant ? unseenPosts?.[otherParticipant.id] : undefined;
  const sendMessage = useSendMessage(conversationId!);
  const sendVoiceNote = useSendVoiceNote(conversationId!);
  const sendMedia = useSendMedia(conversationId!);
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
  const markVoiceNoteOpened = useMarkVoiceNoteOpened(conversationId!);
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
  const toast = useToast();
  const shareAnswer = useShareAnswer(conversationId!);
  const startConversation = useStartConversation();
  const onMutationError = useCallback(() => flashError("Something went wrong. Please try again."), [flashError]);

  // Same brief-banner pattern as flashError above, but neutral styling
  // for a plain confirmation rather than a failure — used for the
  // "Voice message set to view once" toast when the sender flips the
  // preview bar's "1" toggle on (matches image 7 in the reference set).
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
  const infoBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashInfo = useCallback((message: string) => {
    setInfoBanner(message);
    if (infoBannerTimer.current) clearTimeout(infoBannerTimer.current);
    infoBannerTimer.current = setTimeout(() => setInfoBanner(null), 2200);
  }, []);
  useEffect(() => () => {
    if (infoBannerTimer.current) clearTimeout(infoBannerTimer.current);
  }, []);

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
  const [anchoredOnly, setAnchoredOnly] = useState(false);
  const [kindFilter, setKindFilter] = useState<MessageKind | null>(null);
  const visibleMessages = useMemo(() => {
    if (!messages) return messages;
    return messages.filter((m) => {
      const state = userStates?.[m.id];
      if (group && anchoredOnly && !(m.anchored_at && !m.is_deleted)) return false;
      if (group && kindFilter && (m.is_deleted || m.message_kind !== kindFilter)) return false;
      return !state?.hidden_at && !state?.deleted_for_me_at;
    });
  }, [messages, userStates, group, anchoredOnly, kindFilter]);

  // --- Group mode: who wrote what, and the host's "anchored only" filter. ---
  const setAnchor = useSetMessageAnchor(conversationId!);
  const setAnchorBulk = useSetMessagesAnchor(conversationId!);
  const unknownSenderIds = useMemo(() => {
    if (!group || !messages) return [];
    const known = new Set(group.people.map((p) => p.user_id));
    return [...new Set(messages.map((m) => m.sender_id).filter((id) => !known.has(id)))];
  }, [group, messages]);
  const { data: formerSenders } = useProfilesByIds(unknownSenderIds);
  const profileById = useMemo(() => {
    const map = new Map<string, { username: string | null; display_name: string; avatar_url: string | null; is_verified: boolean }>();
    for (const p of formerSenders ?? []) map.set(p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, is_verified: false });
    for (const p of group?.people ?? []) map.set(p.user_id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, is_verified: p.is_verified });
    return map;
  }, [group?.people, formerSenders]);
  const resolveName = useCallback(
    (id: string) => (id === user?.id ? "You" : profileById.get(id)?.display_name ?? "Former member"),
    [profileById, user?.id]
  );
  // Hosts (only) see a small centred badge where someone left — the group itself is never told.
  const { data: memberEvents } = useRoomMemberEvents(group?.projectId, !!group?.isHost);
  const anchoredCount = useMemo(() => (messages ?? []).filter((m) => m.anchored_at && !m.is_deleted).length, [messages]);

  // Flat, virtualizer-friendly list: one entry per message, each
  // carrying whether it starts a new day and that day's label. Day
  // separators used to be a sibling Fragment next to each bubble, but
  // the virtualizer needs exactly one measurable DOM node per index,
  // so a separator now rides along as part of its message's own row
  // (rendered above the bubble) instead of being a separate item.
  const items = useMemo(() => {
    if (!visibleMessages) return [];
    let lastDayKey: string | null = null;
    // A "run" is consecutive messages from one sender, on one day, within 10 minutes of each other — the unit a
    // group thread draws as one cluster (name on top, avatar at the bottom).
    const sameRun = (a?: MessageWithSender, b?: MessageWithSender) =>
      !!a && !!b && a.sender_id === b.sender_id && dayKeyFor(a.created_at) === dayKeyFor(b.created_at) &&
      Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 10 * 60_000;
    const events = group?.isHost ? memberEvents ?? [] : [];
    let eventIdx = 0;
    return visibleMessages.map((m, i, all) => {
      const dayKey = dayKeyFor(m.created_at);
      const showDaySeparator = dayKey !== lastDayKey;
      lastDayKey = dayKey;
      // Badges sit just above the first message that came after them; any after the last message trail it.
      const hostBadges: RoomMemberEvent[] = [];
      while (eventIdx < events.length && events[eventIdx].created_at <= m.created_at) hostBadges.push(events[eventIdx++]);
      const trailingBadges = i === all.length - 1 ? events.slice(eventIdx) : undefined;
      return {
        hostBadges: hostBadges.length ? hostBadges : undefined,
        trailingBadges: trailingBadges?.length ? trailingBadges : undefined,
        key: m.client_key ?? m.id,
        message: m,
        showDaySeparator,
        dayLabel: formatMessageDayLabel(m.created_at),
        isFirstInRun: showDaySeparator || !sameRun(all[i - 1], m),
        isLastInRun: !sameRun(m, all[i + 1]),
      };
    });
  }, [visibleMessages, memberEvents, group?.isHost]);

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, i) => map.set(item.message.id, i));
    return map;
  }, [items]);

  // Only messages within/near the viewport are ever mounted, however
  // long the conversation gets — see the render loop below (§14 of the
  // messaging audit: "avoid full-screen spinners... a single reaction/
  // playback tick must not rerender every message" applies just as much
  // to "every message must not sit in the DOM at once" for a long-running
  // thread). getItemKey keys the size-measurement cache by our own
  // stable per-message key rather than raw index, so prepending older
  // messages (which shifts every existing message's index) doesn't
  // register as every one of them "changing size" and force a
  // re-measure/flash.
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 68,
    overscan: 12,
    getItemKey: (index) => items[index]?.key ?? index,
  });

  const scrollToMessageIndex = useCallback(
    (id: string, align: "start" | "center" | "end" | "auto" = "center") => {
      const index = indexById.get(id);
      if (index == null) return; // not currently loaded (e.g. an un-paginated-in older message) — same silent no-op as before virtualization
      rowVirtualizer.scrollToIndex(index, { align, behavior: "smooth" });
    },
    [indexById, rowVirtualizer]
  );

  // Which messages get the bubble entrance animation (see MessageBubble's
  // `animateIn` / ako-bubble-in-* in index.css) — genuine new arrivals
  // only: a message just sent, or a realtime INSERT landing while the
  // thread is open. NOT the initial page load, and NOT loadOlder()
  // paging older history into view — both would otherwise replay the
  // animation for a whole screenful of already-read messages at once.
  // `hasLoadedRef` gates the very first population; after that, any key
  // not yet in `seenKeysRef` is new. Keyed by client_key (falling back
  // to id) rather than id alone so the optimistic-send → real-row swap
  // in useSendMessage — same message, new id — isn't mistaken for a
  // second arrival and double-animated.
  const hasLoadedRef = useRef(false);
  const seenKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    hasLoadedRef.current = false;
    seenKeysRef.current = new Set();
  }, [conversationId]);
  useEffect(() => {
    if (!visibleMessages) return;
    for (const m of visibleMessages) seenKeysRef.current.add(m.client_key ?? m.id);
    hasLoadedRef.current = true;
  }, [visibleMessages]);

  // Prefilled from e.g. ProjectCard's "Message for access" — an
  // editable draft, not an auto-sent message, so a customised request
  // is still genuinely the visitor's own words. Consumed once via
  // history.replaceState so navigating back/forward through the
  // thread afterward doesn't keep re-offering it.
  const [content, setContent] = useState(
    () => (location.state as { draftMessage?: string } | null)?.draftMessage ?? ""
  );
  // Arrived from a group's "Reply privately": the group message this DM answers. Cleared once a message goes out.
  const [privateReplyTarget, setPrivateReplyTarget] = useState<PrivateReplyTarget | null>(
    () => (group ? null : (location.state as { privateReply?: PrivateReplyTarget } | null)?.privateReply ?? null)
  );
  useEffect(() => {
    const state = location.state as { draftMessage?: string; privateReply?: PrivateReplyTarget } | null;
    if (state && (state.draftMessage || state.privateReply)) {
      window.history.replaceState({}, "");
    }
    // Only ever needs to run once, on mount — re-running on every
    // location.state change would fight with the user's own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const listRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Whether the viewport is close enough to the bottom that an
  // incoming message should auto-scroll into view. Updated on every
  // scroll tick (see handleListScroll) rather than derived from state,
  // since it needs to be read synchronously the instant a new message
  // arrives — a state value could still be one render behind.
  const isNearBottomRef = useRef(true);
  // WhatsApp-style "New messages" pill: a message arriving while the
  // user is scrolled up reading history shows this instead of
  // yanking the viewport down to it.
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);
  const lastSeenLastMessageIdRef = useRef<string | null>(null);

  // WhatsApp-style floating date badge — shows which day's messages are
  // currently scrolled to the top of the viewport, visible only while
  // actively scrolling and fading out shortly after it settles. Driven
  // off the same day-separator elements rendered inline in the list
  // (see data-day-separator below), rather than a duplicate date
  // computation, so the two can never disagree.
  const [stickyDayLabel, setStickyDayLabel] = useState<string | null>(null);
  const [stickyDayVisible, setStickyDayVisible] = useState(false);
  const stickyDayHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stickyDayHideTimer.current) clearTimeout(stickyDayHideTimer.current);
    };
  }, []);
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
  // Set right before calling loadOlder(), holding the id of whichever
  // message was topmost on screen at that moment — the layout effect
  // below re-anchors the virtualized list on that same message once
  // the older page is prepended (via the virtualizer's own
  // scrollToIndex, since indices of every already-loaded message shift
  // once older ones are inserted ahead of them), instead of the
  // browser preserving raw scrollTop, which would visually jump the
  // list down by however tall the newly-prepended messages are.
  const pendingOlderAnchorIdRef = useRef<string | null>(null);
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
  // Group hosts may also take down other people's messages for everyone.
  const selectionAllowsDeleteEveryone =
    selectedMessages.length > 0 && selectedMessages.every((m) => (m.sender_id === user?.id || !!group?.isHost) && !m.is_deleted);
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
  // Who a message is "from" in a copied transcript: real names, not "You" — the text leaves the app.
  function copyNameFor(senderId: string): string {
    if (senderId === user?.id) return profile?.display_name ?? "Me";
    if (group) return profileById.get(senderId)?.display_name ?? "Former member";
    return otherParticipant?.display_name ?? "Them";
  }
  async function handleBulkCopy() {
    const text = formatMessagesForCopy(selectedMessages, copyNameFor);
    if (!text) return;
    const ok = await copyText(text);
    toast(ok ? `Copied ${selectedMessages.filter((m) => !m.is_deleted).length} message${selectedMessages.filter((m) => !m.is_deleted).length === 1 ? "" : "s"}.` : "Couldn't copy.", { variant: ok ? "success" : "error" });
    if (ok) exitSelectMode();
  }
  // Host-only. If everything selected is already anchored this un-anchors them, otherwise it anchors the lot.
  function handleBulkAnchor() {
    const live = selectedMessages.filter((m) => !m.is_deleted);
    if (!live.length) return;
    const anchored = !live.every((m) => !!m.anchored_at);
    setAnchorBulk.mutate(
      { messageIds: live.map((m) => m.id), anchored },
      {
        onSuccess: () => {
          toast(anchored ? "Anchored. New members will always see these." : "Unanchored.", { variant: "success" });
          exitSelectMode();
        },
        onError: (err) => toast(err instanceof Error ? err.message : "Couldn't update the anchors.", { variant: "error" }),
      }
    );
  }
  function handleBulkShare() {
    const text = selectedMessages
      .filter((m) => !m.is_deleted)
      .map((m) => messagePlainText(m.content) || messagePreview(m.content).label)
      .filter(Boolean)
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
      scrollToMessageIndex(id, "center");
      flashHighlight(id);
    },
    [scrollToMessageIndex, flashHighlight]
  );

  // --- Group message types: what the composer is sending as (see lib/messageKinds.ts). The database enforces the
  // same rules; this is so the composer only offers what will be accepted. ---
  const composer = useMemo(() => (group ? composerKinds(group.roomKind, group.isHost) : null), [group?.roomKind, group?.isHost]);
  const [composeKind, setComposeKind] = useState<MessageKind | null>(composer?.defaultKind ?? null);
  const [composePrivate, setComposePrivate] = useState(false);
  // An answer needs a question to answer, and only an answer to someone else's question can be private.
  const answerTarget = replyTarget && replyTarget.message_kind === "question" && !replyTarget.is_deleted ? replyTarget : null;
  const canPrivate = !!answerTarget && answerTarget.sender_id !== user?.id;
  const answerNeedsQuestion = composeKind === "answer" && !answerTarget;
  useEffect(() => {
    if (composer && !composer.kinds.includes(composeKind)) setComposeKind(composer.defaultKind);
  }, [composer, composeKind]);
  // Replying to a question turns the composer into an answer; clearing the reply (or replying to anything else) undoes it.
  useEffect(() => {
    if (!composer || group?.roomKind !== "cohort") return;
    if (answerTarget) setComposeKind((k) => (k === "question" ? "answer" : k));
    else setComposeKind((k) => (k === "answer" ? composer.defaultKind : k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerTarget?.id]);
  useEffect(() => {
    if (composeKind !== "answer" || !canPrivate) setComposePrivate(false);
  }, [composeKind, canPrivate]);

  /** Everything about the next message the composer decides: its type, its audience, and a private-reply quote. */
  function currentMeta(): MessageMeta {
    const meta: MessageMeta = {};
    if (composer) {
      const isPrivate = composeKind === "answer" && composePrivate && canPrivate;
      meta.messageKind = composeKind;
      meta.visibility = isPrivate ? "private" : "public";
      meta.privateTo = isPrivate ? answerTarget?.sender_id ?? null : null;
    }
    if (privateReplyTarget) {
      meta.privateReplyToMessageId = privateReplyTarget.messageId;
      meta.privateReplyContext = {
        message_id: privateReplyTarget.messageId,
        conversation_id: "",
        project_id: null,
        group_title: privateReplyTarget.groupTitle,
        sender_id: privateReplyTarget.senderId,
        sender_name: privateReplyTarget.senderName,
        message_kind: privateReplyTarget.messageKind,
        preview: privateReplyTarget.preview,
      };
    }
    return meta;
  }
  /** After a send: broadcast types (announcement, lecture) never stay selected for the next message. */
  function resetComposer() {
    setComposePrivate(false);
    setPrivateReplyTarget(null);
    if (composer) setComposeKind(composer.defaultKind);
  }
  const [shareTarget, setShareTarget] = useState<MessageWithSender | null>(null);

  async function replyPrivately(m: MessageWithSender) {
    try {
      const dmId = await startConversation.mutateAsync(m.sender_id);
      const target: PrivateReplyTarget = {
        messageId: m.id,
        senderId: m.sender_id,
        senderName: resolveName(m.sender_id),
        groupTitle: group?.title ?? "",
        messageKind: m.message_kind ?? null,
        preview: messagePreview(m.content).label.slice(0, 140),
      };
      navigate(`/messages/${dmId}`, { state: { privateReply: target } });
    } catch {
      flashError("Couldn't open that chat. Please try again.");
    }
  }
  const onOpenPrivateReplySource = useCallback(
    (ctx: PrivateReplyContext) => {
      if (ctx.project_id) navigate(`/groups/${ctx.project_id}`);
    },
    [navigate]
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
    if (searchOpen || selectMode || group) return; // a group opens on its messages, not on the keyboard
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, searchOpen, selectMode]);

  // Landing on the bottom, staying there for genuinely new messages,
  // and NOT yanking the view for one while the user is reading history
  // are three different cases, all keyed off whichever message is now
  // last:
  //  - never scrolled yet (first paint of this conversation) → jump
  //    straight to the bottom, no animation.
  //  - the last message id changed (something new landed) and either
  //    it's the user's own send or they're already near the bottom →
  //    scroll to it smoothly.
  //  - otherwise (new arrival while scrolled up reading older
  //    messages) → leave the viewport alone and show the pill instead.
  useEffect(() => {
    if (searchOpen) return; // don't fight the search-match scroll below
    if (!visibleMessages || !visibleMessages.length) return;
    // Loading older messages also changes `visibleMessages` — the
    // layout effect below owns scroll position for that path.
    if (pendingOlderAnchorIdRef.current != null) return;

    const lastMessage = visibleMessages[visibleMessages.length - 1];

    if (!hasScrolledToBottomOnce.current) {
      rowVirtualizer.scrollToIndex(items.length - 1, { align: "end" });
      hasScrolledToBottomOnce.current = true;
      lastSeenLastMessageIdRef.current = lastMessage.id;
      return;
    }

    if (lastMessage.id === lastSeenLastMessageIdRef.current) return; // nothing new appended, e.g. just a reaction/read-state update
    lastSeenLastMessageIdRef.current = lastMessage.id;

    if (lastMessage.sender_id === user?.id || isNearBottomRef.current) {
      rowVirtualizer.scrollToIndex(items.length - 1, { align: "end", behavior: "smooth" });
      setShowNewMessagePill(false);
    } else {
      setShowNewMessagePill(true);
    }
  }, [visibleMessages, items.length, rowVirtualizer, searchOpen, user?.id]);

  // Re-anchors the virtualized list on whichever message was topmost
  // on screen right before loadOlder() was called — see
  // pendingOlderAnchorIdRef's comment above. Runs before paint so
  // there's no visible flash of the wrong scroll position.
  useLayoutEffect(() => {
    const anchorId = pendingOlderAnchorIdRef.current;
    if (anchorId == null) return;
    pendingOlderAnchorIdRef.current = null;
    const index = indexById.get(anchorId);
    if (index != null) rowVirtualizer.scrollToIndex(index, { align: "start" });
  }, [items, indexById, rowVirtualizer]);

  const handleLoadOlder = useCallback(() => {
    const topVisible = rowVirtualizer.getVirtualItems()[0];
    const topItem = topVisible ? items[topVisible.index] : undefined;
    pendingOlderAnchorIdRef.current = topItem?.message.id ?? null;
    loadOlder();
  }, [loadOlder, rowVirtualizer, items]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottomRef.current) setShowNewMessagePill(false);

      if (el.scrollTop < 120 && hasMore && !isLoadingOlder) {
        handleLoadOlder();
      }

      // Sticky floating date badge: whichever message is topmost in the
      // virtualized viewport carries its own day's label (see `items`
      // above), so this is a plain data lookup now rather than querying
      // the DOM for day-separator elements — which broke the moment a
      // separator scrolled far enough to be unmounted by the virtualizer.
      const topVisible = rowVirtualizer.getVirtualItems()[0];
      const currentLabel = topVisible ? items[topVisible.index]?.dayLabel ?? null : null;

      if (currentLabel) {
        setStickyDayLabel(currentLabel);
        setStickyDayVisible(true);
        if (stickyDayHideTimer.current) clearTimeout(stickyDayHideTimer.current);
        stickyDayHideTimer.current = setTimeout(() => setStickyDayVisible(false), 1200);
      }
    },
    [hasMore, isLoadingOlder, handleLoadOlder, rowVirtualizer, items]
  );

  const matches = useMemo((): MessageWithSender[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !visibleMessages) return [];
    // Tombstones render as "This message was deleted", and voice notes
    // have no text content to match — both are excluded here so a
    // "match" always corresponds to something actually visible/searchable.
    return visibleMessages.filter(
      (m) => !m.is_deleted && messagePlainText(m.content).toLowerCase().includes(q)
    );
  }, [visibleMessages, searchQuery]);

  useEffect(() => {
    setMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!matches.length) return;
    scrollToMessageIndex(matches[matchIndex].id, "center");
  }, [matchIndex, matches, scrollToMessageIndex]);

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
    if (answerNeedsQuestion) {
      flashError("Swipe right on a question to answer it.");
      return;
    }

    const text = content;
    const replyingTo = replyTarget;
    const meta = currentMeta();
    const before = { kind: composeKind, isPrivate: composePrivate, privateReply: privateReplyTarget };
    setContent("");
    setReplyTarget(null);
    resetComposer();
    try {
      await sendMessage.mutateAsync({
        content: text,
        replyToMessageId: replyingTo?.id ?? null,
        replyToSnippet: replyingTo
          ? { id: replyingTo.id, content: replyingTo.content, sender_id: replyingTo.sender_id, is_deleted: replyingTo.is_deleted }
          : null,
        ...meta,
      });
    } catch (err) {
      setContent(text); // restore on failure so the user doesn't lose what they typed
      setReplyTarget(replyingTo);
      setComposeKind(before.kind);
      setComposePrivate(before.isPrivate);
      setPrivateReplyTarget(before.privateReply);
      flashError(sendErrorMessage(err, "Couldn't send that message. Please try again."));
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
        if (targetId) scrollToMessageIndex(targetId, "auto"); // "auto" = only scroll if not already visible, matching the old block:"nearest"
        else if (items.length) rowVirtualizer.scrollToIndex(items.length - 1, { align: "end" });
      });
    }
    vv.addEventListener("resize", keepActiveMessageVisible);
    return () => vv.removeEventListener("resize", keepActiveMessageVisible);
  }, [flashMessageId, replyTarget, scrollToMessageIndex, items.length, rowVirtualizer]);

  const activeReactions = activeMessage ? reactionsByMessage?.[activeMessage.message.id] ?? [] : [];
  const activeMyReaction = activeMessage
    ? activeReactions.find((r) => r.user_id === user?.id)?.emoji ?? null
    : null;
  const activeState = activeMessage ? userStates?.[activeMessage.message.id] : undefined;

  // --- Voice note recording (compose bar) ---
  // Full press-hold-record / slide-to-cancel / slide-up-to-lock /
  // preview-before-send lifecycle lives in this hook — see
  // useVoiceRecorder.ts for the gesture and MediaRecorder details.
  const voiceRecorder = useVoiceRecorder(async (blob, durationSec, peaks, viewOnce, localUrl) => {
    const replyingTo = replyTarget;
    if (answerNeedsQuestion) {
      flashError("Swipe right on a question to answer it.");
      throw new Error("send failed"); // keeps the hook from clearing the preview it couldn't send
    }
    const meta = currentMeta();
    // Still a valid, playable blob URL at this point — useVoiceRecorder's
    // sendPreview only revokes it once this callback resolves. Passing it
    // through as `localUrl` lets the sent bubble appear instantly and
    // already be playable, instead of waiting on the storage upload.
    try {
      await sendVoiceNote.mutateAsync({
        blob,
        durationSec,
        peaks,
        viewOnce,
        replyToMessageId: replyingTo?.id ?? null,
        replyToSnippet: replyingTo
          ? { id: replyingTo.id, content: replyingTo.content, sender_id: replyingTo.sender_id, is_deleted: replyingTo.is_deleted }
          : null,
        localUrl,
        ...meta,
      });
      setReplyTarget(null);
      resetComposer();
    } catch (err) {
      flashError(sendErrorMessage(err, "Couldn't send the voice message. Please try again."));
      throw new Error("send failed"); // keeps the hook from clearing the preview it couldn't send
    }
  }, {
    // WhatsApp: release to send; slide up to lock for hands-free + draft preview.
    sendOnRelease: true,
    onTooShort: () => flashInfo("Hold to record, release to send"),
  });

  // ── attach: gallery · camera · document → preview with caption → send ──
  const [attachOpen, setAttachOpen] = useState(false);
  const [mediaDraft, setMediaDraft] = useState<{ kind: MediaKind; files: File[] } | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  useBackDismiss(() => setAttachOpen(false), attachOpen);

  function onFilesPicked(kind: MediaKind, list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, kind === "document" ? 1 : MAX_ALBUM_ITEMS);
    if (files.some((f) => f.size > MAX_MEDIA_BYTES)) {
      flashError("That file is larger than 25 MB.");
      return;
    }
    if (kind === "image" && files.some((f) => !f.type.startsWith("image/"))) {
      flashError("Only photos can be sent from the gallery.");
      return;
    }
    setMediaDraft({ kind, files });
  }

  function handleSendMedia(files: File[], caption: string, hd: boolean) {
    const draft = mediaDraft;
    if (!draft) return;
    if (answerNeedsQuestion) {
      flashError("Swipe right on a question to answer it.");
      return;
    }
    const replyingTo = replyTarget;
    const meta = currentMeta();
    setMediaDraft(null);
    setReplyTarget(null);
    resetComposer();
    sendMedia.mutate(
      {
        kind: draft.kind,
        files,
        caption,
        hd,
        replyToMessageId: replyingTo?.id ?? null,
        replyToSnippet: replyingTo
          ? { id: replyingTo.id, content: replyingTo.content, sender_id: replyingTo.sender_id, is_deleted: replyingTo.is_deleted }
          : null,
        ...meta,
      },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "";
          flashError(
            msg === "too_large"
              ? "That file is larger than 25 MB."
              : /bucket not found/i.test(msg)
                ? "Photo and file sharing isn't set up on the server yet."
                : sendErrorMessage(err, "Couldn't send that. Please try again.")
          );
        },
      }
    );
  }

  // Defensive layer matching ConversationList's own messaging_enabled
  // check — a conversation someone had open in a tab, or a deep link
  // to a specific thread, shouldn't stay usable once an admin flips
  // messaging off. Enforced server-side too (check_messaging_enabled
  // trigger on messages), so a blocked send would fail there even if
  // this check weren't here at all.
  if (!messagingEnabled) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <header className="px-4 pt-6 pb-3 flex items-center gap-3 sticky top-0 bg-canvas z-chrome border-b border-border">
          <button onClick={() => navigate("/messages")} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-lg text-ink">Chats</h2>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-ink-muted text-center">Messaging is temporarily unavailable. Check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh bg-canvas flex flex-col overflow-hidden"
      // h-dvh is the fallback for browsers without visualViewport;
      // this inline height is what actually keeps the layout glued to
      // the true visible area — see useKeyboardInset for why dvh alone
      // isn't enough once the keyboard is involved.
      style={{ height: viewportHeight }}
    >
      <header className="px-3 pb-2 sticky top-0 bg-canvas z-chrome border-b border-border flex items-center gap-3" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}>
        {selectMode ? (
          <>
            <button onClick={exitSelectMode} className="text-ink-muted flex-shrink-0" aria-label="Cancel selection">
              <X size={22} />
            </button>
            <span className="flex-1 text-sm font-medium text-ink">{selectedIds.size} selected</span>
            {group?.isHost && (
              <button
                onClick={handleBulkAnchor}
                disabled={!selectionHasForwardableContent || setAnchorBulk.isPending}
                className="text-ink-muted disabled:opacity-30 flex-shrink-0"
                aria-label="Anchor"
              >
                <Anchor size={19} />
              </button>
            )}
            <button
              onClick={() => void handleBulkCopy()}
              disabled={!selectionHasForwardableContent}
              className="text-ink-muted disabled:opacity-30 flex-shrink-0"
              aria-label="Copy"
            >
              <Copy size={19} />
            </button>
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
            <button onClick={() => (group ? group.onBack() : navigate("/messages"))} className="text-ink-muted flex-shrink-0" aria-label="Back">
              <ArrowLeft size={22} />
            </button>
            {group && (
              <div className="flex flex-1 min-w-0 items-center gap-3">
                <button type="button" onClick={group.onOpenInfo} className="flex-shrink-0" aria-label="Group info">
                  <Avatar src={group.avatarUrl} name={group.title} size="md" />
                </button>
                <div className="min-w-0 flex-1 text-left">
                  <button type="button" onClick={group.onOpenInfo} className="block max-w-full truncate text-left text-[18px] font-bold text-ink leading-tight" aria-label="Group info">
                    {group.title}
                  </button>
                  <button
                    type="button"
                    onClick={group.onOpenMembers}
                    className="flex items-center gap-1 text-[13px] font-semibold text-accent"
                    aria-label={`${group.people.length} members. View members`}
                  >
                    <Users size={14} />
                    {`${group.people.length} ${group.people.length === 1 ? "member" : "members"}`}
                  </button>
                </div>
              </div>
            )}
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
                    {teamPage.is_verified && <VerifiedBadge size={14} />}
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
                  <p className="font-medium text-ink truncate flex items-center gap-1.5">
                    <span className="truncate">{otherParticipant.display_name}</span>
                    {otherParticipant.badge_visible && <VerifiedBadge size={14} />}
                  </p>
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
              {headerMenuOpen && group && (
                <OptionsModal
                  title={group.title}
                  onClose={() => setHeaderMenuOpen(false)}
                  items={[
                    { key: "info", label: "Group info", icon: <Info />, onSelect: group.onOpenInfo },
                    { key: "search", label: "Search", icon: <Search />, onSelect: () => setSearchOpen(true) },
                    ...(anchoredCount > 0 || anchoredOnly
                      ? [
                          {
                            key: "anchored",
                            label: anchoredOnly ? "Show all messages" : `Anchored messages (${anchoredCount})`,
                            icon: <Anchor />,
                            onSelect: () => setAnchoredOnly((v) => !v),
                          } satisfies OptionItem,
                        ]
                      : []),
                    ...(kindFilter
                      ? [{ key: "kind-all", label: "Show all messages", icon: <ListFilter />, onSelect: () => setKindFilter(null) } satisfies OptionItem]
                      : (group.roomKind === "cohort" ? (["question", "answer", "lecture", "announcement"] as const) : (["announcement"] as const)).map(
                          (k) =>
                            ({
                              key: `kind-${k}`,
                              label: `Show only ${MESSAGE_KIND_PLURAL[k].toLowerCase()}`,
                              icon: <ListFilter />,
                              onSelect: () => setKindFilter(k),
                            }) satisfies OptionItem
                        )),
                    { key: "hidden", label: "Hidden messages", icon: <EyeOff />, onSelect: () => navigate(`/messages/${conversationId}/hidden`) },
                    "divider" as const,
                    ...group.menuItems,
                  ]}
                />
              )}
              {headerMenuOpen && !group && (
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

      {infoBanner && (
        <div className="px-4 py-2 max-w-xl mx-auto w-full text-xs text-ink-muted bg-surface border-b border-border text-center">
          {infoBanner}
        </div>
      )}

      {group && anchoredOnly && (
        <button
          type="button"
          onClick={() => setAnchoredOnly(false)}
          className="flex w-full items-center justify-center gap-1.5 border-b border-border bg-accent-soft/60 px-4 py-2 text-xs font-medium text-accent"
        >
          <Anchor size={13} /> Showing anchored messages · Tap to show all
        </button>
      )}

      {group && kindFilter && (
        <button
          type="button"
          onClick={() => setKindFilter(null)}
          className="flex w-full items-center justify-center gap-1.5 border-b border-border bg-accent-soft/60 px-4 py-2 text-xs font-medium text-accent"
        >
          <ListFilter size={13} /> Showing {MESSAGE_KIND_PLURAL[kindFilter].toLowerCase()} · Tap to show all
        </button>
      )}

      {myParticipantState?.is_request && (
        <div className="flex items-center gap-2 px-4 py-2.5 max-w-xl mx-auto w-full text-sm text-ink-muted bg-accent-soft/60 border-b border-border">
          <Inbox size={15} className="text-accent flex-shrink-0" />
          <span>Message request — reply to move this to your inbox.</span>
        </div>
      )}

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <Wallpaper />
        {/* Floating date badge: positioned against the viewport (outside
            the scrolling div below), so it stays put at the top while
            the content scrolls under it. Opacity-toggled rather than
            unmounted so the fade transition can play both ways. */}
        <div
          className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-subchrome transition-opacity duration-300 ${
            stickyDayVisible && stickyDayLabel ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface/95 backdrop-blur-sm border border-border text-[11px] font-medium text-ink-muted shadow-sm">
            {stickyDayLabel}
          </span>
        </div>
        {/* "New messages" pill — see the scroll-to-bottom effect above.
            Only ever shown while genuinely scrolled up; tapping it is
            the one thing that scrolls the list on its behalf. */}
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-subchrome transition-opacity duration-200 ${
            showNewMessagePill ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              rowVirtualizer.scrollToIndex(items.length - 1, { align: "end", behavior: "smooth" });
              setShowNewMessagePill(false);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cta text-white text-xs font-medium shadow-md"
          >
            New messages <ChevronDown size={14} />
          </button>
        </div>
        <div ref={listRef} onScroll={handleListScroll} className="relative z-10 h-full overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !visibleMessages || visibleMessages.length === 0 ? (
          group ? (
            <div className="mx-auto mt-10 flex max-w-[16rem] flex-col items-center gap-2 rounded-2xl bg-surface/90 px-5 py-6 text-center shadow-sm">
              <Avatar src={group.avatarUrl} name={group.title} size="xl" />
              <p className="font-display text-lg text-ink">{anchoredOnly ? "Nothing anchored yet" : kindFilter ? `No ${MESSAGE_KIND_PLURAL[kindFilter].toLowerCase()} yet` : group.title}</p>
              <p className="text-sm text-ink-muted">
                {anchoredOnly ? "Hosts can anchor a message from its long-press menu." : kindFilter ? "Tap to show all messages from the ⋯ menu." : "No messages yet. Say hello and start the conversation."}
              </p>
            </div>
          ) : (
            <p className="text-ink-muted text-center py-10 text-sm">Say hello.</p>
          )
        ) : (
          <>
            {isLoadingOlder && <p className="text-ink-muted text-center py-2 text-xs">Loading earlier messages…</p>}
            {/* Virtualized: only messages within/near the viewport are
               ever mounted, however long the conversation gets. Each
               row is absolutely positioned at its measured offset
               inside a spacer sized to the full (virtual) list height —
               the standard @tanstack/react-virtual dynamic-size
               pattern. A day separator rides along as part of its
               message's own row rather than a sibling Fragment, since
               the virtualizer needs exactly one measured element per
               index. */}
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = items[virtualRow.index];
                if (!item) return null;
                const m = item.message;
                const reactions = m.is_deleted ? [] : reactionsByMessage?.[m.id] ?? [];
                const myReaction = reactions.find((r) => r.user_id === user?.id)?.emoji ?? null;
                const isCurrentMatch = m.id === currentMatchId;
                const isFlashed = flashMessageId === m.id;
                const animateIn = hasLoadedRef.current && !seenKeysRef.current.has(item.key);

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {item.showDaySeparator && (
                      <div className={`flex justify-center ${virtualRow.index === 0 ? "pt-0 pb-2" : "py-2"}`}>
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface/90 border border-border text-[11px] font-medium text-ink-muted shadow-sm">
                          {item.dayLabel}
                        </span>
                      </div>
                    )}
                    {item.hostBadges?.map((e) => <LeaveBadge key={e.id} event={e} />)}
                    <MessageBubble
                      message={m}
                      group={
                        group
                          ? ({
                              senderName: resolveName(m.sender_id),
                              senderUsername: profileById.get(m.sender_id)?.username ?? null,
                              senderAvatarUrl: profileById.get(m.sender_id)?.avatar_url ?? null,
                              isFirstInRun: item.isFirstInRun,
                              isLastInRun: item.isLastInRun,
                              resolveName,
                              onOpenProfile: group.onOpenProfile,
                            } satisfies GroupBubbleInfo)
                          : undefined
                      }
                      currentUserId={user?.id}
                      otherParticipantName={otherParticipant?.display_name ?? "Them"}
                      otherParticipantAvatarUrl={otherParticipant?.avatar_url}
                      myAvatarUrl={profile?.avatar_url}
                      myName="You"
                      voiceNoteOpenedAt={userStates?.[m.id]?.opened_once_at}
                      onVoiceNoteOpened={(id) => markVoiceNoteOpened.mutate(id)}
                      reactions={reactions}
                      myReaction={myReaction}
                      isSelected={selectedIds.has(m.id)}
                      selectMode={selectMode}
                      isHighlighted={isCurrentMatch || isFlashed}
                      searchQuery={searchQuery}
                      dragOffset={dragOffsets[m.id] ?? 0}
                      isDraggingThis={activeDragId === m.id}
                      animateIn={animateIn}
                      registerRef={registerRef}
                      onRowClick={onRowClick}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onEndGesture={endGesture}
                      onScrollToMessage={scrollToMessage}
                      onAddReaction={onAddReaction}
                      onRequestManageReaction={onRequestManageReaction}
                      onOpenPrivateReplySource={onOpenPrivateReplySource}
                    />
                    {item.trailingBadges?.map((e) => <LeaveBadge key={e.id} event={e} />)}
                  </div>
                );
              })}
            </div>
          </>
        )}
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
      ) : group && !group.canPost ? (
        <div
          className="sticky bottom-0 z-30 mx-auto flex w-full max-w-xl items-center justify-center gap-2 border-t border-border bg-canvas px-4 py-3.5 text-sm text-ink-muted"
          style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Lock size={15} /> {group.cantPostReason ?? "Only hosts can send messages here."}
        </div>
      ) : (
      <div
        className="sticky bottom-0 z-30 bg-canvas border-t border-border max-w-xl mx-auto w-full relative"
        style={{ paddingBottom: emojiPickerTarget?.mode === "input" ? 0 : "env(safe-area-inset-bottom, 0px)" }}
      >
        {replyTarget && voiceRecorder.phase === "idle" && (
          <div className="flex items-start gap-2 px-4 pt-2.5">
            <div className="flex-1 min-w-0 border-l-2 border-accent pl-2 py-0.5">
              <p className="text-xs font-medium text-accent">
                Replying to {replyTarget.sender_id === user?.id ? "yourself" : group ? resolveName(replyTarget.sender_id) : otherParticipant?.display_name ?? "them"}
              </p>
              <MessagePreviewLine content={replyTarget.content} className="text-xs text-ink-muted" />
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

        {privateReplyTarget && voiceRecorder.phase === "idle" && (
          <div className="flex items-start gap-2 px-4 pt-2.5">
            <div className="flex-1 min-w-0 border-l-2 border-accent pl-2 py-0.5">
              <p className="flex items-center gap-1 text-xs font-medium text-accent">
                <Lock size={11} /> Replying privately to {privateReplyTarget.senderName} · {privateReplyTarget.groupTitle}
              </p>
              <p className="truncate text-xs text-ink-muted">{privateReplyTarget.preview}</p>
            </div>
            <button type="button" onClick={() => setPrivateReplyTarget(null)} className="text-ink-muted flex-shrink-0 p-1" aria-label="Cancel private reply">
              <X size={16} />
            </button>
          </div>
        )}

        {composer && voiceRecorder.phase === "idle" && (
          <div className="px-3 pt-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Message type">
              {composer.kinds.map((k) => (
                <button
                  key={k ?? "message"}
                  type="button"
                  role="radio"
                  aria-checked={composeKind === k}
                  onClick={() => setComposeKind(k)}
                  className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    composeKind === k ? "border-cta bg-cta text-white" : "border-border bg-surface text-ink-muted"
                  }`}
                >
                  {k ? MESSAGE_KIND_LABEL[k] : "Message"}
                </button>
              ))}
            </div>
            {answerNeedsQuestion && <p className="mt-1.5 text-xs text-ink-muted">Swipe right on a question to answer it.</p>}
            {composeKind === "answer" && canPrivate && answerTarget && (
              <button
                type="button"
                role="switch"
                aria-checked={composePrivate}
                onClick={() => setComposePrivate((v) => !v)}
                className={`mt-1.5 flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  composePrivate ? "bg-accent-soft text-accent" : "bg-surface text-ink-muted"
                }`}
              >
                <Lock size={12} className="flex-shrink-0" />
                <span className="truncate">
                  {composePrivate
                    ? `Private. Only ${resolveName(answerTarget.sender_id)} and instructors can see this`
                    : "Make this answer private"}
                </span>
              </button>
            )}
            {composeKind === "announcement" && <p className="mt-1.5 text-xs text-ink-muted">Everyone in the group is notified.</p>}
          </div>
        )}

        {/* This form — and specifically the mic button inside it — is
           now ALWAYS mounted, through "recording" and "preview" too,
           never swapped out for VoiceRecordingBar/VoicePreviewBar the
           way it used to be. That swap was the actual cause of every
           voice note recording for only ~1 second: the mic button is
           the pointerdown target for the whole hold-to-record gesture
           (see useVoiceRecorder), and removing that exact DOM node
           from the tree while the touch was still physically active on
           it made the browser fire pointercancel on it — read as "the
           gesture ended" almost the instant it began. Recording/preview
           now render as an opaque overlay ON TOP of this instead of
           replacing it, so the gesture's own target is never touched
           mid-hold. aria-hidden + pointer-events:none keep it out of
           the way (and out of the accessibility tree) once it's
           covered, without ever unmounting it. */}
        <form
          onSubmit={handleSubmit}
          className="px-3 py-2.5 flex items-end gap-2"
          aria-hidden={voiceRecorder.phase !== "idle"}
          style={voiceRecorder.phase !== "idle" ? { pointerEvents: "none" } : undefined}
        >
          {/* One rounded pill, like WhatsApp: emoji · message · attach · camera. */}
          <div className="flex-1 min-w-0 flex items-end rounded-3xl border border-border bg-surface pl-3 pr-1.5">
            <button
              type="button"
              onClick={() => {
                const switchingToKeyboard = emojiPickerTarget?.mode === "input";
                setEmojiPickerTarget(switchingToKeyboard ? null : { mode: "input" });
                if (switchingToKeyboard) {
                  // Bring the real software keyboard straight back up — matches the feel of a
                  // native app's emoji/keyboard toggle.
                  requestAnimationFrame(() => inputRef.current?.focus());
                } else {
                  inputRef.current?.blur(); // stop the OS keyboard from fighting our panel for space
                }
              }}
              className="text-ink-muted flex-shrink-0 pb-[11px] pr-2"
              aria-label={emojiPickerTarget?.mode === "input" ? "Switch to keyboard" : "Add emoji"}
            >
              {emojiPickerTarget?.mode === "input" ? <Keyboard size={23} /> : <Smile size={23} />}
            </button>
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={1}
              placeholder={
                composeKind === "question"
                  ? "Ask a question"
                  : composeKind === "answer"
                    ? "Write your answer"
                    : composeKind === "lecture"
                      ? "Post a lecture note"
                      : composeKind === "announcement"
                        ? "Write an announcement"
                        : group
                          ? "Message the group"
                          : "Message"
              }
              // No onKeyDown at all on purpose — a bare <textarea> never submits its form on
              // Enter (only <input> does that), so Enter already just inserts a newline for free.
              // Sending only ever happens via the button below.
              className="flex-1 min-w-0 bg-transparent py-2.5 text-ink placeholder:text-ink-muted resize-none max-h-[120px] leading-snug focus:outline-none"
            />
            <button type="button" onClick={() => setAttachOpen((v) => !v)} className="text-ink-muted flex-shrink-0 px-2 pb-[11px]" aria-label="Attach" aria-expanded={attachOpen}>
              <Paperclip size={22} />
            </button>
            {!content.trim() && (
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="text-ink-muted flex-shrink-0 px-2 pb-[11px]" aria-label="Take a photo">
                <Camera size={22} />
              </button>
            )}
          </div>
          {content.trim() || !voiceNotesEnabled ? (
            <SendButton disabled={sendMessage.isPending || !content.trim() || answerNeedsQuestion} />
          ) : (
            <button
              type="button"
              onPointerDown={voiceRecorder.micHandlers.onPointerDown}
              className="bg-cta text-white rounded-full w-11 h-11 flex items-center justify-center transition-colors hover:brightness-90 active:scale-95 flex-shrink-0"
              style={{ touchAction: "none" }}
              aria-label="Hold to record a voice message"
            >
              <Mic size={20} />
            </button>
          )}
          <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onFilesPicked("image", e.target.files); e.target.value = ""; }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFilesPicked("image", e.target.files); e.target.value = ""; }} />
          <input ref={documentInputRef} type="file" className="hidden" onChange={(e) => { onFilesPicked("document", e.target.files); e.target.value = ""; }} />
        </form>

        {attachOpen && (
          <AttachMenu
            onClose={() => setAttachOpen(false)}
            onGallery={() => galleryInputRef.current?.click()}
            onCamera={() => cameraInputRef.current?.click()}
            onDocument={() => documentInputRef.current?.click()}
          />
        )}

        {mediaDraft && (
          <MediaComposeModal kind={mediaDraft.kind} files={mediaDraft.files} onClose={() => setMediaDraft(null)} onSend={handleSendMedia} />
        )}

        {voiceRecorder.phase !== "idle" && (
          // Locked recording is a taller two-row panel that grows upward over the chat (WhatsApp);
          // every other state exactly covers the composer.
          <div className={voiceRecorder.phase === "recording" && voiceRecorder.locked ? "absolute inset-x-0 bottom-0" : "absolute inset-0 bg-canvas"}>
            {voiceRecorder.phase === "recording" && (
              <VoiceRecordingBar
                locked={voiceRecorder.locked}
                paused={voiceRecorder.paused}
                live={voiceRecorder.live}
                cancelThresholdPx={voiceRecorder.cancelThresholdPx}
                lockThresholdPx={voiceRecorder.lockThresholdPx}
                onCancel={voiceRecorder.cancelRecording}
                onTogglePause={voiceRecorder.togglePauseResume}
                onStop={voiceRecorder.stopToPreview}
                onSend={voiceRecorder.stopAndSend}
                onPreview={voiceRecorder.stopToPreview}
                onTogglePlayback={voiceRecorder.togglePausedPlayback}
                onSeekPlayback={voiceRecorder.seekPausedPlayback}
                playingPaused={voiceRecorder.playingPaused}
              />
            )}
            {voiceRecorder.phase === "preview" && voiceRecorder.preview && (
              <VoicePreviewBar
                url={voiceRecorder.preview.url}
                durationSec={voiceRecorder.preview.durationSec}
                peaks={voiceRecorder.preview.peaks}
                sending={voiceRecorder.sending}
                viewOnce={voiceRecorder.preview.viewOnce}
                onToggleViewOnce={() => {
                  const turningOn = !voiceRecorder.preview?.viewOnce;
                  voiceRecorder.toggleViewOnce();
                  if (turningOn) flashInfo("Voice message set to view once");
                }}
                onDiscard={voiceRecorder.discardPreview}
                onSend={voiceRecorder.sendPreview}
              />
            )}
          </div>
        )}

        {emojiPickerTarget?.mode === "input" && (
          <EmojiPickerSheet
            mode="input"
            content={content}
            heightPx={Math.max(260, Math.min(lastKnownHeight, Math.round(viewportHeight * 0.5)))}
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
          onCopy={() => navigator.clipboard.writeText(messagePlainText(activeMessage.message.content))}
          canModerate={!!group?.isHost}
          onDeletePress={() =>
            setDeleteTarget({
              messageIds: [activeMessage.message.id],
              allowEveryone: (activeMessage.message.sender_id === user?.id || !!group?.isHost) && !activeMessage.message.is_deleted,
            })
          }
          onShare={() => {
            const text = messagePlainText(activeMessage.message.content) || messagePreview(activeMessage.message.content).label;
            if (navigator.share) {
              navigator.share({ text }).catch(() => {});
            } else {
              navigator.clipboard.writeText(text);
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
          isAnchored={!!activeMessage.message.anchored_at}
          onReplyPrivately={group && activeMessage.message.sender_id !== user?.id ? () => void replyPrivately(activeMessage.message) : undefined}
          onShareWithGroup={
            group && isPrivateAnswer(activeMessage.message) && activeMessage.message.private_to === user?.id
              ? () => setShareTarget(activeMessage.message)
              : undefined
          }
          // A private answer is never anchored: anchoring shows a message to people who join later.
          onToggleAnchor={
            group?.isHost && !isPrivateAnswer(activeMessage.message)
              ? () =>
                  setAnchor.mutate(
                    { messageId: activeMessage.message.id, anchored: !activeMessage.message.anchored_at },
                    { onError: onMutationError }
                  )
              : undefined
          }
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

      {shareTarget && (
        <ConfirmDialog
          title="Share this answer with the group?"
          description="Everyone in the group will be able to read it. You can't make it private again."
          confirmLabel="Share"
          danger={false}
          themed
          onConfirm={() => {
            const id = shareTarget.id;
            setShareTarget(null);
            shareAnswer.mutate(id, {
              onSuccess: () => toast("Answer shared with the group.", { variant: "success" }),
              onError: (err) => toast(sendErrorMessage(err, "Couldn't share that answer."), { variant: "error" }),
            });
          }}
          onCancel={() => setShareTarget(null)}
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
