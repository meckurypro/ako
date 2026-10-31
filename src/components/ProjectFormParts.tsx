// src/components/ProjectFormParts.tsx
// The building blocks the New project and Edit project pages share, so both read like the Settings page:
// a rounded card per topic with an icon header (FormSection), a chip row for the project type, one thumbnail
// picker, one pricing block, and link rows with a chevron. Nothing here owns form state — the pages do.
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronRight,
  DoorOpen,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Lightbulb,
  Link2,
  Music,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { ChangeEvent, ReactNode, RefObject } from "react";

import { FormField } from "./FormField";
import { SupportingImagesField } from "./SupportingImagesField";
import type { ThumbSpec } from "../lib/thumbnailSpec";
import { PROJECT_TYPE_LABELS, type ProjectType } from "../hooks/useProjects";

export const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
  file: FileText,
  url: Link2,
  media: Music,
  event: CalendarDays,
  meeting: Video,
  room: DoorOpen,
  course: GraduationCap,
  gig: Briefcase,
  pitch: Lightbulb,
  book: BookOpen,
};

/** One topic of the form in its own rounded card — the same look as a Settings section, but always open. */
export function FormSection({
  icon: IconComponent,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface rounded-3xl border border-border overflow-hidden">
      <div className="flex items-center gap-3.5 p-3.5">
        <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-accent-soft text-accent">
          <IconComponent size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="border-t border-border px-4 pt-4 pb-1">{children}</div>
    </section>
  );
}

