// src/components/DropdownMenu.tsx
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";

export interface DropdownMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  /** e.g. an unread-count pill, rendered flush right */
  badge?: ReactNode;
}

interface DropdownMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  items: (DropdownMenuItem | "divider")[];
  onClose: () => void;
  widthClass?: string;
}

const ROW_HEIGHT = 52; // ~13 x 4 — matches WhatsApp's roomy row scale
const VIEWPORT_MARGIN = 8;

// Safety-net only — see runAfterDismiss below for why this exists.
const DISMISS_FALLBACK_MS = 200;

/**
 * Runs `action` only once this menu's dismiss has actually finished,
 * instead of guessing with a fixed-delay timer.
 *
 * useBackDismiss pushes a dummy history entry while the menu is open
 * and pops it (`history.back()`) when the menu unmounts. Per spec —
 * and confirmed across Chrome/Firefox/Safari — the `popstate` that
 * pop produces fires *asynchronously*, on its own task, with no
 * guaranteed ordering against anything else queued around the same
 * time, including a `setTimeout(fn, 0)`.
 *
 * That's a problem for any item whose onSelect() itself navigates
 * (pushState, via react-router's navigate()): if the item's own push
 * happens to run before the still-in-flight back() resolves, the
 * pop then removes the entry that was JUST pushed instead of the
 * dummy one — the navigation lands, then silently reverts a moment
 * later. A fixed setTimeout only ever *happened* to dodge this often
 * enough to look fixed; it isn't one.
 *
 * Listening for the real popstate event removes the guesswork —
 * `action` runs exactly when the dismiss has genuinely completed,
 * never before. `DISMISS_FALLBACK_MS` is only a safety net for the
 * (rare) case no popstate ever arrives at all, so a tap can't get
 * silently swallowed.
 */
function runAfterDismiss(close: () => void, action: () => void) {
  let done = false;
  let fallback: number;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("popstate", finish);
    window.clearTimeout(fallback);
    action();
  };
  window.addEventListener("popstate", finish);
  fallback = window.setTimeout(finish, DISMISS_FALLBACK_MS);
  close();
}

/**
 * Shared three-dot / kebab menu panel. Renders via the shared
 * <Portal> component straight onto `document.body` — needed for the
 * same reason Portal itself documents: a menu triggered from inside
 * ProjectCard/PostCard can be mounted inside SwipeableTabs, whose
 * translateX transform would otherwise hijack this panel's `position:
 * fixed` containing block. Positioned from the trigger button's own
 * rect, so it can never be clipped by a scroll container or an
 * `overflow-hidden` card the trigger happens to sit inside either
 * (the bug behind menus getting truncated), and it always renders
 * above everything else regardless of local stacking contexts.
 *
 * Flips to open upward when there isn't enough room below the
 * trigger, and caps its own height with `overflow-y-auto` +
 * `scroll-smooth` so a long list scrolls in place instead of running
 * off the bottom of the screen.
 *
 * Caller is expected to render this conditionally — `{open &&
 * <DropdownMenu ... />}` — matching the existing pattern everywhere
 * else in the app, since `useBackDismiss` requires being mounted only
 * while actually open.
 */
export function DropdownMenu({ anchorRef, items, onClose, widthClass = "w-56" }: DropdownMenuProps) {
  useBackDismiss(onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const rowCount = items.filter((i) => i !== "divider").length;
    const desired = Math.min(rowCount * ROW_HEIGHT + 16, 420);

    const spaceBelow = viewportH - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const openUp = spaceBelow < Math.min(desired, 180) && spaceAbove > spaceBelow;

    setStyle({
      position: "fixed",
      ...(openUp
        ? { bottom: viewportH - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      right: Math.max(VIEWPORT_MARGIN, viewportW - rect.right),
      maxHeight: Math.max(160, Math.min(desired, openUp ? spaceAbove : spaceBelow)),
    });
  }, [anchorRef, items]);

  // Outside click/tap closes — a transparent full-screen catcher
  // rather than a dimmed backdrop, matching how WhatsApp's ordinary
  // dropdowns (as opposed to the long-press message overlay) behave.
  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [anchorRef, onClose]);

  return (
    <Portal>
      <div
        ref={panelRef}
        style={style ?? { position: "fixed", opacity: 0 }}
        className={`${widthClass} z-50 bg-canvas border border-border rounded-xl shadow-lg py-2 overflow-y-auto overscroll-contain scroll-smooth`}
      >
        {items.map((item, i) =>
          item === "divider" ? (
            <div key={`divider-${i}`} className="h-px bg-border my-2" />
          ) : (
            <button
              key={item.key}
              onClick={() => {
                if (item.disabled) return;
                // See runAfterDismiss above — waits for the actual
                // popstate from this menu's dismiss instead of
                // racing it with a blind setTimeout(fn, 0).
                runAfterDismiss(onClose, item.onSelect);
              }}
              disabled={item.disabled}
              className={`w-full flex items-center gap-4 text-left px-5 py-3.5 text-base leading-snug hover:bg-surface active:bg-surface disabled:opacity-40 ${
                item.variant === "danger" ? "text-danger" : "text-ink"
              }`}
            >
              {item.icon && (
                <span className="shrink-0 [&_svg]:w-6 [&_svg]:h-6 flex items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              {item.badge}
            </button>
          )
        )}
      </div>
    </Portal>
  );
}
