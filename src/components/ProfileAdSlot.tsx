// src/components/ProfileAdSlot.tsx
//
// Occupies the reserved ad space in the profile owner's own toolbar
// (see ProfilePage.tsx, Tier 1 / showOwnerView branch). Transparent by
// default — renders nothing visible until an admin has an active
// creative actually targeting the viewer. See useAdCreatives.ts for
// how that targeting resolves, and AdminProfileAds.tsx for where the
// optional link and media are set.
import { useEffect, useRef } from "react";
import { useActiveProfileAd } from "../hooks/useAdCreatives";

export function ProfileAdSlot({ className = "" }: { className?: string }) {
  const { creative, mediaUrl } = useActiveProfileAd();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pauses the video the moment it scrolls out of view and resumes it
  // when it's back — "plays continuously provided it is in view" means
  // exactly that, not "plays nonstop in the background regardless of
  // whether anyone can see it."
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mediaUrl]);

  // Always renders the wrapper (even with nothing inside) so the
  // Plus/⋯ icons next to it never shift position depending on
  // whether an ad happens to be showing right now.
  return (
    <div className={`h-10 rounded-lg overflow-hidden ${className}`}>
      {creative && mediaUrl && (
        <MaybeLink href={creative.link_url}>
          {creative.media_type === "video" ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              disablePictureInPicture
              // No sound, no scrubber, no play/pause button — this is
              // decorative background visual only, not a media player.
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
          )}
        </MaybeLink>
      )}
    </div>
  );
}

// Only becomes a real, clickable <a> when the creative actually has a
// link — with no URL the media renders exactly the same but inert, no
// cursor change and no navigation on tap.
function MaybeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
      {children}
    </a>
  );
}
