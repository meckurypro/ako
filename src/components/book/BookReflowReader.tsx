// src/components/book/BookReflowReader.tsx
//
// Reader for authored (text) books, modelled on Apple Books:
//   - Contents screen with a Continue button, then a distraction-free page
//   - "N pages left in chapter" up top, "185 of 736" + a menu button below
//   - tap the page to show/hide the top bar and the book scrubber
//   - menu: Contents · %, Bookmarks, Search Book, Themes & Settings
//   - return pill after any jump (contents, search, bookmark, scrubber)
//   - themes: Original / Quiet / Paper / Bold / Calm / Focus, font, spacing, justify
//
// Text reflows (it is real text, not a raster page), so "page" means one screenful
// at the current type size: estimated from the text length for chapters you haven't
// opened and measured for the open one. Reading position (chapter + scroll fraction)
// is saved to the server, debounced, same as before.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpToLine,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  RotateCcw,
  Search,
  Share,
  Type,
} from "lucide-react";

import { FeedDoorway } from "../FeedDoorway";
import { ResumePrompt } from "../ResumePrompt";
import { useFeedDoorway } from "../../hooks/useFeedDoorway";
import {
  BOOK_SECTION_INFO,
  useAddBookBookmark,
  useBookBookmarks,
  useBookProgress,
  useDeleteBookBookmark,
  useSaveBookProgress,
  type BookBookmark,
  type BookChapter,
} from "../../hooks/useBookBuilder";
import { parseBook } from "../../lib/bookFormat";
import { chapterPlainText, readingMinutes, snippetAt, splitChapterOpener } from "../../lib/bookReaderText";
import {
  DEFAULT_FONT_SIZE,
  LINE_HEIGHT,
  READER_STORAGE,
  READER_THEMES,
  clampFontSize,
  coerceFont,
  coerceSpacing,
  estimatePages,
  locate,
  pagesLeftLabel,
  resolveOverall,
  type PageMetrics,
} from "../../lib/bookReaderTheme";
import { BookRichText } from "../BookRichText";
import { FONT_STACKS } from "./fontStacks";
import { ContentsSheet, SearchSheet, SettingsSheet, chapterLabel, type ContentsTab } from "./ReaderSheets";
import { useBookReaderTheme } from "./useBookReaderTheme";

const SAVE_DEBOUNCE_MS = 900;
const PAD_X = 24;
const MAX_COLUMN = 640;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota: the setting just won't persist */
  }
}

type Sheet = null | "contents" | "search" | "settings";

interface BookReflowReaderProps {
  projectId: string;
  title: string;
  chapters: BookChapter[];
  userId: string | undefined;
  onBack: () => void;
  thumbnailUrl?: string | null;
  /** Public link to the book, for the Share button (falls back to the current address). */
  shareUrl?: string;
}

