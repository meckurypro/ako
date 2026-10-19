// src/components/comments/ReplyBar.tsx
import { Avatar } from "../Avatar";
import { useMyProfile } from "../../hooks/useProfile";
import { useActiveIdentity } from "../../hooks/usePages";
import { STANCE_ORDER, STANCE_TONE } from "./stance";
import type { Stance } from "../../types/database";

/**
 * The always-visible "say something" row under a post or an opened comment. Tapping the field opens the
 * composer on Support; the three small words open it straight on that stance. `stances` narrows what's offered
 * (a post's own author can only add to their own post, so they only get Support).
 */
export function ReplyBar({
  placeholder,
  stances = STANCE_ORDER,
  onOpen,
}: {
  placeholder: string;
  stances?: Stance[];
  onOpen: (stance: Stance) => void;
}) {
  const { data: me } = useMyProfile();
  const { data: identity } = useActiveIdentity();
  const page = identity?.mode === "page" ? identity.page : null;
  const name = page?.name ?? me?.display_name ?? "";
  const avatar = page?.avatar_url ?? me?.avatar_url ?? null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border">
      <Avatar src={avatar} name={name || "You"} size="sm" />
      <div className="flex-1 min-w-0">
        <button onClick={() => onOpen(stances[0])} className="w-full text-left text-[15px] text-ink-muted truncate py-1">
          {placeholder}
        </button>
      </div>
      {stances.length > 1 && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {stances.map((s) => (
            <button
              key={s}
              onClick={() => onOpen(s)}
              className={`text-xs font-medium ${STANCE_TONE[s].text} opacity-80 hover:opacity-100 transition-opacity`}
            >
              {STANCE_TONE[s].noun}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
