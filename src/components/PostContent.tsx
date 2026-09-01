// src/components/PostContent.tsx

import { Link } from "react-router-dom";
import { Fragment } from "react";

// Splits on hashtags AND @mentions in one pass so both render as
// links instead of plain text — this is the piece that was missing
// for hashtags to feel "working": create-post already parsed and
// stored them server-side, but nothing rendered them as tappable.
const TOKEN_PATTERN = /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g;

function withLinks(text: string) {
  const parts = text.split(TOKEN_PATTERN);

  return parts.map((part, i) => {
    if (part.startsWith("#") && part.length > 1) {
      const tag = part.slice(1).toLowerCase();
      return (
        <Link
          key={i}
          to={`/hashtag/${tag}`}
          onClick={(e) => e.stopPropagation()}
          className="text-accent hover:underline"
        >
          {part}
        </Link>
      );
    }
    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      return (
        <Link
          key={i}
          to={`/profile/${username}`}
          onClick={(e) => e.stopPropagation()}
          className="text-accent hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

interface PostContentProps {
  heading?: string | null;
  content: string;
}

// Heading (capped at 50 chars server-side, so this naturally stays
// to ~2 lines at this size) renders in the display/heading font,
// bold and a step larger than the body; content renders at normal
// size below it. Either can be absent — a post can be heading-only
// or details-only — so both are rendered conditionally.
export function PostContent({ heading, content }: PostContentProps) {
  return (
    <div>
      {heading && (
        <h3 className="font-display text-lg font-semibold leading-snug text-ink mb-1">
          {withLinks(heading)}
        </h3>
      )}
      {content && (
        <p className="text-ink whitespace-pre-wrap break-words">{withLinks(content)}</p>
      )}
    </div>
  );
}
