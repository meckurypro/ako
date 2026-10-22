// src/components/comments/ReplyBar.tsx
import { MessageSquarePlus, HelpCircle, Hand } from "lucide-react";
import { Avatar } from "../Avatar";
import { useMyProfile } from "../../hooks/useProfile";
import { useActiveIdentity } from "../../hooks/usePages";
import type { Stance } from "../../types/database";

/** The reply stances, in the order they're offered. ("support" is stored; people see "Add".) */
const CHOICES: { stance: Stance; label: string; ownLabel: string; Icon: typeof HelpCircle; cls: string }[] = [
  { stance: "support", label: "Add", ownLabel: "Add to your post", Icon: MessageSquarePlus, cls: "text-accent bg-accent-soft" },
  { stance: "question", label: "Question", ownLabel: "Question", Icon: HelpCircle, cls: "text-stance-question bg-stance-question/10" },
  { stance: "pushback", label: "Pushback", ownLabel: "Pushback", Icon: Hand, cls: "text-pushback bg-pushback/10" },
];

/**
 * The "say something" row under a post or an opened comment. There is no free-text field: every reply starts by
 * choosing what it is — Add, Question or Pushback — so intent is never lost in a generic "comment". Tapping one
 * opens the composer already set to it (and it can't be switched afterwards). `stances` narrows the choices: a
 * post's own author can only Add to their own post.
 */
export function ReplyBar({
  placeholder,
  stances = ["support", "question", "pushback"],
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
  const choices = CHOICES.filter((c) => stances.includes(c.stance));

  return (
    <div className="py-3 border-b border-border">
      <div className="flex items-center gap-3 mb-2.5">
        <Avatar src={avatar} name={name || "You"} size="sm" />
        <p className="flex-1 min-w-0 text-[15px] text-ink-muted truncate">{placeholder}</p>
      </div>
      <div className="flex gap-2">
        {choices.map(({ stance, label, ownLabel, Icon, cls }) => (
          <button
            key={stance}
            onClick={() => onOpen(stance)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium active:opacity-70 transition-opacity ${cls}`}
          >
            <Icon size={16} aria-hidden="true" />
            {choices.length === 1 ? ownLabel : label}
          </button>
        ))}
      </div>
    </div>
  );
}
