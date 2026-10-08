// src/components/MessagePreviewLine.tsx
// One-line summary of a message with WhatsApp's little leading glyph: 🎤 Voice message / 0:12,
// 🖼 Photo / 3 photos / the caption, 📄 file name. Plain text messages render as plain text.
// Use this anywhere a message is quoted or previewed (reply quotes, chat list, hidden messages…).
import { FileText, Image as ImageIcon, Mic } from "lucide-react";
import { messagePreview } from "../lib/chatMedia";

interface MessagePreviewLineProps {
  content: string;
  /** "list" shows a voice message's duration (like WhatsApp's chat list); "quote" shows its name. */
  variant?: "list" | "quote";
  className?: string;
}

export function MessagePreviewLine({ content, variant = "quote", className = "" }: MessagePreviewLineProps) {
  const p = messagePreview(content);
  const Glyph = p.icon === "mic" ? Mic : p.icon === "image" ? ImageIcon : p.icon === "file" ? FileText : null;
  const text = variant === "list" && p.icon === "mic" && p.meta ? p.meta : p.label;

  if (!Glyph) return <span className={`block truncate ${className}`}>{text}</span>;
  return (
    <span className={`flex items-center gap-1 min-w-0 ${className}`}>
      <Glyph size={variant === "list" ? 14 : 13} className="flex-shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
    </span>
  );
}
