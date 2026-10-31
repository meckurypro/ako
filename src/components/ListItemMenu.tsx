// src/components/ListItemMenu.tsx
//
// The options menu for one row on Connect or Library. It replaces the old "x" that sat on every row: a red-herring
// shortcut that looked like a call to action and invited people to throw things away. Everything is behind a quiet "more"
// button now, and nothing here deletes anything a person owns or paid for.
//
//   Pin to top / Unpin       the row leads its list
//   Mute / Unmute updates    no room meeting notifications, no group chat pushes
//   Share in Ako             to a person or a community, as a chat message
//   Share outside Ako        the phone's own share sheet
//   Copy link                to the clipboard
//   Exit group               groups you belong to but don't own
//   Remove from list         hides the row. Access doesn't change and it can come back. Not offered for a group: a group
//                            is managed from inside it, and the way out is Exit group
//
// Every share and copy uses the project's public page (/:slug, or /projects/:id with no slug), never a direct link to
// the ticket, reader or files. Whoever receives it lands on the page and gets access the usual way.
import { useState } from "react";
import { Bell, BellOff, EyeOff, Link2, LogOut, MoreVertical, Pin, PinOff, Send, Share2 } from "lucide-react";
import { getProjectUrl } from "../lib/projectLinks";
import { useLeaveRoom } from "../hooks/useRoom";
import { useRemoveFromLibrary } from "../hooks/useLibraryRemovals";
import { useSetListPref } from "../hooks/useProjectListPrefs";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "./ConfirmDialog";
import { OptionsModal, type OptionItem } from "./OptionsModal";
import { ShareProjectSheet } from "./ShareProjectSheet";
import { useErrorNotice } from "./ErrorNotice";
import { useToast } from "./Toast";

interface ListItemMenuProps {
  projectId: string;
  title: string;
  slug: string | null;
  pinned: boolean;
  muted: boolean;
  /** The list the row is on, used in wording ("Remove from Connect"). */
  listName: "Connect" | "Library";
  /** Set for a group (or one of its meetings). Only then is "Exit group" offered, and never to the owner. */
  group?: { isOwner: boolean };
}

type Dialog = null | "menu" | "remove" | "exit" | "share";

export function ListItemMenu({ projectId, title, slug, pinned, muted, listName, group }: ListItemMenuProps) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const setPref = useSetListPref();
  const remove = useRemoveFromLibrary();
  const leave = useLeaveRoom(projectId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const notifyError = useErrorNotice();

  const url = getProjectUrl({ id: projectId, slug });
  const canExit = !!group && !group.isOwner;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.", { variant: "success" });
    } catch {
      notifyError(new Error("copy_failed"), "Couldn't copy the link.");
    }
  }

  async function shareOutside() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // The person closed the share sheet. Nothing to do.
      }
      return;
    }
    await copyLink();
  }

  function togglePin() {
    setPref.mutate(
      { projectId, pinned: !pinned },
      { onError: (err) => notifyError(err, pinned ? "Couldn't unpin that." : "Couldn't pin that.") }
    );
  }

  function toggleMute() {
    setPref.mutate(
      { projectId, muted: !muted },
      {
        onSuccess: () => toast(muted ? "Updates are back on." : "Updates muted.", { variant: "success" }),
        onError: (err) => notifyError(err, "Couldn't change that."),
      }
    );
  }

  // The last group of actions: leaving a group, or hiding the row. A group's owner gets neither, so no divider then.
  const tail: OptionItem[] = [
    ...(canExit
      ? [{ key: "exit", label: "Exit group", icon: <LogOut />, onSelect: () => setDialog("exit"), variant: "danger" as const }]
      : []),
    ...(group
      ? []
      : [
          {
            key: "remove",
            label: `Remove from ${listName}`,
            description: "Hides it here. Your access doesn't change.",
            icon: <EyeOff />,
            onSelect: () => setDialog("remove"),
          },
        ]),
  ];

  const items: (OptionItem | "divider")[] = [
    {
      key: "pin",
      label: pinned ? "Unpin from top" : "Pin to top",
      icon: pinned ? <PinOff /> : <Pin />,
      onSelect: togglePin,
    },
    {
      key: "mute",
      label: muted ? "Unmute updates" : "Mute updates",
      icon: muted ? <Bell /> : <BellOff />,
      onSelect: toggleMute,
    },
    "divider",
    { key: "share-in", label: "Share in Ako", icon: <Send />, onSelect: () => setDialog("share") },
    { key: "share-out", label: "Share outside Ako", icon: <Share2 />, onSelect: () => void shareOutside() },
    { key: "copy", label: "Copy link", icon: <Link2 />, onSelect: () => void copyLink() },
    ...(tail.length ? (["divider", ...tail] as (OptionItem | "divider")[]) : []),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog("menu")}
        aria-label={`Options for ${title}`}
        aria-haspopup="menu"
        className="absolute top-1/2 -translate-y-1/2 right-1.5 p-2 rounded-full text-ink-muted/70 hover:text-ink"
      >
        <MoreVertical size={18} />
      </button>

      {dialog === "menu" && <OptionsModal title={title} items={items} onClose={() => setDialog(null)} />}

      {dialog === "share" && (
        <ShareProjectSheet
          projectId={projectId}
          title={title}
          slug={slug}
          onClose={() => setDialog(null)}
          onSent={() => {
            setDialog(null);
            toast("Shared.", { variant: "success" });
          }}
        />
      )}

      {dialog === "remove" && (
        <ConfirmDialog
          themed
          danger={false}
          title={`Remove from ${listName}?`}
          description="This only takes it off this list. Your access doesn't change."
          confirmLabel="Remove"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            remove.mutate(projectId);
          }}
        />
      )}

      {dialog === "exit" && (
        <ConfirmDialog
          themed
          title="Exit this group?"
          description="You'll stop getting its messages and meetings. You can ask to join again later."
          confirmLabel="Exit group"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            leave.mutate(undefined, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["activity"] });
                queryClient.invalidateQueries({ queryKey: ["library"] });
                toast("You left the group.", { variant: "success" });
              },
              onError: (err) => notifyError(err, "Couldn't exit the group."),
            });
          }}
        />
      )}
    </>
  );
}
