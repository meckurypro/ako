// src/components/UnlockReveal.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";

interface UnlockRevealProps {
  /** Whether the gated content is currently accessible. */
  unlocked: boolean;
  children: ReactNode;
}

/**
 * Wraps project content that's gated behind a purchase/unlock. Plays a
 * blur-to-sharp "reveal" animation only on the false→true transition —
 * i.e. the moment a purchase actually completes and hasAccess flips —
 * never on ordinary re-renders, and never for content that was already
 * unlocked when the card first mounted (owner's own project, something
 * already purchased earlier, a free project). See ProjectCard.tsx.
 */
export function UnlockReveal({ unlocked, children }: UnlockRevealProps) {
  const [animating, setAnimating] = useState(false);
  const prevUnlocked = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevUnlocked.current !== null && unlocked && !prevUnlocked.current) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 550);
      prevUnlocked.current = unlocked;
      return () => clearTimeout(timer);
    }
    prevUnlocked.current = unlocked;
  }, [unlocked]);

  return <div className={animating ? "ako-unlock-reveal" : ""}>{children}</div>;
}
