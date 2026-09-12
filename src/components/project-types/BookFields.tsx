// src/components/project-types/BookFields.tsx
import { useRef, useState } from "react";
import { FileUp, Info } from "lucide-react";
import { FormField } from "../FormField";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";

export type BookContentSource = "link" | "upload" | "authored";

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
}

const SOURCE_OPTIONS: { value: BookContentSource; label: string; hint: string }[] = [
  { value: "upload", label: "Upload PDF", hint: "Host the file here — allow download, in-app reading, or both." },
  { value: "link", label: "Link", hint: "Redirect readers to it elsewhere — nothing hosted here." },
  { value: "authored", label: "Write in Akọ", hint: "Build it chapter by chapter, right here, like a Course." },
];

export function BookFields({ value, onChange, onError }: BookFieldsProps) {
  const uploadFile = useUploadProjectFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0); // forces disabled/label state to re-render during upload

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
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

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

      {/* Content source — link, upload, or build it in-app. Switching
          this doesn't clear the other modes' state, same reasoning as
          switching project_type itself in CreateProject. */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">How are you adding it?</label>
        <div className="flex flex-col gap-2">
          {SOURCE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer ${
                value.content_source === opt.value ? "border-accent bg-accent-soft" : "border-border bg-canvas"
              }`}
            >
              <input
                type="radio"
                name="book_content_source"
                checked={value.content_source === opt.value}
                onChange={() => onChange({ ...value, content_source: opt.value })}
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

      {value.content_source === "upload" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-muted mb-1.5">PDF</label>
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
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col gap-2 mt-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={value.allow_read_in_app}
                onChange={(e) => onChange({ ...value, allow_read_in_app: e.target.checked })}
                className="rounded border-border"
              />
              Let readers read it right here in Akọ
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={value.allow_download}
                onChange={(e) => onChange({ ...value, allow_download: e.target.checked })}
                className="rounded border-border"
              />
              Let readers download the PDF
            </label>
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
