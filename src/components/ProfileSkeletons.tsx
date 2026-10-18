// src/components/ProfileSkeletons.tsx
// Layout-shaped placeholders for the profile page. They replace the old full-screen "Loading…" / blurred
// overlay: the page frame renders immediately and only the parts still waiting on data pulse, which is the
// pattern users perceive as fastest (and it never blocks Back / the nav bar).
import { thumbBoxAspectClass } from "../lib/bookCover";
import type { ProjectType } from "../hooks/useProjects";

/** Pulsing placeholder tiles shaped like ProjectMiniCard — same grid, same cover ratio, so nothing jumps on load. */
export function ProjectMiniGridSkeleton({ count = 4, projectType }: { count?: number; projectType?: ProjectType }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-start" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="min-w-0 rounded-2xl overflow-hidden border border-border/60 bg-surface animate-pulse">
          <div className={`w-full ${thumbBoxAspectClass(projectType ?? "book", "aspect-square")} bg-canvas`} />
          <div className="px-4 pt-3.5 pb-4 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-canvas" />
            <div className="h-3 w-1/3 rounded bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Whole-profile placeholder: header block + tab bar + a grid, shown only until the profile row itself arrives. */
export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-canvas pb-24" role="status" aria-busy="true" aria-label="Loading profile">
      <div className="max-w-xl md:max-w-2xl mx-auto px-4">
        <div className="h-14" />
        <div className="animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-surface shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-5 w-2/5 rounded bg-surface" />
              <div className="h-3.5 w-1/3 rounded bg-surface" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3.5 w-full rounded bg-surface" />
            <div className="h-3.5 w-4/5 rounded bg-surface" />
          </div>
          <div className="mt-5 flex gap-5">
            <div className="h-3.5 w-20 rounded bg-surface" />
            <div className="h-3.5 w-20 rounded bg-surface" />
          </div>
          <div className="mt-6 h-10 w-full rounded bg-surface" />
        </div>
        <div className="mt-4">
          <ProjectMiniGridSkeleton />
        </div>
      </div>
    </div>
  );
}
