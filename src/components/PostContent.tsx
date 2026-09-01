// src/components/PostContent.tsx
import { Link } from "react-router-dom";
import { Fragment } from "react";

// Splits on hashtags AND @mentions in one pass so both render as
// links instead of plain text — this is the piece that was missing
// for hashtags to feel "working": create-post already parsed and
// stored them server-side, but nothing rendered them as tappable.
const TOKEN_PATTERN = /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g;

export function PostContent({ content }: { content: string }) {
  const parts = content.split(TOKEN_PATTERN);

  return (
    <p className="text-ink whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
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
      })}
    </p>
  );
}
