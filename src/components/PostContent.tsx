import { renderFormattedText } from "../lib/formatText";
import { getHeadingColorDef } from "../lib/headingColors";

interface PostContentProps {
  heading?: string | null;
  headingColor?: string | null;
  content: string;
}

function renderParagraphs(content: string) {
  const paragraphs = content.split(/\n{2,}/);
  return paragraphs.map((para, i) => (
    <p
      key={i}
      className={`text-[15px] text-ink leading-[24px] whitespace-pre-wrap break-words ${
        i < paragraphs.length - 1 ? "mb-3" : ""
      }`}
    >
      {renderFormattedText(para, `p${i}`)}
    </p>
  ));
}

// Heading matches the author name in family (both font-simple, a plain
// Roboto sans) so the two read as one consistent voice — simplified
// away from the earlier Playfair Display serif treatment.
// A heading with no body underneath isn't really a "headline" for
// anything — it's just what the person typed into the title field with
// nothing added below — so it renders as plain body text instead of a
// large bold headline, which otherwise reads like a shouty, half-empty
// post.
//
// Color: --color-post-header, not text-ink — a dedicated blue token
// (own dark-mode override in index.css) rather than --color-accent
// (sage, reads as a link/action color here) or --color-tick-blue
// (WhatsApp-specific, semantically unrelated). Weight: font-semibold,
// a step down from the old font-bold but still clearly heavier than
// the body/details text below it (font-normal), so the heading stays
// the most prominent line without shouting.
export function PostContent({ heading, headingColor, content }: PostContentProps) {
  const hasBody = content.trim() !== "";

  if (heading && !hasBody) {
    return <div>{renderParagraphs(heading)}</div>;
  }

  // A picked color (see Compose.tsx's palette button, src/lib/
  // headingColors.ts) overrides the text-post-header class below via
  // inline style — var(--color-heading-<key>), themed automatically
  // the same way text-post-header already is. No pick (null/undefined,
  // every heading from before this feature existed) leaves the class
  // alone, so it keeps reading --color-post-header exactly as before.
  const colorDef = getHeadingColorDef(headingColor);
  const headingStyle = colorDef ? { color: `var(--color-heading-${colorDef.key})` } : undefined;

  return (
    <div>
      {heading && (
        <h3
          className="font-simple text-[26px] font-semibold leading-[30px] text-post-header mb-3"
          style={headingStyle}
        >
          {renderFormattedText(heading, "h")}
        </h3>
      )}
      {hasBody && renderParagraphs(content)}
    </div>
  );
}
