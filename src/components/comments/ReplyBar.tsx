// src/components/comments/ReplyBar.tsx
import { Avatar } from "../Avatar";
import { useMyProfile } from "../../hooks/useProfile";
import { useActiveIdentity } from "../../hooks/usePages";
import { STANCE_ORDER, STANCE_TONE } from "./stance";
import type { Stance } from "../../types/database";

/** The quick words beside the field; the field itself is the neutral Comment. */
const QUICK_STANCES: Stance[] = STANCE_ORDER.filter((s) => s !== "comment");

/**
 * The always-visible "say something" row under a post or an opened comment. Tapping the field opens the
 * neutral Comment composer; the small words open it on that stance. There is no switching once it's open: the
 * stance picked here is the stance posted. `stances` narrows the small words (a post's own author can only build
 * on their own post, so they only get Support).
 */
export function ReplyBar({
  placeholder,
  stances = QUICK_STANCES,
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
        <button onClick={() => onOpen("comment")} className="w-full text-left text-[15px] text-ink-muted truncate py-1">
          {placeholder}
        </button>
      </div>
      {stances.length > 0 && (
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
