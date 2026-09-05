// src/components/LoadingOverlay.tsx
import { useIsMutating } from "@tanstack/react-query";

// Mount once, near the root, inside QueryClientProvider. Any mutation
// tagged `meta: { blocking: true }` (profile save, create/edit post,
// create/edit project, send gift, withdraw, course builder, room
// host actions, etc.) makes this appear; it disappears the instant
// that mutation's promise settles — success or failure — because
// it's driven directly off react-query's in-flight count rather than
// a timer, so there's never an artificial minimum duration.
//
// Deliberately left off lightweight instant toggles (like/dislike,
// follow, bookmark, mute/block, privacy switches) and real-time chat
// sends — those should stay snappy, not get gated behind a blur.
export function LoadingOverlay() {
  const blockingCount = useIsMutating({
    predicate: (mutation) => mutation.options.meta?.blocking === true,
  });

  if (blockingCount === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Saving"
    >
      {/* backdrop-filter blurs whatever is rendered behind this element —
          i.e. the live app — no separate wrapper around #root needed */}
      <div className="absolute inset-0 bg-canvas/35 backdrop-blur-md animate-ako-overlay-in" />
      <div className="relative ako-loader" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="ako-loader-dot"
            style={{
              transform: `rotate(${i * 45}deg) translateY(-15px)`,
              animationDelay: `${(i * -0.125).toFixed(3)}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
