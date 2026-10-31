// src/components/ProfileSkeletons.tsx
// Layout-shaped placeholders for the profile page. They replace the old full-screen "Loading…" / blurred
// overlay: the page frame renders immediately and only the parts still waiting on data pulse, which is the
// pattern users perceive as fastest (and it never blocks Back / the nav bar).
import { THUMB_SPECS } from "../lib/thumbnailSpec";
import type { ProjectType } from "../hooks/useProjects";
import { BottomNav } from "./BottomNav";

/** Pulsing placeholder tiles shaped like ProjectMiniCard — same grid, same cover ratio, so nothing jumps on load. */
export function ProjectMiniGridSkeleton({ count = 4, projectType }: { count?: number; projectType?: ProjectType }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-start" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="min-w-0 rounded-2xl overflow-hidden border border-border/60 bg-surface animate-pulse">
          <div style={{ aspectRatio: THUMB_SPECS[projectType === "media" ? "1:1" : projectType === "gig" ? "2:1" : projectType === "course" ? "4:3" : projectType === "event" ? "4:5" : projectType === "room" ? "1:1" : "2:3"].ratio }} className="w-full bg-canvas" />
          <div className="px-4 pt-3.5 pb-4 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-canvas" />
            <div className="h-3 w-1/3 rounded bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Whole-profile placeholder, shown only until the profile row itself arrives. The app frame never disappears:
 * the sticky toolbar bar (same height/position as the real one, its buttons fill in once we know whose profile
 * this is) and the BottomNav stay put, and only the content area pulses — the same "frame stays, content
 * reloads" behaviour as pull-to-refresh.
 */
export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-chrome bg-canvas">
        <div className="max-w-xl md:max-w-2xl mx-auto px-4 h-14" />
      </div>
      <div className="max-w-xl md:max-w-2xl mx-auto px-4" role="status" aria-busy="true" aria-label="Loading profile">
        <div className="animate-pulse pt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 pt-1 space-y-2.5">
              <div className="h-7 w-3/5 rounded bg-surface" />
              <div className="h-4 w-2/5 rounded bg-surface" />
              <div className="mt-5 flex gap-7">
                <div className="h-9 w-16 rounded bg-surface" />
                <div className="h-9 w-16 rounded bg-surface" />
              </div>
            </div>
            <div className="w-28 h-28 rounded-full bg-surface shrink-0" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3.5 w-full rounded bg-surface" />
            <div className="h-3.5 w-4/5 rounded bg-surface" />
          </div>
          <div className="mt-5 h-11 w-full rounded-xl bg-surface" />
          <div className="mt-4 h-12 w-full rounded bg-surface" />
        </div>
        <div className="mt-4">
          <PostListSkeleton count={2} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

/** Placeholder rows shaped like PostCard (avatar + name line, text lines, media block). */
export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading posts">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse" aria-hidden="true">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-surface" />
              <div className="h-3 w-1/4 rounded bg-surface" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3.5 w-full rounded bg-surface" />
            <div className="h-3.5 w-3/4 rounded bg-surface" />
          </div>
          {i === 0 && <div className="mt-3 aspect-[4/3] w-full rounded-2xl bg-surface" />}
        </div>
      ))}
    </div>
  );
}
