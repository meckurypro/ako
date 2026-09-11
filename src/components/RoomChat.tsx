// src/components/RoomChat.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Smile, Keyboard, Send, Lock, Mic } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useMessages, useSendMessage, useSendVoiceNote } from "../hooks/useMessaging";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { VoiceRecordingBar } from "./VoiceRecordingBar";
import { VoicePreviewBar } from "./VoicePreviewBar";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { EmojiPickerSheet } from "./EmojiPickerSheet";
import { Avatar } from "./Avatar";
import { decodeVoiceNote } from "../lib/voiceNotes";
import { useRoomMembersList } from "../hooks/useRoom";

// The Cohort's group chat — deliberately built on the exact same
// hooks/components a 1:1 DM uses (useMessages, useSendMessage,
// useSendVoiceNote, useVoiceRecorder, VoiceRecordingBar,
// VoicePreviewBar, VoiceMessageBubble, EmojiPickerSheet). None of
// them assume a 2-party conversation at the data layer — only
// MessageThread.tsx's header does, which is why this is a new,
// lighter component rather than reusing that whole page. A fix to
// the voice-note pipeline, emoji picker, or send flow made in either
// place is the same code running in both.
//
// Left out of this pass, as a deliberate scope cut: reply-to-message
// threading and message reactions. Both are real features in the DM
// thread that would need more UI here (long-press menus, reaction
// trays) than a first version of group chat needs to prove out.
interface RoomChatProps {
  conversationId: string;
  canPost: boolean;
  cantPostReason?: string;
}

interface RoomChatProps {
  projectId: string;
  conversationId: string;
  canPost: boolean;
  cantPostReason?: string;
}

export function RoomChat({ projectId, conversationId, canPost, cantPostReason }: RoomChatProps) {
  const { user } = useAuth();
  const { data: messages } = useMessages(conversationId);
  const { data: members } = useRoomMembersList(projectId);
  const sendMessage = useSendMessage(conversationId);
  const sendVoiceNote = useSendVoiceNote(conversationId);
  const [content, setContent] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const memberByUserId = useMemo(() => new Map((members ?? []).map((m) => [m.user_id, m.profile])), [members]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const voiceRecorder = useVoiceRecorder(async (blob, durationSec, peaks) => {
    await sendVoiceNote.mutateAsync({ blob, durationSec, peaks, replyToMessageId: null });
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    sendMessage.mutate(content.trim());
    setContent("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 px-1 py-2">
        {(messages ?? []).map((m) => {
          const isMine = m.sender_id === user?.id;
          const senderProfile = memberByUserId.get(m.sender_id);
          const voiceNote = decodeVoiceNote(m.content);
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
              {!isMine && <Avatar src={senderProfile?.avatar_url} name={senderProfile?.display_name ?? "Member"} size="sm" />}
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                {!isMine && (
                  <span className="text-xs text-ink-muted font-medium mb-0.5 px-1">
                    {senderProfile?.display_name ?? "Member"}
                  </span>
                )}
                {voiceNote ? (
                  <VoiceMessageBubble url={voiceNote.url} durationSec={voiceNote.durationSec} peaks={voiceNote.peaks} isMine={isMine} />
                ) : (
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm ${
                      isMine ? "bg-accent text-canvas rounded-br-md" : "bg-surface text-ink rounded-bl-md"
                    }`}
                  >
                    {m.is_deleted ? <span className="italic opacity-70">Message deleted</span> : m.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {(messages ?? []).length === 0 && <p className="text-center text-sm text-ink-muted mt-6">No messages yet — say hello.</p>}
        <div ref={bottomRef} />
      </div>

      {!canPost ? (
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-border text-sm text-ink-muted">
          <Lock size={14} /> {cantPostReason ?? "Chat is closed"}
        </div>
      ) : voiceRecorder.phase === "recording" ? (
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
        <>
          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                const closing = emojiOpen;
                setEmojiOpen(!closing);
                if (closing) requestAnimationFrame(() => inputRef.current?.focus());
                else inputRef.current?.blur();
              }}
              className="text-ink-muted flex-shrink-0"
              aria-label={emojiOpen ? "Switch to keyboard" : "Add emoji"}
            >
              {emojiOpen ? <Keyboard size={22} /> : <Smile size={22} />}
            </button>
            <input
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              placeholder="Message the group…"
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            {content.trim() ? (
              <button
                type="submit"
                disabled={sendMessage.isPending}
                className="bg-accent text-canvas rounded-full p-2.5 disabled:opacity-50 flex-shrink-0"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={voiceRecorder.micHandlers.onPointerDown}
                className="bg-accent text-canvas rounded-full p-2.5 flex-shrink-0"
                aria-label="Hold to record a voice note"
              >
                <Mic size={16} />
              </button>
            )}
          </form>
          {emojiOpen && (
            <EmojiPickerSheet mode="input" onSelect={(emoji) => setContent((c) => c + emoji)} />
          )}
        </>
      )}
    </div>
  );
}
