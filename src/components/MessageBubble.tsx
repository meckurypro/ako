// src/components/MessageBubble.tsx
import { memo, type PointerEvent as ReactPointerEvent } from "react";
import { Reply } from "lucide-react";
import type { MessageWithSender } from "../hooks/useMessaging";
import type { MessageReaction } from "../hooks/useMessageReactions";
import { MessageStatusTicks } from "./MessageStatusTicks";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { decodeVoiceNote, VOICE_NOTE_LABEL } from "../lib/voiceNotes";
import { getEmojiOnlyInfo, jumboEmojiSizeClass } from "../lib/emoji";
import { formatMessageTime } from "../lib/messageTime";

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

interface MessageBubbleProps {
  message: MessageWithSender;
  currentUserId: string | undefined;
  otherParticipantName: string;
  reactions: MessageReaction[];
  myReaction: string | null;
  isSelected: boolean;
  selectMode: boolean;
  isHighlighted: boolean;
  searchQuery: string;
  dragOffset: number;
  isDraggingThis: boolean;
  registerRef: (id: string) => (el: HTMLDivElement | null) => void;
  onRowClick: (id: string) => void;
  onPointerDown: (m: MessageWithSender, e: ReactPointerEvent) => void;
  onPointerMove: (m: MessageWithSender, e: ReactPointerEvent) => void;
  onEndGesture: (id: string) => void;
  onScrollToMessage: (id: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRequestManageReaction: (messageId: string, anchorRect: DOMRect, emoji: string) => void;
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
  currentUserId,
  otherParticipantName,
  reactions,
  myReaction,
  isSelected,
  selectMode,
  isHighlighted,
  searchQuery,
  dragOffset,
  isDraggingThis,
  registerRef,
  onRowClick,
  onPointerDown,
  onPointerMove,
  onEndGesture,
  onScrollToMessage,
  onAddReaction,
  onRequestManageReaction,
}: MessageBubbleProps) {
  const isMine = m.sender_id === currentUserId;
  const voiceNote = !m.is_deleted ? decodeVoiceNote(m.content) : null;
  const offset = dragOffset;
  const repliedTo = m.reply_to?.[0];
  const repliedToVoiceNote = repliedTo && !repliedTo.is_deleted ? decodeVoiceNote(repliedTo.content) : null;
  const timeStr = formatMessageTime(m.created_at);

  // "Jumbo" emoji-only rendering (WhatsApp/iMessage behavior,
  // researched — see lib/emoji.ts): 1-3 emoji and nothing else gets
  // shown big with no bubble at all. Suppressed when replying to
  // something, since the reply-quote strip still needs an actual
  // bubble to sit inside.
  const emojiInfo =
    !m.is_deleted && !voiceNote && !repliedTo ? getEmojiOnlyInfo(m.content) : { isEmojiOnly: false, count: 0 };
  const isJumboEmoji = emojiInfo.isEmojiOnly;
  const tailClass = isMine ? "bubble-tail-mine" : "bubble-tail-theirs";

  const ticks = isMine ? <MessageStatusTicks deliveredAt={m.delivered_at} readAt={m.read_at} size={14} /> : null;

  return (
    <div className="flex items-center gap-2 mb-2 -mx-2 px-2 py-0.5" onClick={() => onRowClick(m.id)}>
      {selectMode && (
        <span
          className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
            isSelected ? "bg-accent border-accent" : "border-border"
          }`}
        >
          {isSelected && <span className="w-2 h-2 rounded-full bg-canvas" />}
        </span>
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
            ref={registerRef(m.id)}
            data-message-id={m.id}
            onPointerDown={(e) => onPointerDown(m, e)}
            onPointerMove={(e) => onPointerMove(m, e)}
            onPointerUp={() => onEndGesture(m.id)}
            onPointerLeave={() => onEndGesture(m.id)}
            onPointerCancel={() => onEndGesture(m.id)}
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
              transition: isDraggingThis ? "none" : "transform 200ms ease-out, box-shadow 300ms, background-color 300ms",
            }}
          >
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
                <span className="block font-medium">
                  {repliedTo.sender_id === currentUserId ? "You" : otherParticipantName}
                </span>
                <span className="block truncate">
                  {repliedTo.is_deleted ? "Original message deleted" : repliedToVoiceNote ? VOICE_NOTE_LABEL : repliedTo.content}
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
                <VoiceMessageBubble url={voiceNote.url} durationSec={voiceNote.durationSec} peaks={voiceNote.peaks} isMine={isMine} />
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
