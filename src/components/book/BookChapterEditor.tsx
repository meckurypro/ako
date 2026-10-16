// src/components/book/BookChapterEditor.tsx
// The creator's chapter editor: a formatting toolbar over the text box, plus a Preview tab that renders the
// chapter exactly as the reader will (same parser, same block renderer, same Copy button on code blocks).
// Everything the reader can display is one button away; the text underneath stays plain Markdown.
import { useRef, useState } from "react";
import { Bold, Code, FileCode, Italic, Link as LinkIcon, List, ListOrdered, Minus, Quote } from "lucide-react";

import { BookRichText } from "../BookRichText";
import { BOOK_SECTION_INFO, type BookChapterKind } from "../../hooks/useBookBuilder";
import { applyBookFormat, type BookFormatOp } from "../../lib/bookEditorOps";
import { parseBook } from "../../lib/bookFormat";
import { splitChapterOpener } from "../../lib/bookReaderText";
import { READER_THEMES } from "../../lib/bookReaderTheme";
import { useBookReaderTheme } from "./useBookReaderTheme";
import { FONT_STACKS } from "./fontStacks";

const TOOLS: { op: BookFormatOp; label: string; text?: string; Icon?: typeof Bold }[] = [
  { op: "h1", label: "Chapter title (H1)", text: "H1" },
  { op: "h2", label: "Heading", text: "H2" },
  { op: "h3", label: "Subheading", text: "H3" },
  { op: "bold", label: "Bold", Icon: Bold },
  { op: "italic", label: "Italic", Icon: Italic },
  { op: "code", label: "Inline code", Icon: Code },
  { op: "link", label: "Link", Icon: LinkIcon },
  { op: "bullet", label: "Bulleted list", Icon: List },
  { op: "numbered", label: "Numbered list", Icon: ListOrdered },
  { op: "quote", label: "Quote", Icon: Quote },
  { op: "codeblock", label: "Code block (readers get a Copy button)", Icon: FileCode },
  { op: "divider", label: "Divider", Icon: Minus },
];

export function BookChapterEditor({
  kind,
  title,
  content,
  onChange,
}: {
  kind: BookChapterKind;
  title: string;
  content: string;
  onChange: (content: string) => void;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);
  const [themeId] = useBookReaderTheme();
  const theme = READER_THEMES[themeId];

  function apply(op: BookFormatOp) {
    const el = ref.current;
    const s = el?.selectionStart ?? content.length;
    const e = el?.selectionEnd ?? content.length;
    const r = applyBookFormat(content, s, e, op);
    onChange(r.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(r.start, r.end);
    });
  }

  const tab = (m: "write" | "preview", label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`px-3 py-1 rounded-full text-xs font-medium ${mode === m ? "bg-ink text-canvas" : "text-ink-muted"}`}
    >
      {label}
    </button>
  );

  const opener = mode === "preview" ? splitChapterOpener(parseBook(content), title, kind === "chapter" ? null : BOOK_SECTION_INFO[kind].label) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">{tab("write", "Write")}{tab("preview", "Preview")}</div>
      </div>

      {mode === "write" ? (
        <>
          <div className="flex flex-wrap items-center gap-0.5">
            {TOOLS.map(({ op, label, text, Icon }) => (
              <button
                key={op}
                type="button"
                // Keep the selection in the text box while the button is pressed.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(op)}
                aria-label={label}
                title={label}
                className="min-w-8 h-8 px-1.5 rounded-lg text-ink-muted hover:bg-surface hover:text-ink flex items-center justify-center text-xs font-semibold"
              >
                {Icon ? <Icon size={15} /> : text}
              </button>
            ))}
          </div>
          <textarea
            ref={ref}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={BOOK_SECTION_INFO[kind].hint}
            rows={12}
            className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm resize-y font-mono leading-relaxed"
          />
        </>
      ) : (
        <div className="rounded-lg border border-border p-4" style={{ background: theme.bg, color: theme.ink, fontFamily: FONT_STACKS.serif }}>
          {opener && (
            <>
              {opener.eyebrow && (
                <p className="text-center uppercase" style={{ fontSize: 11, letterSpacing: "0.18em", color: theme.muted, margin: "0 0 0.6em", fontWeight: 600 }}>
                  {opener.eyebrow}
                </p>
              )}
              <h1 className="text-center" style={{ fontSize: 28, lineHeight: 1.15, fontWeight: 650, margin: "0 0 1em" }}>{opener.title}</h1>
              {opener.body.length > 0 ? (
                <BookRichText blocks={opener.body} ink={theme.ink} muted={theme.muted} accent={theme.accent} fontSize={16} lineHeight={1.625} ornament />
              ) : (
                <p style={{ color: theme.muted }}>Nothing here yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
