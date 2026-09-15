// src/components/FeedDoorway.tsx
//
// The "soft Feed discovery" invitation — see
// 04_AKO_SOFT_FEED_DISCOVERY_AND_CROSS_SURFACE_INVITATIONS.md. A
// quiet, optional footer that a non-Feed page can show once its own
// task is done, inviting the user into the Feed without ever
// blocking, gating, or duplicating the primary content above it.
//
// Deliberately the "Quiet inline invitation" treatment (the spec's
// option A) rather than a card, modal, or banner: it's the one
// treatment that reads as calm on every surface this ships on first
// (a book's table of contents, a completed course, a ticket page)
// without needing per-surface visual tuning. A stronger editorial
// treatment can be layered on later per-surface if a specific page
// warrants it — this component isn't meant to be the only shape this
// idea ever takes.
//
// Renders nothing on its own if the doorway shouldn't show — always
// pair with useFeedDoorway(context) and only mount this when
// `visible` is true, so a disabled feature flag or an already-used
// session budget means literally no DOM for this, not a hidden one.
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FEED_DOORWAY_COPY, type FeedDoorwayContextKey } from "../lib/feedDoorwayCopy";

interface FeedDoorwayProps {
  context: FeedDoorwayContextKey;
  /** Called right before navigating to /feed — use this to record
   *  frequency state (see useFeedDoorway's markEnteredFeed). */
  onEnter: () => void;
  className?: string;
}

export function FeedDoorway({ context, onEnter, className = "" }: FeedDoorwayProps) {
  const navigate = useNavigate();
  const copy = FEED_DOORWAY_COPY[context];

  return (
    <div className={`ako-doorway-in pt-4 mt-4 border-t border-border ${className}`}>
      <p className="text-sm font-medium text-ink">{copy.heading}</p>
      <p className="text-sm text-ink-muted mt-0.5">{copy.subtext}</p>
      <button
        onClick={() => {
          onEnter();
          navigate("/feed");
        }}
        className="group flex items-center gap-1 text-sm font-medium text-accent mt-2"
      >
        {copy.cta}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
