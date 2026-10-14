// src/components/course/LessonRenderer.tsx
// Renders a lesson's text as a warm, scannable reading page: tinted section cards (🎯 GOAL, ✅ CHECKPOINT,
// 🔧 WHEN IT BREAKS …), numbered step lists, copyable code blocks and inline code/link chips.
// Parsing lives in lib/lessonFormat (pure, shared with native).
import { Check, Copy, Square } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { parseLesson, type Block, type Inline, type ListItem, type Tone } from "../../lib/lessonFormat";
import { useToast } from "../Toast";

const TONE: Record<Tone, { bar: string; card: string; head: string }> = {
  goal: { bar: "bg-accent", card: "bg-accent/10", head: "text-accent" },
  success: { bar: "bg-accent", card: "bg-accent-soft", head: "text-accent" },
  warn: { bar: "bg-pushback", card: "bg-pushback/10", head: "text-pushback" },
  danger: { bar: "bg-danger", card: "bg-danger/10", head: "text-danger" },
  tip: { bar: "bg-accent/60", card: "bg-surface", head: "text-ink" },
  plain: { bar: "bg-border", card: "bg-surface", head: "text-ink" },
};

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.t === "text") return p.v;
        if (p.t === "bold") return <strong key={i} className="font-semibold text-ink">{p.v}</strong>;
        if (p.t === "code") {
          return (
            <code key={i} className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[0.86em] text-ink">
              {p.v}
            </code>
          );
        }
        return (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
            {p.v}
          </a>
        );
      })}
    </>
  );
}

function Para({ parts }: { parts: Inline[] }) {
  return (
    <p className="whitespace-pre-line text-[15px] leading-6 text-ink">
      <Inlines parts={parts} />
    </p>
  );
}

function CodeBlock({ text }: { text: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Copied", { variant: "success" });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Couldn't copy that.", { variant: "error" });
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-ink/10">
      <pre className="overflow-x-auto py-3 pl-3.5 pr-12 font-mono text-[12.5px] leading-[19px] text-ink">{text}</pre>
      <button
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-muted transition-colors hover:text-ink"
      >
        {copied ? <Check size={15} className="text-accent" /> : <Copy size={15} />}
      </button>
    </div>
  );
}

function Marker({ item }: { item: ListItem }) {
  const m = item.marker;
  if (m.kind === "dot") return <span className="mt-[10px] block h-1.5 w-1.5 rounded-full bg-accent" />;
  if (m.kind === "emoji") return <span className="text-[15px] leading-6">{m.v}</span>;
  if (m.kind === "check") return <Square size={17} className="mt-[3px] text-ink-muted" />;
  const label = m.kind === "num" ? m.n : m.v;
  return <span className="mt-px flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{label}</span>;
}

function ListView({ items }: { items: ListItem[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex w-6 flex-shrink-0 justify-center">
            <Marker item={item} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Para parts={item.inline} />
            {item.extra.map((b, j) => (
              <BlockView key={j} block={b} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.k) {
    case "p":
      return <Para parts={block.inline} />;
    case "list":
      return <ListView items={block.items} />;
    case "code":
      return <CodeBlock text={block.text} />;
    case "hr":
      return <hr className="my-1 border-border" />;
    case "heading": {
      const size = block.level === 1 ? "text-[22px] leading-7" : block.level === 2 ? "text-[19px] leading-6" : "text-base leading-6";
      return (
        <p className={`mt-1 font-display font-bold text-ink ${size}`}>
          <Inlines parts={block.inline} />
        </p>
      );
    }
    case "note":
      return (
        <div className="flex overflow-hidden rounded-xl bg-accent/10">
          <div className="w-1 flex-shrink-0 bg-accent" />
          <div className="min-w-0 flex-1 px-3 py-2.5">
            <Para parts={block.inline} />
          </div>
        </div>
      );
    case "section": {
      const t = TONE[block.tone];
      return (
        <section className={`flex overflow-hidden rounded-2xl border border-border ${t.card}`}>
          <div className={`w-1 flex-shrink-0 ${t.bar}`} />
          <div className="min-w-0 flex-1 px-4 pb-4 pt-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-base leading-none">{block.emoji}</span>
              <h4 className={`flex-1 text-[11.5px] font-bold uppercase tracking-[0.08em] ${t.head}`}>{block.title}</h4>
            </div>
            <div className="flex flex-col gap-3">
              {block.blocks.map((b, i) => (
                <BlockView key={i} block={b} />
              ))}
            </div>
          </div>
        </section>
      );
    }
  }
}

export const LessonRenderer = memo(function LessonRenderer({ content }: { content: string }) {
  const parsed = useMemo(() => parseLesson(content), [content]);
  return (
    <div className="flex flex-col gap-3.5">
      {parsed.blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
});
