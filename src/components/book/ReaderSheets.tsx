// src/components/book/ReaderSheets.tsx
// The reader's bottom sheets, styled after Apple Books: Contents / Bookmarks,
// Search Book, and Themes & Settings. All colours come from the reader theme
// (not the app theme) so the sheets always match the page behind them.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlignJustify, AlignLeft, Bookmark, ChevronRight, Search, Trash2, X } from "lucide-react";

import { BOOK_SECTION_INFO, type BookBookmark, type BookChapter } from "../../hooks/useBookBuilder";
import { searchChapters } from "../../lib/bookReaderText";
import {
  FONT_STEP,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  READER_THEME_ORDER,
  READER_THEMES,
  relativeDay,
  type LineSpacingId,
  type ReaderFontId,
  type ReaderThemeId,
  type ReaderThemeSpec,
} from "../../lib/bookReaderTheme";
import { FONT_STACKS } from "./fontStacks";

export function chapterLabel(c: BookChapter): string {
  return c.kind === "chapter" ? "Chapter" : BOOK_SECTION_INFO[c.kind].label;
}

// ---------------------------------------------------------------
// Frame
// ---------------------------------------------------------------

function Sheet({
  theme,
  title,
  subtitle,
  onClose,
  headerRight,
  children,
  tall,
}: {
  theme: ReaderThemeSpec;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.38)" }} onClick={onClose} />
      <div
        className="ako-reader-anim relative flex w-full max-w-xl flex-col overflow-hidden"
        style={{
          background: theme.sheet,
          color: theme.ink,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: tall ? "88vh" : "78vh",
          minHeight: tall ? "62vh" : undefined,
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.25)",
          animation: "ako-reader-sheet-up 220ms ease-out",
        }}
      >
        <div className="flex items-start justify-between px-5 pb-2 pt-4">
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-tight">{title}</p>
            {subtitle ? <div className="mt-0.5 text-[13px]" style={{ color: theme.muted }}>{subtitle}</div> : null}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: theme.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", color: theme.muted }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Contents + Bookmarks
// ---------------------------------------------------------------

export type ContentsTab = "contents" | "bookmarks";

