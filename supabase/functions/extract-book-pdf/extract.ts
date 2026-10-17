// extract.ts — turns a pdf.js document into book chapters (Markdown in the shape src/lib/bookFormat.ts reads).
// Pure: takes a pdf.js PDFDocumentProxy-like object, returns chapters. No Deno / Node / Supabase APIs here,
// so the same file runs in the edge function and in local tests.
//
// Pipeline: text items -> lines -> (drop running headers/footers/page numbers) -> paragraphs + headings
//           -> split into chapters (PDF outline, else detected "Chapter N"/big headings, else page chunks).

export type ChapterKind =
  | "dedication" | "foreword" | "preface" | "introduction" | "prologue" | "chapter"
  | "epilogue" | "afterword" | "acknowledgments" | "about_author" | "appendix";

export interface ExtractedChapter {
  kind: ChapterKind;
  title: string;
  content: string;
}

export interface ExtractResult {
  ok: boolean;
  /** Why nothing usable came out: "no_text" = scanned/image-only PDF. */
  reason?: "no_text" | "too_large";
  pageCount: number;
  strategy?: "outline" | "headings" | "pages";
  chapters: ExtractedChapter[];
}

interface Line {
  text: string;
  size: number;
  x: number;
  y: number; // pdf coords: larger = higher on the page
  width: number;
}

interface PageLines {
  lines: Line[];
  height: number;
  width: number;
}

type Block =
  | { k: "h"; level: 1 | 2 | 3; text: string; chapterStart?: boolean }
  | { k: "p"; text: string }
  | { k: "li"; text: string };

const MAX_PAGES = 1200;
const MAX_TITLE = 120;

// ---------------------------------------------------------------- lines

function groupLines(items: any[]): Line[] {
  const real = items.filter((it) => typeof it.str === "string" && it.transform);
  // Top to bottom, then left to right.
  const sorted = real.slice().sort((a, b) => {
    const dy = b.transform[5] - a.transform[5];
    if (Math.abs(dy) > Math.max(2, Math.min(a.height, b.height) * 0.35)) return dy;
    return a.transform[4] - b.transform[4];
  });
  const lines: { items: any[]; y: number }[] = [];
  for (const it of sorted) {
    const y = it.transform[5];
    const last = lines[lines.length - 1];
    const h = it.height || Math.abs(it.transform[3]) || 10;
    if (last && Math.abs(last.y - y) <= Math.max(2, h * 0.4)) last.items.push(it);
    else lines.push({ items: [it], y });
  }
  const out: Line[] = [];
  for (const l of lines) {
    l.items.sort((a, b) => a.transform[4] - b.transform[4]);
    let text = "";
    let prevEnd: number | null = null;
    let prevH = 10;
    const sizeVotes = new Map<number, number>();
    for (const it of l.items) {
      const h = it.height || Math.abs(it.transform[3]) || 10;
      const x = it.transform[4];
      if (it.str === "" ) {
        continue;
      }
      if (prevEnd !== null) {
        const gap = x - prevEnd;
        const needsSpace = gap > prevH * 0.18 && !text.endsWith(" ") && !it.str.startsWith(" ");
        if (needsSpace) text += " ";
      }
      text += it.str;
      prevEnd = x + (it.width || 0);
      prevH = h;
      const key = Math.round(h * 2) / 2;
      sizeVotes.set(key, (sizeVotes.get(key) ?? 0) + it.str.length);
    }
    text = text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    let size = 10;
    let best = -1;
    for (const [s, n] of sizeVotes) if (n > best) { best = n; size = s; }
    const first = l.items[0];
    const lastIt = l.items[l.items.length - 1];
    out.push({
      text,
      size,
      x: first.transform[4],
      y: l.y,
      width: lastIt.transform[4] + (lastIt.width || 0) - first.transform[4],
    });
  }
  return out;
}

// ---------------------------------------------------------------- cleanup

const normRepeat = (t: string) => t.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
const PAGE_NUMBER_RE = /^(page\s+)?[-–—\s]*(\d{1,4}|[ivxlcdm]{1,7})[-–—\s]*(of\s+\d+)?$/i;