/** Pick the project type as chips (it decides which fields appear below). */
export function ProjectTypeChips({
  options,
  value,
  onChange,
}: {
  options: ProjectType[];
  value: ProjectType;
  onChange: (type: ProjectType) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Project type" className="flex flex-wrap gap-2 mb-3">
      {options.map((type) => {
        const selected = type === value;
        const TypeIcon = PROJECT_TYPE_ICONS[type];
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
              selected
                ? "border-accent/40 bg-accent-soft text-accent font-semibold"
                : "border-border bg-canvas text-ink-muted hover:text-ink"
            }`}
          >
            <TypeIcon size={15} />
            {PROJECT_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The cover frame plus the supporting-images strip. The frame is drawn in the exact shape this kind of project's
 * thumbnail must be (lib/thumbnailSpec.ts); a picture of any other shape is cropped to it in the crop sheet.
 */
export function ThumbnailPicker({
  url,
  spec,
  noun,
  uploading,
  inputRef,
  onFileChange,
  needsRecrop,
  onRecrop,
  supportingImageUrls,
  onSupportingChange,
}: {
  url: string | null;
  spec: ThumbSpec;
  /** "video thumbnail", "book cover", … */
  noun: string;
  uploading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** The current picture isn't the shape this project now needs (e.g. a video was added to an audio project). */
  needsRecrop?: boolean;
  onRecrop?: () => void;
  supportingImageUrls: string[];
  onSupportingChange: (urls: string[]) => void;
}) {
  const portrait = spec.ratio < 1;
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={url ? `Change ${noun}` : `Choose ${noun}`}
        style={{ aspectRatio: spec.ratio }}
        className={`bg-canvas border border-border rounded-2xl flex items-center justify-center overflow-hidden hover:border-ink-muted/40 transition-colors mx-auto mb-2 ${
          portrait ? "w-48" : "w-full max-w-sm"
        }`}
      >
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-ink-muted flex flex-col items-center gap-1.5">
            <span className="w-11 h-11 rounded-full bg-accent-soft text-accent flex items-center justify-center">
              <ImageIcon size={20} />
            </span>
            <span className="text-sm">{uploading ? "Uploading…" : `Add ${noun} (${spec.shape})`}</span>
          </div>
        )}
      </button>
      {needsRecrop ? (
        <div className="mb-3 rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-center">
          <p className="text-xs text-danger">This picture isn't the {spec.label} shape a {noun} needs.</p>
          {onRecrop ? (
            <button type="button" onClick={onRecrop} className="mt-1 text-xs font-medium text-accent underline">
              Crop it to fit
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-ink-muted text-center mb-3">
          A {noun} is {spec.label}. Choose any picture — if it isn't that shape you'll crop it to fit.
          {url && onRecrop ? (
            <>
              {" "}
              <button type="button" onClick={onRecrop} className="font-medium text-accent underline">
                Adjust crop
              </button>
            </>
          ) : null}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileChange}
        className="hidden"
      />
      <SupportingImagesField urls={supportingImageUrls} onChange={onSupportingChange} hasThumbnail={!!url} spec={spec} />
    </>
  );
}

/** Price + optional promo price. A pitch never has one (supporters choose their own amount) — callers skip it. */
export function PricingFields({
  type,
  priceUsd,
  onPriceChange,
  showPromo,
  onShowPromoChange,
  promoPriceUsd,
  onPromoPriceChange,
  bookNotOwn,
}: {
  type: ProjectType;
  priceUsd: string;
  onPriceChange: (value: string) => void;
  showPromo: boolean;
  onShowPromoChange: (value: boolean) => void;
  promoPriceUsd: string;
  onPromoPriceChange: (value: string) => void;
  bookNotOwn: boolean;
}) {
  return (
    <>
      <FormField
        id="price"
        label={type === "gig" ? "Booking fee (USD, optional)" : "Price (USD)"}
        type="number"
        value={priceUsd}
        onChange={(e) => onPriceChange(e.target.value)}
        min={0}
        step="0.01"
        disabled={bookNotOwn}
      />
      <p className="text-xs text-ink-muted -mt-4 mb-4">
        {type === "gig"
          ? "Set to 0 to keep this message-only — people reach out, no payment upfront. Add an amount to also let people pay a booking fee to secure a slot."
          : bookNotOwn
            ? "Crediting someone else's work — this has to stay free."
            : "Set to 0 for a free project."}
      </p>

      {!bookNotOwn && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={showPromo}
              onChange={(e) => {
                onShowPromoChange(e.target.checked);
                if (!e.target.checked) onPromoPriceChange("");
              }}
              className="rounded border-border"
            />
            Add a promo price
          </label>
          {showPromo && (
            <div className="mt-4">
              <FormField
                id="promo_price"
                label="Promo price"
                type="number"
                value={promoPriceUsd}
                onChange={(e) => onPromoPriceChange(e.target.value)}
                min={0}
                step="0.01"
                placeholder="Promo price"
              />
              <p className="text-xs text-ink-muted -mt-4 mb-2">
                Shown next to the actual price, which will appear crossed out. Must be lower than the actual price.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** A tappable row with an icon, a title, a one-line hint and a chevron — for the links out of the edit form. */
export function LinkRow({
  icon: IconComponent,
  title,
  description,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 rounded-xl bg-canvas p-4 mb-3 text-left transition-colors ${
        disabled ? "opacity-60" : "hover:bg-ink/5 active:bg-ink/5"
      }`}
    >
      <IconComponent size={18} className="text-ink-muted shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {description && <span className="block text-xs text-ink-muted">{description}</span>}
      </span>
      {!disabled && <ChevronRight size={18} className="text-ink-muted shrink-0" />}
    </button>
  );
}

/** A switch row inside a section — same look as Settings' toggle rows. */
export function ToggleRow({
  icon: IconComponent,
  title,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="bg-canvas rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <IconComponent size={18} className="text-ink-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{title}</p>
            <p className="text-xs text-ink-muted">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          aria-pressed={checked}
          aria-label={title}
          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden ${
            checked ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-[left] ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

/** The bar pinned to the bottom of the form: any error, then the primary action. */
export function FormFooter({ error, children }: { error?: string | null; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 px-4 pt-3 pb-4 bg-canvas/95 backdrop-blur border-t border-border">
      {error && (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
