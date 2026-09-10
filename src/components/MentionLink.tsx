// src/components/MentionLink.tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAccountKind } from "../hooks/useAccountKind";

interface MentionLinkProps {
  username: string;
  children: ReactNode;
}

/**
 * Renders an @mention as a link to the right place — /profile/:username
 * for a personal account, /page/:username for an organization/brand
 * page. Used by formatText.tsx wherever an @token is parsed out of
 * post/project/comment/bio text.
 *
 * Starts pointed at /profile/:username (the default useAccountKind
 * resolves to before/without an answer) and corrects itself to
 * /page/:username if the lookup comes back a page — no loading state
 * needed since the wrong-for-a-moment link is never clicked before
 * the (cached, usually-instant) resolution lands.
 */
export function MentionLink({ username, children }: MentionLinkProps) {
  const { data: kind } = useAccountKind(username);
  const to = kind === "page" ? `/page/${username}` : `/profile/${username}`;

  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className="text-accent hover:underline">
      {children}
    </Link>
  );
}
