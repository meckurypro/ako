// src/pages/PageMessageThread.tsx
//
// Page-mode counterpart to MessageThread.tsx — text-only for v1, see
// the scope note at the top of usePageInbox.ts.
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import { usePageThread, useSendPageMessage, useMarkPageThreadRead } from "../hooks/usePageInbox";
import { BottomNav } from "../components/BottomNav";
import { dayKeyFor, formatMessageDayLabel } from "../lib/messageTime";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function PageMessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const smartBack = useSmartBack();
  const { data: messages, isLoading } = usePageThread(conversationId);
  const sendMessage = useSendPageMessage(conversationId);
  const markRead = useMarkPageThreadRead(conversationId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Same WhatsApp-style floating date badge as MessageThread.tsx —
  // see the longer comment there for the reasoning.
  const [stickyDayLabel, setStickyDayLabel] = useState<string | null>(null);
  const [stickyDayVisible, setStickyDayVisible] = useState(false);
  const stickyDayHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stickyDayHideTimer.current) clearTimeout(stickyDayHideTimer.current);
    };
  }, []);

  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const separators = el.querySelectorAll<HTMLElement>("[data-day-separator]");
    let currentLabel: string | null = null;
    for (const sep of separators) {
      if (sep.offsetTop <= el.scrollTop + 8) {
        currentLabel = sep.dataset.dayLabel ?? currentLabel;
      } else {
        break;
      }
    }
    if (currentLabel) {
      setStickyDayLabel(currentLabel);
      setStickyDayVisible(true);
      if (stickyDayHideTimer.current) clearTimeout(stickyDayHideTimer.current);
      stickyDayHideTimer.current = setTimeout(() => setStickyDayVisible(false), 1200);
    }
  }, []);

  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  function handleSend() {
    const content = draft.trim();
    if (!content) return;
    sendMessage.mutate(content);
    setDraft("");
  }

  return (
    <div className="min-h-screen bg-canvas pb-24 flex flex-col">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={smartBack} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-lg text-ink flex-1">Conversation</h2>
      </header>

      <div className="relative flex-1 min-h-0">
        <div
          className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300 ${
            stickyDayVisible && stickyDayLabel ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface/95 backdrop-blur-sm border border-border text-[11px] font-medium text-ink-muted shadow-sm">
            {stickyDayLabel}
          </span>
        </div>
        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="h-full max-w-xl w-full mx-auto px-4 pt-4 pb-2 overflow-y-auto"
        >
          {isLoading ? (
            <p className="text-ink-muted text-center py-10">Loading…</p>
          ) : !messages || messages.length === 0 ? (
            <p className="text-ink-muted text-center py-10 text-sm">Say hello.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(() => {
                let lastDayKey: string | null = null;
                return messages.map((m) => {
                  const dayKey = dayKeyFor(m.created_at);
                  const isNewDay = dayKey !== lastDayKey;
                  lastDayKey = dayKey;

                  return (
                    <Fragment key={m.id}>
                      {isNewDay && (
                        <div
                          className="flex justify-center py-2 self-stretch first:pt-0"
                          data-day-separator
                          data-day-label={formatMessageDayLabel(m.created_at)}
                        >
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface/90 border border-border text-[11px] font-medium text-ink-muted shadow-sm">
                            {formatMessageDayLabel(m.created_at)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender_type === "page"
                            ? "self-end bg-accent text-canvas"
                            : "self-start bg-surface text-ink border border-border"
                        }`}
                      >
                        <p>{m.content}</p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            m.sender_type === "page" ? "text-canvas/70" : "text-ink-muted"
                          }`}
                        >
                          {timeAgo(m.created_at)}
                        </p>
                      </div>
                    </Fragment>
                  );
                });
              })()}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-canvas border-t border-border px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message as your page…"
            className="flex-1 px-4 py-2.5 rounded-full border border-border bg-surface text-ink text-sm
              focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sendMessage.isPending}
            className="w-10 h-10 rounded-full bg-accent text-canvas flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
