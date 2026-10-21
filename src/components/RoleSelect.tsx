// src/components/RoleSelect.tsx
// The role field on Create a page and on team invites: a dropdown of the admin-managed roles (A→Z, scrolls
// smoothly) that you can also type into. A title that isn't in the list is accepted too — it goes to the Akọ team
// for approval and shows as the generic title until they decide (see supabase/ako_page_roles_catalogue.sql).
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { usePageRoles } from "../hooks/usePages";
import { GENERIC_ROLE_LABEL, findRole } from "../lib/pageRoles";

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Only changes the wording of the approval note ("your title" vs "their title"). */
  subject?: "you" | "them";
  /** Classes for the input box itself (background, padding, text size). */
  className?: string;
}

export function RoleSelect({
  value,
  onChange,
  placeholder = "Select a role…",
  ariaLabel = "Role",
  subject = "you",
  className = "w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted",
}: RoleSelectProps) {
  const { data: roles = [], isLoading } = usePageRoles();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  // What the list is filtered by. Empty on open so you always see the whole list first; it only narrows once
  // you start typing, so reopening after picking "CEO" doesn't leave you with a list of one.
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(-1);

  const typed = value.trim();
  const exact = findRole(roles, typed);
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? roles.filter((r) => r.toLowerCase().includes(q)) : roles;
  }, [roles, filter]);
  const showCustom = typed.length > 0 && !exact;
  // "Use “…”" sits first when what you typed isn't in the list, so it is never buried under a long scroll.
  const offset = showCustom ? 1 : 0;
  const rowCount = shown.length + offset;

  // Keep the keyboard-highlighted row in view.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function close() {
    setOpen(false);
    setFilter("");
    setActive(-1);
    // Settle on the catalogue's own spelling once you leave the field.
    if (exact && exact !== value) onChange(exact);
  }

  function pick(label: string) {
    onChange(label);
    setOpen(false);
    setFilter("");
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      if (rowCount === 0) return;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % rowCount : (i - 1 + rowCount) % rowCount));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault(); // don't submit the form while picking a row
      if (showCustom && active === 0) pick(typed);
      else pick(shown[active - offset]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  }

  return (
    <div
      ref={wrapRef}
      onBlur={(e) => {
        // Leaving for something inside this component (the list, a row) keeps it open.
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFilter(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          maxLength={60}
          placeholder={placeholder}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className={`${className} pr-10`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Close role list" : "Open role list"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (open ? close() : setOpen(true))}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-ink-muted"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div
            id={listId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="absolute top-full left-0 right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch] z-20 py-1"
          >
            {isLoading ? (
              <p className="px-3 py-2.5 text-sm text-ink-muted">Loading roles…</p>
            ) : (
              <>
                {showCustom && (
                  <button
                    type="button"
                    role="option"
                    tabIndex={-1}
                    data-index={0}
                    aria-selected={false}
                    onClick={() => pick(typed)}
                    onMouseEnter={() => setActive(0)}
                    className={`w-full px-3 py-2.5 flex items-start gap-2 text-left border-b border-border ${active === 0 ? "bg-surface" : "hover:bg-surface"}`}
                  >
                    <Plus size={14} className="shrink-0 mt-0.5 text-accent" />
                    <span className="min-w-0">
                      <span className="block text-sm text-ink truncate">Use “{typed}”</span>
                      <span className="block text-xs text-ink-muted">Sent for approval · shows as {GENERIC_ROLE_LABEL} until then</span>
                    </span>
                  </button>
                )}

                {shown.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    data-index={i + offset}
                    aria-selected={exact === label}
                    onClick={() => pick(label)}
                    onMouseEnter={() => setActive(i + offset)}
                    className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left text-sm text-ink ${active === i + offset ? "bg-surface" : "hover:bg-surface"}`}
                  >
                    <span className="truncate">{label}</span>
                    {exact === label && <Check size={14} className="shrink-0 text-accent" />}
                  </button>
                ))}

                {!showCustom && shown.length === 0 && (
                  <p className="px-3 py-2.5 text-sm text-ink-muted">No roles yet — type yours above.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showCustom && !open && (
        <p className="text-xs text-ink-muted mt-1">
          “{typed}” isn’t in the list yet, so the Akọ team will review it. Until it’s approved, {subject === "them" ? "their" : "your"} title shows as {GENERIC_ROLE_LABEL}.
        </p>
      )}
    </div>
  );
}
