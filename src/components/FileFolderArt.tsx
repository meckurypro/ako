// src/components/FileFolderArt.tsx
// The folder look for File projects. Two pieces:
//  - FileFolderIcon: the small 📂 tile used wherever a thumbnail would be (profile grid, mini cards, post embed,
//    pickers). The same glyph everywhere, so a file is recognisable at any size.
//  - FileFolderHero: the big version on a file's own card/page — a folder resting on a couple of fanned-out
//    sheets of paper (where a book shows its upright cover), with the download count tucked underneath.
import { Download } from "lucide-react";
import { FILE_FOLDER_EMOJI, formatDownloadCount } from "../lib/fileProject";

export function FileFolderIcon({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center bg-gradient-to-br from-accent/15 to-surface select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: Math.round(size * 0.52), lineHeight: 1 }}>{FILE_FOLDER_EMOJI}</span>
    </div>
  );
}

export function FileFolderHero({ downloadCount }: { downloadCount?: number | null }) {
  return (
    <div className="relative w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-accent/10 via-canvas to-surface overflow-hidden">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Fanned papers peeking out behind the folder */}
        <span className="absolute w-20 h-24 rounded-md bg-surface border border-border/70 -rotate-12 -translate-x-6 shadow-sm" />
        <span className="absolute w-20 h-24 rounded-md bg-surface border border-border/70 rotate-6 translate-x-5 shadow-sm" />
        <span
          className="relative text-[84px] leading-none drop-shadow-[0_10px_14px_rgba(var(--shadow-ink-rgb),0.25)]"
          aria-hidden
        >
          {FILE_FOLDER_EMOJI}
        </span>
      </div>
      {typeof downloadCount === "number" && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted px-3 py-1 rounded-full bg-surface/80 border border-border/60 backdrop-blur-sm">
          <Download size={12} /> {formatDownloadCount(downloadCount)}
        </span>
      )}
    </div>
  );
}
