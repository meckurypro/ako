// src/components/ConversationActionSheet.tsx
import { Pin, PinOff, Archive, Trash2, CheckSquare } from "lucide-react";
import { OptionsModal, type OptionItem } from "./OptionsModal";

interface ConversationActionSheetProps {
  displayName: string;
  isPinned: boolean;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onClose: () => void;
}

/**
 * Long-press options for a conversation row — pin/unpin to top, archive, select several chats, or delete (hides the
 * chat for this user only; the other participant's copy is untouched). onDelete only opens the caller's confirmation
 * step — this list never deletes directly.
 */
export function ConversationActionSheet({
  displayName,
  isPinned,
  onTogglePin,
  onArchive,
  onDelete,
  onSelect,
  onClose,
}: ConversationActionSheetProps) {
  const items: OptionItem[] = [
    {
      key: "pin",
      label: isPinned ? "Unpin from top" : "Pin to top",
      icon: isPinned ? <PinOff /> : <Pin />,
      onSelect: onTogglePin,
    },
    { key: "archive", label: "Archive", icon: <Archive />, onSelect: onArchive },
    { key: "select", label: "Select chats", icon: <CheckSquare />, onSelect },
    { key: "delete", label: "Delete chat", icon: <Trash2 />, onSelect: onDelete, variant: "danger" },
  ];
  return <OptionsModal title={displayName || "Chat options"} items={items} onClose={onClose} />;
}