export function BookReflowReader({ projectId, title, chapters, userId, onBack, thumbnailUrl, shareUrl }: BookReflowReaderProps) {
  const { data: progress, isLoading: progressLoading } = useBookProgress(projectId, userId);
  const saveProgress = useSaveBookProgress(projectId, userId);
  const { data: bookmarkData } = useBookBookmarks(projectId, userId);
  const addBookmark = useAddBookBookmark(projectId, userId);
  const deleteBookmark = useDeleteBookBookmark(projectId, userId);
  const bookDoorway = useFeedDoorway("book");
  const bookmarks = useMemo(() => bookmarkData ?? [], [bookmarkData]);

  const [view, setView] = useState<"toc" | "chapter">("toc");
  const [chapterId, setChapterId] = useState<string | null>(null);
  // Opens in the app's light/dark; a pick here lasts for this reading session (see useBookReaderTheme).
  const [themeId, setThemeId] = useBookReaderTheme();
  const theme = READER_THEMES[themeId];
  const [fontSize, setFontSize] = useState<number>(() => {
    const n = Number(readStored(READER_STORAGE.fontSize));
    return n ? clampFontSize(n) : DEFAULT_FONT_SIZE;
  });
  const [fontPick, setFontPick] = useState<string | null>(() => readStored(READER_STORAGE.font));
  const font = coerceFont(fontPick, themeId);
  const [spacing, setSpacing] = useState(() => coerceSpacing(readStored(READER_STORAGE.spacing)));
  const [justify, setJustify] = useState(() => readStored(READER_STORAGE.justify) === "1");

  const [chromeVisible, setChromeVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [contentsTab, setContentsTab] = useState<ContentsTab>("contents");
  const [resumed, setResumed] = useState(false);
  // Where the reader stopped last time, offered once on reopening: continue there, or start from the beginning.
  const [resumeOffer, setResumeOffer] = useState<{ chapterId: string; fraction: number } | null>(null);
  const [fraction, setFraction] = useState(0);
  const [dims, setDims] = useState({ vw: 390, vh: 800, contentH: 0 });
  const [scrub, setScrub] = useState<number | null>(null);
  const [jumpBack, setJumpBack] = useState<{ chapterId: string; fraction: number; label: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingFraction = useRef<number | null>(null);
  const chromeAnchor = useRef(0);
  const lastChapterId = useRef<string | null>(null);

  useEffect(() => writeStored(READER_STORAGE.fontSize, String(fontSize)), [fontSize]);
  useEffect(() => {
    if (fontPick) writeStored(READER_STORAGE.font, fontPick);
  }, [fontPick]);
  useEffect(() => writeStored(READER_STORAGE.spacing, spacing), [spacing]);
  useEffect(() => writeStored(READER_STORAGE.justify, justify ? "1" : "0"), [justify]);
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // The last position not yet sent. Saves are debounced while scrolling, so leaving the page or hiding the tab
  // must send it straight away rather than drop it.
  const unsaved = useRef<{ chapterId: string; scrollFraction: number } | null>(null);
  const saveMutate = saveProgress.mutate;
  const flushSave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const pending = unsaved.current;
    unsaved.current = null;
    if (pending) saveMutate(pending);
  }, [saveMutate]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushSave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  }, [flushSave]);

  // Resume: once the saved position has loaded, offer to reopen the last chapter at the saved spot — or start from
  // the beginning. (Waits for the progress query: resolving before it arrived used to skip resuming altogether.)
  useEffect(() => {
    if (resumed || chapters.length === 0 || progressLoading) return;
    setResumed(true);
    const savedId = progress?.current_chapter_id;
    const idx = savedId ? chapters.findIndex((c) => c.id === savedId) : -1;
    if (idx < 0) return;
    const f = progress?.scroll_fraction ?? 0;
    // Nothing worth resuming if they only ever opened the very start of the first chapter.
    if (idx === 0 && f < 0.02) return;
    setResumeOffer({ chapterId: chapters[idx].id, fraction: f });
  }, [resumed, chapters, progress, progressLoading]);

  function continueReading() {
    if (!resumeOffer) return;
    setJumpBack(null);
    pendingFraction.current = resumeOffer.fraction;
    setChapterId(resumeOffer.chapterId);
    setView("chapter");
    setResumeOffer(null);
  }

  function startOver() {
    setResumeOffer(null);
    if (!chapters[0]) return;
    setJumpBack(null);
    pendingFraction.current = null;
    setChapterId(chapters[0].id);
    setView("chapter");
    // The beginning is now the place to come back to.
    unsaved.current = { chapterId: chapters[0].id, scrollFraction: 0 };
    flushSave();
  }

  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const current = currentIndex >= 0 ? chapters[currentIndex] : null;
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  // ---------- page estimates ----------
  const lineHeight = LINE_HEIGHT[spacing];
  const plainLengths = useMemo(() => chapters.map((c) => chapterPlainText(c.content).length), [chapters]);
  const chapterPages = useMemo(() => {
    const m: PageMetrics = { viewportW: dims.vw, viewportH: dims.vh, fontSize, lineHeight, padX: PAD_X, maxColumn: MAX_COLUMN };
    const est = plainLengths.map((n) => estimatePages(n, m));
    if (currentIndex >= 0 && dims.contentH > 0 && dims.vh > 0) {
      est[currentIndex] = Math.max(1, Math.round(dims.contentH / (dims.vh * 0.86)));
    }
    return est;
  }, [plainLengths, dims, fontSize, lineHeight, currentIndex]);
  const startPages = useMemo(() => {
    let acc = 1;
    return chapterPages.map((p) => {
      const at = acc;
      acc += p;
      return at;
    });
  }, [chapterPages]);

  const position = useMemo(
    () => locate(chapterPages, Math.max(0, currentIndex), current ? fraction : 0),
    [chapterPages, currentIndex, current, fraction]
  );

  // ---------- opener + body ----------
  const opener = useMemo(() => {
    if (!current) return null;
    return splitChapterOpener(parseBook(current.content), current.title, current.kind === "chapter" ? null : BOOK_SECTION_INFO[current.kind].label);
  }, [current]);

  // ---------- measuring ----------
  useEffect(() => {
    if (view !== "chapter") return;
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;
    const measure = () => setDims({ vw: scrollEl.clientWidth, vh: scrollEl.clientHeight, contentH: contentEl.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scrollEl);
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [view, current?.id]);

  // ---------- scroll bookkeeping ----------
  const syncFraction = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const range = el.scrollHeight - el.clientHeight;
    setFraction(range > 0 ? Math.min(1, Math.max(0, el.scrollTop / range)) : 0);
  }, []);

  const applyPending = useCallback(() => {
    const el = scrollRef.current;
    const f = pendingFraction.current;
    if (!el || f == null) return;
    const range = el.scrollHeight - el.clientHeight;
    if (range <= 0 && f > 0) return; // not laid out yet; the measure effect will retry
    pendingFraction.current = null;
    el.scrollTop = f * range;
    syncFraction();
  }, [syncFraction]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (view !== "chapter" || !el || !current) return;
    if (lastChapterId.current !== current.id) {
      lastChapterId.current = current.id;
      if (pendingFraction.current == null) {
        el.scrollTop = 0;
        setFraction(0);
        // Record that this chapter is now the place, even if they leave before scrolling.
        unsaved.current = { chapterId: current.id, scrollFraction: 0 };
        flushSave();
      }
    }
    applyPending();
  }, [view, current, dims.contentH, applyPending]);

  useEffect(() => {
    if (view === "toc") lastChapterId.current = null;
  }, [view]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !current) return;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        syncFraction();
      });
    }
    if (chromeVisible && Math.abs(el.scrollTop - chromeAnchor.current) > 90) setChromeVisible(false);
    if (menuOpen) setMenuOpen(false);

    const range = el.scrollHeight - el.clientHeight;
    const f = range > 0 ? Math.min(1, Math.max(0, el.scrollTop / range)) : 0;
    // While a saved position is still waiting to be applied the scroller sits at the top: that isn't progress.
    if (pendingFraction.current != null) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    unsaved.current = { chapterId: current.id, scrollFraction: f };
    saveTimer.current = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }

  function handleTap(e: React.MouseEvent) {
    if (window.getSelection()?.toString()) return; // finishing a text selection, not a tap
    if ((e.target as HTMLElement).closest("a,button,input")) return;
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    chromeAnchor.current = scrollRef.current?.scrollTop ?? 0;
    setChromeVisible((v) => !v);
  }

  // ---------- navigation ----------
  function goTo(id: string, f: number, remember = true) {
    if (remember && current) setJumpBack({ chapterId: current.id, fraction, label: current.title });
    pendingFraction.current = f;
    setSheet(null);
    setMenuOpen(false);
    setChromeVisible(false);
    if (id === chapterId && view === "chapter") applyPending();
    else {
      setChapterId(id);
      setView("chapter");
    }
  }
  function openChapterSequential(id: string) {
    setJumpBack(null);
    goTo(id, 0, false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (sheet) setSheet(null);
        else if (menuOpen) setMenuOpen(false);
        return;
      }
      if (view !== "chapter" || sheet || (e.target as HTMLElement | null)?.closest("input,textarea")) return;
      if (e.key === "ArrowRight" && next) openChapterSequential(next.id);
      if (e.key === "ArrowLeft" && prev) openChapterSequential(prev.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sheet, menuOpen, next, prev]);

  // ---------- bookmarks ----------
  const bookmarkWindow = dims.contentH > 0 ? Math.max(0.015, (0.6 * dims.vh) / dims.contentH) : 0.03;
  const marked: BookBookmark | undefined = current
    ? bookmarks.find((b) => b.chapter_id === current.id && Math.abs(b.scroll_fraction - fraction) < bookmarkWindow)
    : undefined;

  function toggleBookmark() {
    if (!current) return;
    if (marked) deleteBookmark.mutate(marked.id);
    else
      addBookmark.mutate({
        chapterId: current.id,
        scrollFraction: fraction,
        snippet: snippetAt(chapterPlainText(current.content), fraction),
      });
  }
  const pageOfBookmark = (b: BookBookmark) => {
    const idx = chapters.findIndex((c) => c.id === b.chapter_id);
    return idx < 0 ? 1 : locate(chapterPages, idx, b.scroll_fraction).page;
  };

  async function share() {
    const url = shareUrl ?? window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* dismissed */
    }
    setMenuOpen(false);
  }

  // ---------- TOC ----------
  if (view === "toc" || !current || !opener) {
    const savedIndex = progress?.current_chapter_id ? chapters.findIndex((c) => c.id === progress.current_chapter_id) : -1;
    const m: PageMetrics = { viewportW: window.innerWidth, viewportH: window.innerHeight, fontSize, lineHeight, padX: PAD_X, maxColumn: MAX_COLUMN };
    const pages = plainLengths.map((n) => estimatePages(n, m));
    const savedOverall = savedIndex >= 0 ? locate(pages, savedIndex, progress?.scroll_fraction ?? 0).overall : 0;
    const startChapter = savedIndex >= 0 ? chapters[savedIndex] : chapters[0];
    const totalMinutes = chapters.reduce((a, c) => a + readingMinutes(chapterPlainText(c.content)), 0);
    return (
      <div className="min-h-screen bg-canvas" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
          <button onClick={onBack} aria-label="Back" className="text-ink">
            <ChevronLeft size={24} />
          </button>
          <p className="truncate text-sm font-medium text-ink">{title}</p>
        </div>
        <div className="mx-auto max-w-xl px-4 pb-10">
          <div className="flex flex-col items-center gap-3 pb-6 pt-8 text-center">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="aspect-[2/3] w-36 rounded-lg object-cover shadow-xl" />
            ) : (
              <div className="flex aspect-[2/3] w-36 items-end rounded-lg bg-surface p-3 text-left shadow-xl">
                <p className="font-display text-base leading-tight text-ink">{title}</p>
              </div>
            )}
            <p className="mt-2 font-display text-xl text-ink">{title}</p>
            <p className="text-xs text-ink-muted">
              {chapters.length} {chapters.length === 1 ? "section" : "sections"} · about {totalMinutes} min read
              {savedOverall > 0 ? ` · ${Math.round(savedOverall * 100)}% read` : ""}
            </p>
            {startChapter && (
              <button
                onClick={() => {
                  setJumpBack(null);
                  pendingFraction.current = savedIndex >= 0 ? (progress?.scroll_fraction ?? 0) : 0;
                  setChapterId(startChapter.id);
                  setView("chapter");
                }}
                className="mt-1 rounded-full bg-accent px-7 py-2.5 text-sm font-semibold text-canvas"
              >
                {savedIndex >= 0 ? "Continue reading" : "Start reading"}
              </button>
            )}
          </div>

          <div className="flex flex-col">
            {chapters.map((c, i) => {
              const read = savedIndex >= 0 && i < savedIndex;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setJumpBack(null);
                    pendingFraction.current = i === savedIndex ? (progress?.scroll_fraction ?? 0) : 0;
                    setChapterId(c.id);
                    setView("chapter");
                  }}
                  className="flex items-center gap-3 border-t border-border px-1 py-3.5 text-left first:border-t-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-muted">{chapterLabel(c)}</span>
                    <span className="block truncate text-[15px] font-medium text-ink">{c.title}</span>
                  </span>
                  <span className="text-xs text-ink-muted">{readingMinutes(chapterPlainText(c.content))} min</span>
                  {read ? <Check size={15} className="text-accent" /> : <ChevronRight size={15} className="text-ink-muted" />}
                </button>
              );
            })}
            {bookDoorway.visible && <FeedDoorway context="book" onEnter={bookDoorway.markEnteredFeed} />}
          </div>
        </div>
        {resumeOffer &&
          (() => {
            const i = chapters.findIndex((c) => c.id === resumeOffer.chapterId);
            return (
              <ResumePrompt
                kind="book"
                where={i >= 0 ? `“${chapters[i].title}”` : "where you stopped"}
                percent={i >= 0 ? ((i + resumeOffer.fraction) / chapters.length) * 100 : null}
                onContinue={continueReading}
                onStartOver={startOver}
              />
            );
          })()}
      </div>
    );
  }

  // ---------- page ----------
  const bodyFont = FONT_STACKS[font];
  const overallPct = Math.round(position.overall * 100);
  const hairline = `1px solid ${theme.rule}`;
  const iconBtn = "flex h-10 w-10 items-center justify-center rounded-full";

  return (
    <div
      className="fixed inset-0 flex select-none flex-col overflow-hidden"
      style={{ background: theme.bg, color: theme.ink, colorScheme: theme.dark ? "dark" : "light" }}
    >
      {/* Status line: always there, like Apple Books */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center" style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}>
        <span className="text-[11px] tracking-wide" style={{ color: theme.muted }}>
          {pagesLeftLabel(position.pagesLeftInChapter)}
        </span>
      </div>

      {/* Return pill after a jump */}
      {jumpBack && !chromeVisible && (
        <button
          onClick={() => {
            goTo(jumpBack.chapterId, jumpBack.fraction, false);
            setJumpBack(null);
          }}
          className="ako-reader-anim absolute left-4 z-20 flex max-w-[46%] items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-md"
          style={{ top: "calc(env(safe-area-inset-top) + 6px)", background: theme.sheet, color: theme.ink, animation: "ako-reader-pop 180ms ease-out" }}
          aria-label={`Return to ${jumpBack.label}`}
        >
          <RotateCcw size={13} />
          <span className="truncate">Return</span>
        </button>
      )}

      {/* Bookmark ribbon when this spot is saved */}
      {marked && (
        <Bookmark
          size={24}
          fill={theme.accent}
          style={{ position: "absolute", right: 20, top: "env(safe-area-inset-top)", zIndex: 10, color: theme.accent, pointerEvents: "none" }}
          aria-label="Bookmarked"
        />
      )}

      {/* Top bar */}
      <div
        className="absolute inset-x-0 top-0 z-30 transition-transform duration-200"
        style={{
          transform: chromeVisible ? "translateY(0)" : "translateY(-105%)",
          background: theme.chrome,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: hairline,
          paddingTop: "env(safe-area-inset-top)",
          pointerEvents: chromeVisible ? "auto" : "none",
        }}
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <button onClick={() => setView("toc")} className="flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 text-[15px]" aria-label="Back to contents">
            <ChevronLeft size={24} />
            <span>Book</span>
          </button>
          <p className="mx-2 min-w-0 flex-1 truncate text-center text-[13px] font-medium" style={{ color: theme.muted }}>
            {current.title}
          </p>
          <div className="flex items-center">
            <button className={iconBtn} aria-label="Search book" onClick={() => setSheet("search")}>
              <Search size={20} />
            </button>
            <button className={iconBtn} aria-label="Themes and settings" onClick={() => setSheet("settings")}>
              <Type size={20} />
            </button>
            <button className={iconBtn} aria-label={marked ? "Remove bookmark" : "Add bookmark"} aria-pressed={!!marked} onClick={toggleBookmark}>
              <Bookmark size={20} fill={marked ? theme.accent : "none"} style={marked ? { color: theme.accent } : undefined} />
            </button>
          </div>
        </div>
      </div>

      {/* The page */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={handleTap}
        className="flex-1 select-text overflow-y-auto overscroll-contain"
        style={{
          padding: `calc(env(safe-area-inset-top) + 40px) ${PAD_X}px calc(env(safe-area-inset-bottom) + 120px)`,
          fontFamily: bodyFont,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div ref={contentRef} style={{ maxWidth: MAX_COLUMN, margin: "0 auto" }}>
          <header style={{ margin: "1.2em 0 2em", textAlign: "center" }}>
            {opener.eyebrow && (
              <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, margin: "0 0 0.9em", fontFamily: FONT_STACKS.sans, fontWeight: 600 }}>
                {opener.eyebrow}
              </p>
            )}
            <h1 style={{ fontSize: fontSize * 1.85, lineHeight: 1.15, fontWeight: theme.heavy ? 800 : 650, margin: 0, textWrap: "balance" }}>{opener.title}</h1>
            <div className="mt-5 flex justify-center" style={{ color: theme.muted }}>
              <svg width={112} height={12} viewBox="0 0 112 12" fill="none" aria-hidden="true">
                <path d="M0 6h44M68 6h44" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                <path d="M56 1.5 60.5 6 56 10.5 51.5 6z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.7" />
              </svg>
            </div>
          </header>

          {opener.body.length > 0 ? (
            <BookRichText
              blocks={opener.body}
              ink={theme.ink}
              muted={theme.muted}
              fontSize={fontSize}
              lineHeight={lineHeight}
              justify={justify}
              heavy={theme.heavy}
              ornament
            />
          ) : (
            <p style={{ color: theme.muted, fontSize }}>Nothing here yet.</p>
          )}

          {/* End of chapter */}
          <div className="mt-14 flex flex-col items-center gap-3 text-center" style={{ fontFamily: FONT_STACKS.sans }}>
            <div style={{ color: theme.muted }}>
              <svg width={112} height={12} viewBox="0 0 112 12" fill="none" aria-hidden="true">
                <path d="M0 6h44M68 6h44" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                <path d="M56 1.5 60.5 6 56 10.5 51.5 6z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.7" />
              </svg>
            </div>
            {next ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
                  Next · {chapterLabel(next)}
                </p>
                <p className="text-[17px] font-semibold" style={{ maxWidth: 420 }}>{next.title}</p>
                <button
                  onClick={() => openChapterSequential(next.id)}
                  className="mt-1 flex items-center gap-1 rounded-full px-5 py-2.5 text-[14px] font-semibold"
                  style={{ background: theme.ink, color: theme.bg }}
                >
                  Continue <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold">You've reached the end of {title}</p>
                <button
                  onClick={() => setView("toc")}
                  className="mt-1 rounded-full px-5 py-2.5 text-[14px] font-semibold"
                  style={{ background: theme.ink, color: theme.bg }}
                >
                  Back to contents
                </button>
              </>
            )}
            {prev && (
              <button onClick={() => openChapterSequential(prev.id)} className="mt-2 flex items-center gap-0.5 text-[13px]" style={{ color: theme.muted }}>
                <ChevronLeft size={14} /> Previous chapter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrubber (with the top bar) */}
      <div
        className="absolute inset-x-3 z-30 rounded-2xl px-4 py-3 transition-all duration-200"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 62px)",
          background: theme.chrome,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: hairline,
          opacity: chromeVisible ? 1 : 0,
          transform: chromeVisible ? "translateY(0)" : "translateY(12px)",
          pointerEvents: chromeVisible ? "auto" : "none",
        }}
      >
        <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: theme.muted }}>
          <span className="truncate pr-3">{current.title}</span>
          <span className="shrink-0 tabular-nums">
            {scrub != null ? `${Math.max(1, Math.round((scrub / 1000) * position.totalPages))} of ${position.totalPages}` : `${overallPct}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          value={scrub ?? Math.round(position.overall * 1000)}
          onChange={(e) => setScrub(Number(e.target.value))}
          onPointerUp={() => {
            if (scrub == null) return;
            const target = resolveOverall(chapterPages, scrub / 1000);
            setScrub(null);
            const c = chapters[target.index];
            if (c) goTo(c.id, target.fraction);
          }}
          onKeyUp={() => {
            if (scrub == null) return;
            const target = resolveOverall(chapterPages, scrub / 1000);
            setScrub(null);
            const c = chapters[target.index];
            if (c) goTo(c.id, target.fraction);
          }}
          aria-label="Position in book"
          className="block w-full"
          style={{ accentColor: theme.ink }}
        />
      </div>

      {/* Footer: page counter + menu button */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        style={{
          height: "calc(env(safe-area-inset-bottom) + 84px)",
          background: `linear-gradient(to top, ${theme.bg} 38%, ${theme.bg}00)`,
        }}
      >
        <p
          className="absolute inset-x-0 text-center text-[12px] tabular-nums"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)", color: theme.muted }}
        >
          {position.page} of {position.totalPages}
        </p>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Reader menu"
          aria-expanded={menuOpen}
          className="pointer-events-auto absolute flex h-11 w-11 items-center justify-center rounded-full shadow-md"
          style={{ right: 16, bottom: "calc(env(safe-area-inset-bottom) + 10px)", background: theme.sheet, color: theme.ink }}
        >
          <List size={20} />
        </button>
      </div>

      {/* Menu popover */}
      {menuOpen && (
        <>
          <div className="absolute inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div
            className="ako-reader-anim absolute z-40 w-[268px] overflow-hidden rounded-2xl shadow-xl"
            style={{
              right: 16,
              bottom: "calc(env(safe-area-inset-bottom) + 64px)",
              background: theme.sheet,
              color: theme.ink,
              transformOrigin: "bottom right",
              animation: "ako-reader-pop 160ms ease-out",
              border: hairline,
            }}
            role="menu"
          >
            {[
              { label: `Contents · ${overallPct}%`, icon: <List size={17} />, run: () => { setContentsTab("contents"); setSheet("contents"); setMenuOpen(false); } },
              { label: "Bookmarks", count: bookmarks.length, icon: <Bookmark size={17} />, run: () => { setContentsTab("bookmarks"); setSheet("contents"); setMenuOpen(false); } },
              { label: "Search Book", icon: <Search size={17} />, run: () => { setSheet("search"); setMenuOpen(false); } },
              { label: "Themes & Settings", icon: <Type size={17} />, run: () => { setSheet("settings"); setMenuOpen(false); } },
            ].map((it, i) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={it.run}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px]"
                style={{ borderTop: i === 0 ? undefined : hairline }}
              >
                <span>{it.label}</span>
                <span className="flex items-center gap-2" style={{ color: theme.muted }}>
                  {it.count ? <span className="text-[13px]">{it.count}</span> : null}
                  {it.icon}
                </span>
              </button>
            ))}
            <div className="grid grid-cols-3" style={{ borderTop: hairline }}>
              <button onClick={share} aria-label="Share" className="flex items-center justify-center py-3">
                <Share size={19} />
              </button>
              <button
                onClick={() => {
                  scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  setMenuOpen(false);
                }}
                aria-label="Back to start of chapter"
                className="flex items-center justify-center py-3"
                style={{ borderLeft: hairline, borderRight: hairline }}
              >
                <ArrowUpToLine size={19} />
              </button>
              <button
                onClick={() => {
                  toggleBookmark();
                  setMenuOpen(false);
                }}
                aria-label={marked ? "Remove bookmark" : "Add bookmark"}
                className="flex items-center justify-center py-3"
              >
                <Bookmark size={19} fill={marked ? theme.accent : "none"} style={marked ? { color: theme.accent } : undefined} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sheets */}
      {sheet === "contents" && (
        <ContentsSheet
          theme={theme}
          chapters={chapters}
          currentId={current.id}
          startPages={startPages}
          bookmarks={bookmarks}
          pageOfBookmark={pageOfBookmark}
          tab={contentsTab}
          onTab={setContentsTab}
          onOpenChapter={(id) => goTo(id, 0)}
          onOpenBookmark={(b) => goTo(b.chapter_id, b.scroll_fraction)}
          onDeleteBookmark={(id) => deleteBookmark.mutate(id)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "search" && <SearchSheet theme={theme} chapters={chapters} onOpenHit={(id, f) => goTo(id, f)} onClose={() => setSheet(null)} />}
      {sheet === "settings" && (
        <SettingsSheet
          theme={theme}
          themeId={themeId}
          onTheme={setThemeId}
          fontSize={fontSize}
          onFontSize={(n) => {
            const next = clampFontSize(n);
            if (next === fontSize) return;
            // Keep the reader on the same sentence while the text reflows (scroll fraction is re-applied after layout).
            pendingFraction.current = fraction;
            setFontSize(next);
          }}
          font={font}
          onFont={setFontPick}
          spacing={spacing}
          onSpacing={setSpacing}
          justify={justify}
          onJustify={setJustify}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
