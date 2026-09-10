// src/components/DropdownMenu.tsx
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useBackDismiss, runAfterDismiss } from "../hooks/useBackDismiss";
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
 * off the bottom of the screen OR under BottomNav — the available
 * space calculation below subtracts BottomNav's real rendered height
 * (via #ako-bottom-nav) from the viewport first, so "room below the
 * trigger" means room above the nav bar, not literal screen bottom.
 * Without that, a menu near the bottom of a page could size/position
 * itself as if the nav bar weren't there, then either render its last
 * rows underneath the (higher-stacked, but still visually blocking)
 * nav strip or open upward when it didn't actually need to.
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
    const viewportW = window.innerWidth;
    // The real bottom-nav footprint, if one is mounted on this page —
    // treat it as the effective bottom edge of the viewport rather
    // than the literal screen bottom, so "space below" never counts
    // space the nav bar is actually sitting on top of.
    const bottomNavHeight = document.getElementById("ako-bottom-nav")?.getBoundingClientRect().height ?? 0;
    const viewportH = window.innerHeight - bottomNavHeight;

    const rowCount = items.filter((i) => i !== "divider").length;
    const desired = Math.min(rowCount * ROW_HEIGHT + 16, 420);

    const spaceBelow = viewportH - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const openUp = spaceBelow < Math.min(desired, 180) && spaceAbove > spaceBelow;

    setStyle({
      position: "fixed",
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      right: Math.max(VIEWPORT_MARGIN, viewportW - rect.right),
      maxHeight: Math.max(160, Math.min(desired, openUp ? spaceAbove : spaceBelow)),
    });
  }, [anchorRef, items]);

  // Outside click/tap closes — handled by the dimmed backdrop below
  // (onClick), same as every other overlay in the app now. Kept as a
  // separate document-level listener too so a tap that lands on inert
  // page chrome outside both the panel AND the backdrop's own bounds
  // (rare, but e.g. a browser UI element) still closes the menu.
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
      {/* Same dim + blur treatment as every modal/dialog in the app
          (see ConfirmDialog, ReactionMoreSheet) — a kebab menu is
          still a modal interaction, it just anchors near the trigger
          instead of centering, so it gets the same backdrop. */}
      <div className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-sm" onClick={onClose} />
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
              {/* Fixed-size slot rendered for every row, icon or not —
                  otherwise an icon-less item's label starts flush left
                  while every other row's label starts one icon-width
                  in, reading as inconsistent padding down the list. */}
              <span className="shrink-0 w-6 h-6 flex items-center justify-center [&_svg]:w-6 [&_svg]:h-6">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge}
            </button>
          )
        )}
      </div>
    </Portal>
  );
}
