// src/components/customPage/EditorParts.tsx
// Small form building blocks for the Custom Page editor.
import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Trash2, Upload } from "lucide-react";
import { fileProblem, publicFileUrl, storagePathFor, type CustomPageImage } from "../../lib/customPage";
import { uploadCustomPageFile } from "../../hooks/useCustomPages";
import { friendlyError } from "../../lib/friendlyError";
import { useToast } from "../Toast";

export const INPUT =
  "w-full rounded-xl bg-surface border border-border text-ink placeholder:text-ink-muted/50 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/40";

export function Field({ label, hint, count, max, children }: { label: string; hint?: string; count?: number; max?: number; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[13px] font-medium text-ink">{label}</label>
        {max !== undefined && count !== undefined && (
          <span className={`text-[11px] ${count > max ? "text-danger" : "text-ink-muted"}`}>
            {count}/{max}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-ink-muted mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

export function Section({ title, children, intro }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {intro && <p className="text-sm text-ink-muted mt-1 mb-4 leading-snug">{intro}</p>}
      {!intro && <div className="mb-3" />}
      {children}
    </section>
  );
}

/** Uploads one file to the page's folder and hands back its storage path. */
export function useFileUpload(ownerId: string, pageId: string) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function upload(file: File, kind: "image" | "file"): Promise<string | null> {
    const problem = fileProblem(file, kind);
    if (problem) {
      toast(problem, { variant: "error", duration: 3500 });
      return null;
    }
    setBusy(true);
    try {
      const path = storagePathFor(ownerId, pageId, file);
      await uploadCustomPageFile(path, file);
      return path;
    } catch (err) {
      toast(friendlyError(err, "Upload failed. Please try again."), { variant: "error", duration: 3500 });
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { upload, busy };
}

export function SingleImage({
  label,
  hint,
  path,
  ownerId,
  pageId,
  onChange,
  square,
}: {
  label: string;
  hint?: string;
  path?: string;
  ownerId: string;
  pageId: string;
  onChange: (path: string | undefined) => void;
  square?: boolean;
}) {
  const { upload, busy } = useFileUpload(ownerId, pageId);
  const input = useRef<HTMLInputElement>(null);
  const url = publicFileUrl(path);
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className={`${square ? "w-16 h-16" : "w-24 h-16"} rounded-xl bg-accent-soft overflow-hidden flex items-center justify-center shrink-0`}>
          {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={20} className="text-accent" />}
        </div>
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2 disabled:opacity-50">
          {busy ? "Uploading…" : url ? "Replace" : "Upload"}
        </button>
        {url && (
          <button type="button" onClick={() => onChange(undefined)} className="text-sm text-ink-muted px-2 py-2">
            Remove
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const p = await upload(f, "image");
            if (p) onChange(p);
          }}
        />
      </div>
    </Field>
  );
}

export function ImageList({
  label,
  hint,
  items,
  max,
  captions,
  ownerId,
  pageId,
  onChange,
}: {
  label: string;
  hint?: string;
  items: CustomPageImage[];
  max: number;
  captions?: boolean;
  ownerId: string;
  pageId: string;
  onChange: (items: CustomPageImage[]) => void;
}) {
  const { upload, busy } = useFileUpload(ownerId, pageId);
  const input = useRef<HTMLInputElement>(null);
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <Field label={label} hint={hint} count={items.length} max={max}>
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((it, i) => (
          <div key={it.path} className="flex items-center gap-3 rounded-xl bg-surface border border-border p-2">
            <img src={publicFileUrl(it.path) ?? ""} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            {captions ? (
              <input
                className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none"
                placeholder="Caption (optional)"
                value={it.caption ?? ""}
                maxLength={160}
                onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, caption: e.target.value || undefined } : x)))}
              />
            ) : (
              <span className="flex-1 text-sm text-ink-muted">Slide {i + 1}</span>
            )}
            <div className="flex items-center shrink-0">
              <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-ink-muted disabled:opacity-30">
                <ArrowUp size={16} />
              </button>
              <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 text-ink-muted disabled:opacity-30">
                <ArrowDown size={16} />
              </button>
              <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))} className="p-1.5 text-danger">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {items.length < max && (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          <ImagePlus size={16} /> {busy ? "Uploading…" : "Add images"}
        </button>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, max - items.length);
          e.target.value = "";
          const added: CustomPageImage[] = [];
          for (const f of files) {
            const p = await upload(f, "image");
            if (p) added.push({ path: p });
          }
          if (added.length) onChange([...items, ...added]);
        }}
      />
    </Field>
  );
}

export function FilePicker({
  label,
  hint,
  path,
  fileName,
  ownerId,
  pageId,
  accept,
  onChange,
}: {
  label: string;
  hint?: string;
  path?: string;
  fileName?: string;
  ownerId: string;
  pageId: string;
  accept?: string;
  onChange: (v: { path: string; name: string } | null) => void;
}) {
  const { upload, busy } = useFileUpload(ownerId, pageId);
  const input = useRef<HTMLInputElement>(null);
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3 rounded-xl bg-surface border border-border p-3">
        <FileText size={20} className="text-accent shrink-0" />
        <span className="flex-1 min-w-0 truncate text-sm text-ink">{path ? fileName || "Uploaded file" : <span className="text-ink-muted">No file yet</span>}</span>
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2 disabled:opacity-50">
          <Upload size={14} /> {busy ? "Uploading…" : path ? "Replace" : "Upload"}
        </button>
        {path && (
          <button type="button" aria-label="Remove file" onClick={() => onChange(null)} className="p-1.5 text-danger">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const p = await upload(f, "file");
          if (p) onChange({ path: p, name: f.name });
        }}
      />
    </Field>
  );
}
