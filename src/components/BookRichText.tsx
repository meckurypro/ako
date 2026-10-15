// src/components/BookRichText.tsx
// Renders an authored chapter's Markdown (see lib/bookFormat.ts) for the reflow
// reader: headings, paragraphs, **bold**, *italic*, lists, quotes, dividers.
// Colours and size come from the reader's theme, not the app theme.
import { Fragment, useMemo, type ReactNode } from "react";

import { parseBook, type BookInline } from "../lib/bookFormat";

interface BookRichTextProps {
  content: string;
  ink: string;
  muted: string;
  fontSize: number;
}

function renderInline(nodes: BookInline[], keyPrefix: string): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (n.t) {
      case "text":
        return <Fragment key={key}>{n.v}</Fragment>;
      case "bold":
        return <strong key={key}>{renderInline(n.c, key)}</strong>;
      case "italic":
        return <em key={key}>{renderInline(n.c, key)}</em>;
      case "code":
        return (
          <code key={key} className="font-mono" style={{ fontSize: "0.9em" }}>
            {n.v}
          </code>
        );
    }
  });
}

export function BookRichText({ content, ink, muted, fontSize }: BookRichTextProps) {
  const blocks = useMemo(() => parseBook(content), [content]);
  const lineHeight = 1.625;
  const gap = fontSize * 0.9;

  return (
    <div style={{ color: ink, fontSize, lineHeight }}>
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
                {renderInline(b.inline, key)}
              </p>
            );
          }
          case "p":
            return (
              <p key={key} className="whitespace-pre-wrap" style={{ marginBottom: gap }}>
                {renderInline(b.inline, key)}
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
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">{renderInline(item.inline, `${key}-${j}`)}</span>
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
                {renderInline(b.inline, key)}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={key}
                className="font-mono overflow-x-auto"
                style={{ fontSize: fontSize - 2, lineHeight: 1.5, padding: 12, borderRadius: 10, border: `1px solid ${muted}`, marginBottom: gap }}
              >
                {b.text}
              </pre>
            );
          case "hr":
            return <hr key={key} style={{ border: 0, height: 1, background: muted, opacity: 0.35, margin: `${fontSize * 1.1}px 0` }} />;
        }
      })}
    </div>
  );
}
