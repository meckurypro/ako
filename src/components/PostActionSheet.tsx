// src/components/PostActionSheet.tsx
import { Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import { OptionsModal, type OptionItem } from "./OptionsModal";

interface PostActionSheetProps {
  canEdit: boolean;
  isArchived: boolean;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Options for a post's own author — Edit / Archive / Delete. Renders as the shared centred options list. */
export function PostActionSheet({ canEdit, isArchived, onEdit, onToggleArchive, onDelete, onClose }: PostActionSheetProps) {
  const items: OptionItem[] = [
    ...(canEdit ? [{ key: "edit", label: "Edit", icon: <Pencil />, onSelect: onEdit }] : []),
    {
      key: "archive",
      label: isArchived ? "Unarchive" : "Archive",
      icon: isArchived ? <RotateCcw /> : <Archive />,
      onSelect: onToggleArchive,
    },
    { key: "delete", label: "Delete post", icon: <Trash2 />, onSelect: onDelete, variant: "danger" },
  ];
  return <OptionsModal title="Post options" items={items} onClose={onClose} />;
}