/** Remove running headers/footers (text repeated across pages near the edges) and bare page numbers. */
function stripFurniture(pages: PageLines[]): void {
  const n = pages.length;
  const counts = new Map<string, number>();
  for (const p of pages) {
    const seen = new Set<string>();
    for (const l of p.lines) {
      const edge = l.y > p.height * 0.9 || l.y < p.height * 0.1;
      if (!edge) continue;
      const k = normRepeat(l.text);
      if (seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.ceil(n * 0.3));
  for (const p of pages) {
    p.lines = p.lines.filter((l) => {
      const edge = l.y > p.height * 0.9 || l.y < p.height * 0.1;
      if (!edge) return true;
      if (PAGE_NUMBER_RE.test(l.text)) return false;
      if (n >= 6 && (counts.get(normRepeat(l.text)) ?? 0) >= threshold) return false;
      return true;
    });
  }
}

// ---------------------------------------------------------------- blocks

const NUMBER_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty";
const CHAPTER_RE = new RegExp(
  "^(chapter|part|section|unit|lesson|book|act)\\s+(\\d{1,3}|[ivxlcdm]{1,7}|" + NUMBER_WORDS + ")\\b[\\s.:–—-]*(.*)$",
  "i"
);
const BULLET_RE = /^([•▪◦●▸‣·\u2022\u25CF\-–—*])\s+(.+)$/;
const NUMBERED_RE = /^(\d{1,3}[.)])\s+(.+)$/;

function medianBodySize(pages: PageLines[]): number {
  const votes = new Map<number, number>();
  for (const p of pages) for (const l of p.lines) {
    const k = Math.round(l.size * 2) / 2;
    votes.set(k, (votes.get(k) ?? 0) + l.text.length);
  }
  let best = 10;
  let n = -1;
  for (const [s, c] of votes) if (c > n) { n = c; best = s; }
  return best;
}

/** Escape what the book parser would read as inline formatting. */
function esc(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/`/g, "\\`");
}

/** A paragraph that starts with a block marker would be re-read as a heading/quote/list — defuse it. */
function defuse(t: string): string {
  return /^(#|>|\||```|[-*+•▸▪◦●]\s|\d{1,3}[.)]\s|([-*_])(\s*\2){2,}$)/.test(t) ? "\u200B" + t : t;
}

function pageBlocks(page: PageLines, body: number): Block[] {
  const blocks: Block[] = [];
  const lines = page.lines;
  const maxWidth = Math.max(1, ...lines.map((l) => l.width));
  let para: Line[] = [];
  let prev: Line | null = null;

  const flush = () => {
    if (!para.length) return;
    let text = "";
    for (const l of para) {
      if (!text) text = l.text;
      else if (/[A-Za-z\u00C0-\u024F]-$/.test(text) && /^[a-z\u00C0-\u024F]/.test(l.text)) text = text.slice(0, -1) + l.text;
      else text += " " + l.text;
    }
    blocks.push({ k: "p", text: text.trim() });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const chap = CHAPTER_RE.exec(l.text);
    const isBig = l.size >= body * 1.3 && l.text.length <= 110;
    const isMid = l.size >= body * 1.12 && l.size < body * 1.3 && l.text.length <= 90 && !/[.,;]$/.test(l.text);

    if (isBig || (chap && l.text.length <= 100 && (l.size >= body * 1.05 || l.text.length <= 40))) {
      flush();
      // Join a wrapped multi-line title ("Chapter 3" + big title line, or a title that wraps).
      let text = l.text;
      let consumed = 0;
      while (i + 1 + consumed < lines.length) {
        const nx = lines[i + 1 + consumed];
        const sameBig = Math.abs(nx.size - l.size) < 0.6 && l.y - nx.y < l.size * 2.2 && nx.text.length <= 90;
        const titleAfterNumber = !!chap && !chap[3] && nx.size >= body * 1.05 && nx.text.length <= 90 && l.y - nx.y < l.size * 3;
        if (sameBig || titleAfterNumber) {
          text += (titleAfterNumber ? ": " : " ") + nx.text;
          consumed++;
          if (titleAfterNumber) break;
        } else break;
      }
      i += consumed;
      const level: 1 | 2 | 3 = l.size >= body * 1.6 || chap ? 1 : 2;
      blocks.push({ k: "h", level, text: text.replace(/\s+/g, " "), chapterStart: !!chap || l.size >= body * 1.5 });
      prev = null;
      continue;
    }
    if (isMid && l.text.split(" ").length <= 12) {
      flush();
      blocks.push({ k: "h", level: 3, text: l.text });
      prev = null;
      continue;
    }

    const bullet = BULLET_RE.exec(l.text) || NUMBERED_RE.exec(l.text);
    if (bullet && l.text.length > 3) {
      flush();
      blocks.push({ k: "li", text: (BULLET_RE.test(l.text) ? "- " : bullet[1] + " ") + bullet[2] });
      prev = l;
      continue;
    }
    // A wrapped bullet continues on the next, indented line.
    const last = blocks[blocks.length - 1];
    if (para.length === 0 && last && last.k === "li" && prev && prev.y - l.y < prev.size * 1.9 && l.x > (lines[i - 1]?.x ?? 0) - 2) {
      last.text += " " + l.text;
      prev = l;
      continue;
    }

    if (prev) {
      const gap = prev.y - l.y;
      const bigGap = gap > prev.size * 1.75;
      const prevShort = prev.width < maxWidth * 0.72 && /[.!?:”"')\]]$/.test(prev.text);
      if (bigGap || prevShort) flush();
    }
    para.push(l);
    prev = l;
  }
  flush();
  return blocks;
}

// ---------------------------------------------------------------- markdown

function blocksToMarkdown(blocks: Block[], skipTitle?: string): string {
  const out: string[] = [];
  let skipping = !!skipTitle;
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const title = skipTitle ? norm(skipTitle) : "";
  let listOpen = false;
  let prevParaEndsOpen = false;

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    if (skipping && b.k === "h") {
      const t = norm(b.text);
      if (t && (title.includes(t) || t.includes(title))) continue;
    }
    if (b.k !== "h") skipping = false;
    if (b.k === "h") skipping = false;

    if (b.k === "li") {
      out.push((listOpen ? "\n" : "\n\n") + esc(b.text));
      listOpen = true;
      continue;
    }
    listOpen = false;
    if (b.k === "h") {
      out.push("\n\n" + "#".repeat(b.level === 1 ? 2 : b.level === 2 ? 2 : 3) + " " + esc(b.text));
      prevParaEndsOpen = false;
      continue;
    }
    // A paragraph cut by a page break continues the previous one.
    if (prevParaEndsOpen && /^[a-z\u00C0-\u024F]/.test(b.text) && out.length) {
      out[out.length - 1] += " " + esc(b.text);
    } else {
      out.push("\n\n" + defuse(esc(b.text)));
    }
    prevParaEndsOpen = !/[.!?:”"')\]]$/.test(b.text);
  }
  return out.join("").replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------- kinds / titles

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

// ---------------------------------------------------------------- outline

async function outlineStarts(doc: any, pageCount: number): Promise<{ title: string; page: number }[]> {
  let outline: any[] | null = null;
  try {
    outline = await doc.getOutline();
  } catch {
    outline = null;
  }
  if (!outline || outline.length === 0) return [];

  async function pageOf(item: any): Promise<number | null> {
    try {
      let dest = item.dest;
      if (typeof dest === "string") dest = await doc.getDestination(dest);
      if (!Array.isArray(dest) || !dest[0]) return null;
      const ref = dest[0];
      if (typeof ref === "number") return ref;
      return await doc.getPageIndex(ref);
    } catch {
      return null;
    }
  }

  // A lone top-level wrapper (the book's own title) -> use its children.
  let level = outline;
  if (level.length === 1 && level[0].items?.length >= 2) level = level[0].items;

  const found: { title: string; page: number }[] = [];
  for (const it of level) {
    const page = await pageOf(it);
    const title = (it.title || "").replace(/\s+/g, " ").trim();
    if (page === null || page < 0 || page >= pageCount || !title) continue;
    found.push({ title, page });
  }
  // Keep one entry per page, in page order.
  found.sort((a, b) => a.page - b.page);
  const dedup: { title: string; page: number }[] = [];
  for (const f of found) if (!dedup.length || dedup[dedup.length - 1].page !== f.page) dedup.push(f);
  return dedup;
}

// ---------------------------------------------------------------- main

export async function extractChapters(doc: any, opts: { pagesPerChunk?: number } = {}): Promise<ExtractResult> {
  const pageCount: number = doc.numPages;
  if (pageCount > MAX_PAGES) return { ok: false, reason: "too_large", pageCount, chapters: [] };

  const pages: PageLines[] = [];
  let chars = 0;
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const view = page.view as number[];
    const height = view[3] - view[1];
    const width = view[2] - view[0];
    const tc = await page.getTextContent();
    const lines = groupLines(tc.items as any[]);
    for (const l of lines) chars += l.text.length;
    pages.push({ lines, height, width });
    page.cleanup?.();
  }

  // Scanned / image-only PDFs have (almost) no text layer — nothing to reflow.
  if (chars < 40 * pageCount && chars < 1500) return { ok: false, reason: "no_text", pageCount, chapters: [] };

  stripFurniture(pages);
  const body = medianBodySize(pages);
  const perPage: Block[][] = pages.map((p) => pageBlocks(p, body));

  const build = (from: number, to: number, skipTitle?: string, dropLeadHeading = false): string => {
    let blocks = perPage.slice(from, to).flat();
    if (dropLeadHeading && blocks[0]?.k === "h") blocks = blocks.slice(1);
    return blocksToMarkdown(blocks, skipTitle);
  };

  // 1) The PDF's own table of contents.
  const starts = await outlineStarts(doc, pageCount);
  if (starts.length >= 2) {
    const chapters: ExtractedChapter[] = [];
    if (starts[0].page > 0) {
      const lead = build(0, starts[0].page);
      if (lead.length > 400) chapters.push({ kind: "chapter", title: "Front matter", content: lead });
    }
    for (let i = 0; i < starts.length; i++) {
      const end = i + 1 < starts.length ? starts[i + 1].page : pageCount;
      const content = build(starts[i].page, end, starts[i].title);
      if (!content) continue;
      chapters.push({ kind: kindFor(starts[i].title), title: clampTitle(starts[i].title), content });
    }
    if (chapters.length >= 2) return { ok: true, pageCount, strategy: "outline", chapters };
  }

  // 2) Chapter-looking headings found in the text.
  const headStarts: { page: number; index: number; title: string }[] = [];
  perPage.forEach((blocks, pi) => {
    blocks.forEach((b, bi) => {
      if (b.k === "h" && b.chapterStart && b.level === 1 && bi <= 2) headStarts.push({ page: pi, index: bi, title: b.text });
    });
  });
  if (headStarts.length >= 2) {
    const chapters: ExtractedChapter[] = [];
    const firstBlocks = perPage.slice(0, headStarts[0].page).flat();
    const leadPages = perPage.slice(0, headStarts[0].page + 1).flat().slice(0, firstBlocks.length + headStarts[0].index);
    const lead = blocksToMarkdown(leadPages);
    if (lead.length > 400) chapters.push({ kind: "chapter", title: "Front matter", content: lead });
    for (let i = 0; i < headStarts.length; i++) {
      const s = headStarts[i];
      const e = headStarts[i + 1];
      let blocks: Block[] = [];
      for (let p = s.page; p <= (e ? e.page : pageCount - 1); p++) {
        let pb = perPage[p];
        if (p === s.page) pb = pb.slice(s.index + 1);
        if (e && p === e.page) pb = pb.slice(0, p === s.page ? e.index - s.index - 1 : e.index);
        blocks = blocks.concat(pb);
      }
      const content = blocksToMarkdown(blocks);
      if (!content) continue;
      chapters.push({ kind: kindFor(s.title), title: clampTitle(s.title), content });
    }
    if (chapters.length >= 2) return { ok: true, pageCount, strategy: "headings", chapters };
  }

  // 3) No structure to find: fixed-size runs of pages, so the reader still gets a table of contents.
  const chunk = opts.pagesPerChunk ?? 10;
  const chapters: ExtractedChapter[] = [];
  for (let from = 0; from < pageCount; from += chunk) {
    const to = Math.min(pageCount, from + chunk);
    const content = build(from, to);
    if (!content) continue;
    chapters.push({
      kind: "chapter",
      title: to - from === 1 ? `Page ${from + 1}` : `Pages ${from + 1}–${to}`,
      content,
    });
  }
  return { ok: chapters.length > 0, pageCount, strategy: "pages", chapters };
}
