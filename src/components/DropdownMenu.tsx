// src/components/DropdownMenu.tsx
import type { ReactNode, RefObject } from "react";
import { OptionsModal } from "./OptionsModal";

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
  /** Every options list has a title. */
  title: string;
  items: (DropdownMenuItem | "divider")[];
  onClose: () => void;
  /** Kept so existing call sites compile; menus are no longer anchored to their trigger — they're centred. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Kept so existing call sites compile; every options list uses the same card width. */
  widthClass?: string;
}

/**
 * Kebab / three-dot / dropdown menu. No longer a popover hanging off its trigger: it is a centred options card with a
 * title (see OptionsModal), so every list of options in the app looks and behaves the same way. Callers render it
 * conditionally — `{open && <DropdownMenu … />}`.
 */
export function DropdownMenu({ title, items, onClose }: DropdownMenuProps) {
  return <OptionsModal title={title} items={items} onClose={onClose} />;
}
