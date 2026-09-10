// src/components/PeoplePicker.tsx
import { useState } from "react";
import { Search, X, Check } from "lucide-react";
import { useMentionSuggestions, type MentionCandidate } from "../hooks/useMentions";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";

interface PeoplePickerProps {
  title: string;
  /** Shown under the title, e.g. "Tagged people appear on this post." */
  subtitle?: string;
  confirmLabel: string;
  /** Pre-selected people — e.g. current collaborators/tags — kept even
   *  if they fall out of the current search results. */
  initialSelected?: MentionCandidate[];
  onConfirm: (selected: MentionCandidate[]) => void;
  onClose: () => void;
}

/**
 * Search-and-select sheet shared by tagging and collaboration invites
 * — same underlying "who do you mean" problem as @mentions, so it
 * reuses useMentionSuggestions rather than a separate search query.
 * Selection persists across searches (kept in local state keyed by
 * id), so picking someone, searching for a second person, and picking
 * them too doesn't lose the first pick.
 */
export function PeoplePicker({
  title,
  subtitle,
  confirmLabel,
  initialSelected = [],
  onConfirm,
  onClose,
}: PeoplePickerProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Map<string, MentionCandidate>>(
    new Map(initialSelected.map((p) => [p.id, p]))
  );
  const { data: suggestions, isLoading } = useMentionSuggestions(query);

  useBackDismiss(onClose);
  useScrollLock();

  function toggle(person: MentionCandidate) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(person.id)) next.delete(person.id);
      else next.set(person.id, person);
      return next;
    });
  }

  // Selected people the current search doesn't happen to include yet,
  // pinned to the top so picks don't visually vanish while searching.
  const pinnedSelected = [...selected.values()].filter(
    (p) => !(suggestions ?? []).some((s) => s.id === p.id)
  );

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />

        <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div>
              <h2 className="font-display text-lg text-ink">{title}</h2>
              {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pt-3 flex-shrink-0">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people…"
                className="w-full pl-10 pr-3 py-2.5 rounded-full border border-border bg-canvas text-ink text-sm
                  focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-3">
            {[...pinnedSelected, ...(suggestions ?? [])].length === 0 && !isLoading ? (
              <p className="text-ink-muted text-sm text-center py-10">
                {query.trim() ? "No one matches that search." : "Start typing a name or username."}
              </p>
            ) : (
              <div className="space-y-1">
                {[...pinnedSelected, ...(suggestions ?? [])].map((person) => {
                  const isSelected = selected.has(person.id);
                  return (
                    <button
                      key={person.id}
                      onClick={() => toggle(person)}
                      className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-canvas text-left"
                    >
                      <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{person.display_name}</p>
                        <p className="text-xs text-ink-muted truncate">@{person.username}</p>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                          isSelected ? "bg-accent border-accent" : "border-border"
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-canvas" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={() => onConfirm([...selected.values()])}
              className="w-full py-3 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
            >
              {confirmLabel}
              {selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
