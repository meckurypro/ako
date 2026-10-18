// src/components/LoadingOverlay.tsx
import { useIsMutating } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { usePageLoading } from "../hooks/usePageLoading";

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
      <div className="absolute inset-0 bg-canvas/35 backdrop-blur-sm animate-ako-overlay-in" />
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

// The spinner ring shared by both overlays.
function LoaderRing() {
  return (
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
  );
}

// Mount inside <BrowserRouter>, before the routes. Covers the page with the same blurred spinner while the page
// the user just opened is still loading its first data; gone the moment that data arrives. Touches pass through
// (pointer-events-none) so Back / the nav bar still work if a request is slow.
export function PageLoadingOverlay() {
  const { pathname } = useLocation();
  const loading = usePageLoading(pathname);
  if (!loading) return null;
  return (
    <div
      className="fixed inset-0 z-[998] flex items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="absolute inset-0 bg-canvas/35 backdrop-blur-sm animate-ako-overlay-in" />
      <LoaderRing />
    </div>
  );
}
