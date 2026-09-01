import { Link } from "react-router-dom";
import { Fragment } from "react";

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

function renderParagraphs(content: string) {
  const paragraphs = content.split(/\n{2,}/);
  return paragraphs.map((para, i) => (
    <p
      key={i}
      className={`text-ink leading-snug whitespace-pre-wrap break-words ${
        i < paragraphs.length - 1 ? "mb-2" : ""
      }`}
    >
      {withLinks(para)}
    </p>
  ));
}

// Heading now matches the author name in weight/family (both
// font-display) so the two read as one consistent "stylised" voice,
// per the Uche reference — bigger and bolder than before.
export function PostContent({ heading, content }: PostContentProps) {
  return (
    <div>
      {heading && (
        <h3 className="font-display text-2xl font-bold leading-snug text-ink mb-4">
          {withLinks(heading)}
        </h3>
      )}
      {content && renderParagraphs(content)}
    </div>
  );
}
