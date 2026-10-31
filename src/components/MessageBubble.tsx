// src/components/MessageBubble.tsx
import { memo, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Anchor, CircleCheck, GraduationCap, Lock, Megaphone, MessageCircleQuestionMark, Reply } from "lucide-react";
import { Avatar } from "./Avatar";
import { senderHue } from "../lib/senderColor";
import type { MessageWithSender } from "../hooks/useMessaging";
import type { MessageReaction } from "../hooks/useMessageReactions";
import { MessageStatusTicks } from "./MessageStatusTicks";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { decodeVoiceNote } from "../lib/voiceNotes";
import { useVoiceNotesEnabled } from "../hooks/useFeatureFlags";
import { decodeMedia } from "../lib/chatMedia";
import { MediaMessage } from "./MediaMessage";
import { MessagePreviewLine } from "./MessagePreviewLine";
import { getEmojiOnlyInfo, jumboEmojiSizeClass } from "../lib/emoji";
import { formatMessageDayLabel, formatMessageTime } from "../lib/messageTime";
import {
  MESSAGE_KIND_LABEL,
  isPrivateAnswer,
  isSharedAnswer,
  privateAudienceLabel,
  type MessageKind,
  type PrivateReplyContext,
} from "../lib/messageKinds";

const KIND_ICON = {
  question: MessageCircleQuestionMark,
  answer: CircleCheck,
  lecture: GraduationCap,
  announcement: Megaphone,
} as const satisfies Record<MessageKind, typeof Reply>;

// Swipe-to-reply tuning — mirrors WhatsApp's feel: the bubble tracks
// the finger 1:1 up to SWIPE_MAX, then resists further drag, and the
// reply fires the instant SWIPE_THRESHOLD is crossed (no need to
// release), snapping back immediately afterward. Exported so
// MessageThread's gesture handlers (which own the drag state) use the
// exact same thresholds as the bubble's own visuals.
export const SWIPE_THRESHOLD = 56;
export const SWIPE_MAX = 80;

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

/**
 * Everything a bubble needs to behave as one message in a GROUP thread: who sent it, whether it opens a run of
 * messages from the same person (name shown once, tail on the first bubble) or closes one (avatar shown once, on
 * the last), and how to turn any sender id into a name for reply quotes.
 */
export interface GroupBubbleInfo {
  senderName: string;
  senderUsername: string | null;
  senderAvatarUrl: string | null;
  /** First message of a run from this sender → carries the name and the bubble tail. */
  isFirstInRun: boolean;
  /** Last message of a run → carries the avatar. */
  isLastInRun: boolean;
  resolveName: (senderId: string) => string;
  onOpenProfile: (username: string) => void;
}

