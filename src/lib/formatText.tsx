// src/lib/formatText.tsx
//
// Shared inline-formatting parser used everywhere user-authored text is
// displayed: post content, project descriptions, comments. Handles:
//   - #hashtag / @mention -> links (existing behavior, moved here)
//   - *bold* / _italic_ / ~strikethrough~ -> WhatsApp-style typed markers,
//     since that's the convention creators already reach for
//   - [u]underline[/u] -> no natural typed convention exists for underline
//     (unlike * _ ~), so this marker is only ever inserted by the
//     FormatToolbar's Underline button, never typed by hand
//
// Single-level only (no nesting of one marker inside another) — kept
// simple on purpose to match how people actually type on WhatsApp.
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

const TOKEN_PATTERN =
  /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\[u\][^[\]]*\[\/u\])/g;

export function renderFormattedText(text: string, keyPrefix = "f"): ReactNode[] {
  const parts = text.split(TOKEN_PATTERN);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;

    if (/^#[a-zA-Z0-9_]+$/.test(part)) {
      const tag = part.slice(1).toLowerCase();
      return (
        <Link
          key={key}
          to={`/hashtag/${tag}`}
          onClick={(e) => e.stopPropagation()}
          className="text-accent hover:underline"
        >
          {part}
        </Link>
      );
    }

    if (/^@[a-zA-Z0-9_]+$/.test(part)) {
      const username = part.slice(1);
      return (
        <Link
          key={key}
          to={`/profile/${username}`}
          onClick={(e) => e.stopPropagation()}
          className="text-accent hover:underline"
        >
          {part}
        </Link>
      );
    }

    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return <strong key={key}>{part.slice(1, -1)}</strong>;
    }

    if (part.length > 2 && part.startsWith("_") && part.endsWith("_")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    if (part.length > 2 && part.startsWith("~") && part.endsWith("~")) {
      return <s key={key}>{part.slice(1, -1)}</s>;
    }

    if (part.startsWith("[u]") && part.endsWith("[/u]")) {
      return <u key={key}>{part.slice(3, -4)}</u>;
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}
