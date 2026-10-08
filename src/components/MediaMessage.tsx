// src/components/MediaMessage.tsx
// Photos, albums and documents inside a chat bubble, laid out like WhatsApp:
//  • one photo → edge-to-edge with the time + ticks on a dark pill in the corner
//  • 2–4+ photos → a grid (the 4th tile shows "+N" for anything beyond four)
//  • a caption sits under the media, with the time at its end like a text message
//  • documents → coloured type tile, file name, "PDF · 1.2 MB", download button
// Clicking a photo opens the full-screen viewer; clicking a document downloads it.
import { useState, type ReactNode } from "react";
import { ArrowDown, FileText, ImageOff, Loader2 } from "lucide-react";
import { albumLayout, documentStyle, formatFileSize, type MediaItem, type MediaPayload } from "../lib/chatMedia";
import { openChatFile } from "../lib/downloadChatFile";
import { useMediaUrl } from "../hooks/useMediaUrl";
import { ImageViewer } from "./ImageViewer";

interface MediaMessageProps {
  media: MediaPayload;
  isMine: boolean;
  timeStr: string;
  ticks: ReactNode;
  senderName: string;
  /** Pre-formatted "Today, 14:05"-style label for the viewer's top bar. */
  sentLabel: string;
}

const GRID_WIDTH = "min(264px, 66vw)";

function Tile({ item, style, overlay, onOpen }: { item: MediaItem; style: React.CSSProperties; overlay?: ReactNode; onOpen: () => void }) {
  const { url, failed, uploading } = useMediaUrl(item);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={`Open photo ${item.name}`}
      className="relative block overflow-hidden bg-ink-muted/15 flex-shrink-0"
      style={style}
    >
      {failed ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink-muted text-[11px]">
          <ImageOff size={22} />
          Photo unavailable
        </span>
      ) : url ? (
        <img src={url} alt="" loading="lazy" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center">
            <Loader2 size={20} className="animate-spin" />
          </span>
        </span>
      )}
      {overlay}
    </button>
  );
}

function PhotoGrid({ items, onOpen }: { items: MediaItem[]; onOpen: (i: number) => void }) {
  const { shown, extra } = albumLayout(items.length);
  const moreOverlay = (i: number) =>
    extra > 0 && i === shown - 1 ? (
      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-2xl font-semibold">+{extra + 1}</span>
    ) : undefined;
  const w = { width: GRID_WIDTH };

  if (items.length === 1) {
    const it = items[0];
    const ratio = it.width && it.height ? Math.min(1.4, Math.max(0.75, it.width / it.height)) : 1;
    return <Tile item={it} style={{ ...w, aspectRatio: String(ratio) }} onOpen={() => onOpen(0)} />;
  }
  if (shown === 2) {
    return (
      <div className="flex gap-0.5" style={{ ...w, aspectRatio: "1 / 0.62" }}>
        {[0, 1].map((i) => (
          <Tile key={i} item={items[i]} style={{ flex: 1, height: "100%" }} onOpen={() => onOpen(i)} />
        ))}
      </div>
    );
  }
  if (shown === 3) {
    return (
      <div className="flex gap-0.5" style={{ ...w, aspectRatio: "1" }}>
        <Tile item={items[0]} style={{ flex: 1, height: "100%" }} onOpen={() => onOpen(0)} />
        <div className="flex flex-col gap-0.5" style={{ flex: 1 }}>
          <Tile item={items[1]} style={{ flex: 1, width: "100%" }} onOpen={() => onOpen(1)} />
          <Tile item={items[2]} style={{ flex: 1, width: "100%" }} onOpen={() => onOpen(2)} />
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-0.5" style={{ ...w, aspectRatio: "1" }}>
      {[0, 1, 2, 3].map((i) => (
        <Tile key={i} item={items[i]} style={{ width: "100%", height: "100%" }} overlay={moreOverlay(i)} onOpen={() => onOpen(i)} />
      ))}
    </div>
  );
}

function DocumentCard({ item, isMine }: { item: MediaItem; isMine: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const style = documentStyle(item.name, item.mime);
  const uploading = !item.path;

  async function open(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy || uploading) return;
    setBusy(true);
    setError(false);
    try {
      await openChatFile(item);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void open(e)}
      aria-label={`Document ${item.name}`}
      className={`flex items-center gap-3 rounded-xl p-2 min-w-[220px] max-w-full text-left ${isMine ? "bg-black/10" : "bg-ink-muted/10"}`}
    >
      <span className="w-11 h-11 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: style.color }}>
        <FileText size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium break-words line-clamp-2 ${isMine ? "text-white" : "text-ink"}`}>{item.name}</span>
        <span className={`block text-[11px] ${error ? "text-danger" : isMine ? "text-white/70" : "text-ink-muted"}`}>
          {error ? "Couldn't open that file" : [style.label, formatFileSize(item.size)].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? "bg-white/20 text-white" : "bg-ink-muted/15 text-ink"}`}>
        {busy || uploading ? <Loader2 size={18} className="animate-spin" /> : <ArrowDown size={18} />}
      </span>
    </button>
  );
}

export function MediaMessage({ media, isMine, timeStr, ticks, senderName, sentLabel }: MediaMessageProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const first = media.items[0];
  const footerColor = isMine ? "text-white/70" : "text-ink-muted";

  const timeFooter = (
    <span className={`flex items-center gap-1 justify-end text-[11px] ${footerColor}`}>
      {timeStr}
      {ticks}
    </span>
  );

  if (first.kind === "document") {
    return (
      <span className="relative block">
        <DocumentCard item={first} isMine={isMine} />
        {media.caption && <span className="block mt-1.5 text-sm leading-5 whitespace-pre-wrap">{media.caption}</span>}
        <span className="block mt-1">{timeFooter}</span>
      </span>
    );
  }

  return (
    <span className="relative block">
      <span className="relative block overflow-hidden rounded-xl">
        <PhotoGrid items={media.items} onOpen={setViewerIndex} />
        {!media.caption && (
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">
            {timeStr}
            {ticks}
          </span>
        )}
      </span>
      {media.caption && (
        <span className="block px-1.5 pt-1.5 pb-0.5" style={{ width: GRID_WIDTH }}>
          <span className="block text-sm leading-5 whitespace-pre-wrap break-words">{media.caption}</span>
          <span className="block mt-0.5">{timeFooter}</span>
        </span>
      )}
      {viewerIndex !== null && (
        <ImageViewer
          items={media.items}
          initialIndex={viewerIndex}
          title={isMine ? "You" : senderName}
          subtitle={sentLabel}
          caption={media.caption}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </span>
  );
}
