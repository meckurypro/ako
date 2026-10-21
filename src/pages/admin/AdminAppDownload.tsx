// src/pages/admin/AdminAppDownload.tsx
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Download, FileUp, Loader2, Package } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Toast";
import {
  formatApkSize,
  getApkDownloadUrl,
  isValidStoreUrl,
  useAppDownloadSettings,
  useSaveStoreUrls,
  useUploadApk,
} from "../../hooks/useAppDownload";

// /admin/app-download — what the "Get the Akọ app" modal in Settings sends people to.
//
//  • Google Play / App Store links: when set, the matching button in the modal opens that listing.
//    When left empty, tapping it shows a "not on the store yet" message instead — so leave a link
//    empty until the app is actually live there.
//  • Android APK: a direct download offered to Android users while there is no Google Play link.
//    Uploading again replaces the current file. iPhone has no equivalent, so iPhone users are told to
//    keep using the web app until the App Store link is set.
export function AdminAppDownload() {
  const smartBack = useSmartBack();
  const toast = useToast();
  const { data: settings, isLoading } = useAppDownloadSettings();
  const saveUrls = useSaveStoreUrls();
  const uploadApk = useUploadApk();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [android, setAndroid] = useState("");
  const [ios, setIos] = useState("");
  const [androidError, setAndroidError] = useState("");
  const [iosError, setIosError] = useState("");

  // Fill the fields once the saved values arrive (and again after a save refreshes them).
  useEffect(() => {
    if (!settings) return;
    setAndroid(settings.android_store_url ?? "");
    setIos(settings.ios_store_url ?? "");
  }, [settings]);

  const dirty =
    android.trim() !== (settings?.android_store_url ?? "") || ios.trim() !== (settings?.ios_store_url ?? "");

  function handleSaveUrls() {
    const a = android.trim();
    const i = ios.trim();
    const aBad = a !== "" && !isValidStoreUrl(a);
    const iBad = i !== "" && !isValidStoreUrl(i);
    setAndroidError(aBad ? "Enter a full link starting with https://" : "");
    setIosError(iBad ? "Enter a full link starting with https://" : "");
    if (aBad || iBad) return;

    saveUrls.mutate(
      { android: a, ios: i },
      {
        onSuccess: () => toast("Store links saved.", { variant: "success" }),
        onError: () => toast("Couldn't save the links. Please try again.", { variant: "error" }),
      }
    );
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so choosing the same file again (after a failure, say) still fires onChange.
    e.target.value = "";
    if (!file) return;

    uploadApk.mutate(
      { file, previousPath: settings?.apk_path ?? null },
      {
        onSuccess: () => toast("APK uploaded. Users can download it now.", { variant: "success" }),
        onError: (err) =>
          toast(err instanceof Error && err.message ? err.message : "Upload failed. Please try again.", {
            variant: "error",
            duration: 4500,
          }),
      }
    );
  }

  const apkUrl = getApkDownloadUrl(settings);
  const hasApk = !!settings?.apk_path;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Mobile app download</h2>
        </div>
        <p className="text-sm text-ink-muted mb-6">
          Controls the "Get the Akọ app" button in Settings. Leave a store link empty until the app is live
          there — people who tap it will be told it isn't available yet.
        </p>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl border border-border p-4 pb-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-4">
                Store links
              </p>
              <FormField
                id="android-store-url"
                label="Google Play link"
                type="url"
                inputMode="url"
                placeholder="https://play.google.com/store/apps/details?id=…"
                value={android}
                onChange={(e) => setAndroid(e.target.value)}
                error={androidError}
                autoComplete="off"
              />
              <FormField
                id="ios-store-url"
                label="App Store link"
                type="url"
                inputMode="url"
                placeholder="https://apps.apple.com/app/…"
                value={ios}
                onChange={(e) => setIos(e.target.value)}
                error={iosError}
                autoComplete="off"
              />
            </div>
            <Button onClick={handleSaveUrls} loading={saveUrls.isPending} disabled={!dirty}>
              Save links
            </Button>

            <div className="bg-surface rounded-xl border border-border p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-3">
                Android APK
              </p>
              <p className="text-xs text-ink-muted mb-4">
                Offered to Android users as a direct download while there is no Google Play link. Uploading a
                new file replaces the current one. iPhone has no equivalent, so iPhone users are asked to keep
                using the web app until the App Store link is set.
              </p>

              {hasApk ? (
                <div className="flex items-start gap-3 rounded-lg bg-canvas border border-border p-3 mb-4">
                  <Package size={20} className="text-accent flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{settings?.apk_file_name ?? "Ako.apk"}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {[
                        formatApkSize(settings?.apk_size_bytes),
                        settings?.apk_uploaded_at
                          ? `uploaded ${new Date(settings.apk_uploaded_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {apkUrl && (
                      <a
                        href={apkUrl}
                        download="Ako.apk"
                        className="inline-flex items-center gap-1 text-xs text-accent font-medium mt-1.5"
                      >
                        <Download size={12} />
                        Test download
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-muted mb-4">No APK uploaded yet.</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                onChange={handleFileChosen}
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadApk.isPending}
                className="flex items-center justify-center gap-2"
              >
                {uploadApk.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading… {uploadApk.progress}%
                  </>
                ) : (
                  <>
                    <FileUp size={16} />
                    {hasApk ? "Replace APK" : "Upload APK"}
                  </>
                )}
              </Button>
              {uploadApk.isPending && (
                <>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={uploadApk.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${uploadApk.progress}%` }} />
                  </div>
                  <p className="text-xs text-ink-muted text-center mt-2">
                    Large files can take several minutes — keep this page open until it finishes. If your connection drops it retries and resumes by itself.
                  </p>
                </>
              )}
              <p className="text-[11px] text-ink-muted text-center mt-3">Up to 300 MB. Must be an .apk file.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
