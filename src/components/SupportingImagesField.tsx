// src/components/SupportingImagesField.tsx
//
// Create/Edit project: up to 4 extra images that visitors swipe through on the
// project's own page (after the thumbnail). Reuses the thumbnail uploader/bucket.
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Plus, X } from "lucide-react";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { MAX_SUPPORTING_IMAGES } from "../lib/projectImages";

export function SupportingImagesField({
  urls,
  onChange,
  hasThumbnail,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
  hasThumbnail: boolean;
}) {
  const upload = useUploadProjectThumbnail();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_SUPPORTING_IMAGES - urls.length;
  const busy = pending > 0;

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (chosen.length === 0) return;

    const files = chosen.slice(0, remaining);
    setError(
      chosen.length > remaining
        ? `Only ${remaining} more image${remaining === 1 ? "" : "s"} fit — the first ${files.length} will be added.`
        : null
    );
    setPending(files.length);

    const added: string[] = [];
    for (const file of files) {
      try {
        const { url } = await upload.mutateAsync(file);
        added.push(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Image upload failed.");
        break;
      } finally {
        setPending((p) => Math.max(0, p - 1));
      }
    }
    if (added.length > 0) onChange([...urls, ...added].slice(0, MAX_SUPPORTING_IMAGES));
  }

  function remove(i: number) {
    onChange(urls.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= urls.length) return;
    const next = [...urls];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-sm font-medium text-ink-muted">Supporting images</label>
        <span className="text-xs text-ink-muted">
          {urls.length}/{MAX_SUPPORTING_IMAGES}
        </span>
      </div>

      {!hasThumbnail ? (
        <p className="px-4 py-3 rounded-xl border border-dashed border-border text-sm text-ink-muted">
          Add a thumbnail first. Supporting images appear when people swipe it on the project page.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {urls.map((url, i) => (
              <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove image ${i + 1}`}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-ink/70 text-canvas"
                >
                  <X size={12} />
                </button>
                {urls.length > 1 && (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move earlier"
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-ink/70 text-canvas disabled:opacity-30"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === urls.length - 1}
                      aria-label="Move later"
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-ink/70 text-canvas disabled:opacity-30"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {Array.from({ length: Math.min(pending, remaining) }).map((_, i) => (
              <div key={`pending-${i}`} className="aspect-square rounded-xl border border-border bg-surface flex items-center justify-center animate-pulse">
                <ImageIcon size={18} className="text-ink-muted" />
              </div>
            ))}

            {remaining - pending > 0 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                aria-label="Add supporting images"
                className="aspect-square rounded-xl border border-dashed border-border text-ink-muted flex items-center justify-center hover:bg-surface disabled:opacity-50"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleSelect}
            className="hidden"
          />
          <p className="text-xs text-ink-muted mt-2">
            Visitors swipe your thumbnail to see these on the project page. They're cropped to the thumbnail's shape and never shown in lists.
          </p>
        </>
      )}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}
