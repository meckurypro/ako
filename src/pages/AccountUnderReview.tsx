// src/pages/AccountUnderReview.tsx
//
// The pending user's entire application while account_status is
// 'pending' and the incubation review gate is enforced (see
// useAccountAccess / RequireAuth). Warm and reassuring on purpose —
// per the product principle, this is incubation, not punishment.
// No navigation into the protected app is offered; logout is the
// only action.
import { Clock3 } from "lucide-react";
import { Button } from "../components/Button";
import { useSignOut } from "../hooks/useAccountAccess";

export function AccountUnderReview() {
  const signOut = useSignOut();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-xs">
        <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-6">
          <Clock3 className="text-accent" size={28} />
        </div>
        <h1 className="font-display text-xl text-ink mb-2">Your Akọ account is under review</h1>
        <p className="text-ink-muted text-sm mb-1">
          We're carefully welcoming people into Akọ during this early period. Your account has been
          received and is currently being reviewed.
        </p>
        <p className="text-ink-muted text-sm mb-8">
          There's nothing else you need to do right now — check back soon, or we'll be in touch.
        </p>
        <Button
          variant="ghost"
          onClick={() => signOut.mutate()}
          loading={signOut.isPending}
          className="w-auto px-4"
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
