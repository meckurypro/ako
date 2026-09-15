// src/components/UnavailableNotice.tsx
import { EyeOff } from "lucide-react";

/**
 * Shown in place of a post or project's real content once it's been
 * deleted or archived. `reason` should already be a complete,
 * human-readable sentence ("You deleted this post.", "Jane removed
 * this post.") — this component just provides the consistent shell.
 * When no reason can be attributed (e.g. a stranger hit a dead link
 * to content that RLS correctly won't reveal details of), pass
 * undefined and only the generic headline shows.
 */
export function UnavailableNotice({
  kind,
  reason,
}: {
  kind: "post" | "project";
  reason?: string | null;
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-3">
        <EyeOff size={20} className="text-ink-muted" />
      </div>
      <p className="text-ink font-medium mb-1">This {kind} is no longer available</p>
      {reason && <p className="text-ink-muted text-sm">{reason}</p>}
    </div>
  );
}
