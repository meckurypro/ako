// src/components/InterestBrowser.tsx
//
// Browse and pick tags (interests): domain pills across the top, then each category's tags as chips.
// Used by onboarding (under its search field) and by Settings → Interests. A search box is optional —
// it matches tag names and their aliases, so "chatgpt" finds Generative AI.
import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { useCategories, type CategoryWithInterests } from "../hooks/useCategories";

interface DomainGroup {
  key: string;
  name: string;
  order: number;
  categories: CategoryWithInterests[];
}

export function matchesInterest(interest: { name: string; aliases?: string[] }, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return interest.name.toLowerCase().includes(needle) || (interest.aliases ?? []).some((a) => a.includes(needle));
}

export function InterestBrowser({
  selected,
  onToggle,
  showSearch = true,
}: {
  selected: Set<string>;
  onToggle: (interestId: string) => void;
  showSearch?: boolean;
}) {
  const { data: categories, isLoading, error } = useCategories();
  const [domainKey, setDomainKey] = useState<string>("all");
  const [query, setQuery] = useState("");

  const domains = useMemo<DomainGroup[]>(() => {
    const byKey = new Map<string, DomainGroup>();
    for (const c of categories ?? []) {
      if (c.interests.length === 0) continue;
      const key = c.domain?.slug ?? "more";
      const group = byKey.get(key) ?? { key, name: c.domain?.name ?? "More", order: c.domain?.sort_order ?? 99, categories: [] };
      group.categories.push(c);
      byKey.set(key, group);
    }
    return [...byKey.values()].sort((a, b) => a.order - b.order);
  }, [categories]);

  if (isLoading) return <p className="py-4 text-sm text-ink-muted">Loading topics…</p>;
  if (error) return <p className="py-4 text-sm text-danger">Couldn't load topics. Check your connection and try again.</p>;

  const searching = query.trim().length > 0;
  const visible = domainKey === "all" ? domains : domains.filter((d) => d.key === domainKey);

  const chip = (id: string, name: string) => {
    const on = selected.has(id);
    return (
      <button
        key={id}
        type="button"
        onClick={() => onToggle(id)}
        aria-pressed={on}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
          on ? "bg-cta text-white border-cta" : "bg-surface text-ink border-border hover:border-accent/50"
        }`}
      >
        {on && <Check size={13} />}
        {name}
      </button>
    );
  };

  return (
    <div>
      {showSearch && (
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics — Music, Startups, Fitness…"
            aria-label="Search topics"
            className="w-full h-10 pl-10 pr-3 rounded-full border border-border bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent/60"
          />
        </div>
      )}

      {searching ? (
        <div className="flex flex-wrap gap-2">
          {(categories ?? [])
            .flatMap((c) => c.interests.filter((i) => matchesInterest(i, query)))
            .slice(0, 40)
            .map((i) => chip(i.id, i.name))}
        </div>
      ) : (
        <>
          <div className="-mx-1 mb-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-1.5 px-1 w-max">
              {[{ key: "all", name: "All" }, ...domains].map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDomainKey(d.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    domainKey === d.key ? "bg-ink text-canvas" : "bg-surface text-ink-muted hover:text-ink"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {visible.flatMap((d) =>
              d.categories.map((c) => (
                <section key={c.id}>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">{c.name}</h3>
                  <div className="flex flex-wrap gap-2">{c.interests.map((i) => chip(i.id, i.name))}</div>
                </section>
              )),
            )}
          </div>
        </>
      )}
    </div>
  );
}
