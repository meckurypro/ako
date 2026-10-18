// src/components/book/BookReaderSkeleton.tsx
// What the reader shows while the book's chapters are still arriving: the same header, cover and title the
// contents screen will have (so they appear instantly and nothing shifts), with pulsing rows where the chapter
// list goes. Replaces opening the reader empty, which read "0 sections · about 0 min read".
import { ChevronLeft } from "lucide-react";

export function BookReaderSkeleton({ title, thumbnailUrl, onBack }: { title?: string; thumbnailUrl?: string | null; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-canvas" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button onClick={onBack} aria-label="Back" className="text-ink">
          <ChevronLeft size={24} />
        </button>
        {title ? <p className="truncate text-sm font-medium text-ink">{title}</p> : <div className="h-4 w-40 animate-pulse rounded bg-surface" />}
      </div>
      <div className="mx-auto max-w-xl px-4 pb-10" role="status" aria-busy="true" aria-label="Loading book">
        <div className="flex flex-col items-center gap-3 pb-6 pt-8 text-center">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="aspect-[2/3] w-36 rounded-lg object-cover shadow-xl" />
          ) : (
            <div className="aspect-[2/3] w-36 animate-pulse rounded-lg bg-surface" />
          )}
          {title ? <p className="mt-2 font-display text-xl text-ink">{title}</p> : <div className="mt-2 h-6 w-48 animate-pulse rounded bg-surface" />}
          <div className="h-3 w-40 animate-pulse rounded bg-surface" />
          <div className="mt-1 h-10 w-40 animate-pulse rounded-full bg-surface" />
        </div>
        <div className="flex flex-col" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 border-t border-border px-1 py-3.5 first:border-t-0">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-2.5 w-16 rounded bg-surface" />
                <div className="h-4 w-3/4 rounded bg-surface" />
              </div>
              <div className="h-3 w-10 rounded bg-surface" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
