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
      className={`text-ink leading-snug whitespace-pre-wrap break-words ${
        i < paragraphs.length - 1 ? "mb-2" : ""
      }`}
    >
      {renderFormattedText(para, `p${i}`)}
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
          {renderFormattedText(heading, "h")}
        </h3>
      )}
      {content && renderParagraphs(content)}
    </div>
  );
}
