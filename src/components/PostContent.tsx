import { renderFormattedText } from "../lib/formatText";

interface PostContentProps {
  heading?: string | null;
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

// Heading matches the author name in family (both font-display) so the
// two read as one consistent "stylised" voice, per the Uche reference —
// large serif headline, roomy sans body underneath.
//
// A heading with no body underneath isn't really a "headline" for
// anything — it's just what the person typed into the title field with
// nothing added below — so it renders as plain body text instead of a
// large bold headline, which otherwise reads like a shouty, half-empty
// post.
export function PostContent({ heading, content }: PostContentProps) {
  const hasBody = content.trim() !== "";

  if (heading && !hasBody) {
    return <div>{renderParagraphs(heading)}</div>;
  }

  return (
    <div>
      {heading && (
        <h3 className="font-display text-[26px] font-bold leading-[30px] text-ink mb-3">
          {renderFormattedText(heading, "h")}
        </h3>
      )}
      {hasBody && renderParagraphs(content)}
    </div>
  );
}
