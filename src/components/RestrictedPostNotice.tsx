// src/components/RestrictedPostNotice.tsx
//
// Shown in place of a post (or a comment thread) when a restricted
// (consumer-only) account follows a shared link to one. These accounts
// can't use feeds or posts yet, so the honest answer is NOT "this post
// doesn't exist" — that would be false, and confusing for someone who was
// just sent a link by a friend. Instead: a gentle explanation of why they
// can't see it, and a clear way forward (Discover, their home surface).
//
// Server-side enforcement is unchanged; this is purely the messaging layer.
import { useNavigate } from "react-router-dom";
import { Compass, Lock } from "lucide-react";
import { Button } from "./Button";
import { RESTRICTED_HOME } from "../hooks/useAccountAccess";

export function RestrictedPostNotice() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-3">
        <Lock size={20} className="text-ink-muted" />
      </div>
      <p className="text-ink font-medium mb-1">Posts aren't available on your account yet</p>
      <p className="text-ink-muted text-sm max-w-xs mb-6">
        Your current account tier can't view feeds or posts just yet. In the meantime, there's plenty to explore on
        Discover — projects, books, courses and more.
      </p>
      <div className="w-full max-w-xs">
        <Button onClick={() => navigate(RESTRICTED_HOME, { replace: true })}>
          <span className="inline-flex items-center justify-center gap-2">
            <Compass size={18} />
            Go to Discover
          </span>
        </Button>
      </div>
    </div>
  );
}
