// src/components/ProbationalPageLock.tsx
//
// Wraps a whole page for the probational (pending-review) partial-
// access system. When the given feature is locked for the current
// probational user, the page still renders underneath (so layout/
// nav stays consistent) but is blurred and inert, with a banner
// explaining it unlocks once the account is approved. Everyone else
// (approved users, or a probational user for whom this feature has
// been turned on) sees the page completely normally — this component
// then does nothing at all.
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useProbationalLock } from "../hooks/useProbationalAccess";

interface ProbationalPageLockProps {
  featureKey: string;
  children: ReactNode;
}

export function ProbationalPageLock({ featureKey, children }: ProbationalPageLockProps) {
  const locked = useProbationalLock(featureKey);

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-60" aria-hidden="true">
        {children}
      </div>
      <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex items-start justify-center px-6 pt-16">
        <div className="max-w-xs w-full bg-surface border border-border rounded-xl p-5 text-center shadow-lg">
          <div className="w-11 h-11 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-3">
            <Lock className="text-accent" size={18} />
          </div>
          <p className="font-display text-base text-ink mb-1">This page unlocks once your account is approved</p>
          <p className="text-ink-muted text-xs">
            You're still in the review period — check back soon, or we'll be in touch.
          </p>
        </div>
      </div>
    </div>
  );
}
