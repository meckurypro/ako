// src/components/MediaMessage.tsx
// Photos, albums and documents inside a chat bubble, laid out like WhatsApp:
//  • one photo → edge-to-edge with the time + ticks on a dark pill in the corner
//  • 2–4+ photos → a grid (the 4th tile shows "+N" for anything beyond four)
//  • a caption sits under the media, with the time at its end like a text message
//  • documents → coloured type tile, file name, "PDF · 1.2 MB", download button
// Media you RECEIVE isn't pulled down until you click it (WhatsApp): the tile shows a "↓ size" button, the click
// downloads it with a progress ring (✕ to cancel) and keeps it on the device, and from then on it opens locally.
// Clicking a downloaded photo opens the full-screen viewer; clicking a document downloads (once) and saves it.
import { useState, type ReactNode } from "react";
import { ArrowDown, Check, FileText, Image as ImageIcon, ImageOff, Loader2, RotateCw } from "lucide-react";
import { albumLayout, documentStyle, formatFileSize, type MediaItem, type MediaPayload } from "../lib/chatMedia";
import { downloadChatMedia, useChatMediaDownload } from "../lib/chatMediaStore";
import { openChatFile } from "../lib/downloadChatFile";
import { useMediaUrl } from "../hooks/useMediaUrl";
import { DownloadPill, ProgressRing } from "./DownloadControl";
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

function Tile({
  item,
  style,
  overlay,
  onOpen,
  isMine,
  album,
}: {
  item: MediaItem;
  style: React.CSSProperties;
  overlay?: ReactNode;
  onOpen: () => void;
  isMine: boolean;
  /** Every item in this message — one click downloads the whole album, like WhatsApp. */
  album: MediaItem[];
}) {
  const dl = useChatMediaDownload(item);
  // Photos you received stay a placeholder until you click to download them; your own show straight away.
  const gated = !isMine && !!item.path && !dl.localUrl;
  const { url, failed, uploading } = useMediaUrl(item, { enabled: !gated && !dl.checking });
  const downloading = dl.status === "downloading";

  function download(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if (downloading || dl.checking) return;
    for (const it of album) if (it.path) void downloadChatMedia(it).catch(() => {});
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (gated) download(e);
        else onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (gated) download(e);
        else onOpen();
      }}
      aria-label={gated ? `Download photo ${item.name}` : `Open photo ${item.name}`}
      className="relative block overflow-hidden bg-ink-muted/15 flex-shrink-0 cursor-pointer"
      style={style}
    >
      {gated ? (
        <span className="absolute inset-0 flex items-center justify-center text-ink-muted/40">
          <ImageIcon size={44} />
        </span>
      ) : failed ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink-muted text-[11px]">
          <ImageOff size={22} />
          Photo unavailable
        </span>
      ) : url ? (
        <img src={url} alt="" loading="lazy" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {gated && !dl.checking && (
        <span className="absolute inset-0 flex items-center justify-center">
          {downloading ? (
            <ProgressRing progress={dl.progress} onCancel={(e) => { e.stopPropagation(); dl.cancel(); }} />
          ) : (
            <DownloadPill label={formatFileSize(item.size)} failed={dl.status === "failed"} onClick={download} />
          )}
        </span>
      )}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center">
            <Loader2 size={20} className="animate-spin" />
          </span>
        </span>
      )}
      {overlay}
    </div>
  );
}

function PhotoGrid({ items, onOpen, isMine }: { items: MediaItem[]; onOpen: (i: number) => void; isMine: boolean }) {
  const { shown, extra } = albumLayout(items.length);
  const moreOverlay = (i: number) =>
    extra > 0 && i === shown - 1 ? (
      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-2xl font-semibold">+{extra + 1}</span>
    ) : undefined;
  const w = { width: GRID_WIDTH };

  if (items.length === 1) {
    const it = items[0];
    const ratio = it.width && it.height ? Math.min(1.4, Math.max(0.75, it.width / it.height)) : 1;
    return <Tile isMine={isMine} album={items} item={it} style={{ ...w, aspectRatio: String(ratio) }} onOpen={() => onOpen(0)} />;
  }
  if (shown === 2) {
    return (
      <div className="flex gap-0.5" style={{ ...w, aspectRatio: "1 / 0.62" }}>
        {[0, 1].map((i) => (
          <Tile key={i} isMine={isMine} album={items} item={items[i]} style={{ flex: 1, height: "100%" }} onOpen={() => onOpen(i)} />
        ))}
      </div>
    );
  }
  if (shown === 3) {
    return (
      <div className="flex gap-0.5" style={{ ...w, aspectRatio: "1" }}>
        <Tile isMine={isMine} album={items} item={items[0]} style={{ flex: 1, height: "100%" }} onOpen={() => onOpen(0)} />
        <div className="flex flex-col gap-0.5" style={{ flex: 1 }}>
          <Tile isMine={isMine} album={items} item={items[1]} style={{ flex: 1, width: "100%" }} onOpen={() => onOpen(1)} />
          <Tile isMine={isMine} album={items} item={items[2]} style={{ flex: 1, width: "100%" }} onOpen={() => onOpen(2)} />
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-0.5" style={{ ...w, aspectRatio: "1" }}>
      {[0, 1, 2, 3].map((i) => (
        <Tile key={i} isMine={isMine} album={items} item={items[i]} style={{ width: "100%", height: "100%" }} overlay={moreOverlay(i)} onOpen={() => onOpen(i)} />
      ))}
    </div>
  );
}

function DocumentCard({ item, isMine }: { item: MediaItem; isMine: boolean }) {
  const dl = useChatMediaDownload(item);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const style = documentStyle(item.name, item.mime);
  const uploading = !item.path;
  const downloading = dl.status === "downloading";
  const onDevice = !!dl.localUrl;

  // Click: download once (progress ring, ✕ to cancel), keep it on the device, and save it to the computer.
  // Later clicks save instantly from the on-device copy.
  async function open(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if (saving || uploading || downloading) return;
    setSaving(true);
    setError(false);
    try {
      await openChatFile(item);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => void open(e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void open(e);
        }
      }}
      aria-label={`${onDevice ? "Save" : "Download"} document ${item.name}`}
      className={`flex items-center gap-3 rounded-xl p-2 min-w-[220px] max-w-full text-left cursor-pointer ${isMine ? "bg-black/10" : "bg-ink-muted/10"}`}
    >
      <span className="w-11 h-11 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: style.color }}>
        <FileText size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium break-words line-clamp-2 ${isMine ? "text-white" : "text-ink"}`}>{item.name}</span>
        <span className={`block text-[11px] ${error || dl.status === "failed" ? "text-danger" : isMine ? "text-white/70" : "text-ink-muted"}`}>
          {error || dl.status === "failed" ? "Couldn't download · click to retry" : [style.label, formatFileSize(item.size)].filter(Boolean).join(" · ")}
        </span>
      </span>
      {downloading ? (
        <ProgressRing progress={dl.progress} size={36} dark={false} onCancel={(e) => { e.stopPropagation(); dl.cancel(); }} />
      ) : (
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? "bg-white/20 text-white" : "bg-ink-muted/15 text-ink"}`}>
          {saving || uploading ? <Loader2 size={18} className="animate-spin" /> : error || dl.status === "failed" ? <RotateCw size={17} /> : onDevice ? <Check size={18} /> : <ArrowDown size={18} />}
        </span>
      )}
    </div>
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
        <PhotoGrid items={media.items} onOpen={setViewerIndex} isMine={isMine} />
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
