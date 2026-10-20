// src/components/DownloadAppModal.tsx
//
// Opened from the "Get the Akọ app" card in Settings. Two choices — Google Play and the App Store —
// each driven by the admin-set link (Admin > Mobile app download):
//   • link set      -> open the store listing in a new tab.
//   • link not set  -> a toast says it isn't on that store yet. For Android, if the admin uploaded an
//                      APK, the modal also shows a direct "Download APK" button (that is the "or
//                      download it directly" the toast points at). iPhone has no equivalent file, so
//                      iPhone users are told to keep using the web app until the App Store link is live.
import type { ReactNode } from "react";
import { ChevronRight, Download, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { AkoMark } from "./AkoMark";
import { AppStoreGlyph, PlayStoreGlyph } from "./BrandIcons";
import { useToast } from "./Toast";
import {
  formatApkSize,
  getApkDownloadUrl,
  useAppDownloadSettings,
} from "../hooks/useAppDownload";

// These messages need longer than the app's usual 2 s toast to actually be read.
const MESSAGE_MS = 4500;

function openStore(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function StoreButton({
  glyph,
  eyebrow,
  name,
  comingSoon,
  disabled,
  onClick,
}: {
  glyph: ReactNode;
  eyebrow: string;
  name: string;
  comingSoon: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3.5 rounded-2xl border border-border bg-canvas px-4 py-3.5 text-left transition-all hover:border-accent/50 hover:shadow-md active:scale-[0.985] disabled:opacity-60"
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-surface border border-border">
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-[0.12em] text-ink-muted">{eyebrow}</span>
        <span className="block text-base font-semibold text-ink leading-tight">{name}</span>
      </span>
      {comingSoon ? (
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
          Coming soon
        </span>
      ) : (
        <ChevronRight size={20} className="flex-shrink-0 text-ink-muted" />
      )}
    </button>
  );
}

export function DownloadAppModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { data: settings, isLoading, isError } = useAppDownloadSettings();

  const androidUrl = settings?.android_store_url ?? null;
  const iosUrl = settings?.ios_store_url ?? null;
  const apkUrl = getApkDownloadUrl(settings);
  // The APK is the stand-in for a Play Store listing that doesn't exist yet — once the store link is
  // live, only the store is offered.
  const showApk = !androidUrl && !!apkUrl;

  function handleAndroid() {
    if (androidUrl) return openStore(androidUrl);
    toast(
      apkUrl
        ? "The Android app isn't on Google Play yet. Check back later, or download the APK below and install it."
        : "The Android app isn't on Google Play yet. Please check back later.",
      { duration: MESSAGE_MS }
    );
  }

  function handleIos() {
    if (iosUrl) return openStore(iosUrl);
    toast(
      "The iPhone app isn't on the App Store yet. Keep using Akọ on the web for now, and check back later.",
      { duration: MESSAGE_MS }
    );
  }

  return (
    <Modal onClose={onClose} themed ariaLabel="Get the Akọ app" maxWidthClass="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <AkoMark size={56} className="!rounded-2xl shadow-md" />
        <h3 className="font-display text-xl text-ink mt-4">Get Akọ on your phone</h3>
        <p className="text-sm text-ink-muted mt-1.5 mb-5">
          Choose where to download the app.
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-danger text-center py-4">
          Couldn't load the download links. Please try again in a moment.
        </p>
      ) : (
        <div className="space-y-3">
          <StoreButton
            glyph={<PlayStoreGlyph size={28} />}
            eyebrow="Get it on"
            name="Google Play"
            comingSoon={!isLoading && !androidUrl}
            disabled={isLoading}
            onClick={handleAndroid}
          />
          <StoreButton
            glyph={<AppStoreGlyph size={30} />}
            eyebrow="Download on the"
            name="App Store"
            comingSoon={!isLoading && !iosUrl}
            disabled={isLoading}
            onClick={handleIos}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center mt-4 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {showApk && (
        <a
          href={apkUrl!}
          download="Ako.apk"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-medium text-canvas hover:bg-accent-hover transition-colors"
        >
          <Download size={16} />
          Download Android APK
          {settings?.apk_size_bytes ? (
            <span className="opacity-75">· {formatApkSize(settings.apk_size_bytes)}</span>
          ) : null}
        </a>
      )}
      {showApk && (
        <p className="text-[11px] text-ink-muted text-center mt-2 leading-snug">
          Open the downloaded file to install. Your phone may ask you to allow installs from your browser first.
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full text-sm text-ink-muted hover:text-ink transition-colors"
      >
        Close
      </button>
    </Modal>
  );
}
