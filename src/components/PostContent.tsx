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

// Content is split into paragraphs on blank lines so paragraph
// spacing is a real margin we control, rather than relying on the
// literal blank line inside a single whitespace-pre-wrap block.
// Single line breaks within a paragraph are still preserved as-is.
//
// leading-snug tightens the gap between wrapped lines within a
// paragraph (was reading as too loose at leading-normal); mb-2 gives
// paragraphs a slightly more deliberate break now that internal
// line-height is tighter.
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

// Heading (capped at 50 chars server-side, so this naturally stays
// to ~2 lines at this size) renders in the display/heading font, a
// step larger than the body, at a medium (not bold) weight to match
// the reference's lighter editorial feel; content renders at normal
// size below it. Either can be absent — a post can be heading-only
// or details-only — so both are rendered conditionally.
export function PostContent({ heading, content }: PostContentProps) {
  return (
    <div>
      {heading && (
        <h3 className="font-display text-lg font-medium leading-snug text-ink mb-4">
          {withLinks(heading)}
        </h3>
      )}
      {content && renderParagraphs(content)}
    </div>
  );
}
