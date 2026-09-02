// src/components/EmojiPickerSheet.tsx
import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { EMOJI_CATEGORIES, searchEmojis } from "../lib/emojiData";

interface EmojiPickerSheetProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

/**
 * Full emoji picker — bottom sheet with search + category tabs + grid,
 * modeled on WhatsApp's picker. Curated emoji set in lib/emojiData.ts
 * (not the full Unicode set) — search matches against each entry's
 * hand-written `name`, not full CLDR keyword data.
 */
export function EmojiPickerSheet({ onSelect, onClose }: EmojiPickerSheetProps) {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].key);
  const [query, setQuery] = useState("");

  const results = useMemo(() => (query.trim() ? searchEmojis(query) : null), [query]);
  const activeEmojis = results ?? EMOJI_CATEGORIES.find((c) => c.key === activeCategory)?.emojis ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-medium text-ink text-sm">Emoji</h3>
          <button onClick={onClose} className="text-ink-muted" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emoji…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-border bg-canvas text-ink text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>
        </div>

        {!query.trim() && (
          <div className="flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  activeCategory === cat.key ? "bg-accent text-canvas" : "bg-accent-soft text-ink-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {activeEmojis.length === 0 ? (
            <p className="text-ink-muted text-center text-sm py-8">No emoji found.</p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {activeEmojis.map((entry) => (
                <button
                  key={entry.char}
                  onClick={() => onSelect(entry.char)}
                  className="text-2xl leading-none aspect-square flex items-center justify-center rounded-lg hover:bg-accent-soft active:scale-90 transition-transform"
                  aria-label={entry.name}
                >
                  {entry.char}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
