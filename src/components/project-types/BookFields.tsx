// src/components/project-types/BookFields.tsx
import { useEffect, useRef, useState } from "react";
import { BookOpen, Download, FileUp, Info, Link as LinkIcon } from "lucide-react";
import { FormField } from "../FormField";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";
import { useFeatureFlag } from "../../hooks/useFeatureFlags";
import { friendlyError } from "../../lib/friendlyError";

// What gets stored (project_book_details.content_source):
//   authored -> written in Akọ              (read on Akọ)
//   upload   -> PDF extracted into chapters (read on Akọ)
//   download -> hosted PDF, download only   (downloadable)
//   link     -> pointer to it elsewhere     (external link)
export type BookContentSource = "link" | "upload" | "authored" | "download";

// What the creator picks first: how readers get the book. It decides
// every option that follows, so "PDF to read here" and "PDF to download"
// can never be mistaken for each other.
export type BookDelivery = "read" | "download" | "link";

export function bookDeliveryOf(source: BookContentSource): BookDelivery {
  if (source === "download") return "download";
  if (source === "link") return "link";
  return "read";
}

export interface BookFieldsValue {
  book_type: "book" | "article";
  content_source: BookContentSource;
  url: string;
  file_path: string | null;
  file_name: string | null; // display-only
  allow_download: boolean;
  allow_read_in_app: boolean;
  is_own_work: boolean;
  author_name: string;
  source_credit: string;
}

export const EMPTY_BOOK_FIELDS: BookFieldsValue = {
  book_type: "book",
  content_source: "upload",
  url: "",
  file_path: null,
  file_name: null,
  allow_download: false,
  allow_read_in_app: true,
  is_own_work: true,
  author_name: "",
  source_credit: "",
};

interface BookFieldsProps {
  value: BookFieldsValue;
  onChange: (value: BookFieldsValue) => void;
  onError: (message: string) => void;
  /** Edit screen: the book's saved source. Stays selectable even if its flag is now off. */
  existingSource?: BookContentSource;
}

const DELIVERY_OPTIONS: { value: BookDelivery; label: string; hint: string; icon: typeof BookOpen }[] = [
  { value: "read", label: "Read on Akọ", hint: "Readers read it here in the app.", icon: BookOpen },
  { value: "download", label: "Downloadable", hint: "Readers download your PDF file. No in-app reading.", icon: Download },
  { value: "link", label: "External link", hint: "Send readers to the book or article elsewhere.", icon: LinkIcon },
];

const READ_SOURCE_OPTIONS: { value: "authored" | "upload"; label: string; hint: string }[] = [
  { value: "authored", label: "Write it in Akọ", hint: "Build it chapter by chapter, right here, like a Course." },
  { value: "upload", label: "Upload a PDF", hint: "We pull the text out into chapters readers can read here." },
];

