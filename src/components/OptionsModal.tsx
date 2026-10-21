// src/components/OptionsModal.tsx
import type { MouseEvent, ReactNode } from "react";
import { runAfterDismiss } from "../hooks/useBackDismiss";
import { useDismissKeyboardOnMount } from "../hooks/useDismissKeyboard";
import { Modal } from "./Modal";

export interface OptionItem {
  key: string;
  label: string;
  /** Rendered on the left, in a fixed-size slot so labels line up whether or not a row has an icon. */
  icon?: ReactNode;
  /** Optional muted second line under the label. */
  description?: string;
  onSelect: (e: MouseEvent) => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  /** e.g. an unread-count pill or a check mark, rendered flush right */
  badge?: ReactNode;
}

interface OptionsModalProps {
  /** Every options list has a title. */
  title: string;
  items: (OptionItem | "divider")[];
  onClose: () => void;
  maxWidthClass?: string;
  zIndexClass?: string;
  /** Extra content under the list (a note, a footer button). */
  footer?: ReactNode;
  /**
   * Run the chosen action synchronously, then close — instead of waiting for the dismiss to settle. Needed when the
   * action must happen inside the tap's own user gesture (opening a file picker or the camera), which a deferred
   * call can lose on iOS Safari. Leave off for anything that navigates or opens another overlay.
   */
  immediate?: boolean;
}

/**
 * The one options list in the app: every dropdown, kebab menu, action sheet and chooser renders through this.
 * A centred card (see Modal / useAnchoredPanel for placement) with a bold title, then rows with the icon on the left
 * and the title on the right — the same layout as the Pages list on a profile. The list scrolls inside the card
 * when it is longer than the room above the bottom nav.
 */
export function OptionsModal({ title, items, onClose, maxWidthClass = "max-w-sm", zIndexClass, footer, immediate = false }: OptionsModalProps) {
  useDismissKeyboardOnMount();

  return (
    <Modal onClose={onClose} title={title} maxWidthClass={maxWidthClass} zIndexClass={zIndexClass}>
      <ul className="-mx-2" role="menu">
        {items.map((item, i) =>
          item === "divider" ? (
            <li key={`divider-${i}`} role="separator" className="my-2 h-px bg-overlay-border" />
          ) : (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  if (item.disabled) return;
                  if (immediate) {
                    item.onSelect(e);
                    onClose();
                    return;
                  }
                  // Waits for the dismiss popstate instead of racing it with a blind timeout — see runAfterDismiss.
                  runAfterDismiss(onClose, () => item.onSelect(e));
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left active:bg-overlay-surface-raised disabled:opacity-40 ${
                  item.variant === "danger" ? "text-overlay-danger" : "text-overlay-ink"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center [&_svg]:h-6 [&_svg]:w-6">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.label}</span>
                  {item.description ? (
                    <span className="block truncate text-sm font-normal text-overlay-ink-muted">{item.description}</span>
                  ) : null}
                </span>
                {item.badge}
              </button>
            </li>
          )
        )}
      </ul>
      {footer}
    </Modal>
  );
}
