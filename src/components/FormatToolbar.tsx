// src/components/FormatToolbar.tsx
//
// Small toolbar for textareas that accept the *bold* / _italic_ / ~strike~ /
// [u]underline[/u] markers parsed by src/lib/formatText.tsx. Bold, italic,
// and strikethrough already have a typeable convention (WhatsApp-style), so
// these buttons are just a discoverable shortcut for them. Underline has no
// natural typed symbol, so this toolbar is its only entry point.
import type { RefObject } from "react";
import { Bold, Italic, Strikethrough, Underline } from "lucide-react";

type MarkKind = "bold" | "italic" | "strike" | "underline";

const MARKERS: Record<MarkKind, { before: string; after: string; label: string; Icon: typeof Bold }> = {
  bold: { before: "*", after: "*", label: "Bold", Icon: Bold },
  italic: { before: "_", after: "_", label: "Italic", Icon: Italic },
  strike: { before: "~", after: "~", label: "Strikethrough", Icon: Strikethrough },
  underline: { before: "[u]", after: "[/u]", label: "Underline", Icon: Underline },
};

interface FormatToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FormatToolbar({ textareaRef, value, onChange, className }: FormatToolbarProps) {
  function applyMark(kind: MarkKind) {
    const { before, after } = MARKERS[kind];
    const textarea = textareaRef.current;

    // No live selection info (e.g. ref not mounted yet) — just append the
    // empty marker pair at the end so the user can type inside it.
    if (!textarea) {
      onChange(`${value}${before}${after}`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const newValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(newValue);

    // Restore focus + a sane cursor position: right after the closing
    // marker when text was wrapped, or between the markers when nothing
    // was selected so the user can start typing immediately.
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = selected
        ? start + before.length + selected.length + after.length
        : start + before.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {(Object.keys(MARKERS) as MarkKind[]).map((kind) => {
        const { label, Icon } = MARKERS[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => applyMark(kind)}
            aria-label={label}
            title={label}
            className="p-1.5 rounded-lg text-ink-muted hover:bg-surface hover:text-ink transition-colors"
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
