// ocrChapters.ts — turns per-page OCR Markdown (one string per PDF page) into book chapters, in the same shape
// extract-book-pdf writes (Markdown the reader's bookFormat.ts parses). Pure: no Deno / Supabase APIs, so it runs in
// the edge function and in local tests.
//
// OCR output is UNTRUSTED text. Before it is stored it is sanitised: images are dropped (the reader would fetch a
// remote URL), links keep their label only, raw HTML is stripped. Nothing here can make the reader load anything.
//
// Pipeline: clean pages -> blocks -> drop running headers/footers/page numbers -> merge paragraphs cut by a page
//           break -> split into chapters ("Chapter N" lines, else top-level headings, else page runs).
//
// kindFor / CHAPTER_RE mirror extract-book-pdf/extract.ts — keep the two in sync.

export type ChapterKind =
  | "dedication" | "foreword" | "preface" | "introduction" | "prologue" | "chapter"
  | "epilogue" | "afterword" | "acknowledgments" | "about_author" | "appendix";

export interface OcrChapter {
  kind: ChapterKind;
  title: string;
  content: string;
}

export interface OcrBuildResult {
  ok: boolean;
  /** "no_text" = the OCR found (almost) nothing to read. */
  reason?: "no_text";
  strategy?: "chapters" | "headings" | "pages";
  chapters: OcrChapter[];
}

type Block =
  | { k: "h"; level: number; text: string; page: number }
  | { k: "p"; text: string; page: number }
  | { k: "list"; text: string; page: number }
  | { k: "table"; text: string; page: number }
  | { k: "quote"; text: string; page: number }
  | { k: "hr"; text: string; page: number };

const MAX_TITLE = 120;
const NUMBER_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty";
const CHAPTER_RE = new RegExp(
  "^(chapter|part|section|unit|lesson|book|act)\\s+(\\d{1,3}|[ivxlcdm]{1,7}|" + NUMBER_WORDS + ")\\b[\\s.:–—-]*(.*)$",
  "i"
);
const PAGE_NUMBER_RE = /^(page\s+)?[-–—\s]*(\d{1,4}|[ivxlcdm]{1,7})[-–—\s]*(of\s+\d+)?$/i;
const normRepeat = (t: string) => t.toLowerCase().replace(/\d+/g, "#").replace(/[^\p{L}\p{N}#]+/gu, " ").trim();

function kindFor(title: string): ChapterKind {
  const t = title.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (/^dedication\b/.test(t)) return "dedication";
  if (/^foreword\b/.test(t)) return "foreword";
  if (/^preface\b/.test(t)) return "preface";
  if (/^(introduction|intro)\b/.test(t)) return "introduction";
  if (/^prologue\b/.test(t)) return "prologue";
  if (/^epilogue\b/.test(t)) return "epilogue";
  if (/^afterword\b/.test(t)) return "afterword";
  if (/^(acknowledg(e)?ments?|acknowledgements)\b/.test(t)) return "acknowledgments";
  if (/^about the (author|authors|writer)\b/.test(t)) return "about_author";
  if (/^appendix\b|^appendices\b/.test(t)) return "appendix";
  return "chapter";
}

const clampTitle = (t: string) => {
  const s = t.replace(/\s+/g, " ").replace(/^[\u200B\s]+/, "").trim() || "Untitled";
  return s.length <= MAX_TITLE ? s : s.slice(0, MAX_TITLE - 1).trimEnd() + "…";
};

// ---------------------------------------------------------------- sanitising

/** Strip everything from OCR text that could make the reader fetch or open something. */
export function sanitizeInline(t: string): string {
  return t
    .replace(/!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g, "") // images (target may hold one level of parens)
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1") // links -> label
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]{1,200}>/g, "") // any other tag
    .replace(/`+/g, "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// ---------------------------------------------------------------- blocks

function pageToBlocks(md: string, page: number): Block[] {
  const text = md.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  const out: Block[] = [];
  for (const raw of text.split(/\n{2,}/)) {
    const lines = raw.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
    if (!lines.length) continue;
    const first = lines[0].trim();

    const heading = /^(#{1,6})\s+(.+)$/.exec(first);
    if (heading && lines.length === 1) {
      const t = sanitizeInline(heading[2].replace(/[*_]+/g, ""));
      if (t) out.push({ k: "h", level: heading[1].length, text: t, page });
      continue;
    }
    if (/^([-*_])(\s*\1){2,}$/.test(first) && lines.length === 1) {
      out.push({ k: "hr", text: "---", page });
      continue;
    }
    if (first.startsWith("|")) {
      const t = lines.map((l) => sanitizeInline(l)).filter(Boolean).join("\n");
      if (t) out.push({ k: "table", text: t, page });
      continue;
    }
    if (first.startsWith(">")) {
      const t = lines.map((l) => "> " + sanitizeInline(l.replace(/^\s*>\s?/, ""))).join("\n");
      out.push({ k: "quote", text: t, page });
      continue;
    }
    if (/^(\s*)([-*+•]|\d{1,3}[.)])\s+\S/.test(lines[0])) {
      const t = lines
        .map((l) => {
          const m = /^(\s*)([-*+•]|\d{1,3}[.)])\s+(.*)$/.exec(l);
          return m ? m[1] + (/^\d/.test(m[2]) ? m[2] : "-") + " " + sanitizeInline(m[3]) : sanitizeInline(l);
        })
        .join("\n");
      out.push({ k: "list", text: t, page });
      continue;
    }
    // A heading line glued to the paragraph below it: split it off.
    let rest = lines;
    if (heading) {
      const t = sanitizeInline(heading[2].replace(/[*_]+/g, ""));
      if (t) out.push({ k: "h", level: heading[1].length, text: t, page });
      rest = lines.slice(1);
    }
    // Soft-wrapped lines inside a paragraph are one paragraph.
    let para = "";
    for (const l of rest) {
      const s = sanitizeInline(l);
      if (!s) continue;
      if (!para) para = s;
      else if (/[\p{L}]-$/u.test(para) && /^[\p{Ll}]/u.test(s)) para = para.slice(0, -1) + s; // hyphenated line break
      else para += " " + s;
    }
    if (para) out.push({ k: "p", text: para, page });
  }
  return out;
}

const plainOf = (b: Block) => b.text.replace(/[*_#>|`-]+/g, " ").replace(/\s+/g, " ").trim();

