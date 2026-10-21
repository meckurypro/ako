// src/components/PageHeroEditor.tsx
// Where a page admin (or a member allowed to edit the page) builds the hero slideshow:
// add images, give each a title and caption, reorder, remove, and choose how it plays.
// Every change saves on its own — there's no separate "save hero" step to forget.
// All slides are cropped to 16:9 on upload so they sit in one frame.
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { useToast } from "./Toast";
import { ToggleSwitch } from "./admin/ToggleSwitch";
import { useUploadAvatar } from "../hooks/useUploadAvatar";
import {
  HERO_ASPECT,
  HERO_INTERVAL_OPTIONS,
  MAX_HERO_SLIDES,
  useAddHeroSlide,
  useDeleteHeroSlide,
  usePageHeroSlides,
  useReorderHeroSlides,
  useUpdateHeroSettings,
  useUpdateHeroSlide,
} from "../hooks/usePageLanding";
import { cropToAspect } from "../lib/cropImage";
import type { HeroDirection, Page, PageHeroSlide } from "../types/database";

function SlideRow({
  slide,
  pageId,
  index,
  total,
  onMove,
  onDelete,
  busy,
}: {
  slide: PageHeroSlide;
  pageId: string;
  index: number;
  total: number;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const toast = useToast();
  const update = useUpdateHeroSlide(pageId);
  const [title, setTitle] = useState(slide.title ?? "");
  const [caption, setCaption] = useState(slide.caption ?? "");

  function saveIfChanged() {
    if (title.trim() === (slide.title ?? "") && caption.trim() === (slide.caption ?? "")) return;
    update.mutate(
      { id: slide.id, title, caption },
      { onError: () => toast("Couldn't save that text.", { variant: "error" }) }
    );
  }

  return (
    <li className="rounded-2xl bg-canvas p-3">
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-surface">
        <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          {index + 1}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveIfChanged}
          maxLength={80}
          placeholder="Title (optional)"
          aria-label={`Slide ${index + 1} title`}
          className="w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted"
        />
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={saveIfChanged}
          maxLength={160}
          placeholder="Caption (optional)"
          aria-label={`Slide ${index + 1} caption`}
          className="w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0 || busy}
            aria-label="Move slide earlier"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 disabled:opacity-30"
          >
            <ArrowUp size={18} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1 || busy}
            aria-label="Move slide later"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 disabled:opacity-30"
          >
            <ArrowDown size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-40"
        >
          <Trash2 size={15} />
          Remove
        </button>
      </div>
    </li>
  );
}

export function PageHeroEditor({ page }: { page: Page }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: slides = [] } = usePageHeroSlides(page.id);
  const addSlide = useAddHeroSlide(page.id);
  const deleteSlide = useDeleteHeroSlide(page.id);
  const reorder = useReorderHeroSlides(page.id);
  const updateSettings = useUpdateHeroSettings(page.id);
  const upload = useUploadAvatar();
  const [uploading, setUploading] = useState(false);

  const autoplay = page.hero_autoplay ?? true;
  const interval = page.hero_interval_seconds ?? 5;
  const direction: HeroDirection = page.hero_direction ?? "forward";
  const full = slides.length >= MAX_HERO_SLIDES;
  const busy = deleteSlide.isPending || reorder.isPending;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_HERO_SLIDES - slides.length);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    let position = slides.length ? Math.max(...slides.map((s) => s.position)) + 1 : 0;
    try {
      for (const file of files) {
        const cropped = await cropToAspect(file, HERO_ASPECT, { maxWidth: 1600 });
        const image_url = await upload.mutateAsync(cropped);
        await addSlide.mutateAsync({ image_url, position: position++ });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't add that image.", { variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  function move(index: number, delta: -1 | 1) {
    const ids = slides.map((s) => s.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids, { onError: () => toast("Couldn't reorder.", { variant: "error" }) });
  }

  function saveSetting(patch: Parameters<typeof updateSettings.mutate>[0]) {
    updateSettings.mutate(patch, {
      onError: () => toast("Couldn't save that setting.", { variant: "error" }),
    });
  }

  return (
    <section className="space-y-4" aria-labelledby="hero-editor-heading">
      <div>
        <h3 id="hero-editor-heading" className="text-sm font-semibold text-ink">
          Hero slides
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          A slideshow visitors see first. Images are cropped to 16:9 so they all fit the same frame. Up to{" "}
          {MAX_HERO_SLIDES}.
        </p>
      </div>

      {slides.length > 0 && (
        <ul className="space-y-3">
          {slides.map((slide, i) => (
            <SlideRow
              key={slide.id}
              slide={slide}
              pageId={page.id}
              index={i}
              total={slides.length}
              busy={busy}
              onMove={(d) => move(i, d)}
              onDelete={() =>
                deleteSlide.mutate(slide.id, { onError: () => toast("Couldn't remove that slide.", { variant: "error" }) })
              }
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || full}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-canvas py-5 text-sm font-medium text-accent disabled:opacity-50"
      >
        <ImagePlus size={18} />
        {uploading ? "Adding…" : full ? "Slide limit reached" : slides.length ? "Add more images" : "Add images"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFiles}
        className="hidden"
      />

      {slides.length > 1 && (
        <div className="space-y-3 rounded-2xl bg-canvas p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink">Play automatically</p>
              <p className="text-xs text-ink-muted">Visitors can always swipe or tap through.</p>
            </div>
            <ToggleSwitch
              checked={autoplay}
              onChange={(v) => saveSetting({ hero_autoplay: v })}
              ariaLabel="Play slides automatically"
            />
          </div>

          {autoplay && (
            <>
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-muted">Time on each slide</p>
                <div className="flex gap-2">
                  {HERO_INTERVAL_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => saveSetting({ hero_interval_seconds: s })}
                      aria-pressed={interval === s}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                        interval === s ? "bg-accent text-canvas" : "bg-surface text-ink"
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-muted">Direction</p>
                <div className="flex gap-2">
                  {(
                    [
                      ["forward", "Forward"],
                      ["backward", "Backward"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => saveSetting({ hero_direction: value })}
                      aria-pressed={direction === value}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                        direction === value ? "bg-accent text-canvas" : "bg-surface text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">
                  {direction === "forward"
                    ? "Moves on to the next slide each time."
                    : "Steps back to the previous slide each time."}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
