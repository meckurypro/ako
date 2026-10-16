// src/components/BookRichText.tsx
// Renders an authored chapter's Markdown (see lib/bookFormat.ts) for the reflow
// reader: headings, paragraphs, **bold**, *italic*, links, lists, quotes, code (with Copy), dividers.
// Colours and size come from the reader's theme, not the app theme.
import { Fragment, useMemo, useState, type ReactNode } from "react";

import { parseBook, type BookBlock, type BookInline } from "../lib/bookFormat";

interface BookRichTextProps {
  /** Markdown source. Ignored when `blocks` is given (the reader pre-parses to lift the chapter heading out). */
  content?: string;
  blocks?: BookBlock[];
  ink: string;
  muted: string;
  /** Link colour (the reader theme's accent). Falls back to the text colour. */
  accent?: string;
  fontSize: number;
  // Optional typography controls used by the book reader's Themes & Settings. Defaults keep the old look.
  fontFamily?: string;
  /** Line height as a multiple of font size. */
  lineHeight?: number;
  justify?: boolean;
  /** "Bold" theme: heavier body + bold weights. */
  heavy?: boolean;
  /** Render `---` as a small centred ornament instead of a hairline. */
  ornament?: boolean;
}

function Ornament({ color }: { color: string }) {
  return (
    <svg width={84} height={12} viewBox="0 0 112 12" fill="none" aria-hidden="true" style={{ color }}>
      <path d="M0 6h44M68 6h44" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      <path d="M56 1.5 60.5 6 56 10.5 51.5 6z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

/** A fenced code block with a Copy button: the book is full of commands people paste into a terminal. */
function CodeBlock({ text, fontSize, muted, gap }: { text: string; fontSize: number; muted: string; gap: number }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard blocked: the text is still selectable. */
    }
  }
  return (
    <div style={{ border: `1px solid ${muted}`, borderRadius: 10, marginBottom: gap, overflow: "hidden" }}>
      <div className="flex justify-end" style={{ padding: "4px 8px 0" }}>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          style={{ fontSize: 12, lineHeight: 1.2, padding: "3px 8px", borderRadius: 6, border: `1px solid ${muted}`, color: muted, background: "transparent" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="font-mono overflow-x-auto" style={{ fontSize: fontSize - 2, lineHeight: 1.5, padding: "6px 12px 12px", margin: 0 }}>
        {text}
      </pre>
    </div>
  );
}

function renderInline(nodes: BookInline[], keyPrefix: string, accent?: string): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (n.t) {
      case "text":
        return <Fragment key={key}>{n.v}</Fragment>;
      case "bold":
        return <strong key={key} style={{ fontWeight: 700 }}>{renderInline(n.c, key, accent)}</strong>;
      case "italic":
        return <em key={key}>{renderInline(n.c, key, accent)}</em>;
      case "link":
        // The parser only emits http(s) links. handleTap in the reader ignores clicks on <a>, so the chrome doesn't toggle.
        return (
          <a
            key={key}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: accent ?? "inherit", textDecoration: "underline", textUnderlineOffset: 3, overflowWrap: "anywhere" }}
          >
            {renderInline(n.c, key, accent)}
          </a>
        );
      case "code":
        return (
          <code key={key} className="font-mono" style={{ fontSize: "0.9em" }}>
            {n.v}
          </code>
        );
    }
  });
}

export function BookRichText({
  content,
  blocks: given,
  ink,
  muted,
  accent,
  fontSize,
  fontFamily,
  lineHeight = 1.625,
  justify = false,
  heavy = false,
  ornament = false,
}: BookRichTextProps) {
  const parsed = useMemo(() => given ?? parseBook(content ?? ""), [given, content]);
  const blocks = parsed;
  const gap = fontSize * 0.9;

  return (
    <div
      style={{
        color: ink,
        fontSize,
        lineHeight,
        fontFamily,
        fontWeight: heavy ? 600 : undefined,
        textAlign: justify ? "justify" : undefined,
        hyphens: justify ? "auto" : undefined,
        WebkitHyphens: justify ? "auto" : undefined,
        overflowWrap: "break-word",
      }}
    >
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.k) {
          case "heading": {
            const size = fontSize + (b.level === 1 ? 6 : b.level === 2 ? 4 : 2);
            return (
              <p
                key={key}
                className="font-semibold whitespace-pre-wrap"
                style={{ fontSize: size, lineHeight: 1.3, marginTop: fontSize * 0.9, marginBottom: fontSize * 0.55 }}
              >
                {renderInline(b.inline, key, accent)}
              </p>
            );
          }
          case "p":
            return (
              <p key={key} className="whitespace-pre-wrap" style={{ marginBottom: gap }}>
                {renderInline(b.inline, key, accent)}
              </p>
            );
          case "list":
            return (
              <div key={key} style={{ marginBottom: gap, display: "flex", flexDirection: "column", gap: fontSize * 0.35 }}>
                {b.items.map((item, j) => (
                  <div key={`${key}-${j}`} className="flex" style={{ paddingLeft: item.depth * fontSize * 1.1 }}>
                    <span className="shrink-0" style={{ width: fontSize * (item.marker.length > 2 ? 2.2 : 1.5) }}>
                      {item.marker}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">{renderInline(item.inline, `${key}-${j}`, accent)}</span>
                  </div>
                ))}
              </div>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="italic whitespace-pre-wrap"
                style={{ color: muted, borderLeft: `3px solid ${muted}`, paddingLeft: 14, marginBottom: gap }}
              >
                {renderInline(b.inline, key, accent)}
              </blockquote>
            );
          case "code":
            return (
              <CodeBlock key={key} text={b.text} fontSize={fontSize} muted={muted} gap={gap} />
            );
          case "hr":
            return ornament ? (
              <div key={key} className="flex justify-center" style={{ margin: `${fontSize * 1.3}px 0` }}>
                <Ornament color={muted} />
              </div>
            ) : (
              <hr key={key} style={{ border: 0, height: 1, background: muted, opacity: 0.35, margin: `${fontSize * 1.1}px 0` }} />
            );
        }
      })}
    </div>
  );
}