export function BookFields({ value, onChange, onError, existingSource }: BookFieldsProps) {
  const uploadFile = useUploadProjectFile();
  const pdfUploadEnabled = useFeatureFlag("book_pdf_upload_enabled");
  const downloadEnabled = useFeatureFlag("book_download_enabled");
  const linkEnabled = useFeatureFlag("book_link_enabled");

  // Admin feature flags can hide an option. A book that already uses a
  // hidden source keeps showing it (existingSource) so editing it
  // doesn't strand it; everything else just loses the option.
  const sourceAllowed = (s: BookContentSource): boolean => {
    if (s === existingSource) return true;
    if (s === "upload") return pdfUploadEnabled;
    if (s === "download") return downloadEnabled;
    if (s === "link") return linkEnabled;
    return true; // authored is never gated
  };

  const deliveryAllowed = (d: BookDelivery): boolean => {
    if (d === "read") return true; // "Write it in Akọ" is always available
    if (d === "download") return sourceAllowed("download");
    return sourceAllowed("link");
  };

  const visibleDeliveries = DELIVERY_OPTIONS.filter((o) => deliveryAllowed(o.value));
  const visibleReadSources = READ_SOURCE_OPTIONS.filter((o) => sourceAllowed(o.value));
  const delivery = bookDeliveryOf(value.content_source);

  // If the current selection isn't offered (e.g. the default "upload"
  // while that flag is off), fall back to one that is.
  useEffect(() => {
    if (!sourceAllowed(value.content_source)) {
      setSource("authored");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUploadEnabled, downloadEnabled, linkEnabled, existingSource, value.content_source]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0); // forces disabled/label state to re-render during upload

  // Switching branches doesn't clear the other branches' state (url,
  // file) — same reasoning as switching project_type in CreateProject.
  // It does reset the access flags so a PDF meant for download can't
  // carry "read in app" over, and vice versa.
  function setSource(next: BookContentSource) {
    if (next === value.content_source) return;
    if (next === "download") {
      onChange({ ...value, content_source: next, allow_download: true, allow_read_in_app: false });
    } else if (next === "upload") {
      onChange({ ...value, content_source: next, allow_download: false, allow_read_in_app: true });
    } else {
      onChange({ ...value, content_source: next });
    }
  }

  function setDelivery(next: BookDelivery) {
    if (next === delivery) return;
    if (next === "read") setSource("authored");
    else setSource(next);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      onError("Only PDF files are supported for upload right now.");
      return;
    }
    try {
      setTick((t) => t + 1);
      const path = await uploadFile.mutateAsync(file);
      onChange({ ...value, file_path: path, file_name: file.name });
    } catch (err) {
      onError(friendlyError(err, "File upload failed."));
    }
  }

  const pdfPicker = (label: string) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink-muted mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadFile.isPending}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink-muted disabled:opacity-50"
      >
        <FileUp size={16} />
        {uploadFile.isPending
          ? "Uploading…"
          : value.file_name
            ? value.file_name
            : value.file_path
              ? "File uploaded — tap to replace"
              : "Choose PDF"}
      </button>
      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
    </div>
  );

  return (
    <div>
      {/* Book vs Article — mostly cosmetic (shown as a badge on the
          card), but lets a quick essay/blog-style piece look right
          next to a full-length book. */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Type</label>
        <div className="flex gap-2">
          {(["book", "article"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...value, book_type: t })}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium capitalize ${
                value.book_type === t
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-border bg-canvas text-ink-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1 — how readers get it. */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">How will readers get it?</label>
        <div className="flex flex-col gap-2">
          {visibleDeliveries.map((opt) => {
            const Icon = opt.icon;
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer ${
                  delivery === opt.value ? "border-accent bg-accent-soft" : "border-border bg-canvas"
                }`}
              >
                <input
                  type="radio"
                  name="book_delivery"
                  checked={delivery === opt.value}
                  onChange={() => setDelivery(opt.value)}
                  className="mt-1 accent-current"
                />
                <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" />
                <span>
                  <span className="block text-sm font-medium text-ink">{opt.label}</span>
                  <span className="block text-xs text-ink-muted">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Step 2 — depends on step 1. */}
      {delivery === "read" && visibleReadSources.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-muted mb-1.5">How do you want to add it?</label>
          <div className="flex flex-col gap-2">
            {visibleReadSources.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer ${
                  value.content_source === opt.value ? "border-accent bg-accent-soft" : "border-border bg-canvas"
                }`}
              >
                <input
                  type="radio"
                  name="book_read_source"
                  checked={value.content_source === opt.value}
                  onChange={() => setSource(opt.value)}
                  className="mt-1 accent-current"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{opt.label}</span>
                  <span className="block text-xs text-ink-muted">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {value.content_source === "authored" && (
        <div className="mb-4 flex gap-2.5 p-4 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
          <Info size={16} className="shrink-0 mt-0.5 text-accent" />
          <p>
            This creates a draft. Build your chapters next, add a cover, then publish when it's
            ready — no one can buy it until you do.
          </p>
        </div>
      )}

      {value.content_source === "upload" && (
        <>
          {pdfPicker("PDF to read on Akọ")}
          <p className="text-xs text-ink-muted -mt-2 mb-4">
            Readers read it here in Akọ. They won't get the PDF file itself — choose Downloadable for that.
          </p>
          {/* Older books could also allow download alongside reading. New ones
              don't offer it; this only shows when the saved book still has it on. */}
          {value.allow_download && (
            <label className="flex items-center gap-2 text-sm text-ink mb-4">
              <input
                type="checkbox"
                checked={value.allow_download}
                onChange={(e) => onChange({ ...value, allow_download: e.target.checked })}
                className="rounded border-border"
              />
              Readers can also download the PDF (older setting — untick to turn it off)
            </label>
          )}
        </>
      )}

      {value.content_source === "download" && (
        <>
          {pdfPicker("PDF for download")}
          <p className="text-xs text-ink-muted -mt-2 mb-4">
            Readers download this file as it is. It isn't readable inside Akọ.
          </p>
        </>
      )}

      {value.content_source === "link" && (
        <FormField
          id="book_url"
          label="Link"
          type="url"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://..."
        />
      )}

      {/* Attribution — independent of content_source. Publishing
          someone else's work with credit forces the price to $0,
          enforced below this component in CreateProject and again on
          the server (a nonzero price silently can't save otherwise). */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Author</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, is_own_work: true })}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${
              value.is_own_work ? "border-accent bg-accent-soft text-ink" : "border-border bg-canvas text-ink-muted"
            }`}
          >
            I wrote this
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, is_own_work: false })}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${
              !value.is_own_work ? "border-accent bg-accent-soft text-ink" : "border-border bg-canvas text-ink-muted"
            }`}
          >
            Someone else wrote this
          </button>
        </div>

        {!value.is_own_work && (
          <>
            <FormField
              id="book_author_name"
              label="Author's name"
              value={value.author_name}
              onChange={(e) => onChange({ ...value, author_name: e.target.value })}
              placeholder="Who actually wrote it"
              required
            />
            <FormField
              id="book_source_credit"
              label="Credit / source (optional)"
              value={value.source_credit}
              onChange={(e) => onChange({ ...value, source_credit: e.target.value })}
              placeholder="e.g. Originally published by Acme Press, shared with permission"
            />
            <p className="text-xs text-ink-muted -mt-3 mb-4">
              You're crediting someone else as the author, so this can't be sold — price is
              locked at $0.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
