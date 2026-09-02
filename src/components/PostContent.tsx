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
      className={`text-base text-ink leading-relaxed whitespace-pre-wrap break-words ${
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
export function PostContent({ heading, content }: PostContentProps) {
  return (
    <div>
      {heading && (
        <h3 className="font-display text-3xl font-bold leading-tight text-ink mb-3">
          {renderFormattedText(heading, "h")}
        </h3>
      )}
      {content && renderParagraphs(content)}
    </div>
  );
}
