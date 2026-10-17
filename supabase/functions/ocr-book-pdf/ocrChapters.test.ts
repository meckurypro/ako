// Run: node --experimental-strip-types ocrChapters.test.ts   (no framework needed)
import { chaptersFromOcrPages, sanitizeInline } from "./ocrChapters.ts";
import assert from "node:assert/strict";

const lorem = (n: number, seed = "word") => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(" ") + ".";

// 1) Chapter words + running header/footer + page numbers + a paragraph cut by a page break + hostile markup.
{
  const pages: string[] = [];
  for (let p = 0; p < 24; p++) {
    const parts = ["THE LONG ROAD", ""];
    if (p === 0) parts.push("# Preface", "", lorem(80, "pre"));
    if (p === 2) parts.push("Chapter 1", "", "# The Beginning", "", lorem(80, "a"));
    else if (p === 9) parts.push("Chapter 2", "", lorem(60, "b") + " and then the road con-", "");
    else if (p === 10) parts.push("tinued past the river. " + lorem(40, "b2"));
    else if (p === 16) parts.push("Chapter 3", "", "![x](https://evil.example/t.png) [click](https://evil.example) <script>x</script>" + lorem(60, "c"));
    else if (p !== 0) parts.push(lorem(90, "body" + p));
    parts.push("", String(p + 1));
    pages.push(parts.join("\n"));
  }
  const r = chaptersFromOcrPages(pages);
  assert.equal(r.ok, true);
  assert.equal(r.strategy, "chapters");
  const titles = r.chapters.map((c) => c.title);
  assert.ok(titles.some((t) => t.startsWith("Chapter 1: The Beginning")), titles.join("|"));
  assert.ok(titles.includes("Chapter 2") && titles.includes("Chapter 3"), titles.join("|"));
  const all = r.chapters.map((c) => c.content).join("\n");
  assert.ok(!/THE LONG ROAD/.test(all), "running head removed");
  assert.ok(!/evil\.example|<script|!\[/.test(all), "hostile markup removed");
  assert.ok(/continued past the river/.test(all) && /road continued/.test(all.replace(/\s+/g, " ")), "hyphenated page-break paragraph rejoined");
  assert.ok(!/\n\d{1,2}\n/.test(all), "page numbers removed");
}

// 2) '#' on every page is a running head, not chapters -> falls back to page runs.
{
  const pages = Array.from({ length: 20 }, (_, p) => `# Some Book\n\n${lorem(70, "t" + p)}`);
  const r = chaptersFromOcrPages(pages);
  assert.equal(r.strategy, "pages");
  assert.equal(r.chapters[0].title, "Pages 1–10");
}

// 3) Real top-level headings are used.
{
  const pages = Array.from({ length: 20 }, (_, p) => (p % 5 === 0 ? `# Part ${p / 5 + 1} Story\n\n` : "") + lorem(70, "s" + p));
  const r = chaptersFromOcrPages(pages);
  assert.ok(r.ok && r.chapters.length >= 4, JSON.stringify(r.chapters.map((c) => c.title)));
}

// 4) Empty OCR -> no_text; sanitizer.
assert.deepEqual(chaptersFromOcrPages(["", " ", "3"]).reason, "no_text");
assert.equal(sanitizeInline("a [b](javascript:alert(1)) ![i](http://x/y.png) `c`"), "a b 'c'");
console.log("ocrChapters: all tests passed");
