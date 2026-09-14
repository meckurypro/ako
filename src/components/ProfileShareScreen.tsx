// src/components/ProfileShareScreen.tsx
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Link2, Share2 } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import { useToast } from "./Toast";

interface ProfileShareScreenProps {
  name: string;
  handle: string;
  avatarUrl: string | null;
  /** Full canonical URL to encode/copy/share — /profile/:username or
   *  /page/:username, already resolved by the caller. */
  url: string;
  onClose: () => void;
}

/**
 * Full-screen "share your own profile/page" takeover — a QR code plus
 * copy/share, for handing a link to someone in person or dropping it
 * somewhere else. Distinct from ShareProfileSheet, which is the
 * consolidated "send to X" menu a VISITOR gets on someone else's
 * profile; this is what an owner reaches for instead.
 */
export function ProfileShareScreen({ name, handle, avatarUrl, url, onClose }: ProfileShareScreenProps) {
  useBackDismiss(onClose);
  useScrollLock();
  const toast = useToast();
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 280, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [url]);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(url);
    toast("Link copied.", { variant: "success" });
  }

  async function handleShareLink() {
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({ title: name, url });
    } catch {
      // Native share sheet dismissed — nothing to do.
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-canvas flex flex-col">
        <div className="flex items-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
          <button onClick={onClose} aria-label="Back" className="p-2 -ml-2 text-ink">
            <ArrowLeft size={22} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
          <div className="w-full max-w-xs bg-surface rounded-3xl border border-border shadow-lg p-6 flex flex-col items-center">
            <Avatar src={avatarUrl} name={name} size="xl" />
            <p className="font-medium text-ink text-lg mt-3 text-center">{name}</p>
            <p className="text-sm text-ink-muted mb-5">@{handle}</p>

            <div className="w-56 h-56 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
              {qrUrl ? (
                <img src={qrUrl} alt={`QR code for ${name}'s profile`} className="w-full h-full object-contain" />
              ) : (
                <p className="text-xs text-ink-muted">Generating…</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] flex gap-3">
          <button
            onClick={() => void handleCopyLink()}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-surface border border-border text-ink"
          >
            <Link2 size={20} />
            <span className="text-sm font-medium">Copy link</span>
          </button>
          <button
            onClick={() => void handleShareLink()}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-surface border border-border text-ink"
          >
            <Share2 size={20} />
            <span className="text-sm font-medium">Share link</span>
          </button>
        </div>
      </div>
    </Portal>
  );
}
