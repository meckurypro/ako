// src/components/book/fontStacks.ts
import type { ReaderFontId } from "../../lib/bookReaderTheme";

// Charter / Iowan Old Style are the closest widely-available cousins of Apple's New York.
export const FONT_STACKS: Record<ReaderFontId, string> = {
  serif: 'Newsreader, "Iowan Old Style", "Charter", "Palatino Linotype", Georgia, "Times New Roman", serif',
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  display: 'Fraunces, "Iowan Old Style", Georgia, serif',
};
