// src/components/book/useBookReaderTheme.ts
//
// Same rule as hooks/useReaderTheme.ts (the PDF reader's): the reader OPENS in the app's
// light/dark, and an in-reader pick lasts for this reading session only, nothing is
// persisted. This one speaks the new Apple Books-style theme ids.
import { useState } from "react";

import { useTheme } from "../../hooks/useTheme";
import { defaultThemeFor, type ReaderThemeId } from "../../lib/bookReaderTheme";

export function useBookReaderTheme(): [ReaderThemeId, (theme: ReaderThemeId) => void] {
  const { resolvedTheme } = useTheme();
  const [picked, setPicked] = useState<ReaderThemeId | null>(null);
  return [picked ?? defaultThemeFor(resolvedTheme === "dark"), setPicked];
}