interface MessageBubbleProps {
  message: MessageWithSender;
  /** Present only in a group thread — switches on names, avatars, run grouping and group-safe ticks. */
  group?: GroupBubbleInfo;
  currentUserId: string | undefined;
  otherParticipantName: string;
  /** Avatar for the "not-mine" side of a voice-note bubble — the sender
   *  when the message isn't the current user's. Undefined (no `src`
   *  prop passed at all — see VoiceMessageBubble) skips the thumbnail
   *  entirely rather than rendering a blank/initials circle every
   *  voice note, since most conversations here are 1:1 and the header
   *  avatar already establishes who's on the other end; pass this only
   *  where the extra per-bubble identity actually helps (e.g. a group
   *  thread). */
  otherParticipantAvatarUrl?: string | null;
  /** Current user's own avatar — shown on their own sent voice-note
   *  bubbles, matching WhatsApp's per-bubble sender thumbnail. */
  myAvatarUrl?: string | null;
  myName?: string;
  reactions: MessageReaction[];
  myReaction: string | null;
  isSelected: boolean;
  selectMode: boolean;
  isHighlighted: boolean;
  searchQuery: string;
  dragOffset: number;
  isDraggingThis: boolean;
  /** DB-backed "already opened" state for a view-once voice note —
   *  read from message_user_state.opened_once_at (see useMessageUserStates),
   *  not a local flag. */
  voiceNoteOpenedAt?: string | null;
  /** Fires once, the moment a view-once voice note finishes playing —
   *  MessageThread wires this to useMarkVoiceNoteOpened. */
  onVoiceNoteOpened?: (messageId: string) => void;
  /** Play the entrance animation once for this bubble — set by
   *  MessageThread for a message it hasn't rendered before (a genuine
   *  new send/arrival), never for the initial page load or loadOlder()
   *  history. See ako-bubble-in-mine/-theirs in index.css. */
  animateIn: boolean;
  registerRef: (id: string) => (el: HTMLDivElement | null) => void;
  onRowClick: (id: string) => void;
  onPointerDown: (m: MessageWithSender, e: ReactPointerEvent) => void;
  onPointerMove: (m: MessageWithSender, e: ReactPointerEvent) => void;
  onEndGesture: (id: string) => void;
  onScrollToMessage: (id: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRequestManageReaction: (messageId: string, anchorRect: DOMRect, emoji: string) => void;
  /** A DM message sent with "Reply privately" quotes the group message it answers; tapping the quote opens that group. */
  onOpenPrivateReplySource?: (context: PrivateReplyContext) => void;
}

/**
 * One message row — everything the old MessageThread.tsx did inline
 * inside its `.map()`, unchanged in behavior, just extracted and
 * wrapped in React.memo. That memo is the actual point: this used to
 * re-render for EVERY message on EVERY keystroke in the composer,
 * because the composer's `content` state lived in the same component
 * that inline-rendered the whole (unvirtualized) message list. As long
 * as the props below stay referentially stable across a pure keystroke
 * (all callback props are useCallback'd in MessageThread), typing no
 * longer touches messages that haven't actually changed.
 */
function MessageBubbleImpl({
  message: m,
  group,
  currentUserId,
  otherParticipantName,
  otherParticipantAvatarUrl,
  myAvatarUrl,
  myName,
  reactions,
  myReaction,
  isSelected,
  selectMode,
  isHighlighted,
  searchQuery,
  dragOffset,
  isDraggingThis,
  voiceNoteOpenedAt,
  onVoiceNoteOpened,
  animateIn,
  registerRef,
  onRowClick,
  onPointerDown,
  onPointerMove,
  onEndGesture,
  onScrollToMessage,
  onAddReaction,
  onRequestManageReaction,
  onOpenPrivateReplySource,
}: MessageBubbleProps) {
  const voiceNotesEnabled = useVoiceNotesEnabled();
  const isMine = m.sender_id === currentUserId;
  const voiceNote = !m.is_deleted ? decodeVoiceNote(m.content) : null;
  // Voice notes switched off by an admin: the bubble silently isn’t there.
  if (voiceNote && !voiceNotesEnabled) return null;
  const offset = dragOffset;
  const repliedTo = m.reply_to?.[0];
  const media = !m.is_deleted ? decodeMedia(m.content) : null;
  const isPhoto = media?.items[0].kind === "image";
  const timeStr = formatMessageTime(m.created_at);

  // "Jumbo" emoji-only rendering (WhatsApp/iMessage behavior,
  // researched — see lib/emoji.ts): 1-3 emoji and nothing else gets
  // shown big with no bubble at all. Suppressed when replying to
  // something, since the reply-quote strip still needs an actual
  // bubble to sit inside.
  // Group structure (see lib/messageKinds.ts): a typed message always keeps its bubble so its label has somewhere to sit.
  const kind = !m.is_deleted ? m.message_kind ?? null : null;
  const KindIcon = kind ? KIND_ICON[kind] : null;
  const privateAnswer = !m.is_deleted && isPrivateAnswer(m);
  const sharedAnswer = !m.is_deleted && isSharedAnswer(m);
  const privateContext = !m.is_deleted ? m.private_reply_context ?? null : null;
  const askerName = m.private_to
    ? m.private_to === currentUserId
      ? "you"
      : group?.resolveName(m.private_to) ?? "the asker"
    : "the asker";
  const metaLabelClass = `relative mb-1 flex items-center gap-1 text-[11px] font-medium ${isMine ? "text-white/75" : "text-accent"}`;
  const emojiInfo =
    !m.is_deleted && !voiceNote && !media && !repliedTo && !kind && !privateContext
      ? getEmojiOnlyInfo(m.content)
      : { isEmojiOnly: false, count: 0 };
  const isJumboEmoji = emojiInfo.isEmojiOnly;
  // In a group only the first bubble of a run points at its sender; the rest are plain rounded cards.
  const tailClass = group && !group.isFirstInRun ? "" : isMine ? "bubble-tail-mine" : "bubble-tail-theirs";

  // A group message has many recipients, so the 1:1 delivered/read ticks would be misleading (one person reading
  // would turn them blue for everyone). A group shows a single "sent" tick instead.
  const ticks = isMine ? (
    group ? <MessageStatusTicks deliveredAt={null} readAt={null} size={14} /> : <MessageStatusTicks deliveredAt={m.delivered_at} readAt={m.read_at} size={14} />
  ) : null;

  const quoteName = (senderId: string) =>
    senderId === currentUserId ? "You" : group ? group.resolveName(senderId) : otherParticipantName;
  const bubbleSenderName = isMine ? myName ?? "You" : group ? group.senderName : otherParticipantName;
  const bubbleSenderAvatar = isMine ? myAvatarUrl : group ? group.senderAvatarUrl : otherParticipantAvatarUrl;
  const showSenderName = !!group && !isMine && group.isFirstInRun;
  const nameStyle = group ? ({ "--nh": senderHue(m.sender_id) } as CSSProperties) : undefined;
  const senderNameEl = showSenderName ? (
    <button
      type="button"
      // Stops the row's long-press / swipe handlers (and their pointer capture) from swallowing this tap.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (group?.senderUsername) group.onOpenProfile(group.senderUsername);
      }}
      style={nameStyle}
      className="sender-name relative mb-0.5 flex max-w-full items-center gap-1 text-left text-[13px] font-semibold leading-tight"
    >
      <span className="truncate">{group!.senderName}</span>
    </button>
  ) : null;

  return (
    <div
      className={`flex gap-2 -mx-2 px-2 py-0.5 ${
        group ? `items-end ${group.isFirstInRun ? "mt-2.5" : ""} mb-px` : "items-center mb-2"
      } ${animateIn ? (isMine ? "ako-bubble-in-mine" : "ako-bubble-in-theirs") : ""}`}
      onClick={() => onRowClick(m.id)}
    >
      {selectMode && (
        <span
          className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center self-center ${
            isSelected ? "bg-accent border-accent" : "border-border"
          }`}
        >
          {isSelected && <span className="w-2 h-2 rounded-full bg-canvas" />}
        </span>
      )}

      {/* Group threads: a 32px avatar column on the left of other people's messages. The avatar sits on the last
          bubble of a run (aligned to its bottom edge); earlier bubbles in the run keep the empty column so the
          whole run lines up. It lives OUTSIDE the gesture wrapper below so a tap on it is never captured as a
          swipe or long-press. */}
      {group && !isMine && (
        <div className="w-8 flex-shrink-0 self-end">
          {group.isLastInRun && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (group.senderUsername) group.onOpenProfile(group.senderUsername);
              }}
              aria-label={`View ${group.senderName}'s profile`}
              className="block rounded-full active:scale-95 transition-transform"
            >
              <Avatar src={group.senderAvatarUrl} name={group.senderName} size="sm" />
            </button>
          )}
        </div>
      )}

      {/* This wrapper is what makes the bubble's max-w-[78%] resolve
          sanely — it's a flex-1 item inside a row with a definite
          width, so it gets a real, definite width of its own for the
          percentage below to be measured against. Without flex-1
          here, this wrapper's width would itself be shrink-to-fit
          (sized off its own content), and a percentage max-width
          measured against a shrink-to-fit container is circular —
          which is what was collapsing short messages down to one
          character per line. */}
      <div
        className={`flex min-w-0 flex-1 ${isMine ? "justify-end" : "justify-start"}`}
        onPointerDown={(e) => onPointerDown(m, e)}
        onPointerMove={(e) => onPointerMove(m, e)}
        onPointerUp={() => onEndGesture(m.id)}
        onPointerLeave={() => onEndGesture(m.id)}
        onPointerCancel={() => onEndGesture(m.id)}
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitTouchCallout: "none", touchAction: "pan-y" }}
      >
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
            ref={registerRef(m.id)}
            data-message-id={m.id}
            className={`relative w-fit max-w-full whitespace-pre-wrap break-words select-none ${
              "text-[15px] leading-[1.4]"
            } ${
              isJumboEmoji
                ? "bg-transparent"
                : `${group ? "rounded-[18px]" : "rounded-2xl"} ${isPhoto ? "p-1" : group ? "px-3.5 py-2" : "px-3 py-2"} ${tailClass} ${kind === "announcement" && !isMine ? "ring-1 ring-accent/40" : ""} ${
                    isMine
                      ? `bg-bubble-mine text-white ${group ? "bubble-mine-elevate" : ""}`
                      : "bg-bubble-theirs text-ink bubble-elevate"
                  }`
            }`}
            style={{
              transform: `translateX(${offset}px)`,
              transition: isDraggingThis ? "none" : "transform 200ms ease-out, box-shadow 300ms, background-color 300ms",
            }}
          >
            {/* Pointer handlers live on the row wrapper above so the
                whole horizontal width of the row starts the gesture,
                not just this bubble's own hit-box (a short bubble left
                a lot of dead space next to it). Pointer capture is set
                there too — see handlePointerDown in MessageThread. */}
            {/* Highlight, whatever the reason, is a shape-matching
                overlay — never a ring/offset (which changes the
                bubble's own outline) and never a background change on
                anything outside the bubble. rounded-[inherit] means
                it always tracks whatever corner shape the bubble
                itself has, tail included. */}
            {(isHighlighted || isSelected) && (
              <div
                className={`absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300 ${
                  isSelected ? "bg-highlight/50" : "bg-accent/25"
                }`}
              />
            )}

            {!isJumboEmoji && senderNameEl}
            {kind && KindIcon && (
              <span className={`${metaLabelClass} font-semibold`}>
                <KindIcon size={12} /> {MESSAGE_KIND_LABEL[kind]}
              </span>
            )}
            {privateAnswer && (
              <span className={metaLabelClass}>
                <Lock size={11} />
                {privateAudienceLabel({ viewerId: currentUserId, senderId: m.sender_id, privateTo: m.private_to ?? null, askerName })}
              </span>
            )}
            {sharedAnswer && <span className={metaLabelClass}>Shared with the group by {askerName === "you" ? "you" : askerName}</span>}
            {m.anchored_at && !m.is_deleted && !isJumboEmoji && (
              <span
                className={`relative mb-1 flex items-center gap-1 text-[11px] font-medium ${
                  isMine ? "text-white/75" : "text-accent"
                }`}
              >
                <Anchor size={11} /> Anchored
              </span>
            )}

            {repliedTo && !m.is_deleted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onScrollToMessage(repliedTo.id);
                }}
                className={`relative block w-full text-left mb-1.5 pl-2 border-l-2 rounded-sm text-xs ${
                  isMine ? "border-white/50 text-white/80" : "border-accent/50 text-ink-muted"
                }`}
              >
                <span className="block font-medium">{quoteName(repliedTo.sender_id)}</span>
                {repliedTo.is_deleted ? (
                  <span className="block truncate">Original message deleted</span>
                ) : (
                  <MessagePreviewLine content={repliedTo.content} />
                )}
              </button>
            )}

            {privateContext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPrivateReplySource?.(privateContext);
                }}
                className={`relative block w-full text-left mb-1.5 pl-2 border-l-2 rounded-sm text-xs ${
                  isMine ? "border-white/50 text-white/80" : "border-accent/50 text-ink-muted"
                }`}
              >
                <span className="flex items-center gap-1 font-medium">
                  <Lock size={10} className="flex-shrink-0" />
                  <span className="truncate">
                    {privateContext.sender_id === currentUserId ? "Private reply to your message" : `Private reply to ${privateContext.sender_name}`} · {privateContext.group_title}
                  </span>
                </span>
                <span className="block truncate">{privateContext.preview}</span>
              </button>
            )}

            {m.is_deleted ? (
              // Only the tombstone wording is italic/faded — the sender name above it and the time stay normal, and
              // everyone's tombstone carries a time so a run of deleted bubbles lines up like any other run.
              <span className="relative block">
                <span className="italic opacity-70">This message was deleted</span>
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
            ) : media ? (
              <MediaMessage
                media={media}
                isMine={isMine}
                timeStr={timeStr}
                ticks={ticks}
                senderName={bubbleSenderName}
                sentLabel={`${formatMessageDayLabel(m.created_at)}, ${timeStr}`}
              />
            ) : voiceNote ? (
              <span className="relative block">
                <VoiceMessageBubble
                  url={voiceNote.url}
                  path={voiceNote.path}
                  durationSec={voiceNote.durationSec}
                  peaks={voiceNote.peaks}
                  isMine={isMine}
                  viewOnce={voiceNote.viewOnce}
                  openedOnceAt={voiceNoteOpenedAt}
                  onOpened={() => onVoiceNoteOpened?.(m.id)}
                  senderAvatarUrl={bubbleSenderAvatar}
                  senderName={bubbleSenderName}
                  footer={
                    <span className={`flex items-center gap-1 text-[11px] ${isMine ? "text-white/70" : "text-ink-muted"}`}>
                      {timeStr}
                      {ticks}
                    </span>
                  }
                />
              </span>
            ) : isJumboEmoji ? (
              <span className="relative flex flex-col items-end">
                {senderNameEl && <span className="self-start">{senderNameEl}</span>}
                <span className={jumboEmojiSizeClass(emojiInfo.count)}>{m.content.trim()}</span>
                <span className="flex items-center gap-1 mt-0.5 text-[11px] text-ink-muted">
                  {timeStr}
                  {ticks}
                </span>
              </span>
            ) : (
              // WhatsApp's own trick for a trailing inline timestamp:
              // an invisible copy of the time+ticks reserves room at
              // the end of the text flow (so wrapping accounts for
              // it, and short messages' bubbles grow to fit it on the
              // last line), while the real, visible one is pinned to
              // the bottom-right corner on top of it.
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
              onAdd={(emoji) => onAddReaction(m.id, emoji)}
              onRequestManage={(anchorRect, emoji) => onRequestManageReaction(m.id, anchorRect, emoji)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