/** Remove running headers/footers (short text repeated across pages at the top/bottom) and bare page numbers. */
function stripFurniture(pages: Block[][]): void {
  const n = pages.length;
  const edgeOf = (blocks: Block[]) => {
    const e: Block[] = [];
    if (blocks.length) e.push(blocks[0]);
    if (blocks.length > 1) e.push(blocks[blocks.length - 1]);
    return e.filter((b) => (b.k === "p" || b.k === "h") && b.text.length <= 90);
  };
  const counts = new Map<string, number>();
  for (const blocks of pages) {
    const seen = new Set<string>();
    for (const b of edgeOf(blocks)) {
      const k = normRepeat(plainOf(b));
      if (!k || seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.ceil(n * 0.3));
  for (let i = 0; i < pages.length; i++) {
    const blocks = pages[i];
    const edges = new Set(edgeOf(blocks));
    pages[i] = blocks.filter((b) => {
      if (!edges.has(b)) return true;
      const plain = plainOf(b);
      if (PAGE_NUMBER_RE.test(plain)) return false;
      if (n >= 6 && (counts.get(normRepeat(plain)) ?? 0) >= threshold) return false;
      return true;
    });
  }
}

/** Join a paragraph the page break cut in two. */
function mergeAcrossPages(pages: Block[][]): Block[] {
  const all: Block[] = [];
  for (const blocks of pages) {
    for (const b of blocks) {
      const prev = all[all.length - 1];
      if (
        prev && prev.k === "p" && b.k === "p" && prev.page !== b.page &&
        !/[.!?:;”"')\]]$/.test(prev.text) && /^[\p{Ll}]/u.test(b.text)
      ) {
        prev.text = /[\p{L}]-$/u.test(prev.text) ? prev.text.slice(0, -1) + b.text : prev.text + " " + b.text;
      } else {
        all.push({ ...b });
      }
    }
  }
  return all;
}

// ---------------------------------------------------------------- markdown out

/** A paragraph that starts with a block marker would be re-read as a heading/quote/list — defuse it. */
function defuse(t: string): string {
  return /^(#|>|\||```|[-*+•▸▪◦●]\s|\d{1,3}[.)]\s|([-*_])(\s*\2){2,}$)/.test(t) ? "\u200B" + t : t;
}

function toMarkdown(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.k === "h") out.push("\n\n" + (b.level <= 2 ? "##" : "###") + " " + b.text);
    else if (b.k === "p") out.push("\n\n" + defuse(b.text));
    else out.push("\n\n" + b.text); // list / table / quote / hr are already in the reader's own syntax
  }
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------- chapters

interface Start {
  at: number; // block index where the chapter begins
  skip: number; // how many blocks from `at` are the title (dropped from the body)
  title: string;
}

function chapterWordStarts(blocks: Block[]): Start[] {
  const starts: Start[] = [];
  blocks.forEach((b, i) => {
    if ((b.k !== "p" && b.k !== "h") || b.text.length > 70) return;
    const m = CHAPTER_RE.exec(b.text.replace(/[*_]+/g, "").trim());
    if (!m) return;
    // Only at the head of a page: "see chapter 3" mid-paragraph is not a start (and those are long anyway).
    const pageStart = i === 0 || blocks[i - 1].page !== b.page;
    if (!pageStart && b.k !== "h") return;
    let title = b.text.replace(/[*_]+/g, "").trim();
    let skip = 1;
    const next = blocks[i + 1];
    if (!m[3] && next && (next.k === "h" || (next.k === "p" && next.text.length <= 80 && !/[.!?]$/.test(next.text)))) {
      title = title + ": " + next.text.replace(/[*_]+/g, "").trim();
      skip = 2;
    }
    starts.push({ at: i, skip, title });
  });
  return starts;
}

function headingStarts(blocks: Block[], level: number): Start[] {
  const starts: Start[] = [];
  blocks.forEach((b, i) => {
    if (b.k === "h" && b.level === level) starts.push({ at: i, skip: 1, title: b.text });
  });
  return starts;
}

export function chaptersFromOcrPages(rawPages: string[], opts: { pagesPerChunk?: number } = {}): OcrBuildResult {
  const pageCount = rawPages.length;
  const pages = rawPages.map((md, i) => pageToBlocks(md ?? "", i));
  const chars = pages.reduce((n, bl) => n + bl.reduce((m, b) => m + b.text.length, 0), 0);
  if (chars < 40 * Math.max(pageCount, 1) && chars < 1500) return { ok: false, reason: "no_text", chapters: [] };

  stripFurniture(pages);
  const blocks = mergeAcrossPages(pages);
  if (!blocks.length) return { ok: false, reason: "no_text", chapters: [] };

  const split = (starts: Start[]): OcrChapter[] => {
    const chapters: OcrChapter[] = [];
    const lead = toMarkdown(blocks.slice(0, starts[0].at));
    if (lead.length > 400) chapters.push({ kind: "chapter", title: "Front matter", content: lead });
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].at : blocks.length;
      const content = toMarkdown(blocks.slice(s.at + s.skip, end));
      if (!content) return;
      chapters.push({ kind: kindFor(s.title), title: clampTitle(s.title), content });
    });
    return chapters;
  };

  // A split is believable only if chapters average at least ~2 pages: a "#" on every page is a running head.
  const plausible = (n: number) => n >= 2 && n <= Math.max(2, Math.floor(pageCount / 2));

  const byWord = chapterWordStarts(blocks);
  if (plausible(byWord.length)) {
    const chapters = split(byWord);
    if (chapters.length >= 2) return { ok: true, strategy: "chapters", chapters };
  }
  for (const level of [1, 2]) {
    const hs = headingStarts(blocks, level);
    if (plausible(hs.length)) {
      const chapters = split(hs);
      if (chapters.length >= 2) return { ok: true, strategy: "headings", chapters };
    }
  }

  // No structure to find: fixed runs of pages, so the reader still gets a table of contents.
  const chunk = opts.pagesPerChunk ?? 10;
  const chapters: OcrChapter[] = [];
  for (let from = 0; from < pageCount; from += chunk) {
    const to = Math.min(pageCount, from + chunk);
    const content = toMarkdown(blocks.filter((b) => b.page >= from && b.page < to));
    if (!content) continue;
    chapters.push({ kind: "chapter", title: to - from === 1 ? `Page ${from + 1}` : `Pages ${from + 1}–${to}`, content });
  }
  return { ok: chapters.length > 0, strategy: "pages", chapters, ...(chapters.length ? {} : { reason: "no_text" as const }) };
}
