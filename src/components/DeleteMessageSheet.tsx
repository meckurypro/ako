// src/components/DeleteMessageSheet.tsx
import { Trash2 } from "lucide-react";
import type { DeleteScope } from "../hooks/useMessaging";
import { OptionsModal, type OptionItem } from "./OptionsModal";

interface DeleteMessageSheetProps {
  /** How many messages this applies to — singular vs "3 messages" copy. */
  count: number;
  /**
   * Whether "delete for everyone" should be offered at all. False when any selected message isn't the current user's
   * own, or when every selected message is already a tombstone (only "delete for me" clears it from view).
   */
  allowEveryone: boolean;
  onDelete: (scope: DeleteScope) => void;
  onClose: () => void;
}

/**
 * Reached from MessageActionMenu's Delete (single) or the multi-select bar's Delete (bulk). Each scope carries its own
 * short warning line instead of a second confirmation modal — the choice itself is the deliberate step.
 */
export function DeleteMessageSheet({ count, allowEveryone, onDelete, onClose }: DeleteMessageSheetProps) {
  const them = count > 1 ? "them" : "it";
  const items: OptionItem[] = [
    {
      key: "me",
      label: "Delete for me",
      description: `Removes ${them} from your view only. Can't be undone.`,
      icon: <Trash2 />,
      onSelect: () => onDelete("me"),
    },
    ...(allowEveryone
      ? [
          {
            key: "everyone",
            label: "Delete for everyone",
            description: `Replaces ${them} with "message deleted" for both of you. Can't be undone.`,
            icon: <Trash2 />,
            onSelect: () => onDelete("everyone"),
            variant: "danger" as const,
          },
        ]
      : []),
  ];
  return <OptionsModal title={`Delete ${count > 1 ? `${count} messages` : "this message"}?`} items={items} onClose={onClose} />;
}