export function ContentsSheet({
  theme,
  chapters,
  currentId,
  startPages,
  bookmarks,
  pageOfBookmark,
  tab,
  onTab,
  onOpenChapter,
  onOpenBookmark,
  onDeleteBookmark,
  onClose,
}: {
  theme: ReaderThemeSpec;
  chapters: BookChapter[];
  currentId: string | null;
  /** Estimated first page of each chapter, same order as `chapters`. */
  startPages: number[];
  bookmarks: BookBookmark[];
  pageOfBookmark: (b: BookBookmark) => number;
  tab: ContentsTab;
  onTab: (t: ContentsTab) => void;
  onOpenChapter: (id: string) => void;
  onOpenBookmark: (b: BookBookmark) => void;
  onDeleteBookmark: (id: string) => void;
  onClose: () => void;
}) {
  const chapterTitle = useMemo(() => new Map(chapters.map((c) => [c.id, c.title])), [chapters]);
  const currentRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (tab === "contents") currentRef.current?.scrollIntoView({ block: "center" });
  }, [tab]);

  const segBg = theme.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  return (
    <Sheet theme={theme} title="Contents" onClose={onClose} tall>
      <div className="px-5 pb-3 pt-1">
        <div className="flex rounded-xl p-0.5" style={{ background: segBg }} role="tablist">
          {(["contents", "bookmarks"] as ContentsTab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className="flex-1 rounded-[10px] py-1.5 text-[13px] font-semibold capitalize"
              style={tab === t ? { background: theme.bg, color: theme.ink, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" } : { color: theme.muted }}
            >
              {t === "bookmarks" && bookmarks.length > 0 ? `Bookmarks ${bookmarks.length}` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {tab === "contents" ? (
          chapters.map((c, i) => {
            const active = c.id === currentId;
            return (
              <button
                key={c.id}
                ref={active ? currentRef : undefined}
                onClick={() => onOpenChapter(c.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left"
                style={{ borderTop: i === 0 ? undefined : `1px solid ${theme.rule}` }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-[0.08em]" style={{ color: theme.muted }}>
                    {chapterLabel(c)}
                  </span>
                  <span className="block truncate text-[15px]" style={{ fontWeight: active ? 650 : 500, color: active ? theme.accent : theme.ink }}>
                    {c.title}
                  </span>
                </span>
                <span className="text-[13px] tabular-nums" style={{ color: theme.muted }}>
                  {startPages[i] ?? ""}
                </span>
                <ChevronRight size={15} style={{ color: theme.muted }} />
              </button>
            );
          })
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-8 py-14 text-center" style={{ color: theme.muted }}>
            <Bookmark size={26} />
            <p className="text-[15px] font-medium" style={{ color: theme.ink }}>No bookmarks yet</p>
            <p className="text-[13px]">Tap the bookmark button while you read to save your place.</p>
          </div>
        ) : (
          bookmarks.map((b, i) => (
            <div key={b.id} className="flex items-center" style={{ borderTop: i === 0 ? undefined : `1px solid ${theme.rule}` }}>
              <button onClick={() => onOpenBookmark(b)} className="flex min-w-0 flex-1 items-center gap-3 px-5 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{chapterTitle.get(b.chapter_id) ?? "Bookmark"}</span>
                  {b.snippet ? (
                    <span className="mt-0.5 block truncate text-[13px]" style={{ color: theme.muted }}>
                      {b.snippet}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-[12px]" style={{ color: theme.muted }}>
                    {relativeDay(b.created_at)}
                  </span>
                </span>
                <span className="text-[13px] tabular-nums" style={{ color: theme.muted }}>
                  {pageOfBookmark(b)}
                </span>
              </button>
              <button onClick={() => onDeleteBookmark(b.id)} aria-label="Delete bookmark" className="mr-3 flex h-9 w-9 items-center justify-center rounded-full" style={{ color: "#D4574A" }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------
// Search Book
// ---------------------------------------------------------------

export function SearchSheet({
  theme,
  chapters,
  onOpenHit,
  onClose,
}: {
  theme: ReaderThemeSpec;
  chapters: BookChapter[];
  onOpenHit: (chapterId: string, fraction: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 180);
    return () => window.clearTimeout(id);
  }, [query]);

  const hits = useMemo(() => searchChapters(chapters, debounced), [chapters, debounced]);
  const titles = useMemo(() => new Map(chapters.map((c) => [c.id, c.title])), [chapters]);

  return (
    <Sheet theme={theme} title="Search Book" onClose={onClose} tall>
      <div className="px-5 pb-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: theme.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)" }}
        >
          <Search size={16} style={{ color: theme.muted }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in this book"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            style={{ color: theme.ink }}
            enterKeyHint="search"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear" style={{ color: theme.muted }}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {debounced.trim().length < 2 ? (
          <p className="px-8 py-10 text-center text-[13px]" style={{ color: theme.muted }}>
            Type at least two letters to search every chapter.
          </p>
        ) : hits.length === 0 ? (
          <p className="px-8 py-10 text-center text-[14px]" style={{ color: theme.muted }}>
            No results for "{debounced.trim()}"
          </p>
        ) : (
          hits.map((h, i) => (
            <button
              key={`${h.chapterId}-${i}`}
              onClick={() => onOpenHit(h.chapterId, h.fraction)}
              className="block w-full px-5 py-3 text-left"
              style={{ borderTop: i === 0 ? undefined : `1px solid ${theme.rule}` }}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: theme.muted }}>
                {titles.get(h.chapterId)}
              </span>
              <span className="mt-0.5 block text-[14px] leading-snug">
                {h.before}
                <mark style={{ background: `${theme.accent}40`, color: "inherit", borderRadius: 3, padding: "0 1px" }}>{h.match}</mark>
                {h.after}
              </span>
            </button>
          ))
        )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------
// Themes & Settings (screenshot-style: A A, layout toggles, theme grid)
// ---------------------------------------------------------------

const SPACING: { id: LineSpacingId; label: string }[] = [
  { id: "tight", label: "Tight" },
  { id: "normal", label: "Normal" },
  { id: "loose", label: "Loose" },
];
const FONTS: { id: ReaderFontId; label: string }[] = [
  { id: "serif", label: "Serif" },
  { id: "sans", label: "Sans" },
  { id: "display", label: "Display" },
];

export function SettingsSheet({
  theme,
  themeId,
  onTheme,
  fontSize,
  onFontSize,
  font,
  onFont,
  spacing,
  onSpacing,
  justify,
  onJustify,
  onClose,
}: {
  theme: ReaderThemeSpec;
  themeId: ReaderThemeId;
  onTheme: (t: ReaderThemeId) => void;
  fontSize: number;
  onFontSize: (n: number) => void;
  font: ReaderFontId;
  onFont: (f: ReaderFontId) => void;
  spacing: LineSpacingId;
  onSpacing: (s: LineSpacingId) => void;
  justify: boolean;
  onJustify: (j: boolean) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState(false);
  const chip = theme.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";

  const Seg = <T extends string>({ items, value, onPick, label }: { items: { id: T; label: string }[]; value: T; onPick: (v: T) => void; label: string }) => (
    <div className="mb-3">
      <p className="mb-1.5 text-[12px] font-medium" style={{ color: theme.muted }}>{label}</p>
      <div className="flex rounded-xl p-0.5" style={{ background: chip }}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onPick(it.id)}
            aria-pressed={value === it.id}
            className="flex-1 rounded-[10px] py-1.5 text-[13px] font-semibold"
            style={value === it.id ? { background: theme.bg, color: theme.ink, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" } : { color: theme.muted }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet
      theme={theme}
      title="Themes & Settings"
      onClose={onClose}
      subtitle={
        <button onClick={() => setOptions((o) => !o)} className="flex items-center gap-1" aria-expanded={options}>
          <span>{READER_THEMES[themeId].label}</span>
          <span style={{ color: theme.ink, fontWeight: 600 }}>Options</span>
          <ChevronRight size={13} style={{ transform: options ? "rotate(90deg)" : undefined, transition: "transform 150ms" }} />
        </button>
      }
    >
      <div className="overflow-y-auto px-5 pb-5 pt-2">
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => onFontSize(fontSize - FONT_STEP)}
            disabled={fontSize <= MIN_FONT_SIZE}
            aria-label="Smaller text"
            className="flex h-11 flex-1 items-center justify-center rounded-xl disabled:opacity-35"
            style={{ background: chip }}
          >
            <span className="text-[14px] font-semibold">A</span>
          </button>
          <button
            onClick={() => onFontSize(fontSize + FONT_STEP)}
            disabled={fontSize >= MAX_FONT_SIZE}
            aria-label="Larger text"
            className="flex h-11 flex-1 items-center justify-center rounded-xl disabled:opacity-35"
            style={{ background: chip }}
          >
            <span className="text-[22px] font-semibold leading-none">A</span>
          </button>
          <button
            onClick={() => onJustify(!justify)}
            aria-label={justify ? "Left-align text" : "Justify text"}
            aria-pressed={justify}
            className="flex h-11 w-14 items-center justify-center rounded-xl"
            style={justify ? { background: theme.ink, color: theme.bg } : { background: chip }}
          >
            {justify ? <AlignJustify size={18} /> : <AlignLeft size={18} />}
          </button>
        </div>

        {options && (
          <div className="mb-2 mt-4">
            <Seg label="Font" items={FONTS} value={font} onPick={onFont} />
            <Seg label="Line spacing" items={SPACING} value={spacing} onPick={onSpacing} />
          </div>
        )}

        <div className="mt-1 grid grid-cols-3 gap-2.5">
          {READER_THEME_ORDER.map((id) => {
            const t = READER_THEMES[id];
            const selected = id === themeId;
            return (
              <button key={id} onClick={() => onTheme(id)} aria-pressed={selected} className="flex flex-col items-center gap-1.5">
                <span
                  className="flex h-[62px] w-full items-center justify-center rounded-2xl text-[24px]"
                  style={{
                    background: t.bg,
                    color: t.ink,
                    fontFamily: FONT_STACKS.serif,
                    fontWeight: t.heavy ? 800 : 500,
                    boxShadow: selected ? `0 0 0 2px ${theme.sheet}, 0 0 0 4px ${theme.ink}` : `inset 0 0 0 1px ${theme.rule}`,
                  }}
                >
                  Aa
                </span>
                <span className="text-[12px] font-medium" style={{ color: selected ? theme.ink : theme.muted }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
